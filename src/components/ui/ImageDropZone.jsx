import { useEffect, useRef } from 'react'

/**
 * ImageDropZone.jsx
 * -----------------------------------------------------------------------------
 * A single-image field for screenshots. Add an image by:
 *   - pasting from the clipboard (Ctrl/Cmd+V) while this is mounted,
 *   - dragging & dropping an image file, or
 *   - clicking to browse.
 * Stores the image as a data URL via `onChange`.
 *
 *   <ImageDropZone value={dataUrl} onChange={setDataUrl} />
 *
 * The paste listener is document-level, so mount this inside an open modal (one
 * at a time) rather than in a list of many.
 */
export default function ImageDropZone({ value, onChange, minHeight = 200 }) {
  const inputRef = useRef(null)

  const readFile = (file) => {
    if (!file || !file.type.startsWith('image/')) return
    const reader = new FileReader()
    reader.onload = () => onChange(reader.result)
    reader.readAsDataURL(file)
  }

  useEffect(() => {
    const onPaste = (e) => {
      const item = Array.from(e.clipboardData?.items || []).find((i) => i.type.startsWith('image/'))
      if (item) {
        e.preventDefault()
        readFile(item.getAsFile())
      }
    }
    document.addEventListener('paste', onPaste)
    return () => document.removeEventListener('paste', onPaste)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (value) {
    return (
      <div className="imgdrop imgdrop-filled">
        <img src={value} alt="screenshot" />
        <button
          type="button"
          className="btn btn-sm btn-danger imgdrop-remove"
          title="Remove image"
          onClick={() => onChange(null)}
        >
          <i className="ri-delete-bin-line" />
        </button>
      </div>
    )
  }

  return (
    <>
      <div
        className="imgdrop imgdrop-empty"
        style={{ minHeight }}
        role="button"
        onClick={() => inputRef.current?.click()}
        onDrop={(e) => { e.preventDefault(); readFile(e.dataTransfer?.files?.[0]) }}
        onDragOver={(e) => e.preventDefault()}
      >
        <i className="ri-image-add-line" />
        <div className="small mt-1">Paste a screenshot (Ctrl/Cmd+V), drop an image, or click to browse</div>
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
