import { useEffect, useRef, useState } from 'react'
import type { GraiAmountAsset } from './GraiAmountInput'

type Props = {
  assets: GraiAmountAsset[]
  selected: GraiAmountAsset | undefined
  onSelect: (asset: GraiAmountAsset) => void
  ariaLabel?: string
}

export function GraiAssetSelect({ assets, selected, onSelect, ariaLabel = 'Select asset' }: Props) {
  const [isOpen, setIsOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isOpen) return
    const onPointerDown = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', onPointerDown)
    return () => document.removeEventListener('mousedown', onPointerDown)
  }, [isOpen])

  const hasChoices = assets.length > 1

  return (
    <div className="grai-asset-select" ref={rootRef}>
      <button
        type="button"
        className="grai-asset-select-trigger"
        onClick={() => {
          if (hasChoices) setIsOpen((open) => !open)
        }}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={ariaLabel}
      >
        {selected ? (
          <>
            <span className="grai-asset-select-icon" aria-hidden="true">
              <img src={selected.icon} alt="" width={20} height={20} loading="lazy" decoding="async" />
            </span>
            <span className="grai-asset-select-symbol">{selected.symbol}</span>
          </>
        ) : (
          <span className="grai-asset-select-symbol">—</span>
        )}
        {hasChoices && (
          <span className="grai-asset-select-caret" aria-hidden="true">
            ▾
          </span>
        )}
      </button>
      {isOpen && (
        <div className="grai-asset-select-list" role="listbox" aria-label={ariaLabel}>
          {assets.map((asset) => (
            <button
              key={asset.address || asset.symbol}
              type="button"
              role="option"
              aria-selected={asset.symbol === selected?.symbol}
              className={`grai-asset-select-option${asset.symbol === selected?.symbol ? ' is-active' : ''}`}
              onClick={() => {
                onSelect(asset)
                setIsOpen(false)
              }}
            >
              <span className="grai-asset-select-icon" aria-hidden="true">
                <img src={asset.icon} alt="" width={20} height={20} loading="lazy" decoding="async" />
              </span>
              <span className="grai-asset-select-symbol">{asset.symbol}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
