import { Link, NavLink, useLocation } from 'react-router-dom'
import { Info } from 'lucide-react'
import { ConnectWalletButton } from './ConnectWalletButton'
import { HeaderSettingsPopover } from './HeaderSettingsPopover'
import { assetUrl } from '../utils/appPaths'
import './Header.css'

function Header() {
  const { pathname } = useLocation()
  const isBacktestActive = pathname.startsWith('/backtest')

  return (
    <header className="header">
      <div className="header-container">
        <div className="header-left">
          <Link to="/" className="header-logo">
            <img src={assetUrl('logo.png')} alt="" className="header-logo-img" />
            <span className="header-logo-text">GrindURUS</span>
          </Link>
          <nav className="header-nav" aria-label="Product sections">
            <ul className="header-nav-list">
              <li>
                <span
                  className={`header-nav-link is-disabled${isBacktestActive ? ' is-current' : ''}`}
                  aria-disabled="true"
                >
                  Backtest (soon)
                </span>
              </li>
              <li>
                <NavLink
                  to="/grai"
                  className={({ isActive }) => `header-nav-link${isActive ? ' is-current' : ''}`}
                >
                  GRAI
                </NavLink>
              </li>
              <li style={{ display: "flex", alignItems: "end" }}>
                <button type="button" className="header-nav-link header-nav-info">
                  <Info className="header-nav-info-icon" aria-hidden="true" />
                  How it works?
                </button>
              </li>
            </ul>
          </nav>
        </div>
        <div className="header-actions">
          <div className="header-wallet-cluster">
            <ConnectWalletButton />
            <HeaderSettingsPopover />
          </div>
        </div>
      </div>
    </header>
  )
}

export default Header
