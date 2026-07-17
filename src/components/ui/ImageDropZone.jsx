import { useRef, useState } from 'react'
import ImageLightbox from './ImageLightbox'

/**
 * ImageDropZone.jsx
 * -----------------------------------------------------------------------------
 * A single-image field for screenshots. Add an image by:
 *   - clicking the zone to arm it, then pasting (Ctrl/Cmd+V),
 *   - dragging & dropping an image file, or
 *   - clicking Browse.
 * Stores the image as a data URL via `onChange`. Click a filled zone's image to
 * view it full-screen.
 *
 *   <ImageDropZone value={dataUrl} onChange={setDataUrl} />
 *
 * Paste is bound to the ELEMENT, not the document, and the zone is focusable —
 * so with several zones on screen a paste only lands in the one you clicked.
 * (A document-level listener would fill every mounted zone at once.)
 */
export default function ImageDropZone({ value, onChange, minHeight = 200 }) {
  const inputRef = useRef(null)
  const [armed, setArmed] = useState(false)
  const [zoom, setZoom] = useState(false)

  const readFile = (file) => {
    if (!file || !file.type.startsWith('image/')) return
    const reader = new FileReader()
    reader.onload = () => onChange(reader.result)
    reader.readAsDataURL(file)
  }

  const handlePaste = (e) => {
    const item = Array.from(e.clipboardData?.items || []).find((i) => i.type.startsWith('image/'))
    if (!item) return
    e.preventDefault()
    readFile(item.getAsFile())
  }

  // Shared by both states so a filled zone can be re-pasted over.
  const zoneProps = {
    tabIndex: 0,
    onPaste: handlePaste,
    onFocus: () => setArmed(true),
    onBlur: () => setArmed(false),
    onDrop: (e) => { e.preventDefault(); readFile(e.dataTransfer?.files?.[0]) },
    onDragOver: (e) => e.preventDefault(),
  }

  if (value) {
    return (
      <>
        <div className={'imgdrop imgdrop-filled' + (armed ? ' armed' : '')} {...zoneProps}>
          <img src={value} alt="screenshot" role="button" onClick={() => setZoom(true)} />
          <div className="imgdrop-actions">
            <button
              type="button"
              className="btn btn-sm btn-dark"
              title="View larger"
              onClick={() => setZoom(true)}
            >
              <i className="ri-zoom-in-line" />
            </button>
            <button
              type="button"
              className="btn btn-sm btn-danger"
              title="Remove image"
              onClick={() => onChange(null)}
            >
              <i className="ri-delete-bin-line" />
            </button>
          </div>
        </div>
        {zoom && <ImageLightbox src={value} onClose={() => setZoom(false)} />}
      </>
    )
  }

  return (
    <>
      <div className={'imgdrop imgdrop-empty' + (armed ? ' armed' : '')} style={{ minHeight }} {...zoneProps}>
        <i className="ri-image-add-line" />
        <div className="small mt-1">
          {armed
            ? 'Ready — press Ctrl/Cmd+V to paste'
            : 'Click here, then paste (Ctrl/Cmd+V) — or drop an image'}
        </div>
        <button type="button" className="imgdrop-browse" onClick={() => inputRef.current?.click()}>
          <i className="ri-folder-open-line me-1" />Browse
        </button>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => { readFile(e.target.files?.[0]); e.target.value = '' }}
      />
    </>
  )
}
