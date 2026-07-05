import { useEffect, useMemo } from 'react'
import { mergeBossEndpointUrls, useCustomBossEndpoints } from './useCustomBossEndpoints'
import { useGraiBossUrls } from './useGraiTokenMetadata'

export function useBossEndpointUrls() {
  const metadata = useGraiBossUrls()
  const {
    customUrls,
    hiddenUrls,
    addCustomUrl,
    removeUrl,
    updateUrl,
    resetEndpointLists,
    bootstrapFromMetadata,
    reorderUrls,
  } = useCustomBossEndpoints()

  const metadataUrls = metadata.status === 'ready' ? metadata.bossUrls : []
  const activeUrls = useMemo(
    () => mergeBossEndpointUrls(metadataUrls, customUrls, hiddenUrls),
    [customUrls, hiddenUrls, metadataUrls],
  )

  const isMetadataLoading = metadata.status === 'loading'
  const isMetadataReady = metadata.status === 'ready'
  const metadataError = metadata.status === 'error' ? metadata.message : null

  useEffect(() => {
    if (!isMetadataReady || customUrls.length > 0) return

    const seedUrls = mergeBossEndpointUrls(metadataUrls, [], hiddenUrls)
    if (seedUrls.length === 0) return

    bootstrapFromMetadata(seedUrls)
  }, [bootstrapFromMetadata, customUrls.length, hiddenUrls, isMetadataReady, metadataUrls])

  return {
    activeUrls,
    metadataUrls,
    customUrls,
    hiddenUrls,
    isMetadataLoading,
    isMetadataReady,
    metadataError,
    addCustomUrl,
    removeUrl,
    updateUrl,
    resetEndpointLists,
    reorderUrls,
  }
}

export type BossEndpointUrlsState = ReturnType<typeof useBossEndpointUrls>
