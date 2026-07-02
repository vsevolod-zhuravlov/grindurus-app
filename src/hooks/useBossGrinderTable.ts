import { useEffect, useMemo, useState } from 'react'
import { bossLogsStream } from '../boss/bossLogsStream'
import { buildGrinderTableFromBossLogs, type GrinderTableRow, type GrinderTableSummary } from '../boss/grinderTable'
import type { BossGrinderLogsSnapshot } from '../boss/types'

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

export function useBossGrinderTable(): UseBossGrinderTableResult {
  const [snapshot, setSnapshot] = useState<BossGrinderLogsSnapshot>({})
  const [isConnected, setIsConnected] = useState(false)
  const [isBootstrapped, setIsBootstrapped] = useState(false)
  const [isBossReachable, setIsBossReachable] = useState<boolean | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    return bossLogsStream.subscribe({
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
        setIsConnected(false)
        if (message) setError(message)
      },
    })
  }, [])

  const { rows, summary } = useMemo(() => buildGrinderTableFromBossLogs(snapshot), [snapshot])

  const isLive = isBootstrapped && Object.keys(snapshot).length > 0
  const isBossUnavailable = isBootstrapped && !isLive && isBossReachable === false

  return {
    rows,
    summary,
    isConnected,
    isBootstrapped,
    isBossReachable,
    isLive,
    isBossUnavailable,
    error,
  }
}
