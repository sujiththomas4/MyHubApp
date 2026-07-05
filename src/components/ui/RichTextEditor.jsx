import { useEffect, useRef } from 'react'

/**
 * RichTextEditor.jsx
 * -----------------------------------------------------------------------------
 * Minimal contentEditable rich-text field. Supports basic formatting plus
 * inline images — you can PASTE a screenshot (Ctrl/Cmd+V), drag-drop an image,
 * or use the toolbar's image button. Images embed as data URLs.
 *
 *   <RichTextEditor value={html} onChange={setHtml} placeholder="…" />
 *
 * Uncontrolled internally (the DOM owns the caret): the initial `value` is
 * written once on mount, and every edit is pushed back out via `onChange` as an
 * HTML string. Pasting external content is coerced to plain text (+ images) so
 * no arbitrary markup enters the document.
 *
 * NOTE: rendered elsewhere with dangerouslySetInnerHTML — fine here because we
 * only ever insert text nodes and our own <img> tags. Add a sanitizer if this
 * ever accepts untrusted HTML.
 */
export default function RichTextEditor({ value = '', onChange = () => {}, placeholder = '' }) {
  const ref = useRef(null)

  // Seed the initial HTML once; never write back into the DOM after mount
  // (that would reset the caret while typing).
  useEffect(() => {
    if (ref.current) ref.current.innerHTML = value || ''
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const emit = () => onChange(ref.current?.innerHTML || '')

  const exec = (cmd, arg) => {
    document.execCommand(cmd, false, arg)
    ref.current?.focus()
    emit()
  }

  const insertImageFile = (file) => {
    if (!file || !file.type.startsWith('image/')) return
    const reader = new FileReader()
    reader.onload = () => {
      ref.current?.focus()
      document.execCommand('insertImage', false, reader.result)
      emit()
    }
    reader.readAsDataURL(file)
  }

  const onPaste = (e) => {
    const items = Array.from(e.clipboardData?.items || [])
    const imageItem = items.find((it) => it.type.startsWith('image/'))
    if (imageItem) {
      e.preventDefault()
      insertImageFile(imageItem.getAsFile())
      return
    }
    // Strip external markup — paste as plain text only.
    e.preventDefault()
    const text = e.clipboardData.getData('text/plain')
    document.execCommand('insertText', false, text)
    emit()
  }

  const onDrop = (e) => {
    const file = e.dataTransfer?.files?.[0]
    if (file && file.type.startsWith('image/')) {
      e.preventDefault()
      insertImageFile(file)
    }
  }

  const pickImage = (e) => {
    insertImageFile(e.target.files?.[0])
    e.target.value = '' // allow re-picking the same file
  }

  const Btn = ({ cmd, arg, icon, title }) => (
    <button
      type="button"
      className="btn btn-sm btn-light"
      title={title}
      onMouseDown={(e) => e.preventDefault()} // keep selection/caret
      onClick={() => exec(cmd, arg)}
    >
      <i className={icon} />
    </button>
  )

  return (
    <div>
      <div className="rte-toolbar">
        <Btn cmd="bold" icon="ri-bold" title="Bold" />
        <Btn cmd="italic" icon="ri-italic" title="Italic" />
        <Btn cmd="underline" icon="ri-underline" title="Underline" />
        <span className="rte-sep" />
        <Btn cmd="insertUnorderedList" icon="ri-list-unordered" title="Bulleted list" />
        <Btn cmd="insertOrderedList" icon="ri-list-ordered" title="Numbered list" />
        <span className="rte-sep" />
        <label className="btn btn-sm btn-light mb-0" title="Insert image">
          <i className="ri-image-add-line" />
          <input type="file" accept="image/*" hidden onChange={pickImage} />
        </label>
      </div>
      <div
        ref={ref}
        className="rte"
        contentEditable
        suppressContentEditableWarning
        role="textbox"
        aria-multiline="true"
        data-placeholder={placeholder}
        onInput={emit}
        onPaste={onPaste}
        onDrop={onDrop}
        onDragOver={(e) => e.preventDefault()}
      />
    </div>
  )
}
