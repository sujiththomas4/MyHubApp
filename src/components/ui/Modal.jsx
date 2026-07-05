import { useEffect } from 'react'
import { createPortal } from 'react-dom'

/**
 * Modal.jsx
 * -----------------------------------------------------------------------------
 * Lightweight, React-controlled Bootstrap modal. We use Bootstrap's modal CSS
 * (already bundled) but drive open/close from React state instead of pulling in
 * bootstrap's JS bundle.
 *
 *   <Modal open={open} title="…" size="xl" onClose={fn}>…body…</Modal>
 *
 * Closes on backdrop click and Escape. Locks body scroll while open.
 */
export default function Modal({ open, title, size, onClose, children }) {
  useEffect(() => {
    if (!open) return
    const onKey = (e) => e.key === 'Escape' && onClose?.()
    document.addEventListener('keydown', onKey)
    document.body.classList.add('modal-open')
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.classList.remove('modal-open')
    }
  }, [open, onClose])

  if (!open) return null

  return createPortal(
    <>
      <div className="modal fade show d-block" tabIndex={-1} role="dialog" onMouseDown={onClose}>
        <div
          className={'modal-dialog modal-dialog-centered modal-dialog-scrollable' + (size ? ' modal-' + size : '')}
          role="document"
          onMouseDown={(e) => e.stopPropagation()}
        >
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">{title}</h5>
              <button type="button" className="btn-close" aria-label="Close" onClick={onClose} />
            </div>
            <div className="modal-body">{children}</div>
          </div>
        </div>
      </div>
      <div className="modal-backdrop fade show" />
    </>,
    document.body
  )
}
