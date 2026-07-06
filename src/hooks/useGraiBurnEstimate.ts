import { useEffect, useState } from 'react'
import { estimateEvmGraiBurnOutputs } from '../grai/evm/estimateBurn'
import { GRAI_DECIMALS_EVM } from '../grai/evm/constants'
import { estimateGraiBurnOutputs, type GraiBurnOutputEstimate } from '../grai/estimateGraiBurn'
import { useGraiDeployment } from '../grai/GraiDeploymentProvider'
import { GRAI_DECIMALS } from '../grai/tokenomics'

export function useGraiBurnEstimate(graiAmountInput: string, enabled: boolean) {
  const { connection, solana, evm, chainKind, isConfigured } = useGraiDeployment()
  const [burnOutputs, setBurnOutputs] = useState<GraiBurnOutputEstimate[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const graiDecimals = chainKind === 'evm' ? GRAI_DECIMALS_EVM : GRAI_DECIMALS

  useEffect(() => {
    if (!enabled || !graiAmountInput.trim() || !isConfigured) {
      setBurnOutputs([])
      setIsLoading(false)
      return
    }

    const isSolanaReady = chainKind === 'solana' && connection && solana
    const isEvmReady = chainKind === 'evm' && evm
    if (!isSolanaReady && !isEvmReady) {
      setBurnOutputs([])
      setIsLoading(false)
      return
    }

    let cancelled = false
    const timer = window.setTimeout(() => {
      setIsLoading(true)
      const estimatePromise =
        chainKind === 'evm' && evm
          ? estimateEvmGraiBurnOutputs(evm, graiAmountInput, graiDecimals)
          : estimateGraiBurnOutputs(graiAmountInput, graiDecimals, connection!, solana!)

      void estimatePromise
        .then((outputs) => {
          if (cancelled) return
          setBurnOutputs(outputs ?? [])
        })
        .catch(() => {
          if (!cancelled) setBurnOutputs([])
        })
        .finally(() => {
          if (!cancelled) setIsLoading(false)
        })
    }, 250)

    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [chainKind, connection, enabled, evm, graiAmountInput, graiDecimals, isConfigured, solana])

  return { burnOutputs, isLoading }
}
