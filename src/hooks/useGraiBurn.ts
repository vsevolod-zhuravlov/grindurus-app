import { useCallback, useState } from 'react'
import { executeBurn } from '../grai/buildBurnTransaction'
import { useGraiTransaction, type GraiTransactionStatus } from './useGraiTransaction'

export type GraiBurnStatus = GraiTransactionStatus

export function useGraiBurn() {
  const { run, reset: resetBase, status, error, lastSignature, isPending } = useGraiTransaction()
  const [lastAmountLabel, setLastAmountLabel] = useState<string | null>(null)

  const burn = useCallback(
    async (params: { amountInput: string }) => {
      setLastAmountLabel(null)
      const amountInput = params.amountInput.trim()

      const { signature } = await run({
        connectMessage: 'Connect a Solana wallet to burn GRAI',
        clusterAction: 'burn GRAI',
        failureMessage: 'Burn transaction failed',
        amountInput: params.amountInput,
        emptyAmountMessage: 'Enter an amount to burn',
        execute: async ({ connection, solana, publicKey, signTransaction }) => {
          const result = await executeBurn({
            connection,
            config: solana,
            burner: publicKey,
            amountInput,
            signTransaction,
          })
          setLastAmountLabel(result.amountLabel)
          return result
        },
      })

      return signature
    },
    [run],
  )

  const reset = useCallback(() => {
    resetBase()
    setLastAmountLabel(null)
  }, [resetBase])

  return {
    burn,
    reset,
    status,
    error,
    lastSignature,
    lastAmountLabel,
    isBurning: isPending,
  }
}
