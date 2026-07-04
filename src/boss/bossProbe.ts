import { bossRequestHeaders } from './bossApi'
import { fetchWithTimeout } from '../utils/fetchWithTimeout'

export type BossHealthResponse = {
  status?: string
  role?: string
}

export type BossMetaAuth = {
  'x-boss-key'?: boolean
  'x-grind-key'?: boolean
}

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
  status: 'loading' | 'ready' | 'error'
  health: string
  metaName: string
  grindersMax: string
  authLabel: string
  error?: string
}

function joinBossUrl(baseUrl: string, path: string): string {
  const normalizedBase = baseUrl.replace(/\/$/, '')
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  return `${normalizedBase}${normalizedPath}`
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
  const absolute = joinBossUrl(baseUrl, path)
  if (import.meta.env.DEV) {
    // Local Traefik cert: use Vite `/api` proxy (secure: false) instead of boss-remote.
    if (isLocalDevBoss(baseUrl)) {
      const normalizedPath = path.startsWith('/') ? path : `/${path}`
      return `/api${normalizedPath}`
    }
    return `/boss-remote?target=${encodeURIComponent(absolute)}`
  }
  return absolute
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

function formatBossAuthFromMeta(meta: BossMetaResponse | BossInfoResponse | null | undefined): string {
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

export function formatBossHealthLabel(health: BossHealthResponse | null | undefined): string {
  const status = health?.status?.trim()
  if (!status) return '—'
  const role = health?.role?.trim()
  return role ? `${status} (${role})` : status
}

export function formatBossMetaName(meta: BossMetaResponse | BossInfoResponse | null | undefined): string {
  if (!meta) return '—'
  const bossName = meta.boss_name?.trim() || ('name' in meta ? meta.name?.trim() : undefined)
  return bossName || '—'
}

export function formatBossGrindersMax(meta: BossMetaResponse | BossInfoResponse | null | undefined): string {
  if (!meta || meta.grinders_max == null) return '—'
  return String(meta.grinders_max)
}

async function fetchBossMeta(baseUrl: string, signal?: AbortSignal): Promise<BossMetaResponse | BossInfoResponse> {
  try {
    return await fetchBossJson<BossMetaResponse>(baseUrl, '/meta', signal)
  } catch {
    return fetchBossJson<BossInfoResponse>(baseUrl, '/info', signal)
  }
}

export async function probeBossEndpoint(baseUrl: string, signal?: AbortSignal): Promise<Omit<BossEndpointProbe, 'uri' | 'status'>> {
  const [healthResult, metaResult] = await Promise.allSettled([
    fetchBossJson<BossHealthResponse>(baseUrl, '/health', signal),
    fetchBossMeta(baseUrl, signal),
  ])

  const errors: string[] = []

  if (healthResult.status === 'rejected') {
    errors.push('health')
  }
  if (metaResult.status === 'rejected') {
    errors.push('meta')
  }

  const health = healthResult.status === 'fulfilled' ? formatBossHealthLabel(healthResult.value) : '—'
  const meta = metaResult.status === 'fulfilled' ? metaResult.value : null
  const metaName = formatBossMetaName(meta)
  const grindersMax = formatBossGrindersMax(meta)
  const authLabel = formatBossAuthFromMeta(meta)

  if (errors.length === 2) {
    throw new Error(`Boss unreachable (${errors.join(', ')})`)
  }

  return {
    health,
    metaName,
    grindersMax,
    authLabel,
    ...(errors.length > 0 ? { error: `Partial: ${errors.join(', ')} failed` } : {}),
  }
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
          health: '—',
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
