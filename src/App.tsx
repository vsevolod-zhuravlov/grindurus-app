import { useState } from 'react'
import GraiPage from './pages/GraiPage'
import BacktestPage from './pages/BacktestPage'
import Header, { type HeaderMainView } from './components/Header'
import './App.css'

function App() {
  const [mainView, setMainView] = useState<HeaderMainView>('grai')

  return (
    <div className="App">
      <Header activeView={mainView} onViewChange={setMainView} />
      <main className={`App-main ${mainView === 'backtest' ? 'App-main--backtest' : ''}`}>
        {mainView === 'grai' ? <GraiPage /> : <BacktestPage />}
      </main>
    </div>
  )
}

export default App
