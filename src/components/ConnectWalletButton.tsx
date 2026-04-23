import { useState } from 'react'
import { useActiveWallet } from '../hooks/useActiveWallet'
import { ChainSelectorModal } from './ChainSelectorModal'
import { WalletInfo } from './WalletInfo'
import './WalletStyles.css'

export function ConnectWalletButton() {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const activeWallet = useActiveWallet()

  if (activeWallet.isConnected) {
    return <WalletInfo />
  }

  return (
    <>
      <button
        className="connect-wallet-btn"
        type="button"
        onClick={() => setIsModalOpen(true)}
        disabled={activeWallet.isConnecting}
      >
        {activeWallet.isConnecting ? (
          <>
            <span className="wallet-spinner" />
            Connecting...
          </>
        ) : (
          <>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="2" y="3" width="20" height="18" rx="2" />
              <path d="M16 8v8M8 8v8" />
            </svg>
            Connect Wallet
          </>
        )}
      </button>

      <ChainSelectorModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </>
  )
}
