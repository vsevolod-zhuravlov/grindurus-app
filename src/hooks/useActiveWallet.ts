import { useMemo } from 'react'
import { useEvmWallet } from './useEvmWallet'
import { useSolanaWallet } from './useSolanaWallet'
import { useWalletContext, ChainType } from '../providers/AppWalletProvider'

export interface ActiveWalletState {
  isConnected: boolean
  isConnecting: boolean
  address: string
  shortAddress: string
  chainType: ChainType
  networkName: string
  disconnect: () => Promise<void>
}

export function useActiveWallet(): ActiveWalletState {
  const { selectedChainType, disconnect: contextDisconnect } = useWalletContext()
  const evmWallet = useEvmWallet()
  const solanaWallet = useSolanaWallet()

  const activeWallet = useMemo((): ActiveWalletState => {
    if (selectedChainType === 'evm' && evmWallet.isConnected) {
      return {
        isConnected: true,
        isConnecting: evmWallet.isConnecting,
        address: evmWallet.address || '',
        shortAddress: evmWallet.shortAddress,
        chainType: 'evm',
        networkName: evmWallet.chainName,
        disconnect: async () => {
          await Promise.resolve(evmWallet.disconnect())
          contextDisconnect()
        },
      }
    }

    if (selectedChainType === 'solana' && solanaWallet.isConnected) {
      return {
        isConnected: true,
        isConnecting: solanaWallet.isConnecting,
        address: solanaWallet.address,
        shortAddress: solanaWallet.shortAddress,
        chainType: 'solana',
        networkName: solanaWallet.clusterName,
        disconnect: async () => {
          await solanaWallet.disconnect()
          contextDisconnect()
        },
      }
    }

    return {
      isConnected: false,
      isConnecting: evmWallet.isConnecting || solanaWallet.isConnecting,
      address: '',
      shortAddress: '',
      chainType: null,
      networkName: '',
      disconnect: async () => {},
    }
  }, [selectedChainType, evmWallet, solanaWallet, contextDisconnect])

  return activeWallet
}
