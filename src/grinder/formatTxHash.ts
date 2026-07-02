export function formatTxHashShort(hash: string): string {
  const value = hash.trim()
  if (value.length <= 12) return value
  if (value.startsWith('0x')) return `${value.slice(0, 6)}…${value.slice(-4)}`
  return `${value.slice(0, 4)}…${value.slice(-4)}`
}
