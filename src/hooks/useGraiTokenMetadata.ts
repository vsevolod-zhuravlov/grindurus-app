import { useEffect, useState } from 'react'
import { fetchGraiBossUrls } from '../grai/graiTokenMetadata'

type GraiTokenMetadataState =
  | { status: 'loading'; bossUrls: string[] }
  | { status: 'ready'; bossUrls: string[] }
  | { status: 'error'; bossUrls: string[]; message: string }

export function useGraiBossUrls(): GraiTokenMetadataState {
  const [state, setState] = useState<GraiTokenMetadataState>({
    status: 'loading',
    bossUrls: [],
  })

  useEffect(() => {
    const controller = new AbortController()

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
  }, [])

  return state
}
