type WalletExpandToggleProps = {
  expanded: boolean
  className?: string
}

export function WalletExpandToggle({ expanded, className = '' }: WalletExpandToggleProps) {
  return (
    <span
      className={['wallet-expand-toggle', expanded ? '' : 'is-collapsed', className].filter(Boolean).join(' ')}
      aria-hidden="true"
    >
      <svg
        className="wallet-expand-toggle-icon"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M6 9l6 6 6-6" />
      </svg>
    </span>
  )
}
