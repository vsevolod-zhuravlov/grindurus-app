import { useWallet, useConnection } from '@solana/wallet-adapter-react'
import { useWalletModal } from '@solana/wallet-adapter-react-ui'
import { useMemo, useCallback } from 'react'
import { useWalletContext } from '../providers/AppWalletProvider'

export function useSolanaWallet() {
  const {
    publicKey,
    connected,
    connecting,
    disconnect: walletDisconnect,
    wallet,
    wallets,
    select,
    connect,
  } = useWallet()
  const { connection } = useConnection()
  const { setVisible } = useWalletModal()
  const { solanaCluster, setSolanaCluster } = useWalletContext()

  const address = useMemo(() => {
    return publicKey?.toBase58() || ''
  }, [publicKey])

  const shortAddress = useMemo(() => {
    if (!address) return ''
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }, [address])

  const clusterName = useMemo(() => {
    if (solanaCluster === 'mainnet-beta') return 'Mainnet'
    if (solanaCluster === 'testnet') return 'Testnet'
    return 'Devnet'
  }, [solanaCluster])

  const supportedClusters = useMemo(
    () => [
      { id: 'mainnet-beta' as const, name: 'Mainnet', icon: '🟢' },
      { id: 'testnet' as const, name: 'Testnet', icon: '🟡' },
      { id: 'devnet' as const, name: 'Devnet', icon: '🟣' },
    ],
    []
  )

  const detectedWallets = useMemo(() => {
    return wallets.filter((w) => w.readyState === 'Installed' || w.readyState === 'Loadable')
  }, [wallets])

  const allWallets = useMemo(() => wallets, [wallets])

  const openModal = useCallback(() => {
    setVisible(true)
  }, [setVisible])

  const disconnect = useCallback(async () => {
    await walletDisconnect()
  }, [walletDisconnect])

  const switchCluster = useCallback(
    (cluster: 'mainnet-beta' | 'testnet' | 'devnet') => {
      setSolanaCluster(cluster)
    },
    [setSolanaCluster]
  )

  const selectWallet = useCallback(
    async (walletName: string) => {
      const found = wallets.find((w) => w.adapter.name === walletName)
      if (found) {
        select(found.adapter.name)
        try {
          await connect()
        } catch {
          // User rejected or wallet still initializing
        }
      }
    },
    [wallets, select, connect]
  )

  return {
    address,
    shortAddress,
    publicKey,
    isConnected: connected,
    isConnecting: connecting,
    cluster: solanaCluster,
    clusterName,
    wallet,
    wallets: allWallets,
    detectedWallets,
    connection,
    supportedClusters,
    connect: openModal,
    disconnect,
    switchCluster,
    selectWallet,
  }
}
