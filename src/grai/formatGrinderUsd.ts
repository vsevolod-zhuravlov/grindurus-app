export function formatGrinderUsdCompactPart(value: number): string {
  const rounded = Math.round(value * 10) / 10
  return rounded % 1 === 0 ? rounded.toFixed(0) : rounded.toFixed(1)
}

export function formatGrinderUsdTotal(value: number): string {
  if (!Number.isFinite(value) || value === 0) return '$0'

  const sign = value < 0 ? '-' : ''
  const abs = Math.abs(value)

  if (abs >= 1_000_000_000) {
    return `${sign}$${formatGrinderUsdCompactPart(abs / 1_000_000_000)}B`
  }
  if (abs >= 1_000_000) {
    return `${sign}$${formatGrinderUsdCompactPart(abs / 1_000_000)}M`
  }
  if (abs >= 1_000) {
    return `${sign}$${formatGrinderUsdCompactPart(abs / 1_000)}K`
  }

  return `${sign}$${abs.toLocaleString('en-US')}`
}

export function formatGrinderUsdExact(value: number): string {
  if (!Number.isFinite(value) || value === 0) return '$0.00'

  const sign = value < 0 ? '-' : ''
  const abs = Math.abs(value)

  return `${sign}$${abs.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

export function formatGrinderTooltipAmount(value: number): string {
  if (!Number.isFinite(value)) return '0'
  const abs = Math.abs(value)
  const maximumFractionDigits = abs >= 1_000 ? 2 : abs >= 1 ? 4 : 6
  return value.toLocaleString('en-US', { maximumFractionDigits })
}

export type GrinderTvlBreakdownRow = {
  id: string
  name: string
  balanceQuote: number
  balanceBase: number
  spotPrice: number
  tvlUsd: number
}

export type GrinderYieldBreakdownRow = {
  id: string
  name: string
  yieldQuoteValue: number
  yieldBaseValue: number
  spotPrice: number
  yieldUsd: number
}
