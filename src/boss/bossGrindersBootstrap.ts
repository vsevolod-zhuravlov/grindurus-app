import { bossRequestHeaders, resolveBossApiUrl } from './bossApi'
import { resolveBossFetchUrl } from './bossProbe'
import type { BossGrinderLogPayload, BossGrinderLogsSnapshot } from './types'

export type BossGrindersResponse = {
  name?: string
  grinders_max?: number
  grinders?: Record<string, BossGrinderRecord>
}

type BossBalanceBucket = {
  quote_balance?: number
  base_balance?: number
}

type BossGrinderRecord = BossGrinderLogPayload & {
  id?: string | number
  name?: string
  grinder_name?: string
  container?: unknown
  detail?: unknown
  terminal?: string
  error?: unknown
  balances?: BossBalanceBucket
  pnl?: BossBalanceBucket
  unallocated?: BossBalanceBucket
  allocated?: BossBalanceBucket
  loans?: BossBalanceBucket
  adapter_data?: {
    base_asset?: string
    quote_asset?: string
    spot_price?: number
    network?: string
    last_tx_hash?: string
  }
  last_tx_hash?: string
  network?: string
}

function readNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) return parsed
  }
  return undefined
}

function readBucketSide(bucket: BossBalanceBucket | undefined, side: 'quote' | 'base'): number | undefined {
  if (!bucket) return undefined
  return readNumber(side === 'quote' ? bucket.quote_balance : bucket.base_balance)
}

function readRecordNumber(record: BossGrinderRecord, flatKey: keyof BossGrinderLogPayload, bucket?: BossBalanceBucket, side?: 'quote' | 'base'): number | undefined {
  const flat = readNumber(record[flatKey])
  if (flat != null) return flat
  if (bucket && side) return readBucketSide(bucket, side)
  return undefined
}

function formatBossError(error: unknown): string | undefined {
  if (error == null) return undefined
  if (typeof error === 'string') return error
  if (typeof error === 'object') {
    const detail = (error as { msg?: string; detail?: string }).msg
      ?? (error as { detail?: string }).detail
    if (typeof detail === 'string') return detail
    try {
      return JSON.stringify(error)
    } catch {
      return String(error)
    }
  }
  return String(error)
}

function hasGrinderData(record: BossGrinderRecord | BossGrinderLogPayload | { error?: string }): boolean {
  if (!record || typeof record !== 'object') return false
  const r = record as BossGrinderRecord
  return (
    readNumber(r.balance_quote) != null
    || readNumber(r.balance_base) != null
    || readBucketSide(r.balances, 'quote') != null
    || readBucketSide(r.balances, 'base') != null
    || readNumber(r.pnl_quote) != null
    || readNumber(r.pnl_base) != null
    || readBucketSide(r.pnl, 'quote') != null
    || readBucketSide(r.pnl, 'base') != null
    || readNumber(r.spot_price) != null
    || readNumber(r.adapter_data?.spot_price) != null
    || Boolean(r.status)
  )
}

function isErrorOnlyPayload(payload: BossGrinderLogPayload | { error?: string } | undefined): boolean {
  return Boolean(payload && typeof payload === 'object' && 'error' in payload && !hasGrinderData(payload))
}

export function mergeBossLogsSnapshots(
  previous: BossGrinderLogsSnapshot,
  incoming: BossGrinderLogsSnapshot,
): BossGrinderLogsSnapshot {
  if (Object.keys(incoming).length === 0) return previous

  const merged: BossGrinderLogsSnapshot = { ...previous }
  for (const [bossId, payload] of Object.entries(incoming)) {
    if (!payload || typeof payload !== 'object') continue
    const prev = merged[bossId]
    if (!prev) {
      merged[bossId] = payload
      continue
    }
    if (isErrorOnlyPayload(payload) && hasGrinderData(prev)) {
      merged[bossId] = { ...prev, ...payload }
      continue
    }
    merged[bossId] = { ...prev, ...payload }
  }
  return merged
}

function recordToLogPayload(bossId: string, record: BossGrinderRecord): BossGrinderLogPayload | { error?: string } {
  const error = formatBossError(record.error ?? record.detail)
  if (error && !hasGrinderData(record)) return { error }

  const baseAsset = record.base_asset ?? record.adapter_data?.base_asset
  const quoteAsset = record.quote_asset ?? record.adapter_data?.quote_asset

  return {
    grinder_id: record.grinder_id ?? record.id ?? bossId,
    grinder_name: record.grinder_name ?? record.name,
    grinder_address: record.grinder_address,
    base_asset: baseAsset,
    quote_asset: quoteAsset,
    status: record.status,
    time: record.time,
    balance_quote: readRecordNumber(record, 'balance_quote', record.balances, 'quote'),
    balance_base: readRecordNumber(record, 'balance_base', record.balances, 'base'),
    pnl_quote: readRecordNumber(record, 'pnl_quote', record.pnl, 'quote'),
    pnl_base: readRecordNumber(record, 'pnl_base', record.pnl, 'base'),
    unalloc_quote: readRecordNumber(record, 'unalloc_quote', record.unallocated, 'quote'),
    unalloc_base: readRecordNumber(record, 'unalloc_base', record.unallocated, 'base'),
    alloc_quote: readRecordNumber(record, 'alloc_quote', record.allocated, 'quote'),
    alloc_base: readRecordNumber(record, 'alloc_base', record.allocated, 'base'),
    spot_price: record.spot_price ?? record.adapter_data?.spot_price,
    terminal: typeof record.terminal === 'string' ? record.terminal : undefined,
    network:
      typeof record.network === 'string'
        ? record.network
        : typeof record.adapter_data?.network === 'string'
          ? record.adapter_data.network
          : undefined,
    last_tx_hash:
      typeof record.last_tx_hash === 'string'
        ? record.last_tx_hash
        : typeof record.adapter_data?.last_tx_hash === 'string'
          ? record.adapter_data.last_tx_hash
          : undefined,
    ...(error ? { error } : {}),
  }
}

