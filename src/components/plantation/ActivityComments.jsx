import CommentThread from '@/components/plantation/CommentThread'
import { addActivityComment, removeActivityComment } from '@/data/activityCommentsRepo'
import { logActivity } from '@/data/activityLogRepo'

/**
 * ActivityComments — comments panel for one plantation activity (thin wrapper
 * over CommentThread). Anyone can comment; logs to the Road Map.
 *
 * Props: activity, comments (all), reload, users [{value,label}], currentUserId,
 * currentUserName, onClose.
 */
const rid = () => Math.random().toString(36).slice(2, 8)

export default function ActivityComments({ activity, comments, reload, users, currentUserId, currentUserName, onClose }) {
  if (!activity) return null
  const mine = comments.filter((c) => c.activityId === activity.id).sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || ''))

  const onAdd = async ({ body, mentions }) => {
    await addActivityComment({ id: 'acmt-' + rid(), activityId: activity.id, body, mentions, authorId: currentUserId, authorName: currentUserName, createdAt: new Date().toISOString() })
    const trimmed = body.length > 60 ? body.slice(0, 60) + '…' : body
    logActivity({ category: 'comment', description: `Comment on activity "${activity.activity}": "${trimmed}"`, meta: { activityId: activity.id }, actorId: currentUserId, actorName: currentUserName }).catch((e) => console.error('log failed', e))
    await reload()
  }
  const onDelete = async (c) => { await removeActivityComment(c.id); await reload() }

  return (
    <CommentThread
      open title={<><i className="ri-chat-3-line me-2 text-primary" />Comments — {activity.activity}</>}
      comments={mine} users={users} currentUserId={currentUserId}
      onAdd={onAdd} onDelete={onDelete} onClose={onClose}
    />
  )
}
