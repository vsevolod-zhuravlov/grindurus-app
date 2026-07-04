import {
  fetchBossGrindersSnapshot,
  mergeBossLogsSnapshots,
  resolveBossGrinderEndpointUrls,
  scopeBossGrinderSnapshot,
} from './bossGrindersBootstrap'
import { bossRequestHeaders } from './bossApi'
import { resolveBossFetchUrl } from './bossProbe'
import type { BossGrinderLogsSnapshot } from './types'

type BossLogsListener = {
  onOpen?: () => void
  onBootstrap?: (reachable: boolean) => void
  onMessage: (snapshot: BossGrinderLogsSnapshot) => void
  onError?: (message: string | null) => void
}

const RECONNECT_DELAYS_MS = [5_000, 10_000, 30_000, 60_000]

function parseSseDataBlock(block: string): string | null {
  const lines = block.split(/\r?\n/)
  const parts: string[] = []
  for (const line of lines) {
    if (!line.length || line.startsWith(':')) continue
    if (line.startsWith('data:')) {
      let rest = line.slice(5)
      if (rest.startsWith(' ')) rest = rest.slice(1)
      parts.push(rest)
    }
  }
  if (parts.length === 0) return null
  return parts.join('\n')
}

function consumeCompleteEvents(buffer: string, onMessage: (data: string) => void): string {
  let remaining = buffer
  while (true) {
    const idxLf = remaining.indexOf('\n\n')
    const idxCr = remaining.indexOf('\r\n\r\n')
    let cut = -1
    let skip = 2
    if (idxLf !== -1 && (idxCr === -1 || idxLf <= idxCr)) {
      cut = idxLf
      skip = 2
    } else if (idxCr !== -1) {
      cut = idxCr
      skip = 4
    }
    if (cut === -1) break
    const block = remaining.slice(0, cut)
    remaining = remaining.slice(cut + skip)
    const data = parseSseDataBlock(block)
    if (data != null) onMessage(data)
  }
  return remaining
}

function sameBossUrlList(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false
  return a.every((url, index) => url === b[index])
}

class BossLogsStreamHub {
  private listeners = new Set<BossLogsListener>()
  private snapshot: BossGrinderLogsSnapshot = {}
  private bossUrls: string[] = []
  private abortByBoss = new Map<string, AbortController>()
  private reconnectTimers = new Map<string, ReturnType<typeof setTimeout>>()
  private reconnectAttempts = new Map<string, number>()
  private readingBosses = new Set<string>()
  private started = false
  private connectedBosses = new Set<string>()
  private bootstrapped = false
  private bootstrapReachable = true
  private sessionGeneration = 0

  start(): void {
    if (this.started) return
    this.started = true
    void this.startSession()
  }

  setBossUrls(bossUrls: string[]): void {
    const next = resolveBossGrinderEndpointUrls(bossUrls)
    if (sameBossUrlList(this.bossUrls, next)) return
    this.bossUrls = next
    if (!this.started) return
    void this.restartSession()
  }

  private async restartSession(): Promise<void> {
    this.sessionGeneration += 1
    this.abortAllConnections()
    this.snapshot = {}
    this.bootstrapped = false
    this.bootstrapReachable = true
    this.connectedBosses.clear()
    await this.startSession()
  }

  private async startSession(): Promise<void> {
    const generation = this.sessionGeneration
    await this.bootstrapFromGrinders()
    if (generation !== this.sessionGeneration) return
    await this.openAllConnections(generation)
  }

  subscribe(listener: BossLogsListener): () => void {
    this.start()
    this.listeners.add(listener)

    if (Object.keys(this.snapshot).length > 0) {
      listener.onMessage(this.snapshot)
    }
    if (this.bootstrapped) {
      listener.onBootstrap?.(this.bootstrapReachable)
    }
    if (this.connectedBosses.size > 0) {
      listener.onOpen?.()
    }

    return () => {
      this.listeners.delete(listener)
    }
  }

  private emitBootstrap(reachable: boolean): void {
    this.bootstrapped = true
    this.bootstrapReachable = reachable
    for (const listener of this.listeners) {
      listener.onBootstrap?.(reachable)
    }
  }

  private emitOpen(): void {
    for (const listener of this.listeners) {
      listener.onOpen?.()
    }
  }

  private emitError(message: string | null): void {
    for (const listener of this.listeners) {
      listener.onError?.(message)
    }
  }

  private emitSnapshot(snapshot: BossGrinderLogsSnapshot): void {
    if (Object.keys(snapshot).length === 0) return
    this.snapshot = mergeBossLogsSnapshots(this.snapshot, snapshot)
    for (const listener of this.listeners) {
      listener.onMessage(this.snapshot)
    }
  }

