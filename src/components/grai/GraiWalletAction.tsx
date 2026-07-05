import { assetUrl } from '../../utils/appPaths'
import { WalletIcon } from '../WalletIcon'
import { GraiFieldInfoButton } from './GraiFieldInfo'
import { MINT_ASSET_SOLSCAN_ICON } from './graiPageIcons'

export function GraiWalletBalanceSlot({
  label,
  symbol,
  isConnected,
}: {
  label: string
  symbol?: string
  isConnected: boolean
}) {
  if (!isConnected) {
    return (
      <span className="grai-wallet-action-slot">
        <span className="grai-wallet-balance">—</span>
      </span>
    )
  }

  const trimmedSymbol = symbol?.trim()
  const symbolSuffix = trimmedSymbol ? ` ${trimmedSymbol}` : ''
  const amount =
    trimmedSymbol && label.endsWith(symbolSuffix)
      ? label.slice(0, -symbolSuffix.length).trimEnd()
      : label

  return (
    <span className="grai-wallet-action-slot">
      <span className="grai-wallet-balance">
        {trimmedSymbol ? (
          <>
            <span className="grai-wallet-balance-amount">{amount}</span>
            <span className="grai-wallet-balance-symbol">{trimmedSymbol}</span>
          </>
        ) : (
          label
        )}
      </span>
    </span>
  )
}

export function GraiWalletActorRow({
  label,
  hint,
  isConnected,
  shortAddress,
  connectedWalletAddress,
  walletCopied,
  onCopyWallet,
  onConnect,
  solscanAccountUrl,
}: {
  label: string
  hint: string
  isConnected: boolean
  shortAddress?: string | null
  connectedWalletAddress?: string | null
  walletCopied: boolean
  onCopyWallet: () => void
  onConnect: () => void
  solscanAccountUrl: (address: string) => string
}) {
  return (
    <p className="grai-mint-feedback-wallet">
      <span className="grai-mint-asset-label-text">
        <span className="grai-balance-field-label-wrap">
          <span className="grai-field-label grai-field-label--with-icon">
            <span className="grai-field-label-icon" aria-hidden="true">
              <WalletIcon size={16} />
            </span>
            {label}
          </span>
          <GraiFieldInfoButton hint={hint} />
        </span>
        {isConnected && shortAddress && connectedWalletAddress ? (
          <span className="grai-mint-asset-address-actions">
            <span className="grai-mint-asset-short-address-wrap">
              <button
                type="button"
                className={`grai-mint-asset-short-address${walletCopied ? ' is-copied' : ''}`}
                onClick={() => {
                  void onCopyWallet()
                }}
                title={walletCopied ? 'Copied to clipboard' : connectedWalletAddress}
                aria-label={walletCopied ? 'Copied to clipboard' : 'Copy wallet address'}
              >
                {walletCopied ? 'Copied!' : shortAddress}
              </button>
            </span>
            <a
              href={solscanAccountUrl(connectedWalletAddress)}
              target="_blank"
              rel="noreferrer"
              className="grai-mint-asset-trigger-solscan"
              aria-label="View wallet on Solscan"
              title="View wallet on Solscan"
            >
              {MINT_ASSET_SOLSCAN_ICON}
            </a>
          </span>
        ) : (
          <span className="grai-mint-asset-address-actions">
            <button
              type="button"
              className="connect-wallet-btn grai-mint-feedback-wallet-connect"
              onClick={onConnect}
            >
              <WalletIcon />
              Connect Wallet
            </button>
          </span>
        )}
      </span>
    </p>
  )
}

export function GraiEstimateSuffix({ solscanHref }: { solscanHref?: string | null }) {
  return (
    <span className="grai-estimated-amount-suffix">
      <span className="grai-mint-asset-item-icon" aria-hidden="true">
        <img
          src={assetUrl('logo.png')}
          alt=""
          width={20}
          height={20}
          loading="lazy"
          decoding="async"
        />
      </span>
      GRAI
      {solscanHref ? (
        <a
          href={solscanHref}
          target="_blank"
          rel="noreferrer"
          className="grai-mint-asset-value-solscan"
          aria-label="View GRAI contract on Solscan"
          title="View GRAI contract on Solscan"
        >
          {MINT_ASSET_SOLSCAN_ICON}
        </a>
      ) : null}
    </span>
  )
}
