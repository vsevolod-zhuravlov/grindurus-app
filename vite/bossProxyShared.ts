import https from 'node:https'
import http from 'node:http'
import type { IncomingMessage, ServerResponse } from 'node:http'

export const DEFAULT_INSECURE_TLS_HOSTS = ['boss.localhost', 'grindurus.xyz']

export function parseInsecureTlsHosts(raw: string | undefined, fallback: string[]): Set<string> {
  const source = raw?.trim() ? raw.split(',') : fallback
  return new Set(source.map((host) => host.trim().toLowerCase()).filter(Boolean))
}

export function allowsInsecureTls(hostname: string, insecureTlsHosts: Set<string>): boolean {
  const host = hostname.toLowerCase()
  for (const rule of insecureTlsHosts) {
    if (host === rule || host.endsWith(`.${rule}`)) return true
  }
  return false
}

function createInsecureHttpsAgent(): https.Agent {
  return new https.Agent({
    rejectUnauthorized: false,
    keepAlive: false,
    maxCachedSessions: 0,
  })
}

export function buildUpstreamHeaders(req: IncomingMessage, target: URL): Record<string, string> {
  const clientAccept = req.headers.accept ? String(req.headers.accept) : ''
  const accept = clientAccept.includes('text/event-stream') ? 'text/event-stream' : 'application/json'

  const headers: Record<string, string> = {
    Accept: accept,
    host: target.host,
  }

  if (req.headers['x-boss-key']) {
    headers['x-boss-key'] = String(req.headers['x-boss-key'])
  }
  if (req.headers['x-grind-key']) {
    headers['x-grind-key'] = String(req.headers['x-grind-key'])
  }

  return headers
}

function copyUpstreamHeaders(upstreamRes: IncomingMessage, res: ServerResponse): void {
  for (const [key, value] of Object.entries(upstreamRes.headers)) {
    if (value == null) continue
    const lower = key.toLowerCase()
    if (lower === 'connection' || lower === 'transfer-encoding') continue
    res.setHeader(key, value)
  }
}

export function proxyBossUpstream(
  req: IncomingMessage,
  res: ServerResponse,
  target: URL,
  upstreamPath: string,
  insecureTlsHosts: Set<string>,
): void {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.statusCode = 405
    res.end('Method not allowed')
    return
  }

  const isHttps = target.protocol === 'https:'
  const port = target.port ? Number(target.port) : isHttps ? 443 : 80
  const agent =
    isHttps && allowsInsecureTls(target.hostname, insecureTlsHosts) ? createInsecureHttpsAgent() : undefined

  const requestOptions: https.RequestOptions = {
    protocol: target.protocol,
    hostname: target.hostname,
    port,
    path: upstreamPath,
    method: req.method ?? 'GET',
    headers: buildUpstreamHeaders(req, target),
    servername: target.hostname,
    agent,
  }

  const lib = isHttps ? https : http

  const upstreamReq = lib.request(requestOptions, (upstreamRes) => {
    res.statusCode = upstreamRes.statusCode ?? 502
    copyUpstreamHeaders(upstreamRes, res)

    if (req.method === 'HEAD') {
      upstreamRes.resume()
      res.end()
      return
    }

    upstreamRes.pipe(res)
    upstreamRes.on('error', () => {
      if (!res.headersSent) {
        res.statusCode = 502
        res.setHeader('content-type', 'application/json')
        res.end(JSON.stringify({ detail: 'Boss upstream stream failed' }))
        return
      }
      res.end()
    })
  })

  upstreamReq.on('error', (error) => {
    if (res.headersSent) {
      res.end()
      return
    }

    res.statusCode = 502
    res.setHeader('content-type', 'application/json')
    const message = error instanceof Error ? error.message : 'Boss proxy failed'
    res.end(JSON.stringify({ detail: message }))
  })

  upstreamReq.end()
}
