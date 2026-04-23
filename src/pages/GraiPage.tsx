import { useState } from 'react'
import './GraiPage.css'

function GraiPage() {
  const [mintAmount, setMintAmount] = useState('')
  const [mintSolAmount, setMintSolAmount] = useState('')
  const [mintAsset, setMintAsset] = useState<'usdc' | 'sol'>('usdc')
  const [exitAmount, setExitAmount] = useState('')

  const chartData = [110, 111, 109, 112, 110, 111, 113, 112, 114, 113]
  const chartPath = chartData
    .map((v, i) => {
      const x = (i / (chartData.length - 1)) * 100
      const min = Math.min(...chartData)
      const max = Math.max(...chartData)
      const y = 100 - ((v - min) / (max - min || 1)) * 90 - 5
      return `${i === 0 ? 'M' : 'L'} ${x} ${y}`
    })
    .join(' ')
  return (
    <div className="grai-page">
      <h1>Grinder Artificial Index</h1>
      <p className="grai-page-subtitle">GRAI</p>
      <div className="grai-index-stats">
        <div className="grai-stat-row">
          <span className="grai-stat-label">In the index:</span>
          <span className="grai-stat-value">10,500 USDC and 100 SOL</span>
        </div>
        <div className="grai-stat-row">
          <span className="grai-stat-label">Under management:</span>
          <span className="grai-stat-value">10,000 USDC and 90 SOL</span>
        </div>
        <div className="grai-stat-row">
          <span className="grai-stat-label">Internal mint and burn price:</span>
          <span className="grai-stat-value">111 USDC/SOL</span>
        </div>
        <div className="grai-stat-row">
          <span className="grai-stat-label">Target net asset value:</span>
          <span className="grai-stat-value">20,000 USDC</span>
        </div>
      </div>
      <div className="grai-actions-block">
        <div className="grai-actions-row grai-actions-row-mint">
        <div className="grai-action-card grai-mint">
          <h2 className="grai-action-title">Mint GRAI</h2>
          <div className="grai-action-content">
            <div className="grai-mint-asset-tabs">
              <button
                type="button"
                className={`grai-mint-asset-tab ${mintAsset === 'usdc' ? 'active' : ''}`}
                onClick={() => setMintAsset('usdc')}
              >
                USDC
              </button>
              <button
                type="button"
                className={`grai-mint-asset-tab ${mintAsset === 'sol' ? 'active' : ''}`}
                onClick={() => setMintAsset('sol')}
              >
                SOL
              </button>
            </div>
            {mintAsset === 'usdc' ? (
              <div className="grai-input-with-suffix">
                <input
                  type="text"
                  inputMode="decimal"
                  className="grai-input"
                  placeholder="0"
                  value={mintAmount}
                  onChange={(e) => {
                    const v = e.target.value.replace(/[^\d.]/g, '')
                    const [int, dec] = v.split('.')
                    setMintAmount(dec !== undefined ? int + '.' + dec.slice(0, 8) : int)
                  }}
                />
                <span className="grai-input-suffix">USDC</span>
              </div>
            ) : (
              <div className="grai-input-with-suffix">
                <input
                  type="text"
                  inputMode="decimal"
                  className="grai-input"
                  placeholder="0"
                  value={mintSolAmount}
                  onChange={(e) => {
                    const v = e.target.value.replace(/[^\d.]/g, '')
                    const [int, dec] = v.split('.')
                    setMintSolAmount(dec !== undefined ? int + '.' + dec.slice(0, 8) : int)
                  }}
                />
                <span className="grai-input-suffix">SOL</span>
              </div>
            )}
            <button type="button" className="grai-mint-btn">
              MINT
            </button>
          </div>
        </div>
        </div>
        <div className="grai-actions-row grai-actions-row-exit">
          <div className="grai-action-card grai-fast-exit">
            <h2 className="grai-action-title">Exit GRAI</h2>
            <div className="grai-action-content">
              <div className="grai-exit-chart">
                <svg viewBox="0 0 100 100" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="grai-chart-gradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#ff69b4" stopOpacity="0.3" />
                      <stop offset="100%" stopColor="#ff69b4" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <path
                    fill="url(#grai-chart-gradient)"
                    d={`${chartPath} L 100 100 L 0 100 Z`}
                  />
                  <path
                    fill="none"
                    stroke="#ff69b4"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d={chartPath}
                  />
                </svg>
              </div>
              <div className="grai-input-with-suffix">
                <input
                  type="text"
                  inputMode="decimal"
                  className="grai-input"
                  placeholder="0"
                  value={exitAmount}
                  onChange={(e) => {
                    const v = e.target.value.replace(/[^\d.]/g, '')
                    const [int, dec] = v.split('.')
                    setExitAmount(dec !== undefined ? int + '.' + dec.slice(0, 8) : int)
                  }}
                />
                <span className="grai-input-suffix">GRAI</span>
              </div>
              <button type="button" className="grai-sell-btn">
                SELL
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default GraiPage
