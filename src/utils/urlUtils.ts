/** Remove a single trailing slash (empty string stays empty). */
export function stripTrailingSlash(url: string): string {
  return url.replace(/\/$/, '')
}

/** Join a base URL with a path segment, normalizing slashes. */
export function joinUrl(base: string, path: string): string {
  const normalizedBase = stripTrailingSlash(base)
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  return `${normalizedBase}${normalizedPath}`
}
