import { useEffect, useMemo, useState } from 'react'
import { fetchLastWalletTx, detectWalletAddressKind } from '../grinder/fetchLastWalletTx'

export type GrinderLastTxEntry =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'ready'; hash: string; explorerUrl: string }
  | { status: 'unsupported' }
  | { status: 'empty' }
  | { status: 'error' }

type GrinderLastTxRow = {
  id: string
  grinderAddress?: string
  terminal?: string
}

export function useGrinderLastTx(rows: GrinderLastTxRow[], enabled: boolean): Record<string, GrinderLastTxEntry> {
  const [state, setState] = useState<Record<string, GrinderLastTxEntry>>({})

  const rowKey = useMemo(
    () => rows.map((row) => `${row.id}:${row.grinderAddress ?? ''}:${row.terminal ?? ''}`).join('|'),
    [rows],
  )

  useEffect(() => {
    if (!enabled || rows.length === 0) {
      setState({})
      return
    }

    let cancelled = false

    const load = async () => {
      const next: Record<string, GrinderLastTxEntry> = {}

      for (const row of rows) {
        const address = row.grinderAddress?.trim()
        if (!address) {
          next[row.id] = { status: 'unsupported' }
          continue
        }
        if (detectWalletAddressKind(address) === 'unsupported') {
          next[row.id] = { status: 'unsupported' }
          continue
        }
        next[row.id] = { status: 'loading' }
      }

      if (!cancelled) setState(next)

      await Promise.all(
        rows.map(async (row) => {
          const address = row.grinderAddress?.trim()
          if (!address || detectWalletAddressKind(address) === 'unsupported') return

          try {
            const result = await fetchLastWalletTx({
              address,
              terminal: row.terminal,
            })
            if (cancelled) return
            setState((prev) => ({
              ...prev,
              [row.id]: result
                ? { status: 'ready', hash: result.hash, explorerUrl: result.explorerUrl }
                : { status: 'empty' },
            }))
          } catch {
            if (cancelled) return
            setState((prev) => ({
              ...prev,
              [row.id]: { status: 'error' },
            }))
          }
        }),
      )
    }

    void load()
    const timer = window.setInterval(() => {
      void load()
    }, 60_000)

    return () => {
      cancelled = true
      window.clearInterval(timer)
    }
  }, [enabled, rowKey, rows])

  return state
}