export function grindersResponseToLogsSnapshot(response: BossGrindersResponse): BossGrinderLogsSnapshot {
  const snapshot: BossGrinderLogsSnapshot = {}
  const grinders = response.grinders ?? {}

  for (const [key, record] of Object.entries(grinders)) {
    if (!record || typeof record !== 'object') continue
    const bossId = String(record.grinder_id ?? record.id ?? key)
    snapshot[bossId] = recordToLogPayload(bossId, record)
  }

  return snapshot
}

export type BossGrindersBootstrapResult =
  | { ok: true; snapshot: BossGrinderLogsSnapshot }
  | { ok: false }

export function bossScopeKey(baseUrl: string): string {
  try {
    return new URL(baseUrl).hostname.replace(/^www\./, '')
  } catch {
    return baseUrl.replace(/\/$/, '')
  }
}

function formatMultiBossGrinderName(bossLabel: string, grinderName: string | undefined, bossId: string): string {
  const name = grinderName?.trim() || `Grinder ${bossId}`
  return `${bossLabel} / ${name}`
}

export function scopeBossGrinderSnapshot(
  baseUrl: string,
  snapshot: BossGrinderLogsSnapshot,
  options?: { prefixNames?: boolean; bossLabel?: string },
): BossGrinderLogsSnapshot {
  const scope = bossScopeKey(baseUrl)
  const label = options?.bossLabel?.trim() || scope
  const prefixNames = options?.prefixNames ?? false
  const scoped: BossGrinderLogsSnapshot = {}

  for (const [id, payload] of Object.entries(snapshot)) {
    const key = `${scope}:${id}`
    if (!payload || typeof payload !== 'object') {
      scoped[key] = payload
      continue
    }
    if (prefixNames && !('error' in payload && Object.keys(payload).length === 1)) {
      const log = payload as BossGrinderLogPayload
      scoped[key] = {
        ...log,
        grinder_name: formatMultiBossGrinderName(label, log.grinder_name, id),
      }
      continue
    }
    scoped[key] = payload
  }

  return scoped
}

export async function fetchBossGrindersSnapshotFromUrl(
  baseUrl: string,
  signal?: AbortSignal,
): Promise<BossGrindersBootstrapResult> {
  try {
    const res = await fetch(resolveBossFetchUrl(baseUrl, '/grinders?verbose=0'), {
      signal,
      credentials: 'same-origin',
      headers: bossRequestHeaders(),
    })
    if (!res.ok) return { ok: false }

    const data = (await res.json()) as BossGrindersResponse
    const snapshot = grindersResponseToLogsSnapshot(data)
    return { ok: true, snapshot }
  } catch {
    return { ok: false }
  }
}

export async function fetchBossGrindersFromUrls(
  baseUrls: string[],
  signal?: AbortSignal,
): Promise<BossGrindersBootstrapResult> {
  if (baseUrls.length === 0) return { ok: false }

  const results = await Promise.all(
    baseUrls.map(async (baseUrl) => ({
      baseUrl,
      result: await fetchBossGrindersSnapshotFromUrl(baseUrl, signal),
    })),
  )

  let merged: BossGrinderLogsSnapshot = {}
  let anyOk = false
  const prefixNames = baseUrls.length > 1

  for (const { baseUrl, result } of results) {
    if (!result.ok) continue
    anyOk = true
    const scoped = prefixNames
      ? scopeBossGrinderSnapshot(baseUrl, result.snapshot, { prefixNames: true })
      : result.snapshot
    merged = mergeBossLogsSnapshots(merged, scoped)
  }

  return anyOk ? { ok: true, snapshot: merged } : { ok: false }
}

export function resolveBossGrinderEndpointUrls(bossUrls: string[]): string[] {
  if (bossUrls.length > 0) return bossUrls

  const configured = import.meta.env.VITE_BOSS_API_URL?.trim()
  if (configured) return [configured]

  return []
}

export async function fetchBossGrindersSnapshot(
  bossUrls: string[] = resolveBossGrinderEndpointUrls([]),
): Promise<BossGrindersBootstrapResult> {
  if (bossUrls.length > 0) {
    return fetchBossGrindersFromUrls(bossUrls)
  }

  try {
    const res = await fetch(resolveBossApiUrl('/grinders?verbose=0'), {
      credentials: 'same-origin',
      headers: bossRequestHeaders(),
    })
    if (!res.ok) return { ok: false }

    const data = (await res.json()) as BossGrindersResponse
    const snapshot = grindersResponseToLogsSnapshot(data)
    return { ok: true, snapshot }
  } catch {
    return { ok: false }
  }
}
