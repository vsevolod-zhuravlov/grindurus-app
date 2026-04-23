import { useState, useCallback, useRef, useEffect } from 'react'
import { useActiveWallet } from '../hooks/useActiveWallet'
import { useEvmWallet } from '../hooks/useEvmWallet'
import { useSolanaWallet } from '../hooks/useSolanaWallet'
import './WalletStyles.css'

export function WalletInfo() {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [isNetworkDropdownOpen, setIsNetworkDropdownOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const networkDropdownRef = useRef<HTMLDivElement>(null)
  const activeWallet = useActiveWallet()
  const evmWallet = useEvmWallet()
  const solanaWallet = useSolanaWallet()

  const handleClickOutside = useCallback((e: MouseEvent) => {
    if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
      setIsDropdownOpen(false)
    }
    if (networkDropdownRef.current && !networkDropdownRef.current.contains(e.target as Node)) {
      setIsNetworkDropdownOpen(false)
    }
  }, [])

  useEffect(() => {
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [handleClickOutside])

  const handleDisconnect = useCallback(() => {
    activeWallet.disconnect()
    setIsDropdownOpen(false)
  }, [activeWallet])

  const copyAddress = useCallback(async () => {
    if (activeWallet.address) {
      await navigator.clipboard.writeText(activeWallet.address)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }, [activeWallet.address])

  const getNetworkLogo = () => {
    if (activeWallet.chainType === 'evm') {
      const chainId = evmWallet.chainId
      
      if (chainId === 42161) {
        return (
          <div className="network-logo arbitrum-logo">
            <img
              src="https://assets.coingecko.com/coins/images/16547/small/photo_2023-03-29_21.47.00.jpeg"
              alt="Arbitrum"
              width={32}
              height={32}
            />
          </div>
        )
      }
      
      if (chainId === 11155111) {
        return (
          <div className="network-logo sepolia-logo">
            <svg width="32" height="32" viewBox="0 0 256 417" fill="#9CA3AF">
              <path d="M127.961 0l-2.795 9.5v275.668l2.795 2.79 127.962-75.638z" fillOpacity="0.8"/>
              <path d="M127.962 0L0 212.32l127.962 75.639V154.158z" fillOpacity="0.5"/>
              <path d="M127.961 287.958l127.96-75.637-127.96-58.162z" fillOpacity="1"/>
              <path d="M0 212.32l127.96 75.638v-133.8z" fillOpacity="0.6"/>
            </svg>
          </div>
        )
      }
      
      return (
        <div className="network-logo ethereum-logo">
          <img
            src="https://assets.coingecko.com/coins/images/279/small/ethereum.png"
            alt="Ethereum"
            width={32}
            height={32}
          />
        </div>
      )
    }
    
    const cluster = solanaWallet.cluster
    const logoClass = cluster === 'devnet' ? 'solana-devnet-logo' : cluster === 'testnet' ? 'solana-testnet-logo' : 'solana-logo'
    return (
      <div className={`network-logo ${logoClass}`}>
        <svg width="22" height="22" viewBox="0 0 397 311" fill="currentColor">
          <path d="M64.6 237.9c2.4-2.4 5.7-3.8 9.2-3.8h317.4c5.8 0 8.7 7 4.6 11.1l-62.7 62.7c-2.4 2.4-5.7 3.8-9.2 3.8H6.5c-5.8 0-8.7-7-4.6-11.1l62.7-62.7z"/>
          <path d="M64.6 3.8C67.1 1.4 70.4 0 73.8 0h317.4c5.8 0 8.7 7 4.6 11.1l-62.7 62.7c-2.4 2.4-5.7 3.8-9.2 3.8H6.5c-5.8 0-8.7-7-4.6-11.1L64.6 3.8z"/>
          <path d="M333.1 120.1c-2.4-2.4-5.7-3.8-9.2-3.8H6.5c-5.8 0-8.7 7-4.6 11.1l62.7 62.7c2.4 2.4 5.7 3.8 9.2 3.8h317.4c5.8 0 8.7-7 4.6-11.1l-62.7-62.7z"/>
        </svg>
      </div>
    )
  }

  if (!activeWallet.isConnected) {
    return null
  }

  const handleNetworkSelect = useCallback((chainId: number) => {
    evmWallet.switchToChain(chainId)
    setIsNetworkDropdownOpen(false)
  }, [evmWallet])

  const handleClusterSelect = useCallback((clusterId: 'mainnet-beta' | 'testnet' | 'devnet') => {
    solanaWallet.switchCluster(clusterId)
    setIsNetworkDropdownOpen(false)
  }, [solanaWallet])

  return (
    <div className="wallet-info" ref={dropdownRef}>
      <div className="network-selector" ref={networkDropdownRef}>
        <button 
          className="network-logo-btn"
          onClick={() => setIsNetworkDropdownOpen(!isNetworkDropdownOpen)}
        >
          {getNetworkLogo()}
        </button>
        
        {isNetworkDropdownOpen && (
          <div className="network-dropdown">
            {activeWallet.chainType === 'evm' && evmWallet.supportedChains.map((chain) => (
              <button
                key={chain.id}
                className={`network-dropdown-item ${evmWallet.chainId === chain.id ? 'active' : ''}`}
                onClick={() => handleNetworkSelect(chain.id)}
              >
                <span className={`network-icon-svg ${chain.name.toLowerCase()}`}>
                  {chain.name === 'Ethereum' && (
                    <img
                      src="https://assets.coingecko.com/coins/images/279/small/ethereum.png"
                      alt="Ethereum"
                      width={28}
                      height={28}
                    />
                  )}
                  {chain.name === 'Arbitrum' && (
                    <img
                      src="https://assets.coingecko.com/coins/images/16547/small/photo_2023-03-29_21.47.00.jpeg"
                      alt="Arbitrum"
                      width={28}
                      height={28}
                    />
                  )}
                  {chain.name === 'Sepolia' && (
                    <svg width="32" height="32" viewBox="0 0 256 417" fill="#9CA3AF">
                      <path d="M127.961 0l-2.795 9.5v275.668l2.795 2.79 127.962-75.638z" fillOpacity="0.8"/>
                      <path d="M127.962 0L0 212.32l127.962 75.639V154.158z" fillOpacity="0.5"/>
                      <path d="M127.961 287.958l127.96-75.637-127.96-58.162z" fillOpacity="1"/>
                      <path d="M0 212.32l127.96 75.638v-133.8z" fillOpacity="0.6"/>
                    </svg>
                  )}
                </span>
                <span className="network-name">{chain.name}</span>
                {evmWallet.chainId === chain.id && (
                  <svg className="network-check" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </button>
            ))}
            {activeWallet.chainType === 'solana' && solanaWallet.supportedClusters.map((cluster) => (
              <button
                key={cluster.id}
                className={`network-dropdown-item ${solanaWallet.cluster === cluster.id ? 'active' : ''}`}
                onClick={() => handleClusterSelect(cluster.id)}
              >
                <span className={`network-icon-svg ${cluster.id === 'devnet' ? 'solana-devnet' : cluster.id === 'testnet' ? 'solana-testnet' : 'solana'}`}>
                  <svg width="22" height="22" viewBox="0 0 397 311" fill="currentColor">
                    <path d="M64.6 237.9c2.4-2.4 5.7-3.8 9.2-3.8h317.4c5.8 0 8.7 7 4.6 11.1l-62.7 62.7c-2.4 2.4-5.7 3.8-9.2 3.8H6.5c-5.8 0-8.7-7-4.6-11.1l62.7-62.7z"/>
                    <path d="M64.6 3.8C67.1 1.4 70.4 0 73.8 0h317.4c5.8 0 8.7 7 4.6 11.1l-62.7 62.7c-2.4 2.4-5.7 3.8-9.2 3.8H6.5c-5.8 0-8.7-7-4.6-11.1L64.6 3.8z"/>
                    <path d="M333.1 120.1c-2.4-2.4-5.7-3.8-9.2-3.8H6.5c-5.8 0-8.7 7-4.6 11.1l62.7 62.7c2.4 2.4 5.7 3.8 9.2 3.8h317.4c5.8 0 8.7-7 4.6-11.1l-62.7-62.7z"/>
                  </svg>
                </span>
                <span className="network-name">{cluster.name}</span>
                {solanaWallet.cluster === cluster.id && (
                  <svg className="network-check" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
      
      <button 
        className="wallet-info-btn"
        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
      >
        <span className="wallet-address">{activeWallet.shortAddress}</span>
        <svg 
          className={`wallet-dropdown-arrow ${isDropdownOpen ? 'open' : ''}`}
          width="10" 
          height="10" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="2.5"
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {isDropdownOpen && (
        <div className="wallet-dropdown">
          <div className="wallet-dropdown-header">
            <span className="wallet-dropdown-label">Connected</span>
            <span className="wallet-dropdown-network">{activeWallet.networkName}</span>
          </div>
          
          <div className="wallet-dropdown-address" onClick={copyAddress}>
            <div className="wallet-address-content">
              <span className="wallet-full-address">{activeWallet.address}</span>
              {copied && <span className="wallet-copy-hint copied">Copied!</span>}
            </div>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
            </svg>
          </div>

          <button className="wallet-disconnect-btn" onClick={handleDisconnect}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            Disconnect
          </button>
        </div>
      )}
    </div>
  )
}
