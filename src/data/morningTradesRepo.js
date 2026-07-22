import { useCollection, insertRow, updateRow, deleteRow, uploadImage } from '@/lib/api'

/**
 * morningTradesRepo.js — dated pre-open observations.
 *
 * Each row: a global-market screenshot, a chart screenshot, a rich-text note,
 * market breadth (advances/declines) and the pre-market move (+/-). Images live
 * in Storage; the row holds their URLs. Backend-only, like every other repo.
 */
export const staticMorningTrades = []

const rowToTrade = (r) => ({
  id: r.id,
  date: r.date,
  observation: r.observation || '',
  advances: r.advances ?? '',
  declines: r.declines ?? '',
  premarket: r.premarket ?? '',
  premarketImage: r.premarket_image || null,   // "Nifty pre-market opening"
  globalImage: r.global_image || null,         // "Global market opening"
  cePrevImage: r.ce_prev_image || null,
  pePrevImage: r.pe_prev_image || null,
  nifty5Image: r.nifty5_image || null,
  ce5Image: r.ce5_image || null,
  pe5Image: r.pe5_image || null,
  nifty5Change: r.nifty5_change ?? '',
  ce5Change: r.ce5_change ?? '',
  pe5Change: r.pe5_change ?? '',
})

// data: URL -> hosted Storage URL; anything else passes through unchanged.
const dataUrlToBlob = (dataUrl) => {
  const [meta, b64] = dataUrl.split(',')
  const mime = (meta.match(/:(.*?);/) || [])[1] || 'image/png'
  const bin = atob(b64)
  const arr = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i)
  return new Blob([arr], { type: mime })
}
const hostImage = async (v) =>
  typeof v === 'string' && v.startsWith('data:')
    ? await uploadImage(dataUrlToBlob(v), 'morning')
    : v

const numOrNull = (v) => (v === '' || v == null ? null : Number(v))

/* App object -> DB row, uploading any freshly-attached (data-URL) images first
   so the row only ever stores hosted URLs, never multi-MB base64. */
async function toRow(t) {
  return {
    id: t.id,
    date: t.date,
    observation: t.observation || '',
    advances: numOrNull(t.advances),
    declines: numOrNull(t.declines),
    premarket: numOrNull(t.premarket),
    premarket_image: await hostImage(t.premarketImage),
    global_image: await hostImage(t.globalImage),
    ce_prev_image: await hostImage(t.cePrevImage),
    pe_prev_image: await hostImage(t.pePrevImage),
    nifty5_image: await hostImage(t.nifty5Image),
    ce5_image: await hostImage(t.ce5Image),
    pe5_image: await hostImage(t.pe5Image),
    nifty5_change: numOrNull(t.nifty5Change),
    ce5_change: numOrNull(t.ce5Change),
    pe5_change: numOrNull(t.pe5Change),
    updated_at: new Date().toISOString(),
  }
}

/** All morning trades, newest day first. */
export function useMorningTrades() {
  const { data } = useCollection('morning_trades', staticMorningTrades, {
    orderBy: 'date', ascending: false, map: rowToTrade,
  })
  return [...data].sort((a, b) => (b.date || '').localeCompare(a.date || ''))
}

export const addMorningTrade = async (t) => insertRow('morning_trades', await toRow(t))
export const editMorningTrade = async (t) => updateRow('morning_trades', t.id, await toRow(t))
export const removeMorningTrade = (id) => deleteRow('morning_trades', id)
