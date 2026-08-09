import CommentThread from '@/components/plantation/CommentThread'
import { addBookingComment, removeBookingComment } from '@/data/bookingCommentsRepo'
import { logActivity } from '@/data/activityLogRepo'

/**
 * BookingComments — comments panel for one plants-booked row (thin wrapper over
 * CommentThread). Logs each comment to the plantation Road Map.
 *
 * Props: booking, comments (all), reload, users [{value,label}], currentUserId,
 * currentUserName, onClose.
 */
const rid = () => Math.random().toString(36).slice(2, 8)

export default function BookingComments({ booking, comments, reload, users, currentUserId, currentUserName, onClose }) {
  if (!booking) return null
  const mine = comments.filter((c) => c.bookingId === booking.id).sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || ''))

  const onAdd = async ({ body, mentions }) => {
    await addBookingComment({ id: 'cmt-' + rid(), bookingId: booking.id, body, mentions, authorId: currentUserId, authorName: currentUserName, createdAt: new Date().toISOString() })
    logActivity({ category: 'comment', description: `Comment on ${booking.crop || 'booking'}${booking.variety ? ' · ' + booking.variety : ''}: "${body}"`, meta: { bookingId: booking.id }, actorId: currentUserId, actorName: currentUserName }).catch((e) => console.error('log failed', e))
    await reload()
  }
  const onDelete = async (c) => { await removeBookingComment(c.id); await reload() }

  const title = `${booking.crop || 'Booking'}${booking.variety ? ' · ' + booking.variety : ''}${booking.nursery ? ' · ' + booking.nursery : ''}`
  return (
    <CommentThread
      open title={<><i className="ri-chat-3-line me-2 text-primary" />Comments — {title}</>}
      comments={mine} users={users} currentUserId={currentUserId}
      onAdd={onAdd} onDelete={onDelete} onClose={onClose}
    />
  )
}
