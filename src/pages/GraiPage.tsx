import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useGraiDeployment } from '../grai/GraiDeploymentProvider'
import { FloatingTokenBackground, STABLE_FLOATING_TOKENS } from '../components/FloatingTokenBackground'
import { GraiGrindersSection } from '../components/grai/GraiGrindersSection'
import { GraiMintBurnPanel } from '../components/grai/GraiMintBurnPanel'
import { GraiAssetsSection } from '../components/grai/GraiAssetsSection'
import { type GraiSection, isManageSectionHash } from '../utils/graiNavigation'
import './GraiPage.css'

const GRAI_ACTIONS_SUBTITLES = {
  mint: 'Turn Assets Price Volatility into Yield',
  burn: 'Exit your GRAI position anytime',
} as const

const GRAI_ACTIONS_SUBTITLE_FIT_TEXT = Object.values(GRAI_ACTIONS_SUBTITLES).reduce((longest, current) =>
  current.length > longest.length ? current : longest,
)

function GraiActionsSubtitle({ actionView }: { actionView: 'mint' | 'burn' }) {
  const subtitleRef = useRef<HTMLParagraphElement>(null)
  const text = GRAI_ACTIONS_SUBTITLES[actionView]

  const fitSubtitleWidth = useCallback(() => {
    const el = subtitleRef.current
    if (!el) return

    el.style.fontSize = ''
    el.classList.remove('is-fit-width')

    if (el.clientWidth < 520) return

    const containerWidth = el.clientWidth
    if (containerWidth <= 0) return

    const visibleText = el.textContent ?? ''
    el.textContent = GRAI_ACTIONS_SUBTITLE_FIT_TEXT

    let min = 12
    let max = 72
    let best = min

    while (min <= max) {
      const mid = Math.floor((min + max) / 2)
      el.style.fontSize = `${mid}px`
      if (el.scrollWidth <= containerWidth) {
        best = mid
        min = mid + 1
      } else {
        max = mid - 1
      }
    }

    el.style.fontSize = `${best}px`
    el.textContent = visibleText
    el.classList.add('is-fit-width')
  }, [])

  useLayoutEffect(() => {
    fitSubtitleWidth()
    const el = subtitleRef.current
    if (!el) return

    const observer = new ResizeObserver(fitSubtitleWidth)
    observer.observe(el)
    return () => observer.disconnect()
  }, [fitSubtitleWidth, text])

  return (
    <p ref={subtitleRef} className="grai-page-subtitle">
      {text}
    </p>
  )
}

function GraiPage() {
  const { clusterMismatch, evmChainMismatch, solanaCluster, chainKind, evm, hasStaticConfig, isConfigured, protocolError } = useGraiDeployment()
  const [actionView, setActionView] = useState<'mint' | 'burn'>('mint')

  const [isManageSectionOpen, setIsManageSectionOpen] = useState(() =>
    isManageSectionHash(window.location.hash.slice(1)),
  )

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

      <FloatingTokenBackground tokens={STABLE_FLOATING_TOKENS} className="grai-content-row">
        <div className="grai-actions-block" id="grai-actions-section">
          <GraiActionsSubtitle actionView={actionView} />
          <GraiMintBurnPanel actionView={actionView} onActionViewChange={setActionView} />
        </div>
      </FloatingTokenBackground>

      <div className="grai-bottom-row">
        <GraiGrindersSection />
      </div>

      <GraiAssetsSection isManageSectionOpen={isManageSectionOpen} />
    </div>
  )
}

export default GraiPage
