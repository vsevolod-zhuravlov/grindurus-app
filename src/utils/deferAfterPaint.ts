/** Run `fn` after the browser has painted (next frame). */
export function deferAfterPaint(fn: () => void): () => void {
  let cancelled = false
  const frame = requestAnimationFrame(() => {
    if (!cancelled) fn()
  })
  return () => {
    cancelled = true
    cancelAnimationFrame(frame)
  }
}
