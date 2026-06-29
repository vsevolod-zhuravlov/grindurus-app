import {
  ColorType,
  CrosshairMode,
  type AutoscaleInfo,
  type ChartOptions,
  type DeepPartial,
  type LineSeriesPartialOptions,
} from 'lightweight-charts'

export type DocumentChartTheme = 'light' | 'dark'

export const GRINDURUS_SERIES = {
  spot: { dark: '#ff69b4', light: '#c21875' },
  nav: { dark: '#ff69b4', light: '#c21875' },
  quote: { dark: '#22c55e', light: '#15803d' },
  base: { dark: '#60a5fa', light: '#2563eb' },
  yieldQuote: { dark: '#22c55e', light: '#15803d' },
  yieldBaseQ: { dark: '#60a5fa', light: '#2563eb' },
  yieldTotal: { dark: '#f472b6', light: '#db2777' },
} as const

function seriesColor(key: keyof typeof GRINDURUS_SERIES, theme: DocumentChartTheme): string {
  return GRINDURUS_SERIES[key][theme]
}

export function nonNegativeAutoscaleInfoProvider(
  original: () => AutoscaleInfo | null
): AutoscaleInfo | null {
  const res = original()
  if (res?.priceRange == null) return res
  return {
    ...res,
    priceRange: {
      ...res.priceRange,
      minValue: Math.max(0, res.priceRange.minValue),
    },
  }
}

export function buildGrindurusChartOptions(theme: DocumentChartTheme): DeepPartial<ChartOptions> {
  const isLight = theme === 'light'

  return {
    layout: {
      background: { type: ColorType.Solid, color: 'transparent' },
      textColor: isLight ? '#6e5a63' : '#888888',
      fontSize: 11,
      fontFamily: 'Inter, system-ui, sans-serif',
      attributionLogo: false,
    },
    grid: {
      vertLines: { color: isLight ? 'rgba(185, 21, 114, 0.1)' : 'rgba(255, 105, 180, 0.1)' },
      horzLines: { color: isLight ? 'rgba(185, 21, 114, 0.1)' : 'rgba(255, 105, 180, 0.1)' },
    },
    crosshair: {
      mode: CrosshairMode.Magnet,
      vertLine: {
        color: isLight ? 'rgba(194, 24, 117, 0.45)' : 'rgba(255, 105, 180, 0.55)',
        width: 1,
        style: 2,
        labelBackgroundColor: isLight ? '#a01366' : '#ff1493',
      },
      horzLine: {
        color: isLight ? 'rgba(194, 24, 117, 0.35)' : 'rgba(255, 105, 180, 0.45)',
        width: 1,
        style: 2,
        labelBackgroundColor: isLight ? '#a01366' : '#ff1493',
      },
    },
    rightPriceScale: {
      borderColor: isLight ? 'rgba(218, 201, 210, 0.9)' : 'rgba(255, 255, 255, 0.12)',
      scaleMargins: { top: 0.12, bottom: 0.08 },
    },
    leftPriceScale: {
      borderColor: isLight ? 'rgba(218, 201, 210, 0.9)' : 'rgba(255, 255, 255, 0.12)',
      scaleMargins: { top: 0.12, bottom: 0.08 },
    },
    timeScale: {
      borderColor: isLight ? 'rgba(218, 201, 210, 0.9)' : 'rgba(255, 255, 255, 0.12)',
      timeVisible: true,
      secondsVisible: true,
      fixLeftEdge: true,
      fixRightEdge: true,
    },
    handleScroll: { mouseWheel: true, pressedMouseMove: true },
    handleScale: { axisPressedMouseMove: true, mouseWheel: true, pinch: true },
  }
}

/** Inventory chart — single left axis in quote terms; right scale hidden. */
export function buildInventoryChartOptions(theme: DocumentChartTheme): DeepPartial<ChartOptions> {
  const base = buildGrindurusChartOptions(theme)
  return {
    ...base,
    leftPriceScale: {
      ...base.leftPriceScale,
      visible: true,
      autoScale: true,
      borderVisible: true,
      minimumWidth: 72,
    },
    rightPriceScale: {
      ...base.rightPriceScale,
      visible: false,
      autoScale: false,
      borderVisible: false,
    },
  }
}

export function buildLineSeriesOptions(
  theme: DocumentChartTheme,
  series: keyof typeof GRINDURUS_SERIES,
  extra?: LineSeriesPartialOptions
): LineSeriesPartialOptions {
  return {
    color: seriesColor(series, theme),
    lineWidth: 2,
    crosshairMarkerVisible: true,
    crosshairMarkerRadius: 4,
    crosshairMarkerBorderColor: theme === 'light' ? '#fcfafb' : '#1a1a1a',
    crosshairMarkerBackgroundColor: seriesColor(series, theme),
    priceLineVisible: false,
    lastValueVisible: true,
    ...extra,
  }
}
