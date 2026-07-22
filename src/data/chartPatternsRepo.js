import { useCollection, insertRow, updateRow, deleteRow, uploadImage } from '@/lib/api'

/** Chart patterns (Supabase + Storage for images, or localStorage). */
export const staticPatterns = [
  {
    id: 'p1', title: 'VWAP reclaim breakout', timeframe: '5m', image: null,
    conditions: ['Price above VWAP', 'High volume breakout', '9 EMA support'],
    notes: 'Price reclaims VWAP on a high-volume breakout candle; 9 EMA holds as support on the retest. Enter on the retest hold, SL below 9 EMA.',
  },
  {
    id: 'p2', title: 'Inside-CPR low-volume fade', timeframe: '3m', image: null,
    conditions: ['Camarilla within CPR resistance', 'Big candle, low volume', '20 EMA resistance'],
    notes: 'Narrow CPR, price coiled inside. A big candle on low volume into 20 EMA fails — fade back toward the pivot.',
  },
]

const rowToPattern = (r) => ({
  id: r.id, title: r.title, timeframe: r.timeframe, image: r.image_url,
  conditions: r.conditions || [], notes: r.notes || '',
  featured: Boolean(r.featured), morning: Boolean(r.morning),
})

const dataUrlToBlob = (dataUrl) => {
  const [meta, b64] = dataUrl.split(',')
  const mime = (meta.match(/:(.*?);/) || [])[1] || 'image/png'
  const bin = atob(b64)
  const arr = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i)
  return new Blob([arr], { type: mime })
}

export function usePatterns() {
  const { data } = useCollection('chart_patterns', staticPatterns, { map: rowToPattern })
  return data
}

// App pattern -> DB row, uploading a freshly-attached (data-URL) image first so
// the row only ever stores a hosted URL.
async function toRow(p) {
  let image = p.image
  if (image && image.startsWith('data:')) image = await uploadImage(dataUrlToBlob(image), 'patterns')
  return {
    id: p.id, title: p.title, timeframe: p.timeframe, image_url: image || null,
    conditions: p.conditions, notes: p.notes,
    featured: Boolean(p.featured), morning: Boolean(p.morning),
  }
}

export async function addPattern(p) {
  return insertRow('chart_patterns', await toRow(p))
}

export async function editPattern(p) {
  return updateRow('chart_patterns', p.id, await toRow(p))
}

/** Toggle "check this daily" without reopening the pattern. */
export const setPatternFeatured = (id, featured) =>
  updateRow('chart_patterns', id, { featured })

/** Toggle "Morning Opening Trades" without reopening the pattern. */
export const setPatternMorning = (id, morning) =>
  updateRow('chart_patterns', id, { morning })

export const removePattern = (id) =>
  deleteRow('chart_patterns', id)
