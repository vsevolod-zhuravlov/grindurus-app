import { shortenAddress } from '../utils/shortenAddress'

export function formatTxHashShort(hash: string): string {
  const value = hash.trim()
  if (value.length <= 12) return value
  return shortenAddress(value)
}
