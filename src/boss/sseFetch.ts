export type GrinderSseSubscribeOptions = {
  enabled?: boolean
  url: string
  headers?: Record<string, string>
  onOpen?: () => void
  onMessage?: (data: string) => void
  onError?: () => void
  reconnectDelaysMs?: number[]
}

type FetchSseConnection = { close: () => void }

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

function consumeCompleteEvents(buffer: string, onMessage?: (data: string) => void): string {
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
    if (data != null) onMessage?.(data)
  }
  return remaining
}

function connectFetchSse(
  url: string,
  handlers: {
    onOpen?: () => void
    onMessage?: (data: string) => void
    onError?: () => void
    requestInit?: RequestInit
  },
): FetchSseConnection {
  const ac = new AbortController()
  const { signal } = ac

  void (async () => {
    try {
      const extraInit = handlers.requestInit ?? {}
      const headers = new Headers(extraInit.headers)
      if (!headers.has('Accept')) headers.set('Accept', 'text/event-stream')
      const res = await fetch(url, {
        ...extraInit,
        signal,
        credentials: extraInit.credentials ?? 'same-origin',
        headers,
      })
      if (!res.ok || !res.body) {
        handlers.onError?.()
        return
      }
      handlers.onOpen?.()
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      try {
        while (true) {
          const { done, value } = await reader.read()
          if (done) {
            buffer += decoder.decode()
            consumeCompleteEvents(buffer, handlers.onMessage)
            break
          }
          buffer += decoder.decode(value, { stream: true })
          buffer = consumeCompleteEvents(buffer, handlers.onMessage)
        }
      } finally {
        reader.releaseLock()
      }
      if (!signal.aborted) handlers.onError?.()
    } catch (e) {
      if ((e as DOMException)?.name === 'AbortError') return
      handlers.onError?.()
    }
  })()

  return { close: () => ac.abort() }
}

export function subscribeBossSse(options: GrinderSseSubscribeOptions): () => void {
  const {
    enabled = true,
    url,
    headers = {},
    onOpen,
    onMessage,
    onError,
    reconnectDelaysMs = [1500, 3000, 5000, 10_000, 30_000],
  } = options

  if (!enabled) return () => {}

  let closed = false
  let conn: FetchSseConnection | null = null
  let retryTimer: ReturnType<typeof setTimeout> | null = null
  let attempt = 0

  const clearRetry = () => {
    if (retryTimer != null) {
      clearTimeout(retryTimer)
      retryTimer = null
    }
  }

  const scheduleReconnect = () => {
    if (closed) return
    clearRetry()
    const delay = reconnectDelaysMs[Math.min(attempt, reconnectDelaysMs.length - 1)]
    attempt += 1
    retryTimer = setTimeout(() => {
      retryTimer = null
      connect()
    }, delay)
  }

  const connect = () => {
    if (closed) return
    conn?.close()
    conn = connectFetchSse(url, {
      requestInit: {
        headers: {
          Accept: 'text/event-stream',
          ...headers,
        },
      },
      onOpen: () => {
        attempt = 0
        onOpen?.()
      },
      onMessage,
      onError: () => {
        conn = null
        onError?.()
        scheduleReconnect()
      },
    })
  }

  connect()

  return () => {
    closed = true
    clearRetry()
    conn?.close()
    conn = null
  }
}
