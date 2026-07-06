import { erc20Abi } from 'viem'
import type { GraiEvmConfig } from '../deployments'
import type { GraiAsset } from '../knownMints'
import { formatTokenBalance } from '../onchain'
import type { GraiAssetVaultBalances } from '../fetchVaultBalances'
import { depositValue } from '../tokenomics'
import { graiAbi, priceOracleAbi } from './abi'
import { createGraiEvmPublicClient, resolveGraiContractAddress } from './client'
import { GRAI_DECIMALS_EVM, USD_SCALE_EVM } from './constants'
import { isNativeEvmAsset, resolveEvmGraiAsset } from './knownAssets'

export async function fetchEvmGraiAssets(config: GraiEvmConfig): Promise<GraiAsset[]> {
  const client = createGraiEvmPublicClient(config)
  const graiAddress = resolveGraiContractAddress(config)
  const assetAddresses = await client.readContract({
    address: graiAddress,
    abi: graiAbi,
    functionName: 'getAssets',
  })

  return assetAddresses.map((address) => resolveEvmGraiAsset(address))
}

export async function fetchEvmGraiTotalSupply(config: GraiEvmConfig) {
  const client = createGraiEvmPublicClient(config)
  const graiAddress = resolveGraiContractAddress(config)
  const [raw, decimals] = await Promise.all([
    client.readContract({
      address: graiAddress,
      abi: graiAbi,
      functionName: 'totalSupply',
    }),
    client.readContract({
      address: graiAddress,
      abi: graiAbi,
      functionName: 'decimals',
    }),
  ])

  return {
    raw,
    decimals: Number(decimals),
    label: formatTokenBalance(raw, Number(decimals), 4),
  }
}

async function readAssetDecimals(
  config: GraiEvmConfig,
  asset: `0x${string}`,
): Promise<number> {
  if (isNativeEvmAsset(asset)) return 18

  const client = createGraiEvmPublicClient(config)
  const decimals = await client.readContract({
    address: asset,
    abi: erc20Abi,
    functionName: 'decimals',
  })
  return Number(decimals)
}

async function readAssetPrice(
  config: GraiEvmConfig,
  asset: `0x${string}`,
): Promise<{ price: bigint; decimals: number }> {
  const client = createGraiEvmPublicClient(config)
  const graiAddress = resolveGraiContractAddress(config)
  const oracleAddress = await client.readContract({
    address: graiAddress,
    abi: graiAbi,
    functionName: 'oracle',
  })

  const [price, priceDecimals] = await client.readContract({
    address: oracleAddress,
    abi: priceOracleAbi,
    functionName: 'getPrice',
    args: [asset],
  })

  return { price, decimals: Number(priceDecimals) }
}

export async function fetchEvmGraiVaultBalances(
  config: GraiEvmConfig,
): Promise<Record<string, GraiAssetVaultBalances>> {
  const client = createGraiEvmPublicClient(config)
  const graiAddress = resolveGraiContractAddress(config)
  const vaults = await client.readContract({
    address: graiAddress,
    abi: graiAbi,
    functionName: 'getVaults',
  })

  const entries = await Promise.all(
    vaults.map(async (vault) => {
      const asset = vault.asset.toLowerCase()
      const decimals = await readAssetDecimals(config, vault.asset)
      let seniorUsdRaw = 0n
      let juniorUsdRaw = 0n
      let allocatedUsdRaw = 0n

      try {
        const oracle = await readAssetPrice(config, vault.asset)
        seniorUsdRaw = depositValue(vault.seniorBalance, decimals, oracle.price, oracle.decimals, USD_SCALE_EVM)
        juniorUsdRaw = depositValue(vault.juniorBalance, decimals, oracle.price, oracle.decimals, USD_SCALE_EVM)
        allocatedUsdRaw = depositValue(vault.activeAmount, decimals, oracle.price, oracle.decimals, USD_SCALE_EVM)
      } catch {
        // Price feed unavailable — USD columns stay zero.
      }

      return [
        asset,
        {
          seniorRaw: vault.seniorBalance,
          juniorRaw: vault.juniorBalance,
          allocatedRaw: vault.activeAmount,
          decimals,
          navUsdRaw: seniorUsdRaw,
          seniorUsdRaw,
          juniorUsdRaw,
          allocatedUsdRaw,
        },
      ] as const
    }),
  )

  return Object.fromEntries(entries)
}

export async function fetchEvmWalletAssetBalance(
  config: GraiEvmConfig,
  owner: `0x${string}`,
  asset: string,
): Promise<{ raw: bigint; maxRaw: bigint; decimals: number }> {
  const client = createGraiEvmPublicClient(config)
  const graiAddress = resolveGraiContractAddress(config)
  const normalizedAsset = asset.toLowerCase()

  if (normalizedAsset === graiAddress.toLowerCase()) {
    const [raw, decimals] = await Promise.all([
      client.readContract({
        address: graiAddress,
        abi: graiAbi,
        functionName: 'balanceOf',
        args: [owner],
      }),
      client.readContract({
        address: graiAddress,
        abi: graiAbi,
        functionName: 'decimals',
      }),
    ])
    const dec = Number(decimals)
    return { raw, maxRaw: raw, decimals: dec }
  }

  if (isNativeEvmAsset(normalizedAsset)) {
    const raw = await client.getBalance({ address: owner })
    const gasReserve = 500_000_000_000_000n
    const maxRaw = raw > gasReserve ? raw - gasReserve : 0n
    return { raw, maxRaw, decimals: 18 }
  }

  const assetAddress = normalizedAsset as `0x${string}`
  const [raw, decimals] = await Promise.all([
    client.readContract({
      address: assetAddress,
      abi: erc20Abi,
      functionName: 'balanceOf',
      args: [owner],
    }),
    client.readContract({
      address: assetAddress,
      abi: erc20Abi,
      functionName: 'decimals',
    }),
  ])
  const dec = Number(decimals)
  return { raw, maxRaw: raw, decimals: dec }
}

export { GRAI_DECIMALS_EVM }
