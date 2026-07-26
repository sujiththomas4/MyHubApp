import { fmtDate } from '@/data/AppData'
import { useAuth } from '@/context/AuthContext'
import { useProfiles, setProfileRole, setProfileDesignation, setProfileDisplayName, ROLES, ROLE_LABEL, DESIGNATIONS } from '@/data/profilesRepo'

/**
 * UsersRoles.jsx — admin-only. List users and switch each between Admin and
 * Plantation Member. Accounts are created in the Supabase dashboard; this screen
 * only assigns roles (RLS lets admins update any profile).
 */
const ROLE_BADGE = { admin: 'bg-primary-subtle text-primary', plantation_member: 'bg-success-subtle text-success' }

export default function UsersRoles() {
  const { session } = useAuth()
  const { profiles, loading, error } = useProfiles()
  const myId = session?.user?.id
  const admins = profiles.filter((p) => p.role === 'admin').length

  const changeRole = async (p, role) => { if (role !== p.role) await setProfileRole(p.id, role) }
  const changeDesignation = async (p, d) => { if (d !== p.designation) await setProfileDesignation(p.id, d) }
  const changeDisplayName = async (p, name) => { const v = name.trim(); if (v !== p.displayName) await setProfileDisplayName(p.id, v) }

  return (
    <div className="option-buying">
      <div className="page-title-box d-flex align-items-center">
        <h4 className="flex-grow-1 mb-0">Users &amp; Roles</h4>
        <nav aria-label="breadcrumb">
          <ol className="breadcrumb mb-0">
            <li className="breadcrumb-item"><a href="/">Hub</a></li>
            <li className="breadcrumb-item">System</li>
            <li className="breadcrumb-item active" aria-current="page">Users &amp; Roles</li>
          </ol>
        </nav>
      </div>

      <div className="alert alert-info d-flex align-items-center">
        <i className="ri-information-line me-2 fs-5" />
        <span>Create accounts in the <strong>Supabase dashboard</strong> (Authentication → Users). New users start as <strong>Plantation Member</strong>; promote them here.</span>
      </div>

      <div className="card mb-0">
        <div className="card-header d-flex align-items-center">
          <h5 className="card-title mb-0 flex-grow-1">Users</h5>
          <span className="text-muted small">{profiles.length} total · {admins} admin{admins === 1 ? '' : 's'}</span>
        </div>
        <div className="card-body p-0">
          {error && <div className="alert alert-danger m-3">{error.message}</div>}
          {loading && !profiles.length && <p className="text-muted text-center py-4 mb-0">Loading…</p>}
          {!loading && !profiles.length && !error && <p className="text-muted text-center py-4 mb-0">No users yet.</p>}
          {profiles.length > 0 && (
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light">
                  <tr><th>User</th><th style={{ width: 200 }}>Display name</th><th>Role</th><th style={{ width: 180 }}>Designation</th><th>Joined</th><th style={{ width: 190 }}>Set role</th></tr>
                </thead>
                <tbody>
                  {profiles.map((p) => (
                    <tr key={p.id}>
                      <td>
                        <div className="fw-medium">{p.email || p.id}{p.id === myId && <span className="badge bg-light text-muted ms-2">you</span>}</div>
                        {p.fullName && <div className="text-muted small">{p.fullName}</div>}
                      </td>
                      <td>
                        <input key={p.id + ':' + p.displayName} className="form-control form-control-sm" defaultValue={p.displayName}
                          placeholder="Display name" onBlur={(e) => changeDisplayName(p, e.target.value)} />
                      </td>
                      <td><span className={'badge ' + (ROLE_BADGE[p.role] || 'bg-secondary-subtle text-secondary')}>{ROLE_LABEL[p.role] || p.role}</span></td>
                      <td>
                        <select className="form-select form-select-sm" value={p.designation} onChange={(e) => changeDesignation(p, e.target.value)}>
                          {DESIGNATIONS.map((d) => <option key={d} value={d}>{d || '—'}</option>)}
                        </select>
                      </td>
                      <td className="text-muted">{p.createdAt ? fmtDate(p.createdAt.slice(0, 10)) : '—'}</td>
                      <td>
                        <select className="form-select form-select-sm" value={p.role} onChange={(e) => changeRole(p, e.target.value)}
                          disabled={p.id === myId && admins <= 1}
                          title={p.id === myId && admins <= 1 ? 'You are the only admin' : ''}>
                          {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
