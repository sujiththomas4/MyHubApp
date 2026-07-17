import { useEffect } from 'react'
import { createPortal } from 'react-dom'

/**
 * ImageLightbox.jsx
 * -----------------------------------------------------------------------------
 * Full-screen view of a single image. Click the backdrop, press Escape, or hit
 * the close button to dismiss.
 *
 *   {zoom && <ImageLightbox src={url} alt="Nifty 50" onClose={() => setZoom(false)} />}
 *
 * Rendered through a portal on <body> so it can't be clipped or out-stacked by
 * whatever card/modal it was opened from.
 */
export default function ImageLightbox({ src, alt = 'screenshot', onClose }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose?.() }
    document.addEventListener('keydown', onKey)
    // Stop the page behind from scrolling while the overlay is up.
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [onClose])

  if (!src) return null

  return createPortal(
    <div className="img-lightbox" role="dialog" aria-label={alt} onClick={onClose}>
      <button
        type="button"
        className="btn-close btn-close-white img-lightbox-close"
        aria-label="Close"
        onClick={onClose}
      />
      {/* stopPropagation so clicking the image itself doesn't dismiss */}
      <img src={src} alt={alt} onClick={(e) => e.stopPropagation()} />
      {alt && <div className="img-lightbox-caption">{alt}</div>}
    </div>,
    document.body
  )
}
