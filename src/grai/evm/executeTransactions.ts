import { getAccount, readContract, waitForTransactionReceipt, writeContract } from '@wagmi/core'
import { erc20Abi, maxUint256, parseUnits } from 'viem'
import { wagmiConfig } from '../../providers/evmConfig'
import type { GraiEvmConfig } from '../deployments'
import { formatTokenBalance, parseTokenAmount } from '../onchain'
import { graiAbi } from './abi'
import { resolveGraiContractAddress } from './client'
import { isNativeEvmAsset } from './knownAssets'

export type ExecuteEvmMintParams = {
  config: GraiEvmConfig
  assetAddress: string
  amountInput: string
  assetDecimals: number
}

export async function executeEvmMint({
  config,
  assetAddress,
  amountInput,
  assetDecimals,
}: ExecuteEvmMintParams): Promise<{ hash: string; amount: bigint }> {
  const account = getAccount(wagmiConfig)
  if (!account.address) {
    throw new Error('Connect an EVM wallet to mint GRAI')
  }

  const graiAddress = resolveGraiContractAddress(config)
  const amount = parseTokenAmount(amountInput, assetDecimals)
  const asset = assetAddress.toLowerCase() as `0x${string}`

  if (!isNativeEvmAsset(asset)) {
    const allowance = await readContract(wagmiConfig, {
      address: asset,
      abi: erc20Abi,
      functionName: 'allowance',
      args: [account.address, graiAddress],
    })

    if (allowance < amount) {
      const approveHash = await writeContract(wagmiConfig, {
        address: asset,
        abi: erc20Abi,
        functionName: 'approve',
        args: [graiAddress, maxUint256],
      })
      await waitForTransactionReceipt(wagmiConfig, { hash: approveHash })
    }
  }

  const hash = await writeContract(wagmiConfig, {
    address: graiAddress,
    abi: graiAbi,
    functionName: 'mint',
    args: [asset, amount],
    value: isNativeEvmAsset(asset) ? amount : 0n,
  })

  await waitForTransactionReceipt(wagmiConfig, { hash })
  return { hash, amount }
}

export type ExecuteEvmBurnParams = {
  config: GraiEvmConfig
  amountInput: string
  graiDecimals: number
}

export async function executeEvmBurn({
  config,
  amountInput,
  graiDecimals,
}: ExecuteEvmBurnParams): Promise<{ hash: string; amount: bigint; amountLabel: string }> {
  const account = getAccount(wagmiConfig)
  if (!account.address) {
    throw new Error('Connect an EVM wallet to burn GRAI')
  }

  const graiAddress = resolveGraiContractAddress(config)
  const graiAmount = parseTokenAmount(amountInput, graiDecimals)

  const hash = await writeContract(wagmiConfig, {
    address: graiAddress,
    abi: graiAbi,
    functionName: 'burn',
    args: [graiAmount],
  })

  await waitForTransactionReceipt(wagmiConfig, { hash })
  return {
    hash,
    amount: graiAmount,
    amountLabel: formatTokenBalance(graiAmount, graiDecimals),
  }
}

/** Parse human-readable amount to wei using viem (for consistency with ERC-20 decimals). */
export function parseEvmTokenAmount(input: string, decimals: number): bigint {
  const trimmed = input.trim()
  if (!trimmed || trimmed === '.') {
    throw new Error('Enter an amount')
  }
  return parseUnits(trimmed, decimals)
}
