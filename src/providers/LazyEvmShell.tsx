import { lazy, ReactNode, Suspense } from 'react'

const EvmProvider = lazy(() => import('./EvmProvider').then((module) => ({ default: module.EvmProvider })))

type LazyEvmShellProps = {
  enabled: boolean
  rainbowKitEnabled: boolean
  onReady: () => void
  children: ReactNode
}

/** Loads wagmi / RainbowKit only when EVM wallet or backtest is needed. */
export function LazyEvmShell({ enabled, rainbowKitEnabled, onReady, children }: LazyEvmShellProps) {
  if (!enabled) return <>{children}</>

  return (
    <Suspense fallback={children}>
      <EvmProvider rainbowKitEnabled={rainbowKitEnabled} onReady={onReady}>
        {children}
      </EvmProvider>
    </Suspense>
  )
}
