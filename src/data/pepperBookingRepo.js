import { useCollection, insertRow, updateRow, deleteRow } from '@/lib/api'

/**
 * pepperBookingRepo.js — pepper plant (sapling) bookings. Backend-only.
 */
const num = (v) => (v === '' || v == null ? 0 : Number(v))

const rowTo = (r) => ({
  id: r.id, crop: r.crop || 'Pepper', landId: r.land_id || '', nursery: r.nursery || '', phone: r.phone || '', address: r.address || '', variety: r.variety || '',
  plantType: r.plant_type || '', growthForm: r.growth_form || '', quantity: Number(r.quantity) || 0,
  rate: Number(r.rate) || 0, deliveryCharge: Number(r.delivery_charge) || 0, advance: Number(r.advance) || 0,
  bookingDate: r.booking_date || '', deliveryDate: r.delivery_date || '',
  status: r.status || 'booked', assigned: r.assigned || '', actions: r.actions || '', note: r.note || '',
})
const toRow = (x) => ({
  id: x.id, crop: x.crop || 'Pepper', land_id: x.landId || null, nursery: x.nursery, phone: x.phone || null, address: x.address || null, variety: x.variety || null,
  plant_type: x.plantType || null, growth_form: x.growthForm || null, quantity: num(x.quantity),
  rate: num(x.rate), delivery_charge: num(x.deliveryCharge), advance: num(x.advance),
  booking_date: x.bookingDate || null, delivery_date: x.deliveryDate || null,
  status: x.status || 'booked', assigned: x.assigned || null, actions: x.actions || null, note: x.note || null,
})

export function usePepperBookings() {
  const { data, loading, error } = useCollection('plantation_pepper_bookings', [], { orderBy: 'booking_date', ascending: false, map: rowTo })
  return { bookings: data, loading, error }
}
export const addBooking = (x) => insertRow('plantation_pepper_bookings', toRow(x))
export const editBooking = (x) => updateRow('plantation_pepper_bookings', x.id, toRow(x))
export const removeBooking = (id) => deleteRow('plantation_pepper_bookings', id)
