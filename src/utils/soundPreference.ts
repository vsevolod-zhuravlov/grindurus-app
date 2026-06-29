const STORAGE_KEY = 'sound-enabled'

export function readSoundEnabled(): boolean {
  if (typeof window === 'undefined') return true
  return localStorage.getItem(STORAGE_KEY) !== 'false'
}

export function writeSoundEnabled(enabled: boolean) {
  localStorage.setItem(STORAGE_KEY, enabled ? 'true' : 'false')
}
