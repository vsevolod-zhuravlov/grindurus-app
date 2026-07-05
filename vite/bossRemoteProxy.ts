import type { IncomingMessage, ServerResponse } from 'node:http'
import type { Plugin } from 'vite'
import {
  DEFAULT_INSECURE_TLS_HOSTS,
  parseInsecureTlsHosts,
  proxyBossUpstream,
} from './bossProxyShared'

export type BossRemoteProxyOptions = {
  /** Hosts (and their subdomains) allowed to skip TLS cert verification in dev. */
  insecureTlsHosts?: string[]
}

function readTargetUrl(req: IncomingMessage): URL | null {
  try {
    const requestUrl = new URL(req.url ?? '/', 'http://localhost')
    const target = requestUrl.searchParams.get('target')?.trim()
    if (!target) return null

    const parsed = new URL(target)
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null
    return parsed
  } catch {
    return null
  }
}

function proxyBossRemote(
  req: IncomingMessage,
  res: ServerResponse,
  insecureTlsHosts: Set<string>,
): void {
  const target = readTargetUrl(req)
  if (!target) {
    res.statusCode = 400
    res.end('Missing or invalid target query parameter')
    return
  }

  const path = `${target.pathname}${target.search}`
  proxyBossUpstream(req, res, target, path, insecureTlsHosts)
}

function isBossRemotePath(url: string | undefined): boolean {
  if (!url) return false
  const path = url.split('?')[0] ?? ''
  return path === '/boss-remote' || path === '/boss-remote/'
}

/** Dev-only proxy: `/boss-remote?target=<url>` → fetch any boss API (CORS / TLS bypass). */
export function bossRemoteProxyPlugin(options: BossRemoteProxyOptions = {}): Plugin {
  const insecureTlsHosts = parseInsecureTlsHosts(
    process.env.BOSS_REMOTE_INSECURE_TLS_HOSTS,
    options.insecureTlsHosts ?? DEFAULT_INSECURE_TLS_HOSTS,
  )

  return {
    name: 'boss-remote-proxy',
    apply: 'serve',
    enforce: 'pre',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (!isBossRemotePath(req.url)) {
          next()
          return
        }

        proxyBossRemote(req, res, insecureTlsHosts)
      })
    },
  }
}
