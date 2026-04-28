import { useEffect, useRef, useState } from 'react'
import './GraiPage.css'

const MINT_ASSET_OPTIONS = ['usdc', 'sol', 'usdt', 'eth', 'btc', 'arb', 'matic'] as const
type MintAsset = (typeof MINT_ASSET_OPTIONS)[number]
const MINT_ASSET_ICONS: Record<MintAsset, { src: string; alt: string }> = {
  usdc: {
    src: 'https://assets.coingecko.com/coins/images/6319/small/usdc.png',
    alt: 'USDC',
  },
  sol: {
    src: 'https://assets.coingecko.com/coins/images/4128/small/solana.png',
    alt: 'SOL',
  },
  usdt: {
    src: 'https://assets.coingecko.com/coins/images/325/small/Tether.png',
    alt: 'USDT',
  },
  eth: {
    src: 'https://assets.coingecko.com/coins/images/279/small/ethereum.png',
    alt: 'ETH',
  },
  btc: {
    src: 'https://assets.coingecko.com/coins/images/1/small/bitcoin.png',
    alt: 'BTC',
  },
  arb: {
    src: 'https://assets.coingecko.com/coins/images/16547/small/arb.jpg',
    alt: 'ARB',
  },
  matic: {
    src: 'https://assets.coingecko.com/coins/images/4713/small/matic-token-icon.png',
    alt: 'MATIC',
  },
}

