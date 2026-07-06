import { useCallback, useEffect, useState, lazy, Suspense, useTransition } from 'react'
import { useGraiDeployment } from '../grai/GraiDeploymentProvider'
import { FloatingTokenBackground, STABLE_FLOATING_TOKENS } from '../components/FloatingTokenBackground'
import { GraiGrindersSection } from '../components/grai/GraiGrindersSection'
import { GraiMintBurnPanel } from '../components/grai/GraiMintBurnPanel'
import { GraiAssetsSection } from '../components/grai/GraiAssetsSection'
import { type GraiSection, isManageSectionHash } from '../utils/graiNavigation'
import './GraiPage.css'

const GraiTokenFlowDiagram = lazy(() =>
  import('../components/GraiTokenFlowDiagram').then((m) => ({ default: m.GraiTokenFlowDiagram })),
)

function TokenFlowLoading() {
  return (
    <div className="grai-token-flow-loading" role="status" aria-live="polite">
      <span className="grai-token-flow-loading-spinner" aria-hidden="true" />
      <span>Loading information…</span>
    </div>
  )
}

function GraiPage() {
  const { clusterMismatch, evmChainMismatch, solanaCluster, chainKind, evm, hasStaticConfig, isConfigured, protocolError } = useGraiDeployment()
  const [actionView, setActionView] = useState<'mint' | 'burn'>('mint')
  const [isTokenFlowOpen, setIsTokenFlowOpen] = useState(false)
  const [isTokenFlowMounted, setIsTokenFlowMounted] = useState(false)
  const [isTokenFlowPending, startTokenFlowTransition] = useTransition()
  const [isTitleExpanded, setIsTitleExpanded] = useState(false)
  const [isManageSectionOpen, setIsManageSectionOpen] = useState(() =>
    isManageSectionHash(window.location.hash.slice(1)),
  )

  const toggleTokenFlow = useCallback(() => {
    startTokenFlowTransition(() => {
      setIsTokenFlowOpen((open) => {
        if (!open) setIsTokenFlowMounted(true)
        return !open
      })
    })
  }, [])
  const expandTitle = useCallback(() => {
    setIsTitleExpanded(true)
  }, [])
  const collapseTitle = useCallback(() => {
    setIsTitleExpanded(false)
  }, [])
  const isCompactHeaderInteraction = useCallback(() => {
    return window.matchMedia('(max-width: 1024px)').matches
  }, [])
  const handleTitlePointerLeave = useCallback(() => {
    if (isCompactHeaderInteraction()) return
    collapseTitle()
  }, [collapseTitle, isCompactHeaderInteraction])
  const handleTitleClick = useCallback(() => {
    if (!isCompactHeaderInteraction()) return
    setIsTitleExpanded((expanded) => !expanded)
  }, [isCompactHeaderInteraction])

  useEffect(() => {
    const applySection = (section: GraiSection) => {
      if (section === 'mint') setActionView('mint')
      else if (section === 'burn') setActionView('burn')
      setIsManageSectionOpen(section === 'allocate' || section === 'distribute')
    }

    const onSectionNav = (event: Event) => {
      applySection((event as CustomEvent<GraiSection>).detail)
    }

    const onHashChange = () => {
      const hash = window.location.hash.slice(1)
      setIsManageSectionOpen(isManageSectionHash(hash))
      if (hash === 'mint' || hash === 'burn' || hash === 'grinders' || hash === 'allocate' || hash === 'distribute' || hash === 'manage') {
        applySection(hash === 'manage' ? 'allocate' : hash)
      }
    }

    window.addEventListener('grai-section-nav', onSectionNav)
    window.addEventListener('hashchange', onHashChange)
    onHashChange()

    return () => {
      window.removeEventListener('grai-section-nav', onSectionNav)
      window.removeEventListener('hashchange', onHashChange)
    }
  }, [])

  return (
    <div className="grai-page">
      <div className={`grai-page-header${isTitleExpanded ? ' is-title-expanded' : ''}`}>
        <h1
          className={`grai-page-title${isTitleExpanded ? ' is-expanded' : ''}`}
          aria-label="GRAI — GRinders Artificial Index"
          tabIndex={0}
          onPointerEnter={expandTitle}
          onPointerLeave={handleTitlePointerLeave}
          onClick={handleTitleClick}
          onFocus={expandTitle}
          onBlur={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget as Node)) {
              collapseTitle()
            }
          }}
        >
          <span className="grai-page-title-accent">GR</span>
          <span className="grai-page-title-expand">
            <span className="grai-page-title-expand-inner">inders</span>
          </span>
          <span className="grai-page-title-accent">A</span>
          <span className="grai-page-title-expand">
            <span className="grai-page-title-expand-inner">rtificial</span>
          </span>
          <span className="grai-page-title-accent">I</span>
          <span className="grai-page-title-expand">
            <span className="grai-page-title-expand-inner">ndex</span>
          </span>
        </h1>
        <div className="grai-page-header-actions">
          <div className="grai-page-info-group">
            <button
              type="button"
              className={`grai-page-info-btn${isTokenFlowOpen ? ' is-active' : ' is-collapsed'}${isTokenFlowPending ? ' is-loading' : ''}`}
              onClick={(event) => {
                event.stopPropagation()
                toggleTokenFlow()
              }}
              aria-expanded={isTokenFlowOpen}
              aria-busy={isTokenFlowPending}
              aria-controls="grai-token-flow-panel"
              aria-label={isTokenFlowPending ? 'Loading information' : 'How it works'}
            >
              {isTokenFlowPending ? (
                <>
                  <span className="grai-page-info-btn-spinner" aria-hidden="true" />
                  LOADING…
                </>
              ) : (
                <>
                  <svg
                    className="grai-page-info-btn-icon"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                  HOW IT WORKS
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      <div
        id="grai-token-flow-panel"
        className={`grai-token-flow-panel${isTokenFlowOpen ? ' is-open' : ''}`}
        aria-hidden={!isTokenFlowOpen}
      >
        <div className="grai-token-flow-panel-inner">
          {isTokenFlowMounted ? (
            <Suspense fallback={<TokenFlowLoading />}>
              <GraiTokenFlowDiagram />
            </Suspense>
          ) : null}
        </div>
      </div>

      {(clusterMismatch || evmChainMismatch || !isConfigured || protocolError) && (
        <div className="grai-page-meta">
          {clusterMismatch && (
            <p className="grai-page-network-warning" role="status">
              Switch your Solana wallet to {solanaCluster === 'mainnet-beta' ? 'Mainnet' : solanaCluster} to mint or burn GRAI.
            </p>
          )}
          {evmChainMismatch && evm && (
            <p className="grai-page-network-warning" role="status">
              Switch your EVM wallet to {evm.chainName} to mint or burn GRAI.
            </p>
          )}
          {!isConfigured && chainKind === null && (
            <p className="grai-page-network-warning" role="status">
              GRAI is not configured for this network. Set deployment env vars before using the app.
            </p>
          )}
          {!isConfigured && chainKind === 'evm' && (
            <p className="grai-page-network-warning" role="status">
              GRAI is not configured for this EVM network. Set VITE_GRAI_*_TOKEN and VITE_GRAI_*_PROTOCOL env vars.
            </p>
          )}
          {!isConfigured && chainKind === 'solana' && !hasStaticConfig && (
            <p className="grai-page-network-warning" role="status">
              GRAI is not configured for this Solana cluster. Set deployment env vars before using the app.
            </p>
          )}
          {protocolError && (
            <p className="grai-page-network-warning" role="status">
              {protocolError}
            </p>
          )}
        </div>
      )}

      <div className="grai-bottom-row">
        <GraiGrindersSection />
      </div>

      <FloatingTokenBackground tokens={STABLE_FLOATING_TOKENS} className="grai-content-row">
        <div className="grai-actions-block" id="grai-actions-section">
          <GraiMintBurnPanel actionView={actionView} onActionViewChange={setActionView} />
        </div>
      </FloatingTokenBackground>

      <GraiAssetsSection isManageSectionOpen={isManageSectionOpen} />
    </div>
  )
}

export default GraiPage
