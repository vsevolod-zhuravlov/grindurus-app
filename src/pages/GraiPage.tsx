import { useEffect, useState } from 'react'
import { useGraiDeployment } from '../grai/GraiDeploymentProvider'
import { FloatingTokenBackground, STABLE_FLOATING_TOKENS } from '../components/FloatingTokenBackground'
import { GraiGrindersSection } from '../components/grai/GraiGrindersSection'
import { GraiMintBurnPanel } from '../components/grai/GraiMintBurnPanel'
import { GraiAssetsSection } from '../components/grai/GraiAssetsSection'
import { type GraiSection, isManageSectionHash } from '../utils/graiNavigation'
import './GraiPage.css'

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
              Switch your Solana wallet to {solanaCluster === 'mainnet-beta' ? 'Mainnet' : solanaCluster} to mint or redeem GRAI.
            </p>
          )}
          {evmChainMismatch && evm && (
            <p className="grai-page-network-warning" role="status">
              Switch your EVM wallet to {evm.chainName} to mint or redeem GRAI.
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
