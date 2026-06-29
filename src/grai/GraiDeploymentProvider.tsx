import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from 'react'
import { Connection } from '@solana/web3.js'
import { useWalletContext, type SolanaCluster } from '../providers/AppWalletProvider'
import { useSolanaWallet } from '../hooks/useSolanaWallet'
import { clearGraiStateCache } from './graiStateCache'
import {
  createGraiConnection,
  getDefaultGraiSolanaCluster,
  GraiEvmConfig,
  GraiSolanaRuntime,
  resolveGraiEvmConfig,
  resolveGraiSolanaConfig,
  resolveGraiSolanaRuntime,
  solscanTokenUrl,
  solscanTxUrl,
  solscanAccountUrl,
} from './deployments'

type GraiDeploymentContextValue = {
  chainKind: 'solana' | 'evm' | null
  solanaCluster: SolanaCluster
  solana: GraiSolanaRuntime | null
  evm: GraiEvmConfig | null
  connection: Connection | null
  isConfigured: boolean
  isProtocolResolving: boolean
  protocolError: string | null
  clusterMismatch: boolean
  solscanTokenUrl: (mint: string) => string
  solscanTxUrl: (signature: string) => string
  solscanAccountUrl: (address: string) => string
}

const GraiDeploymentContext = createContext<GraiDeploymentContextValue | undefined>(undefined)

export function GraiDeploymentProvider({ children }: { children: ReactNode }) {
  const { selectedChainType, evmChain } = useWalletContext()
  const { cluster: walletCluster, isConnected } = useSolanaWallet()

  const solanaCluster = getDefaultGraiSolanaCluster()
  const staticSolana = useMemo(() => resolveGraiSolanaConfig(solanaCluster), [solanaCluster])
  const connection = useMemo(
    () => (staticSolana ? createGraiConnection(staticSolana) : null),
    [staticSolana],
  )
  const [solana, setSolana] = useState<GraiSolanaRuntime | null>(null)
  const [isProtocolResolving, setIsProtocolResolving] = useState(false)
  const [protocolError, setProtocolError] = useState<string | null>(null)

  const evm = useMemo(() => {
    if (selectedChainType !== 'evm') return null
    const chainId =
      evmChain === 'ethereum'
        ? 1
        : evmChain === 'arbitrum'
          ? 42161
          : evmChain === 'sepolia'
            ? 11155111
            : 8453
    return resolveGraiEvmConfig(chainId)
  }, [evmChain, selectedChainType])

  const chainKind = useMemo((): GraiDeploymentContextValue['chainKind'] => {
    if (selectedChainType === 'solana' && staticSolana) return 'solana'
    if (selectedChainType === 'evm' && evm) return 'evm'
    if (staticSolana) return 'solana'
    return null
  }, [evm, selectedChainType, staticSolana])

  const clusterMismatch =
    selectedChainType === 'solana' && isConnected && walletCluster !== null && walletCluster !== solanaCluster

  useEffect(() => {
    if (!connection || !staticSolana) {
      setSolana(null)
      setProtocolError(null)
      setIsProtocolResolving(false)
      return
    }

    let cancelled = false
    setIsProtocolResolving(true)
    setProtocolError(null)
    clearGraiStateCache()

    void resolveGraiSolanaRuntime(connection, staticSolana)
      .then((runtime) => {
        if (!cancelled) {
          setSolana(runtime)
          setProtocolError(null)
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setSolana(null)
          setProtocolError(error instanceof Error ? error.message : 'Failed to resolve GRAI protocol')
        }
      })
      .finally(() => {
        if (!cancelled) setIsProtocolResolving(false)
      })

    return () => {
      cancelled = true
    }
  }, [connection, staticSolana])

  const value = useMemo<GraiDeploymentContextValue>(
    () => ({
      chainKind,
      solanaCluster,
      solana,
      evm,
      connection,
      isConfigured: chainKind === 'solana' ? solana !== null : chainKind === 'evm' ? evm !== null : false,
      isProtocolResolving,
      protocolError,
      clusterMismatch,
      solscanTokenUrl: (mint: string) => solscanTokenUrl(solanaCluster, mint),
      solscanTxUrl: (signature: string) => solscanTxUrl(solanaCluster, signature),
      solscanAccountUrl: (address: string) => solscanAccountUrl(solanaCluster, address),
    }),
    [
      chainKind,
      clusterMismatch,
      connection,
      evm,
      isProtocolResolving,
      protocolError,
      solana,
      solanaCluster,
    ],
  )

  return <GraiDeploymentContext.Provider value={value}>{children}</GraiDeploymentContext.Provider>
}

export function useGraiDeployment() {
  const context = useContext(GraiDeploymentContext)
  if (!context) {
    throw new Error('useGraiDeployment must be used within GraiDeploymentProvider')
  }
  return context
}
