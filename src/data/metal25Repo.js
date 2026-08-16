import { useCollection, updateRow } from '@/lib/api'

/**
 * metal25Repo.js — Metal 25 ETF holdings (GOLDBEES / SILVERBEES). Allotments
 * reuse the ee_stock_allotments tables via focus25Repo (plan_code='METAL25').
 * Backend-only.
 */
const iso = () => new Date().toISOString()
const num = (v) => (v === '' || v == null ? 0 : Number(v) || 0)

export function useEtfHoldings() {
  const { data, loading, error, reload } = useCollection('ee_etf_holdings', [], { orderBy: 'display_order', ascending: true })
  return { holdings: data, loading, error, reload }
}
export const setEtfLtp = (id, ltp) => updateRow('ee_etf_holdings', id, { ltp: num(ltp), ltp_updated_at: iso() })
