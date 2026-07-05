import type { IncomingMessage } from 'node:http'
import type { Plugin } from 'vite'
import {
  DEFAULT_INSECURE_TLS_HOSTS,
  parseInsecureTlsHosts,
  proxyBossUpstream,
} from './bossProxyShared'

const DEFAULT_BOSS_LOCAL_TARGET = 'https://boss.localhost'

export type BossLocalProxyOptions = {
  /** Default upstream for `/boss-local/*` (FastAPI or Traefik host). */
  target?: string
  insecureTlsHosts?: string[]
}

function readBossLocalTarget(fallback: string): URL {
  const raw =
    process.env.BOSS_LOCAL_TARGET?.trim() ||
    process.env.BOSS_API_TARGET?.trim() ||
    fallback
  return new URL(raw)
}

function readBossLocalApiPath(reqUrl: string | undefined): string | null {
  if (!reqUrl) return null

  const { pathname, search } = new URL(reqUrl, 'http://localhost')
  if (pathname === '/boss-local' || pathname === '/boss-local/') {
    return `/${search}`
  }
  if (pathname.startsWith('/boss-local/')) {
    return `${pathname.slice('/boss-local'.length)}${search}`
  }
  return null
}

function isDirectBossBackend(target: URL): boolean {
  if (target.hostname === 'backend') return true
  if (target.hostname === '127.0.0.1' || target.hostname === 'localhost') return true
  const port = target.port ? Number(target.port) : target.protocol === 'https:' ? 443 : 80
  return port === 8000 || port === 8001
}

/** Map app paths to upstream paths (Traefik strips `/api`; uvicorn uses root paths). */
export function resolveBossLocalUpstreamPath(apiPath: string, target: URL): string {
  const queryIndex = apiPath.indexOf('?')
  const pathOnly = queryIndex >= 0 ? apiPath.slice(0, queryIndex) : apiPath
  const query = queryIndex >= 0 ? apiPath.slice(queryIndex) : ''
  const normalizedPath = pathOnly.startsWith('/') ? pathOnly : `/${pathOnly}`

  if (isDirectBossBackend(target)) {
    return `${normalizedPath}${query}`
  }

  if (normalizedPath === '/meta' || normalizedPath.startsWith('/auth')) {
    return `/api${normalizedPath}${query}`
  }

  return `${normalizedPath}${query}`
}

function isBossLocalPath(url: string | undefined): boolean {
  if (!url) return false
  const path = url.split('?')[0] ?? ''
  return path === '/boss-local' || path.startsWith('/boss-local/')
}

/** Dev-only proxy: `/boss-local/*` → local Boss FastAPI (paths like `/logs`, `/meta`). */
export function bossLocalProxyPlugin(options: BossLocalProxyOptions = {}): Plugin {
  const localTarget = readBossLocalTarget(options.target ?? DEFAULT_BOSS_LOCAL_TARGET)
  const insecureTlsHosts = parseInsecureTlsHosts(
    process.env.BOSS_REMOTE_INSECURE_TLS_HOSTS,
    options.insecureTlsHosts ?? DEFAULT_INSECURE_TLS_HOSTS,
  )

  return {
    name: 'boss-local-proxy',
    apply: 'serve',
    enforce: 'pre',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (!isBossLocalPath(req.url)) {
          next()
          return
        }

        const apiPath = readBossLocalApiPath(req.url)
        if (!apiPath) {
          res.statusCode = 400
          res.end('Invalid boss-local path')
          return
        }

        const upstreamPath = resolveBossLocalUpstreamPath(apiPath, localTarget)
        proxyBossUpstream(req, res, localTarget, upstreamPath, insecureTlsHosts)
      })
    },
  }
}
