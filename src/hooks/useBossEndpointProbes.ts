import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  type BossEndpointProbe,
  applyBossEndpointProbeError,
  clearBossEndpointProbeCache,
  getBossEndpointProbeCache,
  listBossEndpointProbeCacheKeys,
  probeBossEndpoint,
  setBossEndpointProbeLoading,
  setBossEndpointProbeReady,
  subscribeBossEndpointProbeCache,
} from '../boss/bossProbe'
import { normalizeBossEndpointUrl } from './useCustomBossEndpoints'

function idleRow(uri: string): BossEndpointProbe {
  return {
    uri,
    status: 'idle',
    metaName: '—',
    grindersMax: '—',
    authLabel: '—',
  }
}

export { clearBossEndpointProbeCache }

export function useBossEndpointProbes(bossUrls: string[], enabled: boolean) {
  const [cacheVersion, setCacheVersion] = useState(0)
  const inflightRef = useRef<Map<string, AbortController>>(new Map())
  const bossUrlsKey = useMemo(() => bossUrls.join('\0'), [bossUrls])

  useEffect(() => subscribeBossEndpointProbeCache(() => setCacheVersion((version) => version + 1)), [])

  useEffect(() => {
    if (!enabled) return

    const activeUrls = new Set(bossUrls)

    for (const cachedUri of listBossEndpointProbeCacheKeys()) {
      if (!activeUrls.has(cachedUri)) {
        clearBossEndpointProbeCache(cachedUri)
      }
    }

    for (const [uri, controller] of inflightRef.current.entries()) {
      if (!activeUrls.has(uri)) {
        controller.abort()
        inflightRef.current.delete(uri)
      }
    }
  }, [bossUrls, bossUrlsKey, enabled])

  useEffect(
    () => () => {
      for (const controller of inflightRef.current.values()) {
        controller.abort()
      }
      inflightRef.current.clear()
    },
    [],
  )

  const probeUri = useCallback(
    (uri: string) => {
      if (!enabled) return

      inflightRef.current.get(uri)?.abort()

      const controller = new AbortController()
      inflightRef.current.set(uri, controller)
      setBossEndpointProbeLoading(uri)

      void probeBossEndpoint(uri, controller.signal)
        .then((result) => {
          if (controller.signal.aborted) return
          setBossEndpointProbeReady(uri, result)
        })
        .catch((error: unknown) => {
          if (controller.signal.aborted) return
          const message = error instanceof Error ? error.message : 'Boss unreachable'
          applyBossEndpointProbeError(uri, message)
        })
        .finally(() => {
          if (inflightRef.current.get(uri) === controller) {
            inflightRef.current.delete(uri)
          }
        })
    },
    [enabled],
  )

  const abortProbeUri = useCallback((uri: string) => {
    const normalized = normalizeBossEndpointUrl(uri)
    inflightRef.current.get(uri)?.abort()
    inflightRef.current.delete(uri)
    if (normalized) clearBossEndpointProbeCache(normalized)
  }, [])

  const rows = useMemo(
    () => bossUrls.map((uri) => getBossEndpointProbeCache(uri) ?? idleRow(uri)),
    [bossUrls, bossUrlsKey, cacheVersion],
  )

  const isLoading = enabled && rows.some((row) => row.status === 'loading')

  return {
    rows: enabled ? rows : [],
    probeUri,
    abortProbeUri,
    isLoading,
  }
}
