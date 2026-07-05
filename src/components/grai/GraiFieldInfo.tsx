import type { ReactNode } from 'react'
import { BALANCE_FIELD_ICON, FIELD_INFO_ICON } from './graiPageIcons'

export function GraiGrindersTotalLabel({
  showTotal,
  rest,
}: {
  showTotal: boolean
  rest: string
}) {
  return (
    <span
      className={`grai-grinders-filter-total-label${showTotal ? ' has-total-prefix' : ''}`}
    >
      <span
        className={`grai-grinders-filter-total-prefix${showTotal ? ' is-visible' : ''}`}
        aria-hidden={showTotal ? undefined : true}
      >
        <span className="grai-grinders-filter-total-prefix-inner">TOTAL</span>
      </span>
      {rest}
    </span>
  )
}

export function GraiFieldInfoButton({
  hint,
  ariaLabel,
  structured = false,
  className,
  tooltipClassName,
  children,
}: {
  hint: ReactNode
  ariaLabel?: string
  structured?: boolean
  className?: string
  tooltipClassName?: string
  children?: ReactNode
}) {
  const accessibleLabel =
    ariaLabel ?? (typeof hint === 'string' ? hint : 'More information')

  return (
    <span className={`grai-field-info-wrap${className ? ` ${className}` : ''}`}>
      {children ? (
        <span
          className="grai-field-info-trigger"
          tabIndex={0}
          role="button"
          aria-label={accessibleLabel}
        >
          {children}
        </span>
      ) : (
        <button type="button" className="grai-field-info-btn" aria-label={accessibleLabel}>
          {FIELD_INFO_ICON}
        </button>
      )}
      <span
        className={`grai-field-info-tooltip${structured ? ' is-structured' : ''}${tooltipClassName ? ` ${tooltipClassName}` : ''}`}
        role="tooltip"
      >
        {hint}
      </span>
    </span>
  )
}

export function GraiBalanceFieldLabel({ hint }: { hint: string }) {
  return (
    <span className="grai-balance-field-label-wrap">
      <span className="grai-field-label grai-field-label--with-icon">
        <span className="grai-field-label-icon">{BALANCE_FIELD_ICON}</span>
        Balance
      </span>
      <GraiFieldInfoButton hint={hint} />
    </span>
  )
}
