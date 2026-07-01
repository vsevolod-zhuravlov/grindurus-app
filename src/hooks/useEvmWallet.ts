import { useAccount, useDisconnect, useChainId, useSwitchChain, useConnect } from 'wagmi'
import { useConnectModal } from '@rainbow-me/rainbowkit'
import { mainnet, base, arbitrum, sepolia, baseSepolia } from 'wagmi/chains'
import { useMemo, useCallback, useState, useEffect } from 'react'

const chainNames: Record<number, string> = {
  [mainnet.id]: 'Ethereum',
  [base.id]: 'Base',
  [arbitrum.id]: 'Arbitrum',
  [sepolia.id]: 'Sepolia',
  [baseSepolia.id]: 'Base Sepolia',
}

export function useEvmWallet() {
  const { address, isConnected, isConnecting, connector } = useAccount()
  const { disconnect } = useDisconnect()
  const chainId = useChainId()
  const { switchChain, switchChainAsync } = useSwitchChain()
  const { openConnectModal } = useConnectModal()
  const { connectors, connectAsync: wagmiConnectAsync } = useConnect()
  const [installedConnectors, setInstalledConnectors] = useState<string[]>([])

  const hasInjectedMetaMask = useMemo(() => {
    const eth = (window as Window & {
      ethereum?: {
        isMetaMask?: boolean
        providers?: Array<{ isMetaMask?: boolean }>
      }
    }).ethereum
    if (!eth) return false
    if (eth.isMetaMask) return true
    return Array.isArray(eth.providers) && eth.providers.some((p: { isMetaMask?: boolean }) => p?.isMetaMask)
  }, [])

  useEffect(() => {
    const checkConnectors = async () => {
      const installed: string[] = []
      for (const c of connectors) {
        // Only probe browser extensions; WalletConnect init network SDK on getProvider().
        if (c.type !== 'injected') continue
        try {
          const provider = await c.getProvider()
          if (provider) {
            installed.push(c.uid)
          }
        } catch {
          // Provider not available
        }
      }
      setInstalledConnectors(installed)
    }
    void checkConnectors()
  }, [connectors])

  const shortAddress = useMemo(() => {
    if (!address) return ''
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }, [address])

  const chainName = useMemo(() => {
    return chainNames[chainId] || 'Unknown'
  }, [chainId])

  const supportedChains = useMemo(
    () => [
      { id: mainnet.id, name: 'Ethereum', icon: '⟠' },
      { id: base.id, name: 'Base', icon: '🔵' },
      { id: arbitrum.id, name: 'Arbitrum', icon: '🔷' },
      { id: sepolia.id, name: 'Sepolia', icon: '🧪' },
      { id: baseSepolia.id, name: 'Base Sepolia', icon: '🔷' },
    ],
    []
  )

  const isCoinbaseConnector = useCallback((c: { id: string; name: string }) => {
    const id = c.id.toLowerCase()
    const name = c.name.toLowerCase()
    return id.includes('coinbase') || name.includes('coinbase')
  }, [])

  const detectedConnectors = useMemo(() => {
    const filtered = connectors.filter((c) => {
      if (isCoinbaseConnector(c)) return false
      // Keep extension-based wallets only when provider is actually installed.
      if (c.type === 'injected') {
        if (c.name === 'Injected') return false
        if (
          hasInjectedMetaMask &&
          (c.id.toLowerCase().includes('metamask') || c.name.toLowerCase().includes('metamask'))
        ) {
          return true
        }
        return installedConnectors.includes(c.uid)
      }
      // Keep non-injected connectors (e.g. WalletConnect) even without local extension.
      return true
    })
    const seen = new Set<string>()
    return filtered.filter((c) => {
      if (seen.has(c.name)) return false
      seen.add(c.name)
      return true
    })
  }, [connectors, hasInjectedMetaMask, installedConnectors, isCoinbaseConnector])

  const switchToChain = useCallback(
    (targetChainId: number) => {
      if (switchChain) {
        switchChain({ chainId: targetChainId })
      }
    },
    [switchChain]
  )

  const switchToChainAsync = useCallback(
    async (targetChainId: number) => {
      if (!switchChainAsync) {
        throw new Error('This wallet does not support switching networks from the app.')
      }
      await switchChainAsync({ chainId: targetChainId })
    },
    [switchChainAsync]
  )

  const canOpenConnectModal = Boolean(openConnectModal)

  const connect = useCallback(() => {
    if (!openConnectModal) return false
    openConnectModal()
    return true
  }, [openConnectModal])

  const connectWalletConnect = useCallback(() => {
    if (openConnectModal) {
      openConnectModal()
      return true
    }

    const walletConnectConnector = connectors.find(
      (c) =>
        c.id.toLowerCase().includes('walletconnect') ||
        c.name.toLowerCase().includes('walletconnect'),
    )
    if (!walletConnectConnector) return false

    void wagmiConnectAsync({ connector: walletConnectConnector }).catch((error: unknown) => {
      console.error('WalletConnect connect failed:', error)
    })
    return true
  }, [connectors, openConnectModal, wagmiConnectAsync])

  const connectWithConnector = useCallback(
    async (connectorId: string) => {
      const found = connectors.find((c) => c.uid === connectorId || c.id === connectorId)
      if (!found) {
        throw new Error(`Connector not found: ${connectorId}`)
      }
      await wagmiConnectAsync({ connector: found })
    },
    [connectors, wagmiConnectAsync]
  )

  return {
    address,
    shortAddress,
    isConnected,
    isConnecting,
    chainId,
    chainName,
    connector,
    connectors: detectedConnectors,
    supportedChains,
    canOpenConnectModal,
    connect,
    connectWalletConnect,
    connectWithConnector,
    disconnect,
    switchToChain,
    switchToChainAsync,
  }
}
