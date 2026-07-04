import https from 'node:https'
import http from 'node:http'
import type { IncomingMessage, ServerResponse } from 'node:http'
import type { Plugin } from 'vite'

const DEFAULT_INSECURE_TLS_HOSTS = ['boss.localhost']

export type BossRemoteProxyOptions = {
  /** Hosts (and their subdomains) allowed to skip TLS cert verification in dev. */
  insecureTlsHosts?: string[]
}

function parseInsecureTlsHosts(raw: string | undefined, fallback: string[]): Set<string> {
  const source = raw?.trim() ? raw.split(',') : fallback
  return new Set(source.map((host) => host.trim().toLowerCase()).filter(Boolean))
}

function allowsInsecureTls(hostname: string, insecureTlsHosts: Set<string>): boolean {
  const host = hostname.toLowerCase()
  for (const rule of insecureTlsHosts) {
    if (host === rule || host.endsWith(`.${rule}`)) return true
  }
  return false
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

function createInsecureHttpsAgent(): https.Agent {
  return new https.Agent({
    rejectUnauthorized: false,
    keepAlive: false,
    maxCachedSessions: 0,
  })
}

type UpstreamResponse = {
  status: number
  headers: http.IncomingHttpHeaders
  body: Buffer
}

function requestUpstream(
  target: URL,
  method: string,
  headers: Record<string, string>,
  insecureTlsHosts: Set<string>,
): Promise<UpstreamResponse> {
  const isHttps = target.protocol === 'https:'
  const port = target.port ? Number(target.port) : isHttps ? 443 : 80
  const path = `${target.pathname}${target.search}`
  const agent = isHttps && allowsInsecureTls(target.hostname, insecureTlsHosts) ? createInsecureHttpsAgent() : undefined

  const requestOptions: https.RequestOptions = {
    protocol: target.protocol,
    hostname: target.hostname,
    port,
    path,
    method,
    headers: {
      ...headers,
      host: target.host,
    },
    servername: target.hostname,
    agent,
  }

  const lib = isHttps ? https : http

  return new Promise((resolve, reject) => {
    const req = lib.request(requestOptions, (res) => {
      const chunks: Buffer[] = []
      res.on('data', (chunk) => chunks.push(Buffer.from(chunk)))
      res.on('end', () => {
        resolve({
          status: res.statusCode ?? 502,
          headers: res.headers,
          body: Buffer.concat(chunks),
        })
      })
    })

    req.on('error', reject)
    req.end()
  })
}

async function proxyBossRemote(
  req: IncomingMessage,
  res: ServerResponse,
  insecureTlsHosts: Set<string>,
): Promise<void> {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.statusCode = 405
    res.end('Method not allowed')
    return
  }

  const target = readTargetUrl(req)
  if (!target) {
    res.statusCode = 400
    res.end('Missing or invalid target query parameter')
    return
  }

  try {
    const upstream = await requestUpstream(
      target,
      req.method ?? 'GET',
      {
        Accept: 'application/json',
        ...(req.headers['x-boss-key'] ? { 'x-boss-key': String(req.headers['x-boss-key']) } : {}),
        ...(req.headers['x-grind-key'] ? { 'x-grind-key': String(req.headers['x-grind-key']) } : {}),
      },
      insecureTlsHosts,
    )

    res.statusCode = upstream.status
    const contentType = upstream.headers['content-type']
    if (contentType) res.setHeader('content-type', String(contentType))

    if (req.method === 'HEAD') {
      res.end()
      return
    }

    res.end(upstream.body)
  } catch (error) {
    res.statusCode = 502
    res.setHeader('content-type', 'application/json')
    const message = error instanceof Error ? error.message : 'Boss proxy failed'
    res.end(JSON.stringify({ detail: message }))
  }
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
      // Pre middleware: must run before Vite SPA fallback serves index.html.
      server.middlewares.use((req, res, next) => {
        if (!isBossRemotePath(req.url)) {
          next()
          return
        }

        void proxyBossRemote(req, res, insecureTlsHosts)
      })
    },
  }
}
