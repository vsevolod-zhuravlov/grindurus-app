import { useEffect, useState } from 'react'
import { PublicKey } from '@solana/web3.js'
import { estimateGraiMintOutput } from '../grai/estimateGraiMint'
import { useGraiDeployment } from '../grai/GraiDeploymentProvider'
import { formatTokenBalance } from '../grai/onchain'
import { GRAI_DECIMALS } from '../grai/tokenomics'

export function useGraiMintEstimate(
  assetMint: string | undefined,
  amountInput: string,
  assetDecimals: number | null,
) {
  const { connection, solana, isConfigured } = useGraiDeployment()
  const [estimatedGrai, setEstimatedGrai] = useState<string | null>(null)
  const [seniorShareLabel, setSeniorShareLabel] = useState<string | null>(null)
  const [juniorShareLabel, setJuniorShareLabel] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (!assetMint || assetDecimals === null || !amountInput.trim() || !connection || !solana || !isConfigured) {
      setEstimatedGrai(null)
      setSeniorShareLabel(null)
      setJuniorShareLabel(null)
      setIsLoading(false)
      return
    }

    let cancelled = false
    const timer = window.setTimeout(() => {
      setIsLoading(true)
      void estimateGraiMintOutput(new PublicKey(assetMint), amountInput, assetDecimals, connection, solana)
        .then((estimate) => {
          if (cancelled) return
          if (estimate === null) {
            setEstimatedGrai(null)
            setSeniorShareLabel(null)
            setJuniorShareLabel(null)
            return
          }
          setEstimatedGrai(formatTokenBalance(estimate.graiRaw, GRAI_DECIMALS))
          setSeniorShareLabel(formatTokenBalance(estimate.seniorRaw, assetDecimals))
          setJuniorShareLabel(formatTokenBalance(estimate.juniorRaw, assetDecimals))
        })
        .catch(() => {
          if (!cancelled) {
            setEstimatedGrai(null)
            setSeniorShareLabel(null)
            setJuniorShareLabel(null)
          }
        })
        .finally(() => {
          if (!cancelled) setIsLoading(false)
        })
    }, 250)

    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [amountInput, assetDecimals, assetMint, connection, isConfigured, solana])

  return { estimatedGrai, seniorShareLabel, juniorShareLabel, isLoading }
}
