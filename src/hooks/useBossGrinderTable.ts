import { useEffect, useMemo, useState } from 'react'
import { bossLogsStream } from '../boss/bossLogsStream'
import { buildGrinderTableFromBossLogs, type GrinderTableRow, type GrinderTableSummary } from '../boss/grinderTable'
import type { BossGrinderLogsSnapshot } from '../boss/types'
import { deferAfterPaint } from '../utils/deferAfterPaint'

type UseBossGrinderTableResult = {
  rows: GrinderTableRow[]
  summary: GrinderTableSummary
  isConnected: boolean
  isBootstrapped: boolean
  isBossReachable: boolean | null
  isLive: boolean
  isBossUnavailable: boolean
  error: string | null
}

export function useBossGrinderTable(bossUrls: string[], metadataReady: boolean): UseBossGrinderTableResult {
  const [snapshot, setSnapshot] = useState<BossGrinderLogsSnapshot>({})
  const [isConnected, setIsConnected] = useState(false)
  const [isBootstrapped, setIsBootstrapped] = useState(false)
  const [isBossReachable, setIsBossReachable] = useState<boolean | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!metadataReady) return

    bossLogsStream.setBossUrls(bossUrls)

    let unsubscribe: (() => void) | undefined
    const cancelDefer = deferAfterPaint(() => {
      unsubscribe = bossLogsStream.subscribe({
        onBootstrap: (reachable) => {
          setIsBootstrapped(true)
          setIsBossReachable(reachable)
        },
        onOpen: () => {
          setIsConnected(true)
          setError(null)
        },
        onMessage: (next) => {
          setSnapshot(next)
          setError(null)
        },
        onError: (message) => {
          if (message) {
            setIsConnected(false)
            setError(message)
          }
        },
      })
    })

    return () => {
      cancelDefer()
      unsubscribe?.()
    }
  }, [bossUrls, metadataReady])

  const { rows, summary } = useMemo(() => buildGrinderTableFromBossLogs(snapshot), [snapshot])

  const isLive = isBootstrapped && Object.keys(snapshot).length > 0
  const isBossUnavailable = metadataReady && isBootstrapped && !isLive && isBossReachable === false

  return {
    rows,
    summary,
    isConnected,
    isBootstrapped: metadataReady ? isBootstrapped : false,
    isBossReachable,
    isLive,
    isBossUnavailable,
    error,
  }
}
