import type { Connection } from '@solana/web3.js'
import type { GraiSolanaConfig } from './deployments'
import { fetchGraiProtocol } from './fetchGraiProtocol'
import { formatTokenBalance } from './onchain'

export type GraiMintSupply = {
  raw: bigint
  decimals: number
  label: string
}

export async function fetchGraiMintSupply(
  connection: Connection,
  config: GraiSolanaConfig,
): Promise<GraiMintSupply> {
  const protocol = await fetchGraiProtocol(connection, config.graiMint)
  const { raw, decimals } = protocol.mintSupply

  return {
    raw,
    decimals,
    label: formatTokenBalance(raw, decimals, 4),
  }
}
