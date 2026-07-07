type Props = {
  message: string
  explorerHref?: string | null
}

export function GraiTransactionToast({ message, explorerHref }: Props) {
  return (
    <span className="grai-tx-toast">
      <span>{message}</span>
      {explorerHref ? (
        <a href={explorerHref} target="_blank" rel="noreferrer">
          View on explorer
        </a>
      ) : null}
    </span>
  )
}
