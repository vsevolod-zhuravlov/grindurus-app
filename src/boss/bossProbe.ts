import { bossRequestHeaders } from './bossApi'
import { fetchWithTimeout } from '../utils/fetchWithTimeout'
import { joinUrl } from '../utils/urlUtils'
import type { BossLogsMeta, BossMetaAuth } from './types'

export type { BossMetaAuth, BossLogsMeta }

export type BossMetaResponse = {
  boss_name?: string
  domain?: string
  grinders_max?: number
  auth?: BossMetaAuth
}

export type BossInfoResponse = {
  boss_name?: string
  name?: string
  domain?: string
  grinders_max?: number
  network_name?: string
  x_boss_key?: boolean | string
  x_grind_key?: boolean | string
}

export type BossAuthConfigResponse = BossMetaAuth & {
  description?: string
}

export type BossEndpointProbe = {
  uri: string
  status: 'idle' | 'loading' | 'ready' | 'error'
  metaName: string
  grindersMax: string
  authLabel: string
  error?: string
}

const probeCache = new Map<string, BossEndpointProbe>()
const probeListeners = new Set<() => void>()

function notifyProbeCacheChanged(): void {
  for (const listener of probeListeners) {
    listener()
  }
}

export function subscribeBossEndpointProbeCache(listener: () => void): () => void {
  probeListeners.add(listener)
  return () => probeListeners.delete(listener)
}

export function getBossEndpointProbeCache(uri: string): BossEndpointProbe | undefined {
  return probeCache.get(uri)
}

export function listBossEndpointProbeCacheKeys(): string[] {
  return [...probeCache.keys()]
}

export function clearBossEndpointProbeCacheEntry(uri: string): void {
  if (probeCache.delete(uri)) {
    notifyProbeCacheChanged()
  }
}

function joinBossUrl(baseUrl: string, path: string): string {
  return joinUrl(baseUrl, path)
}

/** Boss UI is served at `/`; FastAPI is reached via Traefik at `/api/*`. */
function resolveBossApiPath(path: string): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  return normalizedPath.startsWith('/api') ? normalizedPath : `/api${normalizedPath}`
}

const LOCAL_INSECURE_TLS_HOSTS = ['boss.localhost']

function isLocalDevBoss(baseUrl: string): boolean {
  if (!import.meta.env.DEV) return false
  try {
    const hostname = new URL(baseUrl).hostname.toLowerCase()
    return LOCAL_INSECURE_TLS_HOSTS.some(
      (rule) => hostname === rule || hostname.endsWith(`.${rule}`),
    )
  } catch {
    return false
  }
}

/** Dev: same-origin proxy. Prod: direct URL (requires boss CORS). */
export function resolveBossFetchUrl(baseUrl: string, path: string): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  if (import.meta.env.DEV) {
    if (isLocalDevBoss(baseUrl)) {
      return `/boss-local${normalizedPath}`
    }
    const apiPath = resolveBossApiPath(path)
    const absolute = joinBossUrl(baseUrl, apiPath)
    return `/boss-remote?target=${encodeURIComponent(absolute)}`
  }
  return joinBossUrl(baseUrl, resolveBossApiPath(path))
}

