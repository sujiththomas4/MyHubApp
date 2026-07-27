import { useCollection, insertRow, updateRow, deleteRow } from '@/lib/api'

/**
 * fertilizersRepo.js — fertilizer / input reference library (backend-only).
 * A knowledge base of what each fertilizer does, its pros/cons, when to use it
 * and when not to, and its purpose (growth vs fixing plant defects).
 */
const iso = () => new Date().toISOString()

const rowToFert = (r) => ({
  id: r.id,
  name: r.name || '',
  section: r.section || '',
  purpose: r.purpose || '',
  whatItDoes: r.what_it_does || '',
  pros: r.pros || '',
  cons: r.cons || '',
  whenUse: r.when_use || '',
  whenNotUse: r.when_not_use || '',
  howToUse: r.how_to_use || '',
  dosage: r.dosage || '',
  referralName: r.referral_name || '',
  referralPhone: r.referral_phone || '',
  note: r.note || '',
  image: r.image || '',
  sortOrder: r.sort_order ?? 0,
})
const fertToRow = (x) => ({
  id: x.id,
  name: x.name,
  section: x.section || null,
  purpose: x.purpose || null,
  what_it_does: x.whatItDoes || null,
  pros: x.pros || null,
  cons: x.cons || null,
  when_use: x.whenUse || null,
  when_not_use: x.whenNotUse || null,
  how_to_use: x.howToUse || null,
  dosage: x.dosage || null,
  referral_name: x.referralName || null,
  referral_phone: x.referralPhone || null,
  note: x.note || null,
  image: x.image || null,
  sort_order: x.sortOrder ?? 0,
  updated_at: iso(),
})

export function useFertilizers() {
  const { data, loading, error } = useCollection('plantation_fertilizers', [], { orderBy: 'sort_order', ascending: true, map: rowToFert })
  return { fertilizers: data, loading, error }
}
export const addFertilizer = (x) => insertRow('plantation_fertilizers', fertToRow(x))
export const editFertilizer = (x) => updateRow('plantation_fertilizers', x.id, fertToRow(x))
export const removeFertilizer = (id) => deleteRow('plantation_fertilizers', id)

export const FERT_PURPOSE = [
  { value: '', label: '— select —' },
  { value: 'growth', label: 'Growth / nutrition' },
  { value: 'defect', label: 'Fix plant defect' },
  { value: 'pest', label: 'Pest / disease' },
  { value: 'soil', label: 'Soil health' },
  { value: 'general', label: 'General' },
  { value: 'other', label: 'Other' },
]
export const FERT_PURPOSE_LABEL = Object.fromEntries(FERT_PURPOSE.filter((p) => p.value).map((p) => [p.value, p.label]))
export const FERT_PURPOSE_BADGE = {
  growth: 'bg-success-subtle text-success',
  defect: 'bg-warning-subtle text-dark',
  pest: 'bg-danger-subtle text-danger',
  soil: 'bg-primary-subtle text-primary',
  general: 'bg-secondary-subtle text-secondary',
  other: 'bg-light text-muted',
}
