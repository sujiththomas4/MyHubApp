import { useRef, useState } from 'react'
import Modal from '@/components/ui/Modal'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import { addBookingComment, removeBookingComment, timeAgo, fullDateTime } from '@/data/bookingCommentsRepo'
import { logActivity } from '@/data/activityLogRepo'

/**
 * BookingComments — a threaded comments panel for one plants-booked row.
 * Shows every comment with author + friendly time, and a composer that supports
 * @-mentioning users (type "@" then pick from the list).
 *
 * Props: booking, comments (all), reload, users [{value,label}], currentUserId,
 * currentUserName, onClose.
 */
const rid = () => Math.random().toString(36).slice(2, 8)
const initials = (name) => (name || '?').trim().split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase()

// Render a comment body with @mentions highlighted.
function Body({ text, names }) {
  if (!text) return null
  // Longest names first so multi-word names match before their first token.
  const sorted = [...names].sort((a, b) => b.length - a.length)
  const parts = []
  let rest = text
  let guard = 0
  while (rest && guard < 200) {
    guard++
    const at = rest.indexOf('@')
    if (at === -1) { parts.push(rest); break }
    parts.push(rest.slice(0, at))
    const after = rest.slice(at + 1)
    const hit = sorted.find((n) => after.toLowerCase().startsWith(n.toLowerCase()))
    if (hit) { parts.push(<span key={parts.length} className="badge bg-primary-subtle text-primary">@{hit}</span>); rest = after.slice(hit.length) }
    else { parts.push('@'); rest = after }
  }
  return <>{parts}</>
}

function Composer({ users, onSubmit }) {
  const [text, setText] = useState('')
  const [mentions, setMentions] = useState([])
  const [menu, setMenu] = useState(null) // { query, start }
  const [saving, setSaving] = useState(false)
  const ref = useRef(null)

  const onChange = (e) => {
    const val = e.target.value
    setText(val)
    const pos = e.target.selectionStart
    const m = val.slice(0, pos).match(/@(\w*)$/)
    setMenu(m ? { query: m[1].toLowerCase(), start: pos - m[0].length } : null)
  }
  const pick = (u) => {
    const pos = ref.current.selectionStart
    const next = text.slice(0, menu.start) + '@' + u.label + ' ' + text.slice(pos)
    setText(next)
    setMentions((s) => [...new Set([...s, u.value])])
    setMenu(null)
    setTimeout(() => ref.current && ref.current.focus(), 0)
  }
  const submit = async () => {
    const body = text.trim()
    if (!body) return
    setSaving(true)
    // Keep only mentions whose name still appears in the text.
    const kept = mentions.filter((id) => { const u = users.find((x) => x.value === id); return u && body.includes('@' + u.label) })
    try { await onSubmit({ body, mentions: kept }); setText(''); setMentions([]) }
    finally { setSaving(false) }
  }
  const suggestions = menu ? users.filter((u) => u.label.toLowerCase().includes(menu.query)).slice(0, 6) : []

  return (
    <div className="position-relative">
      <textarea ref={ref} className="form-control" rows={2} placeholder="Write a comment… use @ to mention someone"
        value={text} onChange={onChange}
        onKeyDown={(e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) submit() }} />
      {suggestions.length > 0 && (
        <div className="card shadow-sm position-absolute" style={{ zIndex: 1000, bottom: '100%', left: 0, minWidth: 200, marginBottom: 4 }}>
          <div className="card-body p-1">
            {suggestions.map((u) => (
              <button key={u.value} type="button" className="ss-item w-100 text-start" onClick={() => pick(u)}>
                <span className="avatar-xs d-inline-flex align-items-center justify-content-center rounded-circle bg-primary-subtle text-primary me-2" style={{ width: 24, height: 24, fontSize: 10 }}>{initials(u.label)}</span>
                {u.label}
              </button>
            ))}
          </div>
        </div>
      )}
      <div className="d-flex align-items-center gap-2 mt-2">
        <small className="text-muted flex-grow-1">Type <strong>@</strong> to mention · Ctrl/⌘+Enter to send</small>
        <button className="btn btn-primary btn-sm" onClick={submit} disabled={saving || !text.trim()}><i className="ri-send-plane-2-line me-1" />{saving ? 'Posting…' : 'Comment'}</button>
      </div>
    </div>
  )
}

export default function BookingComments({ booking, comments, reload, users, currentUserId, currentUserName, onClose }) {
  const [del, setDel] = useState(null)
  if (!booking) return null
  const names = users.map((u) => u.label)
  const mine = comments.filter((c) => c.bookingId === booking.id)
    .sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || ''))

  const add = async ({ body, mentions }) => {
    await addBookingComment({ id: 'cmt-' + rid(), bookingId: booking.id, body, mentions, authorId: currentUserId, authorName: currentUserName, createdAt: new Date().toISOString() })
    const trimmed = body.length > 60 ? body.slice(0, 60) + '…' : body
    logActivity({ category: 'comment', description: `Comment on ${booking.crop || 'booking'}${booking.variety ? ' · ' + booking.variety : ''}: "${trimmed}"`, meta: { bookingId: booking.id }, actorId: currentUserId, actorName: currentUserName }).catch((e) => console.error('log failed', e))
    await reload()
  }
  const confirmDelete = async () => { const t = del; setDel(null); await removeBookingComment(t.id); await reload() }

  const title = `${booking.crop || 'Booking'}${booking.variety ? ' · ' + booking.variety : ''}${booking.nursery ? ' · ' + booking.nursery : ''}`

  return (
    <Modal open size="lg" title={<><i className="ri-chat-3-line me-2 text-primary" />Comments — {title}</>} onClose={onClose}>
      <div className="d-flex flex-column gap-3" style={{ maxHeight: 380, overflowY: 'auto' }}>
        {mine.length === 0 ? (
          <p className="text-muted text-center py-3 mb-0">No comments yet. Start the thread below.</p>
        ) : mine.map((c) => (
          <div className="d-flex gap-2" key={c.id}>
            <span className="avatar-xs d-inline-flex align-items-center justify-content-center rounded-circle bg-secondary-subtle text-secondary flex-shrink-0" style={{ width: 34, height: 34, fontSize: 12 }}>{initials(c.authorName)}</span>
            <div className="flex-grow-1 min-w-0">
              <div className="d-flex align-items-center gap-2">
                <span className="fw-medium">{c.authorName || 'Someone'}</span>
                <span className="text-muted small" title={fullDateTime(c.createdAt)}>{timeAgo(c.createdAt)}</span>
                <span className="flex-grow-1" />
                {c.authorId === currentUserId && (
                  <button className="btn btn-sm btn-ghost-danger p-1" title="Delete" onClick={() => setDel(c)}><i className="ri-delete-bin-line" /></button>
                )}
              </div>
              <div className="text-body" style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}><Body text={c.body} names={names} /></div>
            </div>
          </div>
        ))}
      </div>

      <div className="border-top mt-3 pt-3">
        <Composer users={users} onSubmit={add} />
      </div>

      <ConfirmDialog
        open={Boolean(del)} title="Delete comment?" message="This comment will be permanently removed."
        confirmLabel="Delete" onConfirm={confirmDelete} onCancel={() => setDel(null)}
      />
    </Modal>
  )
}
