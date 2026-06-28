import { useCallback, useEffect, useState } from 'react'
import { PublicKey } from '@solana/web3.js'
import {
  fetchGrinderCustodyHoldings,
  indexGrinderCustodyHoldings,
  mergeGrinderCustodyHoldings,
  solanaClusterToCustodyNetwork,
  type NormalizedCustodyHolding,
} from '../grai/custodyHoldings'
import { grinderCustodyAddress, type GrinderConfig } from '../grai/grinders'
import {
  fetchCustodyWalletBalances,
  type CustodyAssetBalances,
} from '../grai/fetchCustodyWalletBalances'
import { useGraiDeployment } from '../grai/GraiDeploymentProvider'

export type GrinderCustodyState = {
  id: string
  name: string
  custodyWallet: PublicKey | null
  custodyWalletAddress: string
  /** Live Solana on-chain balances keyed by mint (used by allocate / distribute txs). */
  balances: Record<string, CustodyAssetBalances>
  /** Merged backend + on-chain holdings for display (multi-network ready). */
  holdings: NormalizedCustodyHolding[]
}

function toGrinderRow(grinder: GrinderConfig): GrinderCustodyState {
  const custodyWallet = parseCustodyWallet(grinder.custodyWallet)
  return {
    id: grinder.id,
    name: grinder.name,
    custodyWallet,
    custodyWalletAddress: grinderCustodyAddress(grinder, custodyWallet),
    balances: {},
    holdings: [],
  }
}

function parseCustodyWallet(value: string | undefined): PublicKey | null {
  if (!value?.trim()) return null
  try {
    return new PublicKey(value.trim())
  } catch {
    return null
  }
}

export function useGrindersCustodyBalances(grinders: GrinderConfig[]) {
  const { connection, solana, isConfigured } = useGraiDeployment()
  const [rows, setRows] = useState<GrinderCustodyState[]>(() => grinders.map(toGrinderRow))
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const backendByGrinder = indexGrinderCustodyHoldings(
        await fetchGrinderCustodyHoldings(grinders.map((grinder) => grinder.id)),
      )

      if (!connection || !solana || !isConfigured) {
        setRows(
          grinders.map((grinder) => {
            const base = toGrinderRow(grinder)
            const custodyAddress = base.custodyWalletAddress
            return {
              ...base,
              holdings: mergeGrinderCustodyHoldings({
                backendHoldings: backendByGrinder[grinder.id] ?? [],
                onChainBalances: {},
                custodyAddress,
                solanaNetwork: solanaClusterToCustodyNetwork(solana?.cluster ?? 'devnet'),
              }),
            }
          }),
        )
        return
      }

      const solanaNetwork = solanaClusterToCustodyNetwork(solana.cluster)

      const nextRows = await Promise.all(
        grinders.map(async (grinder) => {
          const custodyWallet = parseCustodyWallet(grinder.custodyWallet)
          const base = toGrinderRow(grinder)
          const custodyAddress = grinderCustodyAddress(grinder, custodyWallet)

          if (!custodyWallet) {
            return {
              ...base,
              holdings: mergeGrinderCustodyHoldings({
                backendHoldings: backendByGrinder[grinder.id] ?? [],
                onChainBalances: {},
                custodyAddress,
                solanaNetwork,
              }),
            }
          }

          const balances = await fetchCustodyWalletBalances(connection, solana, custodyWallet)
          return {
            ...base,
            custodyWallet,
            custodyWalletAddress: custodyAddress,
            balances,
            holdings: mergeGrinderCustodyHoldings({
              backendHoldings: backendByGrinder[grinder.id] ?? [],
              onChainBalances: balances,
              custodyAddress,
              solanaNetwork,
            }),
          }
        }),
      )
      setRows(nextRows)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load grinder custody balances')
    } finally {
      setIsLoading(false)
    }
  }, [connection, grinders, isConfigured, solana])

  useEffect(() => {
    void refresh()
  }, [refresh])

  return {
    rows,
    isLoading,
    error,
    refresh,
  }
}
