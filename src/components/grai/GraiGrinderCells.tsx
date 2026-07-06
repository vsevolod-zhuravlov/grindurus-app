import type { ReactNode } from 'react'
import { isGrinderStatusLive, type GrinderTableRow } from '../../boss/grinderTable'
import type { GrinderLastTxEntry } from '../../hooks/useGrinderLastTx'
import { formatTxHashShort } from '../../grinder/formatTxHash'
import {
  formatGrinderTooltipAmount,
  formatGrinderUsdExact,
  formatGrinderUsdTotal,
  type GrinderTvlBreakdownRow,
  type GrinderYieldBreakdownRow,
} from '../../grai/formatGrinderUsd'
import { WalletIcon } from '../WalletIcon'
import { GraiFieldInfoButton } from './GraiFieldInfo'

export function GraiGrinderTableName({
  row,
  copied,
  onCopy,
}: {
  row: Pick<GrinderTableRow, 'id' | 'name' | 'grinderAddress' | 'status'>
  copied: boolean
  onCopy: (address: string, grinderId: string) => void
}) {
  const isLive = isGrinderStatusLive(row.status)

  return (
    <span role="cell" className="grai-grinder-name">
      <span
        className={`grai-grinder-active-dot${isLive ? '' : ' is-inactive'}`}
        aria-hidden="true"
      />
      {row.grinderAddress ? (
        <button
          type="button"
          className={`grai-grinder-name-copy${copied ? ' is-copied' : ''}`}
          onClick={(event) => {
            event.stopPropagation()
            onCopy(row.grinderAddress!, row.id)
          }}
          title={copied ? 'Copied to clipboard' : row.grinderAddress}
          aria-label={copied ? 'Copied to clipboard' : `Copy ${row.name} address`}
        >
          {copied ? 'Copied!' : row.name}
        </button>
      ) : (
        <span>{row.name}</span>
      )}
    </span>
  )
}

export function GraiGrinderLastTxCell({
  lastActionLabel,
  txState,
}: {
  lastActionLabel: string
  txState?: GrinderLastTxEntry
}) {
  if (txState?.status === 'ready') {
    return (
      <span role="cell" className="grai-grinder-last-tx">
        <a
          href={txState.explorerUrl}
          target="_blank"
          rel="noreferrer"
          className="grai-grinder-last-tx-link"
          title={`${lastActionLabel} · ${txState.hash}`}
        >
          {formatTxHashShort(txState.hash)}
        </a>
      </span>
    )
  }

  if (txState?.status === 'hashOnly') {
    return (
      <span role="cell" className="grai-grinder-last-tx" title={`${lastActionLabel} · ${txState.hash}`}>
        {formatTxHashShort(txState.hash)}
      </span>
    )
  }

  const fallbackTitle =
    txState?.status === 'empty'
      ? `${lastActionLabel} · no last transaction from Boss logs`
      : 'No last transaction'

  return (
    <span
      role="cell"
      className="grai-grinder-last-tx is-fallback is-placeholder"
      title={fallbackTitle}
    >
      —
    </span>
  )
}

function buildGrinderTvlValueHint(totalUsd: number, rows: GrinderTvlBreakdownRow[]): ReactNode {
  return (
    <>
      <span className="grai-field-info-tooltip-title">{formatGrinderUsdExact(totalUsd)}</span>
      <span className="grai-field-info-tooltip-section">
        <span className="grai-field-info-tooltip-section-label">Formula</span>
        <code>balance_quote + balance_base × spot_price</code>
        <span className="grai-field-info-tooltip-formula-note">Summed across all grinders below.</span>
      </span>
      <span className="grai-field-info-tooltip-section">
        <span className="grai-field-info-tooltip-section-label">Breakdown</span>
        <ul className="grai-field-info-tooltip-list grai-field-info-tooltip-list--breakdown">
          {rows.map((row) => (
            <li key={row.id}>
              <strong>{row.name}</strong>
              <span className="grai-field-info-tooltip-breakdown-formula">
                {formatGrinderTooltipAmount(row.balanceQuote)} + {formatGrinderTooltipAmount(row.balanceBase)} ×{' '}
                {formatGrinderTooltipAmount(row.spotPrice)} = {formatGrinderUsdExact(row.tvlUsd)}
              </span>
            </li>
          ))}
        </ul>
      </span>
    </>
  )
}

