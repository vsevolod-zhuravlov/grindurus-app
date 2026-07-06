import { useCallback, useRef, useState } from 'react'
import { Check, Copy } from 'lucide-react'
import { useActiveWallet } from '../hooks/useActiveWallet'
import { useWalletContext } from '../providers/AppWalletProvider'
import { WalletIcon } from './WalletIcon'
import './WalletStyles.css'

export function ConnectWalletButton() {
  const { isChainSelectorOpen, openChainSelector } = useWalletContext()
  const activeWallet = useActiveWallet()
  const [copied, setCopied] = useState(false)
  const showConnecting = isChainSelectorOpen && activeWallet.isConnecting
  const touchOpenedRef = useRef(false)

  const handleOpen = useCallback(() => {
    if (showConnecting) return
    openChainSelector()
  }, [openChainSelector, showConnecting])

  const handlePointerUp = useCallback(
    (event: React.PointerEvent<HTMLButtonElement>) => {
      if (event.pointerType !== 'touch' || showConnecting) return
      touchOpenedRef.current = true
      handleOpen()
    },
    [handleOpen, showConnecting],
  )

  const handleClick = useCallback(() => {
    if (touchOpenedRef.current) {
      touchOpenedRef.current = false
      return
    }
    handleOpen()
  }, [handleOpen])

  const copyAddress = useCallback(async () => {
    if (!activeWallet.address) return
    await navigator.clipboard.writeText(activeWallet.address)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [activeWallet.address])

  if (activeWallet.isConnected) {
    return (
      <div className="header-wallet-slot header-wallet-slot--connected">
        <button
          type="button"
          className={`header-wallet-address-btn${copied ? ' is-copied' : ''}`}
          onClick={() => copyAddress()}
          title="Copy wallet address"
          aria-label={copied ? 'Address copied' : `Copy wallet address ${activeWallet.shortAddress}`}
        >
          <span className="header-wallet-address-text">{activeWallet.shortAddress}</span>
          {copied ? (
            <Check size={14} strokeWidth={2} aria-hidden="true" />
          ) : (
            <Copy size={14} strokeWidth={2} aria-hidden="true" />
          )}
        </button>
      </div>
    )
  }

  return (
    <div className="header-wallet-slot">
      <button
        className="connect-wallet-btn"
        type="button"
        onPointerUp={handlePointerUp}
        onClick={handleClick}
        disabled={showConnecting}
      >
        {showConnecting ? (
          <>
            <span className="wallet-spinner" />
            <span className="connect-wallet-btn-label">Connecting...</span>
          </>
        ) : (
          <>
            <WalletIcon />
            <span className="connect-wallet-btn-label">Connect Wallet</span>
          </>
        )}
      </button>
    </div>
  )
}
