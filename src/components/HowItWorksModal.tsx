import { lazy, Suspense, useCallback, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import './HowItWorksModal.css'

const GraiTokenFlowDiagram = lazy(() =>
  import('./GraiTokenFlowDiagram').then((m) => ({ default: m.GraiTokenFlowDiagram })),
)

function HowItWorksLoading() {
  return (
    <div className="hiw-modal-loading" role="status" aria-live="polite">
      <span className="hiw-modal-loading-spinner" aria-hidden="true" />
      <span>Loading information…</span>
    </div>
  )
}

interface HowItWorksModalProps {
  isOpen: boolean
  onClose: () => void
}

export function HowItWorksModal({ isOpen, onClose }: HowItWorksModalProps) {
  const backdropDismissArmedRef = useRef(false)

  useEffect(() => {
    if (!isOpen) {
      backdropDismissArmedRef.current = false
      return
    }

    backdropDismissArmedRef.current = false
    const armTimer = window.setTimeout(() => {
      backdropDismissArmedRef.current = true
    }, 300)

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      window.clearTimeout(armTimer)
      window.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = previousOverflow
    }
  }, [isOpen, onClose])

  const handleBackdropClick = useCallback(
    (event: React.MouseEvent) => {
      if (!backdropDismissArmedRef.current) return
      if (event.target === event.currentTarget) onClose()
    },
    [onClose],
  )

  if (!isOpen) return null

  return createPortal(
    <div className="hiw-modal-backdrop" onClick={handleBackdropClick}>
      <div
        className="hiw-modal"
        role="dialog"
        aria-modal="true"
        aria-label="How GrindURUS works"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="hiw-modal-header">
          <h2 className="hiw-modal-title">How it works</h2>
          <button type="button" className="hiw-modal-close" onClick={onClose} aria-label="Close">
            <X aria-hidden="true" />
          </button>
        </div>
        <div className="hiw-modal-body">
          <Suspense fallback={<HowItWorksLoading />}>
            <GraiTokenFlowDiagram />
          </Suspense>
        </div>
      </div>
    </div>,
    document.body,
  )
}
