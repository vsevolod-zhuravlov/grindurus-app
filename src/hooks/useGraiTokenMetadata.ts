import { useEffect, useState } from 'react'
import { fetchGraiBossUrls } from '../grai/graiTokenMetadata'

export const GRAI_BOSS_METADATA_RELOAD_EVENT = 'grai-boss-metadata-reload'

type GraiTokenMetadataState =
  | { status: 'loading'; bossUrls: string[] }
  | { status: 'ready'; bossUrls: string[] }
  | { status: 'error'; bossUrls: string[]; message: string }

export function requestGraiBossMetadataReload(): void {
  window.dispatchEvent(new Event(GRAI_BOSS_METADATA_RELOAD_EVENT))
}

export function useGraiBossUrls(): GraiTokenMetadataState {
  const [state, setState] = useState<GraiTokenMetadataState>({
    status: 'loading',
    bossUrls: [],
  })
  const [reloadToken, setReloadToken] = useState(0)

  useEffect(() => {
    const onReload = () => setReloadToken((token) => token + 1)
    window.addEventListener(GRAI_BOSS_METADATA_RELOAD_EVENT, onReload)
    return () => window.removeEventListener(GRAI_BOSS_METADATA_RELOAD_EVENT, onReload)
  }, [])

  useEffect(() => {
    const controller = new AbortController()

    setState((current) => ({
      status: 'loading',
      bossUrls: current.status === 'ready' ? current.bossUrls : [],
    }))

    void fetchGraiBossUrls(controller.signal)
      .then((bossUrls) => {
        setState({ status: 'ready', bossUrls })
      })
      .catch((error: unknown) => {
        if ((error as DOMException)?.name === 'AbortError') return
        const message = error instanceof Error ? error.message : 'Failed to load GRAI metadata'
        setState({ status: 'error', bossUrls: [], message })
      })

    return () => controller.abort()
  }, [reloadToken])

  return state
}
