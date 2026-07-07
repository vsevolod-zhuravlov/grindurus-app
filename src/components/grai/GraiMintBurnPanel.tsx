import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { formatTokenBalance, normalizeDecimalInput, parseTokenAmount } from '../../grai/onchain'
import { formatVaultBalanceDisplay } from '../../grai/formatVaultBalance'
import { useGraiDeployment } from '../../grai/GraiDeploymentProvider'
import { ACTION_TX_ICON } from '../../grai/graiActionIcons'
import { GRAI_DECIMALS_EVM } from '../../grai/evm/constants'
import { USD_SCALE, GRAI_DECIMALS } from '../../grai/tokenomics'
import { useGraiAssets } from '../../hooks/useGraiAssets'
import { useGraiBurn } from '../../hooks/useGraiBurn'
import { useGraiBurnEstimate } from '../../hooks/useGraiBurnEstimate'
import { useGraiMintEstimate } from '../../hooks/useGraiMintEstimate'
import { useGraiMint } from '../../hooks/useGraiMint'
import { useGraiTotalSupply } from '../../hooks/useGraiTotalSupply'
import { useGraiVaultBalances } from '../../hooks/useGraiVaultBalances'
import { useWalletAssetBalance } from '../../hooks/useWalletAssetBalance'
import { useActiveWallet } from '../../hooks/useActiveWallet'
import { useWalletContext } from '../../providers/AppWalletProvider'
import { VaultBalanceTableValue } from '../VaultBalanceTableValue'
import { WalletIcon } from '../WalletIcon'
import { assetUrl } from '../../utils/appPaths'
import { playBullSound, primeBullSound } from '../../utils/playBullSound'
import { shortenAddress } from '../../utils/shortenAddress'
import { GraiFieldInfoButton } from './GraiFieldInfo'
import {
  GraiActionConnectWalletButton,
  GraiEstimateSuffix,
  GraiWalletBalanceSlot,
} from './GraiWalletAction'
import {
  ACTION_SWITCH_ICONS,
  AMOUNT_PREFIX_PLUS_ICON,
  JUNIOR_VAULT_FIELD_ICON,
  MINT_ASSET_SOLSCAN_ICON,
  SENIOR_VAULT_FIELD_ICON,
  VAULT_AMOUNT_PLUS_ICON,
} from './graiPageIcons'

type Props = {
  actionView: 'mint' | 'burn'
  onActionViewChange: (view: 'mint' | 'burn') => void
}

