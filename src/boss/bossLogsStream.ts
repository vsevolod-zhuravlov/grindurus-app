import { fetchBossGrindersSnapshot, mergeBossLogsSnapshots } from './bossGrindersBootstrap'
import { bossRequestHeaders, resolveBossApiUrl } from './bossApi'
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

class BossLogsStreamHub {
  private listeners = new Set<BossLogsListener>()
  private snapshot: BossGrinderLogsSnapshot = {}
  private abort: AbortController | null = null
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private reconnectAttempt = 0
  private started = false
  private isConnected = false
  private isReading = false
  private bootstrapped = false
  private bootstrapReachable = true

  start(): void {
    if (this.started) return
    this.started = true
    void this.startSession()
  }

  private async startSession(): Promise<void> {
    if (!this.started) return
    await this.bootstrapFromGrinders()
    await this.openConnection()
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
    if (this.isConnected) {
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
    this.isConnected = true
    for (const listener of this.listeners) {
      listener.onOpen?.()
    }
  }

  private emitError(message: string | null): void {
    this.isConnected = false
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

  private clearReconnectTimer(): void {
    if (this.reconnectTimer != null) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
  }

  private scheduleReconnect(): void {
    if (!this.started || this.reconnectTimer) return
    const delay = RECONNECT_DELAYS_MS[Math.min(this.reconnectAttempt, RECONNECT_DELAYS_MS.length - 1)]
    this.reconnectAttempt += 1
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null
      void this.openConnection()
    }, delay)
  }

  private async bootstrapFromGrinders(): Promise<void> {
    const result = await fetchBossGrindersSnapshot()
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

  private async openConnection(): Promise<void> {
    if (!this.started || this.isReading) return

    this.clearReconnectTimer()
    this.abort?.abort()
    const ac = new AbortController()
    this.abort = ac
    this.isReading = true

    try {
      const headers = new Headers(bossRequestHeaders())
      headers.set('Accept', 'text/event-stream')

      const res = await fetch(resolveBossApiUrl('/logs'), {
        signal: ac.signal,
        credentials: 'same-origin',
        headers,
      })

      if (!res.ok || !res.body) {
        throw new Error(`Boss logs stream HTTP ${res.status}`)
      }

      this.reconnectAttempt = 0
      this.emitOpen()

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (!ac.signal.aborted) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        buffer = consumeCompleteEvents(buffer, (raw) => {
          try {
            const parsed = JSON.parse(raw) as BossGrinderLogsSnapshot
            if (parsed && typeof parsed === 'object') {
              this.emitSnapshot(parsed)
            }
          } catch {
            this.emitError('Failed to parse boss log stream')
          }
        })
      }

      if (!ac.signal.aborted) {
        this.emitError(null)
        this.scheduleReconnect()
      }
    } catch (error) {
      if ((error as DOMException)?.name === 'AbortError') return
      this.emitError(null)
      this.scheduleReconnect()
    } finally {
      this.isReading = false
      if (this.abort === ac) {
        this.abort = null
      }
    }
  }
}

export const bossLogsStream = new BossLogsStreamHub()

// One app-wide stream for the whole session.
bossLogsStream.start()
