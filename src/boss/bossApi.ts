export function resolveBossApiUrl(path: string): string {
  const configured = import.meta.env.VITE_BOSS_API_URL?.trim()
  const base = configured || '/api'
  const normalizedBase = base.replace(/\/$/, '')
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  return `${normalizedBase}${normalizedPath}`
}

export function bossRequestHeaders(): Record<string, string> {
  const key = import.meta.env.VITE_BOSS_API_KEY?.trim()
  if (!key) return {}

  const headerName = (import.meta.env.VITE_BOSS_API_AUTH_HEADER?.trim() || 'x-boss-key').toLowerCase()
  return { [headerName]: key }
}
