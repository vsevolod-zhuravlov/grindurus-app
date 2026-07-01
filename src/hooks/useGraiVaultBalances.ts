import { useCallback, useEffect, useState } from 'react'
import { fetchGraiVaultBalances, type GraiAssetVaultBalances } from '../grai/fetchVaultBalances'
import { useGraiDeployment } from '../grai/GraiDeploymentProvider'

export function useGraiVaultBalances() {
  const { connection, solana, hasStaticConfig } = useGraiDeployment()
  const [vaultBalances, setVaultBalances] = useState<Record<string, GraiAssetVaultBalances>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!hasStaticConfig) {
      setVaultBalances({})
      setError('GRAI is not configured for this network')
      setIsLoading(false)
      return
    }
    if (!connection || !solana) {
      setIsLoading(true)
      return
    }

    setIsLoading(true)
    setError(null)
    try {
      const balances = await fetchGraiVaultBalances(connection, solana)
      setVaultBalances(balances)
    } catch (err) {
      setVaultBalances({})
      setError(err instanceof Error ? err.message : 'Failed to load vault balances')
    } finally {
      setIsLoading(false)
    }
  }, [connection, hasStaticConfig, solana])

  useEffect(() => {
    void refresh()
  }, [refresh])

  return { vaultBalances, isLoading, error, refresh }
}