function GraiPage() {
  const [actionView, setActionView] = useState<'mint' | 'redeem'>('mint')
  const [mintAmount, setMintAmount] = useState('')
  const [mintSolAmount, setMintSolAmount] = useState('')
  const [mintAsset, setMintAsset] = useState<MintAsset>('usdc')
  const [mintAssetMenuOpen, setMintAssetMenuOpen] = useState(false)
  const [redeemAmount, setRedeemAmount] = useState('')
  const mintAssetMenuRef = useRef<HTMLDivElement>(null)
  const usdcInIndex = 10500
  const solInIndex = 100
  const solPriceUsdc = 111
  const solValueUsdc = solInIndex * solPriceUsdc
  const totalValueUsdc = usdcInIndex + solValueUsdc
  const usdcPct = (usdcInIndex / totalValueUsdc) * 100
  const solPct = (solValueUsdc / totalValueUsdc) * 100
  const donutRadius = 58
  const donutCircumference = 2 * Math.PI * donutRadius
  const usdcDash = (usdcPct / 100) * donutCircumference
  const solDash = donutCircumference - usdcDash
  const getMintMaxValue = () => {
    if (mintAsset === 'usdc') return String(usdcInIndex)
    if (mintAsset === 'sol') return String(solInIndex)
    return ''
  }
  const redeemOutputs: Array<{ asset: MintAsset; amount: string }> = [
    { asset: 'usdc', amount: '10,000 USDC ~ $10,000' },
    { asset: 'sol', amount: '90 SOL ~ $9,990' },
    { asset: 'usdt', amount: '2,400 USDT ~ $2,400' },
    { asset: 'eth', amount: '3.1 ETH ~ $10,850' },
    { asset: 'btc', amount: '0.12 BTC ~ $8,100' },
    { asset: 'arb', amount: '1,850 ARB ~ $1,665' },
    { asset: 'matic', amount: '4,300 MATIC ~ $3,870' },
  ]

  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      if (!mintAssetMenuRef.current) return
      if (!mintAssetMenuRef.current.contains(event.target as Node)) {
        setMintAssetMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', onPointerDown)
    return () => document.removeEventListener('mousedown', onPointerDown)
  }, [])

  return (
    <div className="grai-page">
      <h1>Grinder Artificial Index</h1>
      <p className="grai-page-subtitle">GRAI</p>
      <div className="grai-content-row">
        <div className="grai-actions-block">
          <div className="grai-actions-row grai-actions-row-mint">
            <div className="grai-action-card grai-mint">
              <div className="grai-action-switch" role="tablist" aria-label="Mint or redeem GRAI">
                <button
                  type="button"
                  role="tab"
                  aria-selected={actionView === 'mint'}
                  className={`grai-action-switch-btn is-mint ${actionView === 'mint' ? 'is-active' : ''}`}
                  onClick={() => setActionView('mint')}
                >
                  MINT
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={actionView === 'redeem'}
                  className={`grai-action-switch-btn is-redeem ${
                    actionView === 'redeem' ? 'is-active' : ''
                  }`}
                  onClick={() => setActionView('redeem')}
                >
                  REDEEM
                </button>
              </div>
              <div className="grai-action-content">
                {actionView === 'mint' ? (
                  <>
                    <div className="grai-mint-asset-dropdown" ref={mintAssetMenuRef}>
                      <button
                        type="button"
                        className={`grai-mint-asset-trigger ${mintAssetMenuOpen ? 'is-open' : ''}`}
                        onClick={() => setMintAssetMenuOpen((prev) => !prev)}
                        aria-haspopup="listbox"
                        aria-expanded={mintAssetMenuOpen}
                        aria-label="Select mint asset"
                      >
                        <span className="grai-mint-asset-item-icon" aria-hidden="true">
                          <img
                            src={MINT_ASSET_ICONS[mintAsset].src}
                            alt={MINT_ASSET_ICONS[mintAsset].alt}
                            width={16}
                            height={16}
                            loading="lazy"
                            decoding="async"
                          />
                        </span>
                        <span>{mintAsset.toUpperCase()}</span>
                        <span className="grai-mint-asset-caret" aria-hidden="true">
                          ▾
                        </span>
                      </button>
                      {mintAssetMenuOpen && (
                        <div className="grai-mint-asset-list" role="listbox" aria-label="Mint asset list">
                          {MINT_ASSET_OPTIONS.map((asset) => (
                            <button
                              key={asset}
                              type="button"
                              role="option"
                              aria-selected={mintAsset === asset}
                              className={`grai-mint-asset-item ${mintAsset === asset ? 'active' : ''}`}
                              onClick={() => {
                                setMintAsset(asset)
                                setMintAssetMenuOpen(false)
                              }}
                            >
                              <span className="grai-mint-asset-item-icon" aria-hidden="true">
                                <img
                                  src={MINT_ASSET_ICONS[asset].src}
                                  alt={MINT_ASSET_ICONS[asset].alt}
                                  width={16}
                                  height={16}
                                  loading="lazy"
                                  decoding="async"
                                />
                              </span>
                              <span>{asset.toUpperCase()}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    {mintAsset === 'usdc' ? (
                      <div className="grai-input-with-suffix has-max">
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
                        <button
                          type="button"
                          className="grai-input-max-btn"
                          onClick={() => setMintAmount(getMintMaxValue())}
                        >
                          MAX
                        </button>
                        <span className="grai-input-suffix">{mintAsset.toUpperCase()}</span>
                      </div>
                    ) : (
                      <div className="grai-input-with-suffix has-max">
                        <input
                          type="text"
                          inputMode="decimal"
                          className="grai-input"
                          placeholder="0"
                          value={mintAsset === 'sol' ? mintSolAmount : mintAmount}
                          onChange={(e) => {
                            const v = e.target.value.replace(/[^\d.]/g, '')
                            const [int, dec] = v.split('.')
                            const normalized = dec !== undefined ? int + '.' + dec.slice(0, 8) : int
                            if (mintAsset === 'sol') {
                              setMintSolAmount(normalized)
                            } else {
                              setMintAmount(normalized)
                            }
                          }}
                        />
                        <button
                          type="button"
                          className="grai-input-max-btn"
                          onClick={() => {
                            const maxValue = getMintMaxValue()
                            if (mintAsset === 'sol') {
                              setMintSolAmount(maxValue)
                            } else {
                              setMintAmount(maxValue)
                            }
                          }}
                        >
                          MAX
                        </button>
                        <span className="grai-input-suffix">{mintAsset.toUpperCase()}</span>
                      </div>
                    )}
                    <p className="grai-estimated-amount-label">GRAI mint amount</p>
                    <button type="button" className="grai-mint-btn">
                      MINT
                    </button>
                  </>
                ) : (
                  <>
                    <div className="grai-input-with-suffix has-max">
                      <input
                        type="text"
                        inputMode="decimal"
                        className="grai-input"
                        placeholder="0"
                        value={redeemAmount}
                        onChange={(e) => {
                          const v = e.target.value.replace(/[^\d.]/g, '')
                          const [int, dec] = v.split('.')
                          setRedeemAmount(dec !== undefined ? int + '.' + dec.slice(0, 8) : int)
                        }}
                      />
                      <button
                        type="button"
                        className="grai-input-max-btn"
                        onClick={() => setRedeemAmount(String(totalValueUsdc))}
                      >
                        MAX
                      </button>
                      <span className="grai-input-suffix">GRAI</span>
                    </div>
                    <div
                      className={`grai-redeem-assets-hint ${
                        redeemOutputs.length > 5 ? 'is-scrollable' : ''
                      }`.trim()}
                      aria-label="Redeem outputs estimate"
                    >
                      {redeemOutputs.map(({ asset, amount }) => (
                        <div className="grai-redeem-assets-row" key={asset}>
                          <span className="grai-redeem-assets-token">
                            <span className="grai-redeem-assets-token-icon" aria-hidden="true">
                              <img src={MINT_ASSET_ICONS[asset].src} alt={MINT_ASSET_ICONS[asset].alt} />
                            </span>
                            {asset.toUpperCase()}
                          </span>
                          <span className="grai-redeem-assets-amount">{amount}</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
                {actionView === 'redeem' && (
                  <button type="button" className="grai-redeem-btn">
                    REDEEM
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
        <aside className="grai-assets-chart-card" aria-label="GRAI assets composition">
          <div className="grai-assets-split">
            <div className="grai-donut-wrap">
            <svg className="grai-donut" viewBox="0 0 160 160" aria-hidden="true">
              <circle className="grai-donut-track" cx="80" cy="80" r={donutRadius} />
              <circle
                className="grai-donut-segment grai-donut-segment--usdc"
                cx="80"
                cy="80"
                r={donutRadius}
                strokeDasharray={`${usdcDash} ${donutCircumference}`}
                strokeDashoffset="0"
              />
              <circle
                className="grai-donut-segment grai-donut-segment--sol"
                cx="80"
                cy="80"
                r={donutRadius}
                strokeDasharray={`${solDash} ${donutCircumference}`}
                strokeDashoffset={-usdcDash}
              />
            </svg>
            <div className="grai-donut-center">
              <span className="grai-donut-total-label">NAV</span>
              <span className="grai-donut-total-value">{totalValueUsdc.toLocaleString()} USDC</span>
            </div>
          </div>
            <div className="grai-donut-legend">
              <div className="grai-balance-table" role="table" aria-label="Idle and passive balances">
                <div className="grai-balance-table-row grai-balance-table-row--head" role="row">
                  <span role="columnheader" aria-hidden="true" />
                  <span role="columnheader">IDLE</span>
                  <span role="columnheader">PASSIVE</span>
                  <span role="columnheader">ACTIVE</span>
                </div>
                <div className="grai-balance-table-row" role="row">
                  <span role="cell" className="grai-asset-cell grai-asset-cell--usdc">
                    USDC ({usdcPct.toFixed(1)}%)
                  </span>
                  <span role="cell">{usdcInIndex.toLocaleString()}</span>
                  <span role="cell">0</span>
                  <span role="cell">0</span>
                </div>
                <div className="grai-balance-table-row" role="row">
                  <span role="cell" className="grai-asset-cell grai-asset-cell--sol">
                    SOL ({solPct.toFixed(1)}%)
                  </span>
                  <span role="cell">0</span>
                  <span role="cell">{solInIndex}</span>
                  <span role="cell">0</span>
                </div>
              </div>
            </div>
          </div>
        </aside>
      </div>
      <div className="grai-bottom-row">
        <section className="grai-bottom-card grai-bottom-card--table" aria-label="Grinders in system">
          <div className="grai-grinders-table" role="table" aria-label="Grinders table">
            <div className="grai-grinders-row grai-grinders-row--group" role="row">
              <span
                role="columnheader"
                className="grai-grinders-group-empty"
                style={{ gridColumn: '1 / span 2' }}
              />
              <span role="columnheader" className="grai-grinders-group-title" style={{ gridColumn: '3 / span 2' }}>
                📦 Inventory
              </span>
              <span role="columnheader" className="grai-grinders-group-title" style={{ gridColumn: '5 / span 2' }}>
                📈 Yield
              </span>
            </div>
            <div className="grai-grinders-row grai-grinders-row--head" role="row">
              <span role="columnheader">⚙ Grinder</span>
              <span role="columnheader">Last action time</span>
              <span role="columnheader">Base</span>
              <span role="columnheader">Quote</span>
              <span role="columnheader">Yield base</span>
              <span role="columnheader">Yield quote</span>
            </div>
            <div className="grai-grinders-row" role="row">
              <span role="cell" className="grai-grinder-name">
                <span className="grai-grinder-active-dot" aria-hidden="true" />
                grinder1
              </span>
              <span role="cell">2m ago</span>
              <span role="cell">12 ETH</span>
              <span role="cell">18,240 USDC</span>
              <span role="cell" className="is-positive">
                +0.82 ETH
              </span>
              <span role="cell" className="is-positive">
                +2,140 USDC
              </span>
            </div>
            <div className="grai-grinders-row" role="row">
              <span role="cell" className="grai-grinder-name">
                <span className="grai-grinder-active-dot" aria-hidden="true" />
                grinder2
              </span>
              <span role="cell">7m ago</span>
              <span role="cell">95 SOL</span>
              <span role="cell">9,870 USDT</span>
              <span role="cell" className="is-positive">
                +10.6 SOL
              </span>
              <span role="cell" className="is-positive">
                +1,180 USDT
              </span>
            </div>
            <div className="grai-grinders-row" role="row">
              <span role="cell" className="grai-grinder-name">
                <span className="grai-grinder-active-dot" aria-hidden="true" />
                grinder3
              </span>
              <span role="cell">19m ago</span>
              <span role="cell">0.18 BTC</span>
              <span role="cell">14,220 USDC</span>
              <span role="cell" className="is-positive">
                +0.009 BTC
              </span>
              <span role="cell" className="is-positive">
                +620 USDC
              </span>
            </div>
            <div className="grai-grinders-row" role="row">
              <span role="cell" className="grai-grinder-name">
                <span className="grai-grinder-active-dot" aria-hidden="true" />
                grinder4
              </span>
              <span role="cell">31m ago</span>
              <span role="cell">2,450 ARB</span>
              <span role="cell">3,410 USDC</span>
              <span role="cell" className="is-positive">
                +380 ARB
              </span>
              <span role="cell" className="is-positive">
                +540 USDC
              </span>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}

export default GraiPage
