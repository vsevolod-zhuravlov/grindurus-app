import { useCallback } from 'react'
import { PublicKey } from '@solana/web3.js'
import { executeMint } from '../grai/buildMintTransaction'
import { useGraiTransaction, type GraiTransactionStatus } from './useGraiTransaction'

export type GraiMintStatus = GraiTransactionStatus

export function useGraiMint() {
  const { run, reset, status, error, lastSignature, isPending } = useGraiTransaction()

  const mint = useCallback(
    async (params: { assetMint: string; amountInput: string }) => {
      const amountInput = params.amountInput.trim()
      const assetMint = new PublicKey(params.assetMint)

      const { signature } = await run({
        connectMessage: 'Connect a Solana wallet to mint GRAI',
        clusterAction: 'mint GRAI',
        failureMessage: 'Mint transaction failed',
        amountInput: params.amountInput,
        emptyAmountMessage: 'Enter an amount to mint',
        execute: ({ connection, solana, publicKey, signTransaction }) =>
          executeMint({
            connection,
            config: solana,
            minter: publicKey,
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
    mint,
    reset,
    status,
    error,
    lastSignature,
    isMinting: isPending,
  }
}
