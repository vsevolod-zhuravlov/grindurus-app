import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'react-toastify'
import { formatVaultBalanceDisplay } from '../../grai/formatVaultBalance'
import { useGraiDeployment } from '../../grai/GraiDeploymentProvider'
import { GRAI_DECIMALS_EVM } from '../../grai/evm/constants'
import { USD_SCALE } from '../../grai/tokenomics'
import { useGraiAssets } from '../../hooks/useGraiAssets'
import { useGraiBurn } from '../../hooks/useGraiBurn'
import { useGraiMint } from '../../hooks/useGraiMint'
import { useGraiMintEstimate } from '../../hooks/useGraiMintEstimate'
import { useWalletAssetBalance } from '../../hooks/useWalletAssetBalance'
import { useActiveWallet } from '../../hooks/useActiveWallet'
import { useWalletContext } from '../../providers/AppWalletProvider'
import { assetUrl } from '../../utils/appPaths'
import { GraiActionSwitch } from './GraiActionSwitch'
import { GraiAmountInput, type GraiAmountAsset } from './GraiAmountInput'
import { GraiTransactionToast } from './GraiTransactionToast'
import { GraiActionConnectWalletButton } from './GraiWalletAction'

type ActionView = 'mint' | 'burn'

type Props = {
  actionView: ActionView
  onActionViewChange: (view: ActionView) => void
}

// MOCK: redeem value estimate assumes 1 GRAI = 1 USD.
// Replace with a real on-chain redeem estimate once redeem pricing is final.
const MOCK_GRAI_PRICE_USD = 1
function mockEstimateRedeemUsd(amountInput: string): string {
  const amount = Number.parseFloat(amountInput)
  if (!Number.isFinite(amount) || amount <= 0) return '0.00'
  return (amount * MOCK_GRAI_PRICE_USD).toFixed(2)
}

