import { useCollection, updateRow } from '@/lib/api'

/**
 * profilesRepo.js — user profiles + roles. Only admins can read all rows / change
 * roles (enforced by RLS); members can read only their own.
 */
const rowToProfile = (r) => ({
  id: r.id,
  email: r.email || '',
  fullName: r.full_name || '',
  displayName: r.display_name || '',
  role: r.role || 'plantation_member',
  designation: r.designation || '',
  createdAt: r.created_at || '',
})

/** Name to show for a profile in dropdowns/labels. */
export const personName = (p) => p.displayName || p.fullName || p.email || ''

export function useProfiles() {
  const { data, loading, error } = useCollection('profiles', [], {
    orderBy: 'email', ascending: true, map: rowToProfile,
  })
  return { profiles: data, loading, error }
}

export const setProfileRole = (id, role) => updateRow('profiles', id, { role })
export const setProfileDesignation = (id, designation) => updateRow('profiles', id, { designation: designation || null })
export const setProfileDisplayName = (id, name) => updateRow('profiles', id, { display_name: name || null })

export const ROLES = [
  { value: 'admin', label: 'Admin' },
  { value: 'plantation_member', label: 'Plantation Member' },
]
export const ROLE_LABEL = Object.fromEntries(ROLES.map((r) => [r.value, r.label]))

export const DESIGNATIONS = ['', 'CEO', 'CFO', 'Partner', 'Supervisor', 'Manager', 'Accountant', 'Worker', 'Other']
