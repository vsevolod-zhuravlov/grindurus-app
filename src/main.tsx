import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { AppWalletProvider } from './providers/AppWalletProvider'
import { GraiDeploymentProvider } from './grai/GraiDeploymentProvider'
import { GraiDataProvider } from './providers/GraiDataProvider'
import { stripBasePath } from './utils/appPaths'
import './index.css'

// Start fetching GRAI page chunk in parallel with the main bundle.
if (stripBasePath(window.location.pathname) !== '/backtest') {
  void import('./pages/GraiPage')
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <BrowserRouter basename={import.meta.env.BASE_URL}>
    <AppWalletProvider>
      <GraiDeploymentProvider>
        <GraiDataProvider>
          <App />
        </GraiDataProvider>
      </GraiDeploymentProvider>
    </AppWalletProvider>
  </BrowserRouter>,
)