export function GraiGrinderTvlValue({
  totalUsd,
  rows,
}: {
  totalUsd: number
  rows: GrinderTvlBreakdownRow[]
}) {
  return (
    <GraiFieldInfoButton
      className="grai-grinders-group-title-value"
      hint={buildGrinderTvlValueHint(totalUsd, rows)}
      ariaLabel={`Value locked ${formatGrinderUsdExact(totalUsd)}`}
      structured
      tooltipClassName="is-breakdown"
    >
      {formatGrinderUsdTotal(totalUsd)}
    </GraiFieldInfoButton>
  )
}

function buildGrinderYieldValueHint(totalUsd: number, rows: GrinderYieldBreakdownRow[]): ReactNode {
  return (
    <>
      <span className="grai-field-info-tooltip-title">{formatGrinderUsdExact(totalUsd)}</span>
      <span className="grai-field-info-tooltip-section">
        <span className="grai-field-info-tooltip-section-label">Formula</span>
        <code>yield_quote + yield_base × spot_price</code>
        <span className="grai-field-info-tooltip-formula-note">Summed across all grinders below.</span>
      </span>
      <span className="grai-field-info-tooltip-section">
        <span className="grai-field-info-tooltip-section-label">Breakdown</span>
        <ul className="grai-field-info-tooltip-list grai-field-info-tooltip-list--breakdown">
          {rows.map((row) => (
            <li key={row.id}>
              <strong>{row.name}</strong>
              <span className="grai-field-info-tooltip-breakdown-formula">
                {formatGrinderTooltipAmount(row.yieldQuoteValue)} + {formatGrinderTooltipAmount(row.yieldBaseValue)} ×{' '}
                {formatGrinderTooltipAmount(row.spotPrice)} = {formatGrinderUsdExact(row.yieldUsd)}
              </span>
            </li>
          ))}
        </ul>
      </span>
    </>
  )
}

export function GraiGrinderYieldValue({
  totalUsd,
  rows,
}: {
  totalUsd: number
  rows: GrinderYieldBreakdownRow[]
}) {
  return (
    <GraiFieldInfoButton
      className="grai-grinders-group-title-value is-positive"
      hint={buildGrinderYieldValueHint(totalUsd, rows)}
      ariaLabel={`Yield ${formatGrinderUsdExact(totalUsd)}`}
      structured
      tooltipClassName="is-breakdown"
    >
      {formatGrinderUsdTotal(totalUsd)}
    </GraiFieldInfoButton>
  )
}

function buildGrinderCountHint(active: number, total: number, isLive: boolean, isBossUnavailable: boolean): ReactNode {
  return (
    <>
      <span className="grai-field-info-tooltip-title">
        {active}/{total} grinders
      </span>
      <span className="grai-field-info-tooltip-section">
        <span className="grai-field-info-tooltip-section-label">Active</span>
        Grinders in INITIALIZED or GRINDING status in the Boss fleet.
      </span>
      <span className="grai-field-info-tooltip-section">
        <span className="grai-field-info-tooltip-section-label">Total</span>
        All grinders returned by Boss (<code>/grinders</code> bootstrap, then <code>/logs</code> updates).
      </span>
      <span className="grai-field-info-tooltip-section">
        <span className="grai-field-info-tooltip-section-label">Data source</span>
        Boss API only.
      </span>
      {isBossUnavailable ? (
        <p className="grai-field-info-tooltip-note">Boss API is currently unreachable.</p>
      ) : !isLive ? (
        <p className="grai-field-info-tooltip-note">Waiting for grinder data from Boss.</p>
      ) : null}
    </>
  )
}

export function GraiGrinderCountValue({
  active,
  total,
  isLive,
  isBossUnavailable,
}: {
  active: number
  total: number
  isLive: boolean
  isBossUnavailable: boolean
}) {
  return (
    <GraiFieldInfoButton
      className="grai-grinders-group-general-value"
      hint={buildGrinderCountHint(active, total, isLive, isBossUnavailable)}
      ariaLabel={`${active} of ${total} grinders active`}
      structured
    >
      {active}/{total}{' '}
      <span className="grai-grinders-group-general-value-label">GRINDERS</span>
    </GraiFieldInfoButton>
  )
}

export function GraiGrindersSummaryConnectButton({ onConnect }: { onConnect: () => void }) {
  return (
    <button
      type="button"
      className="connect-wallet-btn grai-grinders-network-connect-btn"
      onClick={onConnect}
    >
      <WalletIcon />
      Connect Wallet
    </button>
  )
}
