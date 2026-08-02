import { useCollection, insertRow, updateRow, deleteRow } from '@/lib/api'

/**
 * strategiesRepo.js — trading strategies playbook. Each strategy defines its OWN
 * columns (dynamic schema): a column is either free text or a dropdown with a
 * list of options. col_defs holds the column definitions, col_values holds this
 * strategy's value for each column. Backend-only.
 */
const iso = () => new Date().toISOString()

const cleanColumns = (cols) =>
  (Array.isArray(cols) ? cols : [])
    .map((c) => ({
      id: c.id,
      name: (c.name || '').trim(),
      type: c.type === 'select' ? 'select' : 'text',
      options: Array.isArray(c.options) ? [...new Set(c.options.map((o) => String(o).trim()).filter(Boolean))] : [],
      star: !!c.star,
    }))
    .filter((c) => c.id && c.name)

const rowToStrategy = (r) => ({
  id: r.id,
  name: r.name || '',
  columns: Array.isArray(r.col_defs) ? r.col_defs : [],
  values: r.col_values && typeof r.col_values === 'object' ? r.col_values : {},
  sortOrder: r.sort_order ?? 0,
})

const strategyToRow = (x) => ({
  id: x.id,
  name: (x.name || '').trim(),
  col_defs: cleanColumns(x.columns),
  col_values: x.values && typeof x.values === 'object' ? x.values : {},
  sort_order: x.sortOrder ?? 0,
  updated_at: iso(),
})

export function useStrategies() {
  const { data, loading, error, reload } = useCollection('trading_strategies', [], { orderBy: 'sort_order', ascending: true, map: rowToStrategy })
  return { strategies: data, loading, error, reload }
}
export const addStrategy = (x) => insertRow('trading_strategies', strategyToRow(x))
export const editStrategy = (x) => updateRow('trading_strategies', x.id, strategyToRow(x))
export const removeStrategy = (id) => deleteRow('trading_strategies', id)
