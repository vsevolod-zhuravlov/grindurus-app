import { ReactNode, useEffect, useMemo, useState } from 'react'
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react'
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui'
import {
  PhantomWalletAdapter,
  SolflareWalletAdapter,
  CoinbaseWalletAdapter,
} from '@solana/wallet-adapter-wallets'
import { resolveSolanaRpcUrl } from '../grai/deployments'
import { deferAfterPaint } from '../utils/deferAfterPaint'
import '@solana/wallet-adapter-react-ui/styles.css'

export type SolanaNetwork = 'mainnet-beta' | 'testnet' | 'devnet'

interface SolanaProviderProps {
  children: ReactNode
  network?: SolanaNetwork
}

export function SolanaProvider({ children, network = 'mainnet-beta' }: SolanaProviderProps) {
  const endpoint = useMemo(() => resolveSolanaRpcUrl(network), [network])
  const [autoConnect, setAutoConnect] = useState(false)

  const wallets = useMemo(
    () => [new PhantomWalletAdapter(), new SolflareWalletAdapter(), new CoinbaseWalletAdapter()],
    [],
  )

  useEffect(() => {
    return deferAfterPaint(() => setAutoConnect(true))
  }, [])

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect={autoConnect}>
        <WalletModalProvider>{children}</WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  )
}
