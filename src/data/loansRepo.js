import { useCollection, insertRow, updateRow, deleteRow, upsertRow } from '@/lib/api'
import { loans as staticLoans, installments as staticInstallments } from '@/data/AppData'

/** Loans + installments + lump-sum prepayments (Supabase or localStorage). */
const rowToLoan = (r) => ({
  id: r.id, bankName: r.bank_name, amount: Number(r.amount), currency: r.currency,
  startDate: r.start_date, endDate: r.end_date, emi: Number(r.emi),
  outstandingAmount: Number(r.outstanding_amount), location: r.location,
})
const rowToInstallment = (r) => ({
  id: r.id, loanId: r.loan_id, number: r.number, date: r.date, amount: Number(r.amount), status: r.status,
})
const rowToPrepayment = (r) => ({ id: r.id, loanId: r.loan_id, date: r.date, amount: Number(r.amount), note: r.note || '' })

export function useLoans() {
  const { data } = useCollection('loans', staticLoans, { map: rowToLoan })
  return data
}
export function useInstallments() {
  const { data } = useCollection('installments', staticInstallments, { map: rowToInstallment })
  return data
}
export function usePrepayments() {
  const { data } = useCollection('loan_prepayments', [], { map: rowToPrepayment })
  return data
}

// Prepayments
export const addPrepayment = (p) =>
  insertRow('loan_prepayments', { id: p.id, loan_id: p.loanId, date: p.date, amount: p.amount, note: p.note })
export const removePrepayment = (id) =>
  deleteRow('loan_prepayments', id)

// Mark an installment paid / not paid (updates the stored row's status).
export const setInstallmentStatus = (id, status) =>
  updateRow('installments', id, { status })

// Mark an installment paid / not paid, creating the row if it does not exist yet
// (the detail page auto-generates months past the last seeded EMI, so those rows
// need an insert-or-update, not a plain update).
export const saveInstallment = (i) =>
  upsertRow('installments', { id: i.id, loan_id: i.loanId, number: i.number, date: i.date, amount: i.amount, status: i.status })