async function fetchBossJson<T>(baseUrl: string, path: string, signal?: AbortSignal): Promise<T> {
  const url = resolveBossFetchUrl(baseUrl, path)
  const response = await fetchWithTimeout(
    url,
    {
      signal,
      headers: {
        Accept: 'application/json',
        ...bossRequestHeaders(),
      },
    },
    5_000,
  )

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`)
  }

  return (await response.json()) as T
}

export function formatBossAuthLabel(config: BossAuthConfigResponse | BossMetaAuth | null | undefined): string {
  const labels: string[] = []
  if (config?.['x-boss-key']) labels.push('X-BOSS-KEY')
  if (config?.['x-grind-key']) labels.push('X-GRIND-KEY')
  return labels.length > 0 ? labels.join(', ') : 'Public'
}

function formatBossAuthFromMeta(meta: BossMetaResponse | BossInfoResponse | BossLogsMeta | null | undefined): string {
  if (!meta) return 'Public'
  if ('auth' in meta && meta.auth) return formatBossAuthLabel(meta.auth)
  if ('x_boss_key' in meta || 'x_grind_key' in meta) {
    return formatBossAuthLabel({
      'x-boss-key': Boolean(meta.x_boss_key),
      'x-grind-key': Boolean(meta.x_grind_key),
    })
  }
  return 'Public'
}

export function formatBossMetaName(meta: BossMetaResponse | BossInfoResponse | BossLogsMeta | null | undefined): string {
  if (!meta) return '—'
  const bossName =
    ('boss_name' in meta && meta.boss_name?.trim()) ||
    ('name' in meta && meta.name?.trim()) ||
    undefined
  return bossName || '—'
}

export function formatBossGrindersMax(meta: BossMetaResponse | BossInfoResponse | BossLogsMeta | null | undefined): string {
  if (!meta || meta.grinders_max == null) return '—'
  return String(meta.grinders_max)
}

export function endpointMetaToProbeFields(
  meta: BossLogsMeta | null | undefined,
): Omit<BossEndpointProbe, 'uri' | 'status'> {
  return {
    metaName: formatBossMetaName(meta),
    grindersMax: formatBossGrindersMax(meta),
    authLabel: formatBossAuthFromMeta(meta),
  }
}

type BossGrindersProbeResponse = BossLogsMeta & {
  grinders?: Record<string, unknown>
}

export function applyBossEndpointProbeFromMeta(uri: string, meta: BossLogsMeta | null | undefined): void {
  if (!meta) return
  probeCache.set(uri, {
    uri,
    status: 'ready',
    ...endpointMetaToProbeFields(meta),
  })
  notifyProbeCacheChanged()
}

export function clearBossEndpointProbeCache(uri?: string): void {
  if (!uri) {
    if (probeCache.size > 0) {
      probeCache.clear()
      notifyProbeCacheChanged()
    }
    return
  }

  clearBossEndpointProbeCacheEntry(uri)
}

export function setBossEndpointProbeLoading(uri: string): void {
  probeCache.set(uri, {
    uri,
    status: 'loading',
    metaName: '…',
    grindersMax: '…',
    authLabel: '…',
  })
  notifyProbeCacheChanged()
}

export function setBossEndpointProbeReady(uri: string, fields: Omit<BossEndpointProbe, 'uri' | 'status'>): void {
  probeCache.set(uri, {
    uri,
    status: 'ready',
    ...fields,
  })
  notifyProbeCacheChanged()
}

export async function probeBossEndpoint(baseUrl: string, signal?: AbortSignal): Promise<Omit<BossEndpointProbe, 'uri' | 'status'>> {
  const data = await fetchBossJson<BossGrindersProbeResponse>(baseUrl, '/grinders?verbose=0', signal)
  return endpointMetaToProbeFields(data)
}

export async function probeBossEndpoints(baseUrls: string[], signal?: AbortSignal): Promise<BossEndpointProbe[]> {
  const probes = await Promise.all(
    baseUrls.map(async (uri) => {
      try {
        const result = await probeBossEndpoint(uri, signal)
        return {
          uri,
          status: 'ready' as const,
          ...result,
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Boss unreachable'
        return {
          uri,
          status: 'error' as const,
          metaName: '—',
          grindersMax: '—',
          authLabel: '—',
          error: message,
        }
      }
    }),
  )

  return probes
}

export function applyBossEndpointProbeError(uri: string, message: string): void {
  probeCache.set(uri, {
    uri,
    status: 'error',
    metaName: '—',
    grindersMax: '—',
    authLabel: '—',
    error: message,
  })
  notifyProbeCacheChanged()
}
