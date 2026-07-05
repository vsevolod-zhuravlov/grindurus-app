import { bossRequestHeaders, resolveBossApiUrl } from './bossApi'
import { applyBossEndpointProbeFromMeta, applyBossEndpointProbeError, resolveBossFetchUrl } from './bossProbe'
import { readNumber } from './readNumber'
import { stripTrailingSlash } from '../utils/urlUtils'
import { BOSS_LOGS_META_KEY, type BossGrinderLogPayload, type BossGrinderLogsSnapshot, type BossLogsMeta, type BossMetaAuth } from './types'

export type BossGrindersResponse = {
  name?: string
  grinders_max?: number
  auth?: BossMetaAuth
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
    address?: string
    base_asset?: string
    quote_asset?: string
    spot_price?: number
    network?: string
    last_tx_hash?: string
  }
  last_tx_hash?: string
  network?: string
}

export type BossGrinderAssetMeta = {
  base_asset?: string
  quote_asset?: string
}

function readAssetSymbol(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim()
  return trimmed || undefined
}

export function resolveGrinderAssetSymbols(record: BossGrinderRecord): {
  baseAsset?: string
  quoteAsset?: string
} {
  const adapter = record.adapter_data
  return {
    baseAsset: readAssetSymbol(record.base_asset) ?? readAssetSymbol(adapter?.base_asset),
    quoteAsset: readAssetSymbol(record.quote_asset) ?? readAssetSymbol(adapter?.quote_asset),
  }
}

export function extractGrinderAssetMetaFromGrindersResponse(
  response: BossGrindersResponse,
): Record<string, BossGrinderAssetMeta> {
  const meta: Record<string, BossGrinderAssetMeta> = {}
  for (const [key, record] of Object.entries(response.grinders ?? {})) {
    if (!record || typeof record !== 'object') continue
    const bossId = String(record.grinder_id ?? record.id ?? key)
    const symbols = resolveGrinderAssetSymbols(record)
    if (!symbols.baseAsset && !symbols.quoteAsset) continue
    meta[bossId] = {
      ...(symbols.baseAsset ? { base_asset: symbols.baseAsset } : {}),
      ...(symbols.quoteAsset ? { quote_asset: symbols.quoteAsset } : {}),
    }
  }
  return meta
}

export function scopeBossGrinderAssetMeta(
  baseUrl: string,
  meta: Record<string, BossGrinderAssetMeta>,
): Record<string, BossGrinderAssetMeta> {
  const scope = bossScopeKey(baseUrl)
  const scoped: Record<string, BossGrinderAssetMeta> = {}
  for (const [id, entry] of Object.entries(meta)) {
    scoped[`${scope}:${id}`] = entry
  }
  return scoped
}

export function mergeGrinderAssetMeta(
  previous: Record<string, BossGrinderAssetMeta>,
  incoming: Record<string, BossGrinderAssetMeta>,
): Record<string, BossGrinderAssetMeta> {
  return { ...previous, ...incoming }
}

function applyAssetMetaToLogPayload(
  payload: BossGrinderLogPayload | { error?: string },
  meta?: BossGrinderAssetMeta,
): BossGrinderLogPayload | { error?: string } {
  if (!meta || !payload || typeof payload !== 'object' || ('error' in payload && Object.keys(payload).length === 1)) {
    return payload
  }

  const log = payload as BossGrinderLogPayload
  return {
    ...log,
    base_asset: readAssetSymbol(log.base_asset) ?? meta.base_asset ?? log.base_asset,
    quote_asset: readAssetSymbol(log.quote_asset) ?? meta.quote_asset ?? log.quote_asset,
  }
}

export function resolveLogAssetSymbols(
  log: Pick<BossGrinderLogPayload, 'base_asset' | 'quote_asset'>,
  assetMeta?: BossGrinderAssetMeta,
): { baseAsset?: string; quoteAsset?: string } {
  return {
    baseAsset: readAssetSymbol(log.base_asset) ?? assetMeta?.base_asset,
    quoteAsset: readAssetSymbol(log.quote_asset) ?? assetMeta?.quote_asset,
  }
}

export function applyGrinderAssetMetaToSnapshot(
  snapshot: BossGrinderLogsSnapshot,
  assetMeta: Record<string, BossGrinderAssetMeta>,
): BossGrinderLogsSnapshot {
  if (Object.keys(assetMeta).length === 0) return snapshot

  const enriched: BossGrinderLogsSnapshot = { ...snapshot }
  const bossIds = new Set([
    ...Object.keys(enriched).filter((id) => id !== BOSS_LOGS_META_KEY),
    ...Object.keys(assetMeta),
  ])

  for (const bossId of bossIds) {
    const payload = enriched[bossId]
    if (!payload || typeof payload !== 'object') continue
    enriched[bossId] = applyAssetMetaToLogPayload(payload, assetMeta[bossId])
  }
  return enriched
}

