import { useCallback, useEffect, useMemo, useState, lazy, Suspense } from 'react'
import { WalletNetworkSelect } from '../WalletNetworkSelect'
import { useActiveWallet } from '../../hooks/useActiveWallet'
import { useBossGrinderTable } from '../../hooks/useBossGrinderTable'
import { useBossEndpointUrls } from '../../hooks/useBossEndpointUrls'
import { useGrinderLastTx } from '../../hooks/useGrinderLastTx'
import { useWalletContext } from '../../providers/AppWalletProvider'
import { summarizeGrinderTableRows } from '../../boss/grinderTable'
import { grinderRowMatchesCaip2Network } from '../../wallet/caip2Network'
import { assetUrl, toAppPath } from '../../utils/appPaths'
import { navigateToGraiSection } from '../../utils/graiNavigation'
import {
  GraiGrinderCountValue,
  GraiGrinderLastTxCell,
  GraiGrinderTableName,
  GraiGrinderTvlValue,
  GraiGrinderYieldValue,
  GraiGrindersSummaryConnectButton,
} from './GraiGrinderCells'
import { GraiFieldInfoButton, GraiGrindersTotalLabel } from './GraiFieldInfo'
import {
  GRINDERS_COLUMN_ICONS,
  GRINDER_TVL_INFO_HINT,
  GRINDER_UPTIME_INFO_HINT,
  GRINDER_YIELD_INFO_HINT,
} from './graiPageIcons'

const BossEndpointsTable = lazy(() =>
  import('../BossEndpointsTable').then((m) => ({ default: m.BossEndpointsTable })),
)

