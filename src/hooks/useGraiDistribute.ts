import { useCallback } from 'react'
import { PublicKey } from '@solana/web3.js'
import { executeDistribute } from '../grai/buildDistributeTransaction'
import { useGraiTransaction, type GraiTransactionStatus } from './useGraiTransaction'

export type GraiDistributeStatus = GraiTransactionStatus

export function useGraiDistribute() {
  const { run, reset, status, error, lastSignature, isPending } = useGraiTransaction()

  const distribute = useCallback(
    async (params: { assetMint: string; amountInput: string }) => {
      const amountInput = params.amountInput.trim()
      const assetMint = new PublicKey(params.assetMint)

      const { signature } = await run({
        connectMessage: 'Connect the custody wallet to distribute yield',
        clusterAction: 'distribute yield',
        failureMessage: 'Distribute transaction failed',
        amountInput: params.amountInput,
        emptyAmountMessage: 'Enter a yield amount to distribute',
        execute: ({ connection, solana, publicKey, signTransaction }) =>
          executeDistribute({
            connection,
            config: solana,
            custodyWallet: publicKey,
            assetMint,
            amountInput,
            signTransaction,
          }),
      })

      return signature
    },
    [run],
  )

  return {
    distribute,
    reset,
    status,
    error,
    lastSignature,
    isDistributing: isPending,
  }
}
