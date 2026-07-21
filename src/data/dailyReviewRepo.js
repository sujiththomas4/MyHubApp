import { useCollection, upsertRow, deleteRow } from '@/lib/api'

/**
 * dailyReviewRepo.js — end-of-day honesty check.
 *
 * One row per trading day recording which of the defined mistakes were actually
 * committed. Keyed by date, so saving twice in a day updates rather than
 * duplicates. `mistakes` stores mistake IDs from dailyReview.js, so the config
 * can gain or lose entries without a migration.
 *
 * Supabase when configured, localStorage otherwise — same as the other repos.
 */
export const staticReviews = []

const rowToReview = (r) => ({
  date: r.date,
  mistakes: r.mistakes || [],
  note: r.note || '',
  updatedAt: r.updated_at || null,
})

/** All reviews, newest day first. */
export function useDailyReviews() {
  const { data } = useCollection('daily_reviews', staticReviews, {
    orderBy: 'date',
    ascending: false,
    map: rowToReview,
  })
  // Supabase orders server-side; the local fallback returns insertion order.
  return [...data].sort((a, b) => (b.date || '').localeCompare(a.date || ''))
}

/** Create or replace a day's review. */
export const saveDailyReview = ({ date, mistakes = [], note = '' }) => {
  const row = { date, mistakes, note }
  return upsertRow('daily_reviews', { ...row, updated_at: new Date().toISOString() }, 'date')
}

/** Remove a day's review entirely. */
export const removeDailyReview = (date) =>
  deleteRow('daily_reviews', date, 'date')
