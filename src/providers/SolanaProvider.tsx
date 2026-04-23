import { ReactNode, useMemo } from 'react'
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react'
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui'
import { clusterApiUrl, Cluster } from '@solana/web3.js'
import {
  PhantomWalletAdapter,
  SolflareWalletAdapter,
  CoinbaseWalletAdapter,
} from '@solana/wallet-adapter-wallets'
import '@solana/wallet-adapter-react-ui/styles.css'

export type SolanaNetwork = 'mainnet-beta' | 'testnet' | 'devnet'

interface SolanaProviderProps {
  children: ReactNode
  network?: SolanaNetwork
}

export function SolanaProvider({ children, network = 'mainnet-beta' }: SolanaProviderProps) {
  const endpoint = useMemo(() => {
    const customRpc = import.meta.env.VITE_SOLANA_RPC_URL
    if (customRpc) return customRpc
    return clusterApiUrl(network as Cluster)
  }, [network])

  const wallets = useMemo(
    () => [new PhantomWalletAdapter(), new SolflareWalletAdapter(), new CoinbaseWalletAdapter()],
    []
  )

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>{children}</WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  )
}