export function GraiMintBurnPanel({ actionView, onActionViewChange }: Props) {
  const { openChainSelector } = useWalletContext()
  const { chainKind, solana, staticSolana, evm, explorerTxUrl } = useGraiDeployment()
  const activeWallet = useActiveWallet()
  const isWalletConnected = activeWallet.isConnected
  const { assets: graiAssets } = useGraiAssets()
  const { mint: mintGrai, isMinting } = useGraiMint()
  const { burn: burnGrai, isBurning } = useGraiBurn()

  const [amount, setAmount] = useState('')
  const [selectedAsset, setSelectedAsset] = useState<GraiAmountAsset | null>(null)

  const graiMintAddress =
    chainKind === 'evm' && evm
      ? (evm.graiToken ?? evm.protocolAddress ?? '')
      : solana?.graiMint.toBase58() ?? staticSolana?.graiMint.toBase58() ?? ''

  const mintAssetOptions = useMemo<GraiAmountAsset[]>(
    () =>
      graiAssets.map((asset) => ({
        icon: asset.icon.src,
        symbol: asset.symbol,
        address: asset.mint,
      })),
    [graiAssets],
  )
  const redeemAssetOptions = useMemo<GraiAmountAsset[]>(
    () => [{ icon: assetUrl('logo.png'), symbol: 'GRAI', address: graiMintAddress }],
    [graiMintAddress],
  )

  const {
    balanceLabel,
    maxAmount,
    decimals,
    refresh: refreshWalletBalance,
  } = useWalletAssetBalance(selectedAsset?.address || undefined, selectedAsset?.symbol)

  const {
    estimatedGrai,
    seniorShareUsdRaw,
    juniorShareUsdRaw,
    isLoading: isEstimateLoading,
  } = useGraiMintEstimate(
    actionView === 'mint' ? selectedAsset?.address : undefined,
    amount,
    decimals,
  )

  useEffect(() => {
    setAmount('')
  }, [actionView])

  const usdScale = chainKind === 'evm' ? GRAI_DECIMALS_EVM : USD_SCALE
  const mintUsdLabel = useMemo(() => {
    if (!amount.trim()) return '$0.00'
    if (isEstimateLoading) return '…'
    const totalUsd = seniorShareUsdRaw + juniorShareUsdRaw
    if (totalUsd <= 0n) return '$0.00'
    return `$${formatVaultBalanceDisplay(totalUsd, usdScale, 2)}`
  }, [amount, isEstimateLoading, juniorShareUsdRaw, seniorShareUsdRaw, usdScale])

  const redeemUsdLabel = `$${mockEstimateRedeemUsd(amount)}`

  const mintedGraiLabel = !amount.trim()
    ? '0.00'
    : isEstimateLoading
      ? '…'
      : estimatedGrai ?? '0.00'

  const isPending = actionView === 'mint' ? isMinting : isBurning

  const handleSubmit = useCallback(async () => {
    const isMint = actionView === 'mint'
    const toastId = toast.loading(isMint ? 'Minting GRAI…' : 'Redeeming GRAI…')
    try {
      const signature = isMint
        ? await mintGrai({
            assetMint: selectedAsset?.address ?? '',
            amountInput: amount,
            assetDecimals: decimals ?? undefined,
          })
        : await burnGrai({ amountInput: amount, graiDecimals: decimals ?? undefined })
      toast.update(toastId, {
        render: (
          <GraiTransactionToast
            message={isMint ? 'Mint successful' : 'Redeem successful'}
            explorerHref={signature ? explorerTxUrl(signature) : null}
          />
        ),
        type: 'success',
        isLoading: false,
        autoClose: 8000,
        closeOnClick: true,
      })
      setAmount('')
      void refreshWalletBalance()
    } catch (error) {
      toast.update(toastId, {
        render: error instanceof Error ? error.message : 'Transaction failed',
        type: 'error',
        isLoading: false,
        autoClose: 8000,
        closeOnClick: true,
      })
    }
  }, [actionView, amount, burnGrai, decimals, explorerTxUrl, mintGrai, refreshWalletBalance, selectedAsset?.address])

  return (
    <div className="grai-actions-row grai-actions-row-mint">
      <div className="grai-action-card grai-mint">
        <GraiActionSwitch actionView={actionView} onActionViewChange={onActionViewChange} />
        <div className="grai-action-content">
          <GraiAmountInput
            key={actionView}
            label={actionView === 'mint' ? 'Asset Amount' : 'Token Amount'}
            assets={actionView === 'mint' ? mintAssetOptions : redeemAssetOptions}
            defaultAsset={actionView === 'mint' ? mintAssetOptions[0]?.symbol : 'GRAI'}
            value={amount}
            onValueChange={setAmount}
            onAssetChange={setSelectedAsset}
            balanceLabel={isWalletConnected ? balanceLabel : '—'}
            maxAmount={maxAmount}
            decimals={decimals}
            usdLabel={actionView === 'mint' ? mintUsdLabel : redeemUsdLabel}
          />
          <div className="grai-action-result" aria-live="polite">
            {actionView === 'mint' ? (
              <>
                <span className="grai-action-result-label">Will be minted:</span>
                <span className="grai-action-result-value">
                  {mintedGraiLabel}
                  <img src={assetUrl('logo.png')} alt="" width={18} height={18} loading="lazy" decoding="async" />
                  GRAI
                </span>
              </>
            ) : (
              <>
                <span className="grai-action-result-label">Will be redeemed:</span>
                <span className="grai-action-result-value">{redeemUsdLabel}</span>
              </>
            )}
          </div>
          {isWalletConnected ? (
            <button
              type="button"
              className={actionView === 'mint' ? 'grai-mint-btn' : 'grai-burn-btn'}
              disabled={isPending || !amount.trim() || (actionView === 'mint' && !selectedAsset?.address)}
              onClick={() => {
                void handleSubmit()
              }}
            >
              {actionView === 'mint'
                ? isMinting
                  ? 'Minting...'
                  : 'Mint'
                : isBurning
                  ? 'Redeeming...'
                  : 'Redeem'}
            </button>
          ) : (
            <GraiActionConnectWalletButton onConnect={openChainSelector} />
          )}
        </div>
      </div>
    </div>
  )
}