export function GraiGrindersSection() {
  const { openChainSelector } = useWalletContext()
  const activeWallet = useActiveWallet()
  const [isGrindersTableHidden, setIsGrindersTableHidden] = useState(true)
  const [isGrindersFilterEnabled, setIsGrindersFilterEnabled] = useState(false)
  const [isBossEndpointsOpen, setIsBossEndpointsOpen] = useState(false)
  const [copiedGrinderId, setCopiedGrinderId] = useState<string | null>(null)
  const bossEndpoints = useBossEndpointUrls()
  const {
    rows: grinderRows,
    isLive: isBossGrinderLive,
    isBootstrapped: isBossGrinderBootstrapped,
    isBossUnavailable,
  } = useBossGrinderTable(bossEndpoints.activeUrls, bossEndpoints.isMetadataReady)
  const walletNetworkCaip2 = activeWallet.networkCaip2
  const isGrindersNetworkFilterActive = isGrindersFilterEnabled && Boolean(walletNetworkCaip2)
  const displayGrinderRows = useMemo(() => {
    if (!isGrindersNetworkFilterActive || !walletNetworkCaip2) return grinderRows
    return grinderRows.filter((row) => grinderRowMatchesCaip2Network(row, walletNetworkCaip2))
  }, [grinderRows, isGrindersNetworkFilterActive, walletNetworkCaip2])
  const displayGrinderSummary = useMemo(
    () => summarizeGrinderTableRows(displayGrinderRows),
    [displayGrinderRows],
  )
  const grinderLastTx = useGrinderLastTx(displayGrinderRows, isBossGrinderLive)
  const isBossGrinderLoading = !isBossGrinderBootstrapped
  const grinderTotalCount = displayGrinderSummary.totalCount
  const grinderActiveCount = displayGrinderSummary.activeCount
  const grinderTvlUsd = displayGrinderSummary.tvlUsd
  const grinderYieldUsd = displayGrinderSummary.yieldUsd
  const isGrinderNetworkConnected = activeWallet.isConnected && Boolean(walletNetworkCaip2)
  const grinderUptimeLabel = isBossGrinderLive ? '99.999%' : '—'
  const toggleGrindersFilter = useCallback(() => {
    setIsGrindersFilterEnabled((enabled) => !enabled)
  }, [])
  const toggleBossEndpoints = useCallback(() => {
    setIsBossEndpointsOpen((open) => !open)
  }, [])
  const showGrindersTotalLabels = !isGrindersFilterEnabled
  const copyGrinderTableAddress = useCallback(async (address: string, grinderId: string) => {
    try {
      await navigator.clipboard.writeText(address)
      setCopiedGrinderId(grinderId)
      window.setTimeout(() => setCopiedGrinderId(null), 1500)
    } catch {
      // ignore clipboard errors
    }
  }, [])

  const [isCompactGrindersLayout, setIsCompactGrindersLayout] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(max-width: 1024px)').matches,
  )

  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 1024px)')
    const onChange = () => setIsCompactGrindersLayout(mediaQuery.matches)
    mediaQuery.addEventListener('change', onChange)
    return () => mediaQuery.removeEventListener('change', onChange)
  }, [])

  const grinderNetworkAction = isGrinderNetworkConnected ? (
    <WalletNetworkSelect variant="compact" ariaLabel="Select wallet network" />
  ) : (
    <GraiGrindersSummaryConnectButton onConnect={openChainSelector} />
  )

  return (
    <div className="grai-bottom-row">
      <div className="grai-grinders-summary-shell" id="grai-grinders-summary">
        <div className="grai-grinders-summary-toolbar">
          {isCompactGrindersLayout ? (
            <>
              <div className="grai-grinders-summary-toolbar-top">
                <button
                  type="button"
                  className={`grai-page-endpoints-btn grai-grinders-summary-endpoints-btn${isBossEndpointsOpen ? ' is-active' : ' is-collapsed'}`}
                  onClick={(event) => {
                    event.stopPropagation()
                    toggleBossEndpoints()
                  }}
                  aria-expanded={isBossEndpointsOpen}
                  aria-controls="grai-boss-endpoints-panel"
                  aria-label="Boss API endpoints"
                >
                  <svg
                    className="grai-page-endpoints-btn-icon"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                  endpoints
                </button>
              </div>
              <div className="grai-grinders-summary-toolbar-bottom">
                <button
                  type="button"
                  role="switch"
                  className={`grai-grinders-filter-toggle${isGrindersFilterEnabled ? ' is-active' : ''}`}
                  onClick={toggleGrindersFilter}
                  aria-checked={isGrindersFilterEnabled}
                  aria-label={
                    isGrindersFilterEnabled ? 'Disable grinder network filter' : 'Enable grinder network filter'
                  }
                >
                  <span className="grai-grinders-filter-toggle-stack" aria-hidden="true">
                    <span className="grai-grinders-filter-toggle-caption grai-grinders-filter-toggle-caption--all">
                      TOTAL
                    </span>
                    <span className="grai-grinders-filter-toggle-track">
                      <span className="grai-grinders-filter-toggle-thumb" />
                    </span>
                    <span className="grai-grinders-filter-toggle-caption grai-grinders-filter-toggle-caption--network">
                      BY NETWORK
                    </span>
                  </span>
                </button>
                <span className="grai-grinders-summary-toolbar-network">
                  <span className="grai-grinders-network-action">{grinderNetworkAction}</span>
                </span>
              </div>
            </>
          ) : (
            <>
              <button
                type="button"
                role="switch"
                className={`grai-grinders-filter-toggle${isGrindersFilterEnabled ? ' is-active' : ''}`}
                onClick={toggleGrindersFilter}
                aria-checked={isGrindersFilterEnabled}
                aria-label={
                  isGrindersFilterEnabled ? 'Disable grinder network filter' : 'Enable grinder network filter'
                }
              >
                <span className="grai-grinders-filter-toggle-stack" aria-hidden="true">
                  <span className="grai-grinders-filter-toggle-caption grai-grinders-filter-toggle-caption--all">
                    TOTAL
                  </span>
                  <span className="grai-grinders-filter-toggle-track">
                    <span className="grai-grinders-filter-toggle-thumb" />
                  </span>
                  <span className="grai-grinders-filter-toggle-caption grai-grinders-filter-toggle-caption--network">
                    BY NETWORK
                  </span>
                </span>
              </button>
              <div className="grai-grinders-summary-toolbar-actions">
                <button
                  type="button"
                  className={`grai-page-endpoints-btn grai-grinders-summary-endpoints-btn${isBossEndpointsOpen ? ' is-active' : ' is-collapsed'}`}
                  onClick={(event) => {
                    event.stopPropagation()
                    toggleBossEndpoints()
                  }}
                  aria-expanded={isBossEndpointsOpen}
                  aria-controls="grai-boss-endpoints-panel"
                  aria-label="Boss API endpoints"
                >
                  <svg
                    className="grai-page-endpoints-btn-icon"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                  endpoints
                </button>
              </div>
            </>
          )}
        </div>
        <div
          id="grai-boss-endpoints-panel"
          className={`grai-boss-endpoints-panel${isBossEndpointsOpen ? ' is-open' : ''}`}
          aria-hidden={!isBossEndpointsOpen}
        >
          <div className="grai-boss-endpoints-panel-inner">
            {isBossEndpointsOpen ? (
              <Suspense fallback={<span className="grai-boss-endpoints-status">Loading endpoints…</span>}>
                <BossEndpointsTable endpoints={bossEndpoints} />
              </Suspense>
            ) : null}
          </div>
        </div>
        <div className="grai-grinders-row grai-grinders-row--group grai-grinders-row--summary" role="row">
          {!isCompactGrindersLayout ? (
          <span
            role="columnheader"
            className="grai-grinders-group-title is-network is-stacked grai-grinders-network-slot--desktop"
          >
            <span className="grai-grinders-network-main">
              <span className="grai-grinders-network-action">{grinderNetworkAction}</span>
            </span>
          </span>
          ) : null}
          <span role="columnheader" className="grai-grinders-group-general is-stacked grai-grinders-summary-general">
            <span className="grai-grinders-group-general-top">
              <span
                className={`grai-grinder-active-dot${isBossGrinderLive ? '' : ' is-inactive'}`}
                aria-hidden="true"
              />
              <span className="grai-grinders-live-label grai-grinders-summary-mini-label">LIVE</span>
            </span>
            {isBossGrinderLoading || isBossUnavailable ? (
              <span className="grai-grinders-group-general-value grai-grinders-group-general-value--placeholder">
                {isBossGrinderLoading ? '…' : '—'}
              </span>
            ) : (
              <GraiGrinderCountValue
                active={grinderActiveCount}
                total={grinderTotalCount}
                isLive={isBossGrinderLive}
                isBossUnavailable={isBossUnavailable}
              />
            )}
          </span>
          <span role="columnheader" className="grai-grinders-group-title is-uptime is-stacked" style={{ gridColumn: 3 }}>
            <GraiFieldInfoButton
              className="grai-grinders-group-title-label"
              hint={GRINDER_UPTIME_INFO_HINT}
              ariaLabel="What grinder uptime means"
              structured
            >
              <span className="grai-grinders-group-title-icon" aria-hidden="true">
                {GRINDERS_COLUMN_ICONS.lastActionTime}
              </span>
              UPTIME
            </GraiFieldInfoButton>
            {isBossGrinderLoading || isBossUnavailable ? (
              <span className="grai-grinders-group-title-value grai-grinders-group-title-value--placeholder">
                {isBossGrinderLoading ? '…' : '—'}
              </span>
            ) : (
              <span className="grai-grinders-group-title-value">{grinderUptimeLabel}</span>
            )}
          </span>
          <span role="columnheader" className="grai-grinders-group-title is-tvl is-stacked" style={{ gridColumn: '4 / span 2' }}>
            <GraiFieldInfoButton
              className="grai-grinders-group-title-label"
              hint={GRINDER_TVL_INFO_HINT}
              ariaLabel="How value locked is calculated"
              structured
            >
              <span className="grai-grinders-group-title-icon" aria-hidden="true">
                {GRINDERS_COLUMN_ICONS.quote}
              </span>
              <GraiGrindersTotalLabel showTotal={showGrindersTotalLabels} rest="VALUE LOCKED" />
            </GraiFieldInfoButton>
            {isBossGrinderLoading || isBossUnavailable ? (
              <span className="grai-grinders-group-title-value grai-grinders-group-title-value--placeholder">
                {isBossGrinderLoading ? '…' : '—'}
              </span>
            ) : (
              <GraiGrinderTvlValue totalUsd={grinderTvlUsd} rows={isBossGrinderLive ? displayGrinderRows : []} />
            )}
          </span>
          <span role="columnheader" className="grai-grinders-group-title is-yield is-stacked" style={{ gridColumn: '6 / span 2' }}>
            <GraiFieldInfoButton
              className="grai-grinders-group-title-label"
              hint={GRINDER_YIELD_INFO_HINT}
              ariaLabel="How yield is calculated"
              structured
            >
              <span className="grai-grinders-group-title-icon" aria-hidden="true">
                {GRINDERS_COLUMN_ICONS.yieldQuote}
              </span>
              <GraiGrindersTotalLabel showTotal={showGrindersTotalLabels} rest="YIELD" />
            </GraiFieldInfoButton>
            {isBossGrinderLoading || isBossUnavailable ? (
              <span className="grai-grinders-group-title-value grai-grinders-group-title-value--placeholder">
                {isBossGrinderLoading ? '…' : '—'}
              </span>
            ) : (
              <GraiGrinderYieldValue totalUsd={grinderYieldUsd} rows={isBossGrinderLive ? displayGrinderRows : []} />
            )}
          </span>
        </div>
        <section
          className={`grai-bottom-card grai-bottom-card--table grai-grinders-table-panel${isGrindersTableHidden ? '' : ' is-open'}`}
          aria-hidden={isGrindersTableHidden}
          aria-label="Grinders in system"
        >
          <div className="grai-grinders-table-panel-inner">
            {isBossGrinderLoading ? (
              <p className="grai-grinders-boss-status" role="status">
                Loading grinder data from Boss…
              </p>
            ) : isBossUnavailable ? (
              <p className="grai-grinders-boss-status is-unavailable" role="status">
                Boss API is unreachable. Grinders data is unavailable. Funds is saved by Custodies
              </p>
            ) : (
              <div
                className="grai-grinders-table"
                id="grai-grinders-table"
                role="table"
                aria-label="Grinders table"
              >
                <div className="grai-grinders-row grai-grinders-row--head" role="row">
                  <span role="columnheader" className="grai-grinders-col-head is-last-action-kind">
                    <span className="grai-grinders-col-head-inner">
                      <span className="grai-grinders-col-icon">{GRINDERS_COLUMN_ICONS.lastAction}</span>
                      <span className="grai-grinders-col-head-label">Last tx</span>
                    </span>
                  </span>
                  <span role="columnheader" className="grai-grinders-col-grinder" aria-label="Grinder">
                    <a
                      href={`${toAppPath('/grai')}#allocate`}
                      className="grai-grinders-col-grinder-link"
                      title="Grinder management"
                      onClick={(event) => {
                        event.preventDefault()
                        navigateToGraiSection('allocate')
                      }}
                    >
                      <span className="grai-grinders-col-logos" aria-hidden="true">
                        {displayGrinderRows.map((row) => (
                          <img
                            key={row.id}
                            src={assetUrl('logo.png')}
                            alt=""
                            className="grai-grinders-col-logo"
                          />
                        ))}
                      </span>
                    </a>
                  </span>
                  <span role="columnheader" className="grai-grinders-col-head is-last-action">
                    <span className="grai-grinders-col-head-inner">
                      <span className="grai-grinders-col-icon">{GRINDERS_COLUMN_ICONS.lastActionTime}</span>
                      <span className="grai-grinders-col-head-label">Last action time</span>
                    </span>
                  </span>
                  <span role="columnheader" className="grai-grinders-col-head is-base">
                    <span className="grai-grinders-col-head-inner">
                      <span className="grai-grinders-col-icon">{GRINDERS_COLUMN_ICONS.base}</span>
                      <span className="grai-grinders-col-head-label">Base</span>
                    </span>
                  </span>
                  <span role="columnheader" className="grai-grinders-col-head is-quote">
                    <span className="grai-grinders-col-head-inner">
                      <span className="grai-grinders-col-icon">{GRINDERS_COLUMN_ICONS.quote}</span>
                      <span className="grai-grinders-col-head-label">Quote</span>
                    </span>
                  </span>
                  <span role="columnheader" className="grai-grinders-col-head is-yield-base">
                    <span className="grai-grinders-col-head-inner">
                      <span className="grai-grinders-col-icon">{GRINDERS_COLUMN_ICONS.yieldBase}</span>
                      <span className="grai-grinders-col-head-label">Yield base</span>
                    </span>
                  </span>
                  <span role="columnheader" className="grai-grinders-col-head is-yield-quote">
                    <span className="grai-grinders-col-head-inner">
                      <span className="grai-grinders-col-icon">{GRINDERS_COLUMN_ICONS.yieldQuote}</span>
                      <span className="grai-grinders-col-head-label">Yield quote</span>
                    </span>
                  </span>
                </div>
                {displayGrinderRows.length === 0 ? (
                  <p className="grai-grinders-boss-status is-empty" role="status">
                    {isGrindersNetworkFilterActive
                      ? `No grinders on ${walletNetworkCaip2}.`
                      : 'No grinders in the Boss fleet.'}
                  </p>
                ) : (
                  displayGrinderRows.map((row) => (
                    <div className="grai-grinders-row" role="row" key={row.id}>
                      <GraiGrinderLastTxCell
                        lastActionLabel={row.lastActionLabel}
                        txState={grinderLastTx[row.id]}
                      />
                      <GraiGrinderTableName
                        row={row}
                        copied={copiedGrinderId === row.id}
                        onCopy={copyGrinderTableAddress}
                      />
                      <span role="cell">{row.lastAction}</span>
                      <span role="cell">{row.base}</span>
                      <span role="cell">{row.quote}</span>
                      <span
                        role="cell"
                        className={row.yieldBase.startsWith('+') ? 'is-positive' : row.yieldBase.startsWith('−') || row.yieldBase.startsWith('-') ? 'is-negative' : undefined}
                      >
                        {row.yieldBase}
                      </span>
                      <span
                        role="cell"
                        className={row.yieldQuote.startsWith('+') ? 'is-positive' : row.yieldQuote.startsWith('−') || row.yieldQuote.startsWith('-') ? 'is-negative' : undefined}
                      >
                        {row.yieldQuote}
                      </span>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </section>
        <div className="grai-grinders-summary-toggle">
          <button
            type="button"
            className={`grai-donut-legend-toggle grai-grinders-show-all-toggle ${isGrindersTableHidden ? 'is-collapsed' : ''}`}
            onClick={() => setIsGrindersTableHidden((hidden) => !hidden)}
            aria-expanded={!isGrindersTableHidden}
            aria-controls="grai-grinders-table"
            aria-label={isGrindersTableHidden ? 'Show all grinders' : 'Hide grinders table'}
          >
            <svg
              className="grai-donut-legend-toggle-icon"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M6 9l6 6 6-6" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}
