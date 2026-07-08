type ActionView = 'mint' | 'burn'

type Props = {
  actionView: ActionView
  onActionViewChange: (view: ActionView) => void
}

export function GraiActionSwitch({ actionView, onActionViewChange }: Props) {
  return (
    <div
      className={`grai-action-switch grai-action-switch--buttons is-${actionView}-active`}
      role="tablist"
      aria-label="Mint or redeem GRAI"
    >
      <button
        type="button"
        role="tab"
        aria-selected={actionView === 'mint'}
        className={`grai-action-switch-btn is-mint ${actionView === 'mint' ? 'is-active' : ''}`}
        onClick={() => onActionViewChange('mint')}
      >
        Mint
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={actionView === 'burn'}
        className={`grai-action-switch-btn is-burn ${actionView === 'burn' ? 'is-active' : ''}`}
        onClick={() => onActionViewChange('burn')}
      >
        Redeem
      </button>
    </div>
  )
}
