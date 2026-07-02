export function formatRelativeTime(isoOrDate: string | undefined): string {
  if (!isoOrDate) return '—'
  const ts = Date.parse(isoOrDate)
  if (!Number.isFinite(ts)) return '—'

  const diffSec = Math.max(0, Math.floor((Date.now() - ts) / 1000))
  if (diffSec < 60) return `${diffSec}s ago`
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`
  if (diffSec < 86_400) return `${Math.floor(diffSec / 3600)}h ago`
  return `${Math.floor(diffSec / 86_400)}d ago`
}
