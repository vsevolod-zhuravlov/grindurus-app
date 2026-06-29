import type { LineData, UTCTimestamp } from 'lightweight-charts'

export function msToUtcTimestamp(ms: number): UTCTimestamp {
  return Math.floor(ms / 1000) as UTCTimestamp
}

/** Lightweight Charts requires strictly ascending unique times. */
export function toUniqueUtcLineData<T>(
  points: T[],
  getTimeMs: (p: T) => number,
  getValue: (p: T) => number
): LineData<UTCTimestamp>[] {
  const out: LineData<UTCTimestamp>[] = []
  let lastSec = -1

  for (const point of points) {
    const value = getValue(point)
    if (!Number.isFinite(value)) continue

    let sec = Math.floor(getTimeMs(point) / 1000)
    if (sec <= lastSec) sec = lastSec + 1
    lastSec = sec

    out.push({ time: sec as UTCTimestamp, value })
  }

  return out
}
