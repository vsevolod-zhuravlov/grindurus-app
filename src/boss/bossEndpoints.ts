export type BossEndpointRow = {
  health: string
  metaName: string
  uri: string
  auth: 'public' | 'boss-key' | 'grind-key'
  stream?: boolean
  usedInApp?: boolean
}

export const BOSS_ENDPOINT_EXAMPLE: BossEndpointRow = {
  health: 'health',
  metaName: 'health',
  uri: '/health',
  auth: 'public',
}

export function bossEndpointAuthLabel(auth: BossEndpointRow['auth']): string {
  switch (auth) {
    case 'public':
      return 'Public'
    case 'boss-key':
      return 'X-BOSS-KEY'
    case 'grind-key':
      return 'X-GRIND-KEY'
  }
}