function preserveLogAssetFields(
  previous: BossGrinderLogPayload | { error?: string },
  incoming: BossGrinderLogPayload | { error?: string },
): BossGrinderLogPayload | { error?: string } {
  const merged = { ...previous, ...incoming } as BossGrinderLogPayload
  const prevLog = previous as BossGrinderLogPayload
  const nextLog = incoming as BossGrinderLogPayload

  if (!readAssetSymbol(nextLog.base_asset) && readAssetSymbol(prevLog.base_asset)) {
    merged.base_asset = prevLog.base_asset
  }
  if (!readAssetSymbol(nextLog.quote_asset) && readAssetSymbol(prevLog.quote_asset)) {
    merged.quote_asset = prevLog.quote_asset
  }

  return merged
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
    if (bossId === BOSS_LOGS_META_KEY) continue
    if (!payload || typeof payload !== 'object') continue
    const prev = merged[bossId]
    if (!prev) {
      merged[bossId] = payload
      continue
    }
    if (isErrorOnlyPayload(payload) && hasGrinderData(prev)) {
      merged[bossId] = preserveLogAssetFields(prev, payload)
      continue
    }
    merged[bossId] = preserveLogAssetFields(prev, payload)
  }
  return merged
}

function recordToLogPayload(bossId: string, record: BossGrinderRecord): BossGrinderLogPayload | { error?: string } {
  const error = formatBossError(record.error ?? record.detail)
  if (error && !hasGrinderData(record)) return { error }

  const { baseAsset, quoteAsset } = resolveGrinderAssetSymbols(record)

  return {
    grinder_id: record.grinder_id ?? record.id ?? bossId,
    grinder_name: record.grinder_name ?? record.name,
    grinder_address: record.grinder_address ?? record.adapter_data?.address,
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

export function splitBossLogsSnapshot(
  snapshot: BossGrinderLogsSnapshot & Record<string, unknown>,
  baseUrl?: string,
): { grinderSnapshot: BossGrinderLogsSnapshot; bossMeta?: BossLogsMeta } {
  const rawMeta = snapshot[BOSS_LOGS_META_KEY]
  const grinderSnapshot = { ...snapshot } as BossGrinderLogsSnapshot & Record<string, unknown>
  delete grinderSnapshot[BOSS_LOGS_META_KEY]

  let bossMeta: BossLogsMeta | undefined
  if (rawMeta && typeof rawMeta === 'object' && ('name' in rawMeta || 'grinders_max' in rawMeta || 'auth' in rawMeta)) {
    bossMeta = rawMeta as BossLogsMeta
    if (baseUrl) applyBossEndpointProbeFromMeta(baseUrl, bossMeta)
  }

  return { grinderSnapshot, bossMeta }
}

export type BossGrindersBootstrapResult =
  | { ok: true; snapshot: BossGrinderLogsSnapshot; assetMeta: Record<string, BossGrinderAssetMeta> }
  | { ok: false }

export function bossScopeKey(baseUrl: string): string {
  try {
    return new URL(baseUrl).hostname.replace(/^www\./, '')
  } catch {
    return stripTrailingSlash(baseUrl)
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
    if (id === BOSS_LOGS_META_KEY) continue
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
    if (!res.ok) {
      applyBossEndpointProbeError(baseUrl, `HTTP ${res.status}`)
      return { ok: false }
    }

    const data = (await res.json()) as BossGrindersResponse
    applyBossEndpointProbeFromMeta(baseUrl, data)
    const snapshot = grindersResponseToLogsSnapshot(data)
    const assetMeta = extractGrinderAssetMetaFromGrindersResponse(data)
    return { ok: true, snapshot, assetMeta }
  } catch {
    applyBossEndpointProbeError(baseUrl, 'Boss unreachable')
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
  let mergedAssetMeta: Record<string, BossGrinderAssetMeta> = {}
  let anyOk = false
  const prefixNames = baseUrls.length > 1

  for (const { baseUrl, result } of results) {
    if (!result.ok) continue
    anyOk = true
    const scoped = prefixNames
      ? scopeBossGrinderSnapshot(baseUrl, result.snapshot, { prefixNames: true })
      : result.snapshot
    const scopedAssetMeta = prefixNames
      ? scopeBossGrinderAssetMeta(baseUrl, result.assetMeta)
      : result.assetMeta
    merged = mergeBossLogsSnapshots(merged, scoped)
    mergedAssetMeta = mergeGrinderAssetMeta(mergedAssetMeta, scopedAssetMeta)
  }

  return anyOk ? { ok: true, snapshot: merged, assetMeta: mergedAssetMeta } : { ok: false }
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
    const assetMeta = extractGrinderAssetMetaFromGrindersResponse(data)
    return { ok: true, snapshot, assetMeta }
  } catch {
    return { ok: false }
  }
}
