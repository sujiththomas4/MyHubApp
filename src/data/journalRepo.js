import { useCollection, insertRow, updateRow, deleteRow, upsertRow, uploadImage } from '@/lib/api'
import { isSupabaseConfigured } from '@/lib/supabase'
import { localInsert, localUpdate, localDelete, localUpsert } from '@/lib/localdb'

/**
 * journalRepo.js — trading journal: days (+ premarket), trades, notes.
 * Supabase or localStorage. The Journal page joins these into per-day objects.
 */
export const staticDays = [
  { date: '2026-07-03', note: 'Choppy expiry-ish day. Stuck to plan mostly.', premarket: { dow: 'Bullish', crude: 'Bearish', dollar: 'Bearish', giftNifty: 'Bullish', niftyPreOpen: 'Bullish', advances: '32', declines: '18' } },
  { date: '2026-07-04', note: 'One clean trade, walked away. Good discipline.', premarket: { dow: 'Bearish', crude: 'Bullish', dollar: 'Bullish', giftNifty: 'Bearish', niftyPreOpen: 'Bearish', advances: '14', declines: '36' } },
]
export const staticTrades = [
  { id: 't1', day: '2026-07-03', time: '09:32', instrument: 'NIFTY 24500 CE', side: 'Buy', qty: 75, entry: 142.5, exit: 168.0, pnl: 1912, answers: { global: 'Bullish', oi: 'Strong Bullish', vix: 'Falling', bias15: 'Bullish', bias1h: 'Bullish', sr: 'Support', fomo: 'No', maxqty: 'Yes', sl: 'Yes', avg: 'Yes', maxQtyValue: '75', slValue: '120' } },
  { id: 't2', day: '2026-07-03', time: '13:05', instrument: 'BANKNIFTY 51500 PE', side: 'Buy', qty: 30, entry: 210, exit: 176, pnl: -1020, answers: { global: 'Neutral', oi: 'Bullish → turning Bearish', vix: 'Rising', bias15: 'Bearish', bias1h: 'Bullish', sr: 'Neither / mid-range', fomo: 'Yes', maxqty: 'Yes', sl: 'No', avg: 'Yes', maxQtyValue: '30' } },
  { id: 't3', day: '2026-07-04', time: '10:12', instrument: 'NIFTY 24600 PE', side: 'Buy', qty: 75, entry: 98, exit: 134, pnl: 2700, answers: { global: 'Bearish', oi: 'Strong Bearish', vix: 'High', bias15: 'Bearish', bias1h: 'Bearish', sr: 'Resistance', fomo: 'No', maxqty: 'Yes', sl: 'Yes', avg: 'Yes', maxQtyValue: '75', slValue: '80' } },
]
export const staticNotes = [
  { id: 'n1', day: '2026-07-03', time: '11:40', text: 'PCR flipping around 1.0, market indecisive at the pivot. Waiting for a clean break.', answers: { global: 'Neutral', oi: 'Neutral', vix: 'Rising', bias15: 'Neutral', bias1h: 'Bullish', sr: 'Neither / mid-range' } },
]

const rowToDay = (r) => ({ date: r.date, note: r.note || '', premarket: r.premarket || {} })
const rowToTrade = (r) => ({ id: r.id, day: r.day, time: r.time, instrument: r.instrument, side: r.side, qty: r.qty, entry: r.entry, exit: r.exit, pnl: r.pnl, answers: r.answers || {} })
const rowToNote = (r) => ({ id: r.id, day: r.day, time: r.time, text: r.text, image: r.image || null, answers: r.answers || {} })

const tradeToRow = (t) => ({ id: t.id, day: t.day, time: t.time, instrument: t.instrument, side: t.side, qty: t.qty, entry: t.entry, exit: t.exit, pnl: t.pnl, answers: t.answers || {} })
const noteToRow = (n) => ({ id: n.id, day: n.day, time: n.time, text: n.text, image: n.image || null, answers: n.answers || {} })

// If the note carries a freshly-attached data-URL image, upload it to Storage
// and swap in the hosted URL (Supabase mode only).
const dataUrlToBlob = (dataUrl) => {
  const [meta, b64] = dataUrl.split(',')
  const mime = (meta.match(/:(.*?);/) || [])[1] || 'image/png'
  const bin = atob(b64)
  const arr = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i)
  return new Blob([arr], { type: mime })
}
async function withUploadedImage(n) {
  if (n.image && n.image.startsWith('data:')) {
    const url = await uploadImage(dataUrlToBlob(n.image), 'journal')
    return { ...n, image: url }
  }
  return n
}

export function useJournalDays() {
  const { data } = useCollection('journal_days', staticDays, { orderBy: 'date', ascending: false, map: rowToDay })
  return data
}
export function useJournalTrades() {
  const { data } = useCollection('journal_trades', staticTrades, { map: rowToTrade })
  return data
}
export function useJournalNotes() {
  const { data } = useCollection('journal_notes', staticNotes, { map: rowToNote })
  return data
}

export const addDay = (d) =>
  isSupabaseConfigured ? upsertRow('journal_days', { date: d.date, note: d.note, premarket: d.premarket }, 'date') : Promise.resolve(localUpsert('journal_days', staticDays, d, 'date'))
// Upsert so the day row is created if it doesn't exist yet.
export const setDayPremarket = (date, premarket) =>
  isSupabaseConfigured ? upsertRow('journal_days', { date, premarket }, 'date') : Promise.resolve(localUpsert('journal_days', staticDays, { date, premarket }, 'date'))
export const setDayNote = (date, note) =>
  isSupabaseConfigured ? upsertRow('journal_days', { date, note }, 'date') : Promise.resolve(localUpsert('journal_days', staticDays, { date, note }, 'date'))

export const addTrade = (t) =>
  isSupabaseConfigured ? insertRow('journal_trades', tradeToRow(t)) : Promise.resolve(localInsert('journal_trades', staticTrades, t))
export const editTrade = (t) =>
  isSupabaseConfigured ? updateRow('journal_trades', t.id, tradeToRow(t)) : Promise.resolve(localUpdate('journal_trades', staticTrades, t.id, t))
export const removeTrade = (id) =>
  isSupabaseConfigured ? deleteRow('journal_trades', id) : Promise.resolve(localDelete('journal_trades', staticTrades, id))

export const addNote = async (n) =>
  isSupabaseConfigured ? insertRow('journal_notes', noteToRow(await withUploadedImage(n))) : Promise.resolve(localInsert('journal_notes', staticNotes, n))
export const editNote = async (n) =>
  isSupabaseConfigured ? updateRow('journal_notes', n.id, noteToRow(await withUploadedImage(n))) : Promise.resolve(localUpdate('journal_notes', staticNotes, n.id, n))
export const removeNote = (id) =>
  isSupabaseConfigured ? deleteRow('journal_notes', id) : Promise.resolve(localDelete('journal_notes', staticNotes, id))
