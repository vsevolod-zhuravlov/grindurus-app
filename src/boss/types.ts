export type BossGrinderLogPayload = {
  grinder_id?: string | number
  grinder_name?: string
  grinder_address?: string
  base_asset?: string
  quote_asset?: string
  status?: string
  time?: string
  balance_base?: number
  balance_quote?: number
  pnl_base?: number
  pnl_quote?: number
  unalloc_base?: number
  unalloc_quote?: number
  alloc_base?: number
  alloc_quote?: number
  spot_price?: number
  terminal?: string
  error?: string
}

export type BossGrinderLogsSnapshot = Record<string, BossGrinderLogPayload | { error?: string }>
