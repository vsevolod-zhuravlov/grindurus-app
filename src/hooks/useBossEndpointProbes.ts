import { useEffect, useState } from 'react'
import { type BossEndpointProbe, probeBossEndpoints } from '../boss/bossProbe'

type BossEndpointProbesState =
  | { status: 'idle'; rows: BossEndpointProbe[] }
  | { status: 'loading'; rows: BossEndpointProbe[] }
  | { status: 'ready'; rows: BossEndpointProbe[] }

function loadingRows(bossUrls: string[]): BossEndpointProbe[] {
  return bossUrls.map((uri) => ({
    uri,
    status: 'loading',
    health: '…',
    metaName: '…',
    grindersMax: '…',
    authLabel: '…',
  }))
}

export function useBossEndpointProbes(bossUrls: string[], metadataReady: boolean): BossEndpointProbesState {
  const [state, setState] = useState<BossEndpointProbesState>({ status: 'idle', rows: [] })

  useEffect(() => {
    if (!metadataReady) {
      setState({ status: 'idle', rows: [] })
      return
    }

    if (bossUrls.length === 0) {
      setState({ status: 'ready', rows: [] })
      return
    }

    const controller = new AbortController()
    setState({ status: 'loading', rows: loadingRows(bossUrls) })

    void probeBossEndpoints(bossUrls, controller.signal)
      .then((rows) => {
        setState({ status: 'ready', rows })
      })
      .catch((error: unknown) => {
        if ((error as DOMException)?.name === 'AbortError') return
        const message = error instanceof Error ? error.message : 'Failed to probe boss endpoints'
        setState({
          status: 'ready',
          rows: bossUrls.map((uri) => ({
            uri,
            status: 'error',
            health: '—',
            metaName: '—',
            grindersMax: '—',
            authLabel: '—',
            error: message,
          })),
        })
      })

    return () => controller.abort()
  }, [bossUrls, metadataReady])

  return state
}