export function GraiMintBurnPanel({ actionView, onActionViewChange }: Props) {
  const { openChainSelector } = useWalletContext()
  const {
    chainKind,
    solana,
    staticSolana,
    evm,
    explorerTokenUrl,
    explorerTxUrl,
  } = useGraiDeployment()
  const activeWallet = useActiveWallet()
  const isWalletConnected = activeWallet.isConnected
  const {
    assets: mintAssets,
    isLoading: mintAssetsLoading,
    error: mintAssetsError,
    isRegistryLoaded,
  } = useGraiAssets()
  const { refresh: refreshVaultBalances } = useGraiVaultBalances()
  const { refresh: refreshTotalSupply } = useGraiTotalSupply()
  const { mint: mintGrai, status: mintStatus, error: mintError, lastSignature: mintSignature, isMinting, reset: resetMint } =
    useGraiMint()
  const { burn: burnGrai, status: burnStatus, error: burnError, lastSignature: burnSignature, lastAmountLabel: burnAmountLabel, isBurning, reset: resetBurn } =
    useGraiBurn()

  const [mintAmount, setMintAmount] = useState('')
  const [selectedMint, setSelectedMint] = useState('')
  const [mintAssetMenuOpen, setMintAssetMenuOpen] = useState(false)
  const [burnAmount, setBurnAmount] = useState('')
  const [isBurnAssetsRowsHidden, setIsBurnAssetsRowsHidden] = useState(false)
  const [isMintSplitSharesHidden, setIsMintSplitSharesHidden] = useState(false)
  const [isBurnTxResultHidden, setIsBurnTxResultHidden] = useState(false)
  const mintAssetMenuRef = useRef<HTMLDivElement>(null)
  const bullSoundPlayedForRef = useRef<string | null>(null)

  const selectedAsset = useMemo(
    () => mintAssets.find((asset) => asset.mint === selectedMint) ?? mintAssets[0],
    [mintAssets, selectedMint],
  )
  const { balanceLabel, maxAmount, decimals: assetDecimals, refresh: refreshWalletBalance } = useWalletAssetBalance(
    selectedAsset?.mint,
    selectedAsset?.symbol,
  )
  const { estimatedGrai, seniorShareLabel, juniorShareLabel, seniorShareUsdRaw, juniorShareUsdRaw, isLoading: isEstimateLoading } = useGraiMintEstimate(
    actionView === 'mint' ? selectedAsset?.mint : undefined,
    mintAmount,
    assetDecimals,
  )
  const { burnOutputs, isLoading: isBurnEstimateLoading } = useGraiBurnEstimate(
    burnAmount,
    actionView === 'burn',
  )
  const burnOutputByMint = useMemo(
    () => new Map(burnOutputs.map((output) => [output.asset.mint, output])),
    [burnOutputs],
  )
  const usdScale = chainKind === 'evm' ? GRAI_DECIMALS_EVM : USD_SCALE
  const burnTotalUsdLabel = useMemo(() => {
    if (!burnAmount.trim()) return '—'
    if (isBurnEstimateLoading) return '…'
    const totalUsd = burnOutputs.reduce((sum, output) => sum + output.usdRaw, 0n)
    if (totalUsd <= 0n) return '$0'
    return `$${formatVaultBalanceDisplay(totalUsd, usdScale)}`
  }, [burnAmount, burnOutputs, isBurnEstimateLoading, usdScale])
  const mintDepositUsdLabel = useMemo(() => {
    if (!mintAmount.trim()) return '$0.00'
    if (isEstimateLoading) return '…'
    const totalUsd = seniorShareUsdRaw + juniorShareUsdRaw
    if (totalUsd <= 0n) return '$0.00'
    return `$${formatVaultBalanceDisplay(totalUsd, usdScale, 2)}`
  }, [isEstimateLoading, juniorShareUsdRaw, mintAmount, seniorShareUsdRaw, usdScale])
  const isBurnConfirmed = burnStatus === 'success' && Boolean(burnSignature)
  const confirmedBurnGraiLabel = useMemo(() => {
    if (burnAmountLabel?.trim()) return burnAmountLabel
    const trimmed = burnAmount.trim()
    if (trimmed) return trimmed
    return '0'
  }, [burnAmount, burnAmountLabel])
  const graiMintAddress =
    chainKind === 'evm' && evm
      ? (evm.graiToken ?? evm.protocolAddress ?? '—')
      : solana?.graiMint.toBase58() ?? staticSolana?.graiMint.toBase58() ?? '—'
  const graiExplorerHref = graiMintAddress !== '—' ? explorerTokenUrl(graiMintAddress) : null
  const defaultGraiDecimals = chainKind === 'evm' ? GRAI_DECIMALS_EVM : GRAI_DECIMALS
  const {
    balanceLabel: graiBalanceLabel,
    maxAmount: maxBurnAmount,
    decimals: graiBalanceDecimals,
    refresh: refreshGraiBalance,
  } = useWalletAssetBalance(actionView === 'burn' ? graiMintAddress : undefined, actionView === 'burn' ? 'GRAI' : undefined)

  const graiDecimals = graiBalanceDecimals ?? defaultGraiDecimals

  useEffect(() => {
    if (mintAssets.length === 0) return
    if (!mintAssets.some((asset) => asset.mint === selectedMint)) {
      setSelectedMint(mintAssets[0].mint)
    }
  }, [mintAssets, selectedMint])

  useEffect(() => {
    resetMint()
    resetBurn()
  }, [selectedMint, actionView])

  useEffect(() => {
    setMintAmount('')
  }, [selectedMint])

  useEffect(() => {
    if (mintStatus !== 'success' || !mintSignature) return
    void refreshWalletBalance()
    void refreshVaultBalances()
    void refreshTotalSupply()
    if (bullSoundPlayedForRef.current !== mintSignature) {
      bullSoundPlayedForRef.current = mintSignature
      void playBullSound()
    }
  }, [mintStatus, mintSignature, refreshWalletBalance, refreshVaultBalances, refreshTotalSupply])

  useEffect(() => {
    if (burnStatus !== 'success' || !burnSignature) return
    void refreshGraiBalance()
    void refreshVaultBalances()
    void refreshTotalSupply()
    if (bullSoundPlayedForRef.current !== burnSignature) {
      bullSoundPlayedForRef.current = burnSignature
      void playBullSound()
    }
  }, [burnStatus, burnSignature, refreshGraiBalance, refreshVaultBalances, refreshTotalSupply])

  const handleMint = useCallback(async () => {
    if (!selectedAsset?.mint) return
    primeBullSound()
    try {
      await mintGrai({
        assetMint: selectedAsset.mint,
        amountInput: mintAmount,
        assetDecimals: assetDecimals ?? undefined,
      })
    } catch {
      // Error state is handled in useGraiMint.
    }
  }, [assetDecimals, mintAmount, mintGrai, selectedAsset?.mint])

  const handleBurn = useCallback(async () => {
    primeBullSound()
    try {
      await burnGrai({ amountInput: burnAmount })
    } catch {
      // Error state is handled in useGraiBurn.
    }
  }, [burnAmount, burnGrai])

  const applyBurnAmountFraction = useCallback(
    (fraction: number) => {
      if (!maxBurnAmount || graiDecimals === null) return
      if (fraction >= 1) {
        setBurnAmount(maxBurnAmount)
        return
      }
      try {
        const maxRaw = parseTokenAmount(maxBurnAmount, graiDecimals)
        const amountRaw = (maxRaw * BigInt(Math.round(fraction * 100))) / 100n
        setBurnAmount(formatTokenBalance(amountRaw, graiDecimals))
      } catch {
        // ignore invalid balance parse
      }
    },
    [graiDecimals, maxBurnAmount],
  )

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
    <div className="grai-actions-row grai-actions-row-mint">
      <div className="grai-action-card grai-mint">
          <div
            className={`grai-action-switch is-${actionView}-active`}
            role="tablist"
            aria-label="Mint or burn GRAI"
          >
            <button
              type="button"
              role="tab"
              aria-selected={actionView === 'mint'}
              className={`grai-action-switch-btn is-mint ${actionView === 'mint' ? 'is-active' : ''}`}
              onClick={() => onActionViewChange('mint')}
            >
              <span className="grai-action-switch-icon">{ACTION_SWITCH_ICONS.mint}</span>
              MINT
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={actionView === 'burn'}
              className={`grai-action-switch-btn is-burn ${
                actionView === 'burn' ? 'is-active' : ''
              }`}
              onClick={() => onActionViewChange('burn')}
            >
              <span className="grai-action-switch-icon">{ACTION_SWITCH_ICONS.burn}</span>
              BURN
            </button>
          </div>
          <div className="grai-action-content">
            {actionView === 'mint' ? (
              <>
                <div className="grai-mint-amount-block">
                <div className="grai-mint-amount-field">
                  <div className="grai-mint-amount-row grai-mint-amount-row--with-asset-label">
                    <div className="grai-mint-amount-input-col">
                      <span className="grai-field-label grai-field-label--with-icon grai-mint-amount-input-label">
                        <span className="grai-estimated-amount-prefix-plus" aria-hidden="true">
                          {AMOUNT_PREFIX_PLUS_ICON}
                        </span>
                        Deposit Amount
                      </span>
                      <div className="grai-input-with-suffix has-max">
                        <input
                          type="text"
                          inputMode="decimal"
                          className="grai-input"
                          placeholder="0"
                          value={mintAmount}
                          onChange={(e) => {
                            setMintAmount(normalizeDecimalInput(e.target.value, assetDecimals ?? 9))
                          }}
                        />
                        <button
                          type="button"
                          className="grai-input-max-btn"
                          onClick={() => {
                            if (maxAmount) setMintAmount(maxAmount)
                          }}
                          disabled={!maxAmount}
                        >
                          MAX
                        </button>
                      </div>
                      <div className="grai-mint-amount-usd-hint" aria-live="polite">
                        <span
                          className={`grai-mint-amount-usd-value${mintAmount.trim() ? '' : ' is-placeholder'}`}
                        >
                          {mintDepositUsdLabel}
                        </span>
                      </div>
                    </div>
                    <div className="grai-mint-amount-asset-col">
                      <div className="grai-mint-asset-dropdown" ref={mintAssetMenuRef}>
                      <div className="grai-mint-asset-value">
                        <button
                          type="button"
                          className="grai-mint-asset-value-select"
                          onClick={() => setMintAssetMenuOpen((prev) => !prev)}
                          aria-haspopup="listbox"
                          aria-expanded={mintAssetMenuOpen}
                          aria-label="Select mint asset"
                        >
                          <span className="grai-mint-asset-item-icon" aria-hidden="true">
                            <img
                              src={selectedAsset?.icon.src}
                              alt={selectedAsset?.icon.alt ?? 'Asset'}
                              width={16}
                              height={16}
                              loading="lazy"
                              decoding="async"
                            />
                          </span>
                          <span className="grai-mint-asset-symbol">
                            {mintAssetsLoading
                              ? 'Loading…'
                              : selectedAsset?.symbol ?? (mintAssetsError ? 'Unavailable' : '—')}
                          </span>
                        </button>
                        <button
                          type="button"
                          className="grai-mint-asset-caret-btn"
                          onClick={() => setMintAssetMenuOpen((prev) => !prev)}
                          aria-label="Open asset list"
                        >
                          <span className="grai-mint-asset-caret" aria-hidden="true">
                            ▾
                          </span>
                        </button>
                      </div>
                      <div
                        className="grai-mint-asset-balance"
                        aria-label="Minter's wallet balance of selected asset"
                      >
                        <GraiWalletBalanceSlot
                          label={balanceLabel}
                          symbol={selectedAsset?.symbol}
                          isConnected={isWalletConnected}
                          explorerHref={selectedAsset?.mint ? explorerTokenUrl(selectedAsset.mint) : null}
                        />
                      </div>
                      {mintAssetMenuOpen && mintAssets.length > 0 && (
                        <div className="grai-mint-asset-list" role="listbox" aria-label="Mint asset list">
                          {mintAssets.map((asset) => (
                            <div
                              key={asset.mint}
                              role="option"
                              aria-selected={selectedMint === asset.mint}
                              className={`grai-mint-asset-item ${selectedMint === asset.mint ? 'active' : ''}`}
                              onClick={() => {
                                setSelectedMint(asset.mint)
                                setMintAssetMenuOpen(false)
                              }}
                              onKeyDown={(event) => {
                                if (event.key === 'Enter' || event.key === ' ') {
                                  event.preventDefault()
                                  setSelectedMint(asset.mint)
                                  setMintAssetMenuOpen(false)
                                }
                              }}
                              tabIndex={0}
                            >
                              <span className="grai-mint-asset-item-icon" aria-hidden="true">
                                <img
                                  src={asset.icon.src}
                                  alt={asset.icon.alt}
                                  width={16}
                                  height={16}
                                  loading="lazy"
                                  decoding="async"
                                />
                              </span>
                              <span className="grai-mint-asset-item-symbol">{asset.symbol}</span>
                              <a
                                href={explorerTokenUrl(asset.mint) ?? '#'}
                                target="_blank"
                                rel="noreferrer"
                                className="grai-mint-asset-item-solscan"
                                aria-label={`View ${asset.symbol} on block explorer`}
                                title={`View ${asset.symbol} on block explorer`}
                                onClick={(event) => event.stopPropagation()}
                                onMouseDown={(event) => event.stopPropagation()}
                              >
                                {MINT_ASSET_SOLSCAN_ICON}
                              </a>
                            </div>
                          ))}
                        </div>
                      )}
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    className={`grai-mint-amount-flow-arrow${isMintSplitSharesHidden ? ' is-collapsed' : ''}`}
                    onClick={() => setIsMintSplitSharesHidden((hidden) => !hidden)}
                    aria-expanded={!isMintSplitSharesHidden}
                    aria-controls="grai-mint-split-shares"
                    aria-label={
                      isMintSplitSharesHidden
                        ? 'Show mint transaction preview'
                        : 'Hide mint transaction preview'
                    }
                  >
                    <span className="grai-mint-amount-flow-arrow-inner">
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                      >
                        <path d="M6 9l6 6 6-6" />
                      </svg>
                      <span className="grai-mint-amount-flow-arrow-label" aria-hidden="true">
                        TX PREVIEW
                      </span>
                    </span>
                  </button>
                  {!isMinting && !mintError && !(mintSignature && mintStatus === 'success') ? (
                    <div className="grai-mint-split-shares-hint is-open" aria-label="Mint deposit split estimate">
                      <div
                        className={`grai-burn-assets-rows-panel${isMintSplitSharesHidden ? '' : ' is-open'}`}
                        aria-hidden={isMintSplitSharesHidden}
                      >
                        <div className="grai-burn-assets-rows-panel-inner">
                        <div id="grai-mint-split-shares" className="grai-burn-assets-rows">
                          <div className="grai-burn-assets-row grai-mint-estimate-row">
                            <span className="grai-burn-assets-amount">
                              <span className="grai-estimated-amount-prefix" aria-label="Amount">
                                <span className="grai-estimated-amount-prefix-plus" aria-hidden="true">
                                  {AMOUNT_PREFIX_PLUS_ICON}
                                </span>
                                <span className="grai-estimated-amount-prefix-label">MINTER</span>
                                <span className="grai-mint-split-vault-plus" aria-hidden="true">
                                  {VAULT_AMOUNT_PLUS_ICON}
                                </span>
                                {mintAmount.trim() && (isEstimateLoading || estimatedGrai !== null) ? (
                                  <span className="grai-estimated-amount-value">
                                    {isEstimateLoading ? (
                                      <span className="grai-estimate-spinner" aria-label="Calculating GRAI estimate" />
                                    ) : (
                                      estimatedGrai
                                    )}
                                  </span>
                                ) : (
                                  <span className="grai-estimated-amount-value is-placeholder">0</span>
                                )}
                              </span>
                            </span>
                            <span className="grai-burn-assets-token grai-mint-estimate-token">
                              {!(mintAmount.trim() && isEstimateLoading) && (
                                <GraiEstimateSuffix explorerHref={graiExplorerHref} />
                              )}
                            </span>
                          </div>
                    {(
                      [
                        {
                          key: 'senior',
                          label: 'SR. VAULT',
                          icon: SENIOR_VAULT_FIELD_ICON,
                          hint: 'Amount transfered to Senior Vault as Collateral under GRAI',
                          shareLabel: seniorShareLabel,
                          shareUsdRaw: seniorShareUsdRaw,
                        },
                        {
                          key: 'junior',
                          label: 'JR. VAULT',
                          icon: JUNIOR_VAULT_FIELD_ICON,
                          hint: 'Amount transfered to Junior Vault as Yield Generation to Grinders',
                          shareLabel: juniorShareLabel,
                          shareUsdRaw: juniorShareUsdRaw,
                        },
                      ] as const
                    ).map((row) => (
                      <div className="grai-burn-assets-row" key={row.key}>
                        <span className="grai-burn-assets-amount">
                          <span className="grai-mint-split-vault-prefix">
                            <span className={`grai-mint-split-vault-prefix-icon is-${row.key}`} aria-hidden="true">
                              {row.icon}
                            </span>
                            {row.label}
                            <GraiFieldInfoButton hint={row.hint} />
                            <span className="grai-mint-split-vault-plus" aria-hidden="true">
                              {VAULT_AMOUNT_PLUS_ICON}
                            </span>
                          </span>
                          <span className={`grai-burn-assets-amount-value${!mintAmount.trim() ? ' is-placeholder' : ''}`}>
                            <VaultBalanceTableValue
                              amount={!mintAmount.trim() ? '0.0' : row.shareLabel ?? '0.0'}
                              usdRaw={row.shareUsdRaw}
                              isLoading={Boolean(mintAmount.trim()) && isEstimateLoading}
                            />
                          </span>
                        </span>
                        <span className="grai-burn-assets-token">
                          <span className="grai-burn-assets-token-icon" aria-hidden="true">
                            {selectedAsset && (
                              <img src={selectedAsset.icon.src} alt={selectedAsset.icon.alt} />
                            )}
                          </span>
                          {selectedAsset?.symbol ?? '—'}
                          {selectedAsset?.mint && (
                            <a
                              href={explorerTokenUrl(selectedAsset.mint) ?? '#'}
                              target="_blank"
                              rel="noreferrer"
                              className="grai-burn-assets-solscan"
                              aria-label={`View ${selectedAsset.symbol} on block explorer`}
                              title={`View ${selectedAsset.symbol} on block explorer`}
                            >
                              {MINT_ASSET_SOLSCAN_ICON}
                            </a>
                          )}
                        </span>
                      </div>
                    ))}
                        </div>
                        </div>
                      </div>
                      </div>
                  ) : null}
                </div>
                {mintAssetsError && !isRegistryLoaded && (
                  <p className="grai-registry-hint is-error">{mintAssetsError}</p>
                )}
                </div>
                {(isMinting || mintError || (mintSignature && mintStatus === 'success')) && (
                <div className="grai-mint-feedback-slot">
                  {isMinting ? (
                    <p className="grai-mint-feedback is-pending">Confirming transaction…</p>
                  ) : mintError ? (
                    <p className="grai-mint-feedback is-error">{mintError}</p>
                  ) : (
                    <p className="grai-mint-feedback is-success grai-mint-feedback-confirmed">
                      Mint confirmed:{' '}
                      <a
                        href={explorerTxUrl(mintSignature!) ?? '#'}
                        target="_blank"
                        rel="noreferrer"
                        title={mintSignature!}
                      >
                        {shortenAddress(mintSignature!)}
                      </a>
                    </p>
                  )}
                </div>
                )}
                {isWalletConnected ? (
                  <button
                    type="button"
                    className="grai-mint-btn"
                    disabled={isMinting || !selectedAsset?.mint || !mintAmount.trim()}
                    onClick={() => {
                      void handleMint()
                    }}
                  >
                    <span className="grai-action-tx-btn-icon" aria-hidden="true">
                      {ACTION_TX_ICON}
                    </span>
                    {isMinting ? 'MINTING…' : 'MINT'}
                  </button>
                ) : (
                  <GraiActionConnectWalletButton onConnect={openChainSelector} />
                )}
              </>
            ) : (
              <>
                <div className="grai-mint-amount-block">
                <div className="grai-mint-amount-field">
                  <div className="grai-mint-amount-label-row">
                    <span className="grai-field-label grai-field-label--with-icon grai-mint-amount-input-label">
                      <span className="grai-field-label-icon" aria-hidden="true">
                        {ACTION_SWITCH_ICONS.burn}
                      </span>
                      Burn Amount
                    </span>
                    <div className="grai-amount-preset-btns" aria-label="Burn amount presets">
                      {[25, 50, 75].map((percent) => (
                        <button
                          key={percent}
                          type="button"
                          className="grai-amount-preset-btn"
                          onClick={() => applyBurnAmountFraction(percent / 100)}
                          disabled={!maxBurnAmount}
                        >
                          {percent}%
                        </button>
                      ))}
                      <button
                        type="button"
                        className="grai-amount-preset-btn"
                        onClick={() => applyBurnAmountFraction(1)}
                        disabled={!maxBurnAmount}
                      >
                        MAX
                      </button>
                    </div>
                  </div>
                  <div className="grai-mint-amount-row grai-mint-amount-row--with-burn-suffix">
                    <div className="grai-input-with-suffix has-max is-without-max-btn">
                      <input
                        type="text"
                        inputMode="decimal"
                        className="grai-input"
                        placeholder="0"
                        value={burnAmount}
                        onChange={(e) => {
                          setBurnAmount(normalizeDecimalInput(e.target.value, graiDecimals ?? 9))
                        }}
                      />
                    </div>
                    <div className="grai-burn-amount-trailing-col">
                      <span className="grai-burn-amount-suffix">
                        <span className="grai-mint-asset-item-icon" aria-hidden="true">
                          <img
                            src={assetUrl('logo.png')}
                            alt=""
                            width={16}
                            height={16}
                            loading="lazy"
                            decoding="async"
                          />
                        </span>
                        <span className="grai-mint-asset-symbol">GRAI</span>
                        {graiMintAddress !== '—' && (
                          <a
                            href={explorerTokenUrl(graiMintAddress) ?? '#'}
                            target="_blank"
                            rel="noreferrer"
                            className="grai-mint-asset-value-solscan"
                            aria-label="View GRAI contract on block explorer"
                            title="View GRAI contract on block explorer"
                          >
                            {MINT_ASSET_SOLSCAN_ICON}
                          </a>
                        )}
                      </span>
                      <div
                        className="grai-mint-asset-balance"
                        aria-label="Burner's wallet balance of GRAI"
                      >
                        <GraiWalletBalanceSlot
                          label={graiBalanceLabel}
                          symbol="GRAI"
                          isConnected={isWalletConnected}
                          explorerHref={graiExplorerHref}
                        />
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    className={`grai-mint-amount-flow-arrow${isBurnTxResultHidden ? ' is-collapsed' : ''}`}
                    onClick={() => setIsBurnTxResultHidden((hidden) => !hidden)}
                    aria-expanded={!isBurnTxResultHidden}
                    aria-controls="grai-burn-tx-result"
                    aria-label={
                      isBurnTxResultHidden
                        ? 'Show burn transaction preview'
                        : 'Hide burn transaction preview'
                    }
                  >
                    <span className="grai-mint-amount-flow-arrow-inner">
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                      >
                        <path d="M6 9l6 6 6-6" />
                      </svg>
                      <span className="grai-mint-amount-flow-arrow-label" aria-hidden="true">
                        TX PREVIEW
                      </span>
                    </span>
                  </button>
                  <div
                    className={`grai-burn-assets-rows-panel grai-burn-tx-result-panel${isBurnTxResultHidden ? '' : ' is-open'}`}
                    id="grai-burn-tx-result"
                    aria-hidden={isBurnTxResultHidden}
                  >
                    <div className="grai-burn-assets-rows-panel-inner">
                  <div className="grai-burn-assets-hint is-open" aria-label="Burn outputs estimate">
                  <div className="grai-burn-assets-rows grai-burn-tx-result-rows">
                  <div className="grai-burn-assets-section-title grai-burn-assets-row grai-burn-estimate-title-row">
                    {isBurnConfirmed ? (
                      <span className="grai-burn-confirmed-title">
                        BURNT{' '}
                        <span className="grai-burn-confirmed-amount">{confirmedBurnGraiLabel}</span>{' '}
                        GRAI
                      </span>
                    ) : (
                      <span className="grai-burn-assets-amount">
                        <span className="grai-estimated-amount-prefix" aria-label="Burner">
                          {!isBurning && !burnError ? (
                            <>
                              <span
                                role="button"
                                tabIndex={0}
                                className={`grai-burn-estimate-sigma grai-burn-assets-section-toggle ${isBurnAssetsRowsHidden ? 'is-collapsed' : ''}`}
                                onClick={() => setIsBurnAssetsRowsHidden((hidden) => !hidden)}
                                onKeyDown={(event) => {
                                  if (event.key === 'Enter' || event.key === ' ') {
                                    event.preventDefault()
                                    setIsBurnAssetsRowsHidden((hidden) => !hidden)
                                  }
                                }}
                                aria-expanded={!isBurnAssetsRowsHidden}
                                aria-controls="grai-burn-assets-rows"
                                aria-label={
                                  isBurnAssetsRowsHidden
                                    ? 'Show senior vault shares breakdown'
                                    : 'Hide senior vault shares breakdown'
                                }
                              >
                                Σ
                              </span>
                              <span className="grai-estimated-amount-prefix-label">BURNER</span>
                              <span className="grai-mint-split-vault-plus" aria-hidden="true">
                                {VAULT_AMOUNT_PLUS_ICON}
                              </span>
                              <span
                                className={`grai-burn-estimate-value${
                                  !(burnAmount.trim() && (isBurnEstimateLoading || burnTotalUsdLabel !== '—'))
                                    ? ' is-placeholder'
                                    : ''
                                }`}
                              >
                                {burnAmount.trim() && (isBurnEstimateLoading || burnTotalUsdLabel !== '—') ? (
                                  isBurnEstimateLoading ? (
                                    <span className="grai-estimate-spinner" aria-label="Calculating burn value estimate" />
                                  ) : (
                                    `~${burnTotalUsdLabel}`
                                  )
                                ) : (
                                  '$0'
                                )}
                              </span>
                            </>
                          ) : null}
                        </span>
                      </span>
                    )}
                  </div>
                  <div
                    className={`grai-burn-assets-rows-panel${isBurnAssetsRowsHidden ? '' : ' is-open'}`}
                    aria-hidden={isBurnAssetsRowsHidden}
                  >
                    <div className="grai-burn-assets-rows-panel-inner">
                      <div
                        id="grai-burn-assets-rows"
                        className={`grai-burn-assets-rows${mintAssets.length > 3 ? ' is-scrollable' : ''}`}
                      >
                        {mintAssets.map((asset) => {
                      const output = burnOutputByMint.get(asset.mint)
                      return (
                        <div className="grai-burn-assets-row" key={asset.mint}>
                          <span className="grai-burn-assets-amount">
                            <span className="grai-estimated-amount-prefix" aria-label="Burner">
                              <span className="grai-field-label-icon" aria-hidden="true">
                                <WalletIcon size={14} />
                              </span>
                              BURNER +
                            </span>
                            <span className={`grai-burn-assets-amount-value${!burnAmount.trim() ? ' is-placeholder' : ''}`}>
                              <VaultBalanceTableValue
                                amount={output?.amountLabel ?? '0'}
                                usdRaw={output?.usdRaw ?? 0n}
                                isLoading={Boolean(burnAmount.trim()) && isBurnEstimateLoading}
                              />
                            </span>
                          </span>
                          <span className="grai-burn-assets-token">
                            <span className="grai-burn-assets-token-icon" aria-hidden="true">
                              <img src={asset.icon.src} alt={asset.icon.alt} />
                            </span>
                            {asset.symbol}
                            <a
                              href={explorerTokenUrl(asset.mint) ?? '#'}
                              target="_blank"
                              rel="noreferrer"
                              className="grai-burn-assets-solscan"
                              aria-label={`View ${asset.symbol} on block explorer`}
                              title={`View ${asset.symbol} on block explorer`}
                            >
                              {MINT_ASSET_SOLSCAN_ICON}
                            </a>
                          </span>
                        </div>
                      )
                    })}
                      </div>
                    </div>
                  </div>
                </div>
                    </div>
                  </div>
                  </div>
                </div>
                </div>
                {(isBurning || burnError || isBurnConfirmed) && (
                <div className="grai-burn-feedback-slot">
                  {isBurning ? (
                    <p className="grai-mint-feedback is-pending">Confirming transaction…</p>
                  ) : burnError ? (
                    <p className="grai-mint-feedback is-error">{burnError}</p>
                  ) : (
                    <p className="grai-mint-feedback is-success grai-burn-feedback-confirmed">
                      Burn confirmed:{' '}
                      <a
                        href={explorerTxUrl(burnSignature!) ?? '#'}
                        target="_blank"
                        rel="noreferrer"
                        title={burnSignature!}
                      >
                        {shortenAddress(burnSignature!)}
                      </a>
                    </p>
                  )}
                </div>
                )}
                {isWalletConnected ? (
                  <button
                    type="button"
                    className="grai-burn-btn"
                    disabled={isBurning || !burnAmount.trim()}
                    onClick={() => {
                      void handleBurn()
                    }}
                  >
                    <span className="grai-action-tx-btn-icon" aria-hidden="true">
                      {ACTION_TX_ICON}
                    </span>
                    {isBurning ? 'BURNING…' : 'BURN'}
                  </button>
                ) : (
                  <GraiActionConnectWalletButton onConnect={openChainSelector} />
                )}
              </>
            )}
          </div>
        </div>
      </div>
  )
}
