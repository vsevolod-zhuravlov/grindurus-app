import { useCallback, useState } from 'react'
import { Transaction } from '@solana/web3.js'
import { executeBurn } from '../grai/buildBurnTransaction'
import { useGraiDeployment } from '../grai/GraiDeploymentProvider'
import { useSolanaWallet } from './useSolanaWallet'

export type GraiBurnStatus = 'idle' | 'building' | 'signing' | 'confirming' | 'success' | 'error'

export function useGraiBurn() {
  const solanaWallet = useSolanaWallet()
  const { connection, solana, clusterMismatch } = useGraiDeployment()
  const [status, setStatus] = useState<GraiBurnStatus>('idle')
  const [error, setError] = useState<string | null>(null)
  const [lastSignature, setLastSignature] = useState<string | null>(null)
  const [lastAmountLabel, setLastAmountLabel] = useState<string | null>(null)

  const burn = useCallback(
    async (params: { amountInput: string }) => {
      setError(null)
      setLastSignature(null)
      setLastAmountLabel(null)

      if (!solanaWallet.publicKey) {
        solanaWallet.connect()
        throw new Error('Connect a Solana wallet to burn GRAI')
      }

      if (!solanaWallet.signTransaction) {
        throw new Error('Connected wallet cannot sign transactions')
      }

      if (!connection || !solana) {
        throw new Error('GRAI is not configured for this network')
      }

      if (clusterMismatch) {
        throw new Error(`Switch your Solana wallet to ${solana.cluster} to burn GRAI`)
      }

      const amountInput = params.amountInput.trim()
      if (!amountInput || amountInput === '0' || amountInput === '0.') {
        throw new Error('Enter an amount to burn')
      }

      const burner = solanaWallet.publicKey

      try {
        setStatus('building')
        const signTransaction = async (transaction: Transaction) => {
          setStatus('signing')
          return solanaWallet.signTransaction!(transaction)
        }

        setStatus('confirming')
        const { signature, amountLabel } = await executeBurn({
          connection,
          config: solana,
          burner,
          amountInput,
          signTransaction,
        })

        setLastSignature(signature)
        setLastAmountLabel(amountLabel)
        setStatus('success')
        return signature
      } catch (burnError) {
        const message =
          burnError instanceof Error ? burnError.message : 'Burn transaction failed'
        setError(message)
        setStatus('error')
        throw burnError
      }
    },
    [clusterMismatch, connection, solana, solanaWallet],
  )

  const reset = useCallback(() => {
    setStatus('idle')
    setError(null)
    setLastSignature(null)
    setLastAmountLabel(null)
  }, [])

  return {
    burn,
    reset,
    status,
    error,
    lastSignature,
    lastAmountLabel,
    isBurning: status === 'building' || status === 'signing' || status === 'confirming',
  }
}
