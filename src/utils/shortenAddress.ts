type ShortenAddressOptions = {
  head?: number
  tail?: number
  separator?: string
}

/** Shorten a wallet address, mint, or tx hash for display. */
export function shortenAddress(
  value: string,
  headOrOptions: number | ShortenAddressOptions = 6,
  tail = 6,
): string {
  const options: ShortenAddressOptions =
    typeof headOrOptions === 'number'
      ? { head: headOrOptions, tail }
      : headOrOptions

  const trimmed = value.trim()
  if (!trimmed) return ''

  const head = options.head ?? 6
  const separator = options.separator ?? '...'
  const resolvedTail = options.tail ?? (trimmed.startsWith('0x') ? 4 : 6)

  if (trimmed.length <= head + resolvedTail + separator.length) return trimmed

  if (trimmed.startsWith('0x')) {
    return `${trimmed.slice(0, head)}…${trimmed.slice(-resolvedTail)}`
  }

  return `${trimmed.slice(0, head)}${separator}${trimmed.slice(-resolvedTail)}`
}