  private clearReconnectTimer(baseUrl: string): void {
    const timer = this.reconnectTimers.get(baseUrl)
    if (timer != null) {
      clearTimeout(timer)
      this.reconnectTimers.delete(baseUrl)
    }
  }

  private scheduleReconnect(baseUrl: string): void {
    if (!this.started || this.reconnectTimers.has(baseUrl)) return
    const attempt = this.reconnectAttempts.get(baseUrl) ?? 0
    const delay = RECONNECT_DELAYS_MS[Math.min(attempt, RECONNECT_DELAYS_MS.length - 1)]
    this.reconnectAttempts.set(baseUrl, attempt + 1)
    const timer = setTimeout(() => {
      this.reconnectTimers.delete(baseUrl)
      void this.openConnectionForBoss(baseUrl, this.sessionGeneration)
    }, delay)
    this.reconnectTimers.set(baseUrl, timer)
  }

  private abortAllConnections(): void {
    for (const timer of this.reconnectTimers.values()) {
      clearTimeout(timer)
    }
    this.reconnectTimers.clear()
    for (const abort of this.abortByBoss.values()) {
      abort.abort()
    }
    this.abortByBoss.clear()
    this.readingBosses.clear()
    this.connectedBosses.clear()
    this.reconnectAttempts.clear()
  }

  private scopeIncomingSnapshot(baseUrl: string, snapshot: BossGrinderLogsSnapshot): BossGrinderLogsSnapshot {
    if (this.bossUrls.length <= 1) return snapshot
    return scopeBossGrinderSnapshot(baseUrl, snapshot, { prefixNames: true })
  }

  private async bootstrapFromGrinders(): Promise<void> {
    const result = await fetchBossGrindersSnapshot(this.bossUrls)
    if (result.ok) {
      if (Object.keys(result.snapshot).length > 0) {
        this.emitSnapshot(result.snapshot)
      }
      this.emitBootstrap(true)
      return
    }
    this.emitBootstrap(false)
    this.emitError('Boss API is unreachable')
  }

  private async openAllConnections(generation: number): Promise<void> {
    const urls = this.bossUrls.length > 0 ? this.bossUrls : []
    if (urls.length === 0) return
    await Promise.all(urls.map((baseUrl) => this.openConnectionForBoss(baseUrl, generation)))
  }

  private async openConnectionForBoss(baseUrl: string, generation: number): Promise<void> {
    if (!this.started || generation !== this.sessionGeneration || this.readingBosses.has(baseUrl)) return

    this.clearReconnectTimer(baseUrl)
    this.abortByBoss.get(baseUrl)?.abort()

    const ac = new AbortController()
    this.abortByBoss.set(baseUrl, ac)
    this.readingBosses.add(baseUrl)

    try {
      const headers = new Headers(bossRequestHeaders())
      headers.set('Accept', 'text/event-stream')

      const res = await fetch(resolveBossFetchUrl(baseUrl, '/logs'), {
        signal: ac.signal,
        credentials: 'same-origin',
        headers,
      })

      if (!res.ok || !res.body) {
        throw new Error(`Boss logs stream HTTP ${res.status}`)
      }

      this.reconnectAttempts.set(baseUrl, 0)
      this.connectedBosses.add(baseUrl)
      this.emitOpen()
      this.emitError(null)

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (!ac.signal.aborted && generation === this.sessionGeneration) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        buffer = consumeCompleteEvents(buffer, (raw) => {
          try {
            const parsed = JSON.parse(raw) as BossGrinderLogsSnapshot
            if (parsed && typeof parsed === 'object') {
              this.emitSnapshot(this.scopeIncomingSnapshot(baseUrl, parsed))
            }
          } catch {
            this.emitError('Failed to parse boss log stream')
          }
        })
      }

      if (!ac.signal.aborted && generation === this.sessionGeneration) {
        this.connectedBosses.delete(baseUrl)
        this.scheduleReconnect(baseUrl)
      }
    } catch (error) {
      if ((error as DOMException)?.name === 'AbortError') return
      this.connectedBosses.delete(baseUrl)
      if (generation === this.sessionGeneration) {
        this.scheduleReconnect(baseUrl)
      }
    } finally {
      this.readingBosses.delete(baseUrl)
      if (this.abortByBoss.get(baseUrl) === ac) {
        this.abortByBoss.delete(baseUrl)
      }
    }
  }
}

export const bossLogsStream = new BossLogsStreamHub()
