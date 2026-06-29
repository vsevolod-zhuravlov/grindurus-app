import { useEffect, useState } from 'react'
import type { DocumentChartTheme } from './grindurusChartTheme'

function readDocumentChartTheme(): DocumentChartTheme {
  return document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark'
}

export function useDocumentChartTheme(): DocumentChartTheme {
  const [theme, setTheme] = useState<DocumentChartTheme>(() => readDocumentChartTheme())

  useEffect(() => {
    const sync = () => setTheme(readDocumentChartTheme())
    const observer = new MutationObserver(sync)
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    return () => observer.disconnect()
  }, [])

  return theme
}
