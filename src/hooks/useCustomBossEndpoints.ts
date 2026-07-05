import { useCallback, useEffect, useState } from 'react'

const CUSTOM_STORAGE_KEY = 'grai-custom-boss-endpoints'
const HIDDEN_STORAGE_KEY = 'grai-hidden-boss-endpoints'

function readStoredUrls(storageKey: string): string[] {
  try {
    const raw = localStorage.getItem(storageKey)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed.filter((value): value is string => typeof value === 'string')
  } catch {
    return []
  }
}

export function normalizeBossEndpointUrl(input: string): string | null {
  const trimmed = input.trim()
  if (!trimmed) return null

  try {
    const url = new URL(trimmed)
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null
    url.hash = ''
    url.search = ''
    const pathname = url.pathname.replace(/\/+$/, '')
    return `${url.origin}${pathname}`.replace(/\/$/, '') || url.origin
  } catch {
    return null
  }
}

export function mergeBossEndpointUrls(
  metadataUrls: string[],
  customUrls: string[],
  hiddenUrls: string[] = [],
): string[] {
  const hidden = new Set(
    hiddenUrls
      .map((uri) => normalizeBossEndpointUrl(uri))
      .filter((uri): uri is string => Boolean(uri)),
  )
  const seen = new Set<string>()
  const merged: string[] = []
  const sourceUrls = customUrls.length > 0 ? customUrls : metadataUrls

  for (const uri of sourceUrls) {
    const normalized = normalizeBossEndpointUrl(uri)
    if (!normalized || seen.has(normalized) || hidden.has(normalized)) continue
    seen.add(normalized)
    merged.push(normalized)
  }

  return merged
}

export function useCustomBossEndpoints() {
  const [customUrls, setCustomUrls] = useState<string[]>(() => readStoredUrls(CUSTOM_STORAGE_KEY))
  const [hiddenUrls, setHiddenUrls] = useState<string[]>(() => readStoredUrls(HIDDEN_STORAGE_KEY))

  useEffect(() => {
    localStorage.setItem(CUSTOM_STORAGE_KEY, JSON.stringify(customUrls))
  }, [customUrls])

  useEffect(() => {
    localStorage.setItem(HIDDEN_STORAGE_KEY, JSON.stringify(hiddenUrls))
  }, [hiddenUrls])

  const addCustomUrl = useCallback((input: string, existingUrls: string[]): string | null => {
    const normalized = normalizeBossEndpointUrl(input)
    if (!normalized) return 'Enter a valid http or https URL'
    if (existingUrls.includes(normalized)) return 'This URI is already in the list'

    setHiddenUrls((current) => current.filter((uri) => uri !== normalized))
    setCustomUrls((current) => (current.includes(normalized) ? current : [...current, normalized]))
    return null
  }, [])

  const removeUrl = useCallback((uri: string) => {
    const normalized = normalizeBossEndpointUrl(uri)
    if (!normalized) return

    setCustomUrls((current) => current.filter((entry) => entry !== normalized))
    setHiddenUrls((current) => (current.includes(normalized) ? current : [...current, normalized]))
  }, [])

  const updateUrl = useCallback((fromUri: string, toInput: string, existingUrls: string[]): string | null => {
    const from = normalizeBossEndpointUrl(fromUri)
    const to = normalizeBossEndpointUrl(toInput)
    if (!from || !to) return 'Enter a valid http or https URL'
    if (from === to) return null

    const withoutFrom = existingUrls.filter((uri) => uri !== from)
    if (withoutFrom.includes(to)) return 'This URI is already in the list'

    const fromIndex = existingUrls.indexOf(from)
    if (fromIndex < 0) return 'URI not found in the list'

    const next = [...existingUrls]
    next[fromIndex] = to
    setCustomUrls(next)
    setHiddenUrls((current) => {
      const withoutTo = current.filter((entry) => entry !== to)
      return withoutTo.includes(from) ? withoutTo : [...withoutTo, from]
    })
    return null
  }, [])

  const resetEndpointLists = useCallback(() => {
    setCustomUrls([])
    setHiddenUrls([])
    localStorage.removeItem(CUSTOM_STORAGE_KEY)
    localStorage.removeItem(HIDDEN_STORAGE_KEY)
  }, [])

  const bootstrapFromMetadata = useCallback((metadataUrls: string[]) => {
    setCustomUrls((current) => {
      if (current.length > 0) return current

      const seen = new Set<string>()
      const seeded: string[] = []

      for (const uri of metadataUrls) {
        const normalized = normalizeBossEndpointUrl(uri)
        if (!normalized || seen.has(normalized)) continue
        seen.add(normalized)
        seeded.push(normalized)
      }

      return seeded.length > 0 ? seeded : current
    })
  }, [])

  const reorderUrls = useCallback((fromIndex: number, toIndex: number, currentUrls: string[]) => {
    if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0) return
    if (fromIndex >= currentUrls.length || toIndex >= currentUrls.length) return

    const next = [...currentUrls]
    const [moved] = next.splice(fromIndex, 1)
    next.splice(toIndex, 0, moved)
    setCustomUrls(next)
  }, [])

  return {
    customUrls,
    hiddenUrls,
    addCustomUrl,
    removeUrl,
    updateUrl,
    resetEndpointLists,
    bootstrapFromMetadata,
    reorderUrls,
  }
}
