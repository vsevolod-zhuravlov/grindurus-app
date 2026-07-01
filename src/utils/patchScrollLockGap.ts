const LOCK_PROPS = [
  'margin-right',
  'margin-left',
  'margin-top',
  'padding-right',
  'padding-left',
  'padding-top',
] as const

/** RainbowKit injects margin on body; html already has scrollbar-gutter: stable. */
export function patchScrollLockGap(): void {
  if (!document.body.hasAttribute('data-scroll-locked')) return
  for (const prop of LOCK_PROPS) {
    document.body.style.setProperty(prop, '0', 'important')
  }
}

export function clearScrollLockGapPatch(): void {
  for (const prop of LOCK_PROPS) {
    document.body.style.removeProperty(prop)
  }
}

/** Call once at app startup. */
export function startScrollLockGapPatch(): () => void {
  const run = () => patchScrollLockGap()

  const bodyObserver = new MutationObserver(run)
  bodyObserver.observe(document.body, {
    attributes: true,
    attributeFilter: ['data-scroll-locked', 'style'],
  })

  const headObserver = new MutationObserver(run)
  headObserver.observe(document.head, { childList: true, subtree: true })

  run()

  return () => {
    bodyObserver.disconnect()
    headObserver.disconnect()
    clearScrollLockGapPatch()
  }
}
