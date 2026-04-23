import { ThemeToggle } from './ThemeToggle'
import { ConnectWalletButton } from './ConnectWalletButton'
import './Header.css'

const MAIN_APP_URL = import.meta.env.VITE_MAIN_APP_URL || '/'

export type HeaderMainView = 'grai' | 'backtest'

interface HeaderProps {
  activeView: HeaderMainView
  onViewChange: (view: HeaderMainView) => void
}

function Header({ activeView, onViewChange }: HeaderProps) {
  return (
    <header className="header">
      <div className="header-container">
        <div className="header-left">
          <a href={MAIN_APP_URL} className="header-logo" style={{ textDecoration: 'none' }}>
            <img src="/logo.png" alt="GrindURUS" className="header-logo-img" />
          </a>
          <nav className="header-nav" aria-label="Product sections">
            <button
              type="button"
              className={`header-nav-btn ${activeView === 'backtest' ? 'is-active' : ''}`}
              onClick={() => onViewChange('backtest')}
            >
              BACKTEST
            </button>
            <button
              type="button"
              className={`header-nav-btn ${activeView === 'grai' ? 'is-active' : ''}`}
              onClick={() => onViewChange('grai')}
            >
              GRAI
            </button>
          </nav>
        </div>
        <div className="header-actions">
          {MAIN_APP_URL !== '/' && (
            <a href={MAIN_APP_URL} className="my-grinders-btn" style={{ textDecoration: 'none' }}>
              ← GrindURUS
            </a>
          )}
          <ConnectWalletButton />
          <ThemeToggle />
        </div>
      </div>
    </header>
  )
}

export default Header
