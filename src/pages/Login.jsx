import { useState } from 'react'
import { useAuth } from '@/context/AuthContext'

/**
 * Login.jsx — email + password sign in (no emails, so no rate limits). Shown
 * only when Supabase is configured and there's no session. Create your user
 * with a password in Supabase → Authentication → Users → Add user.
 */
export default function Login() {
  const { signInWithPassword } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setErr(''); setBusy(true)
    const { error } = await signInWithPassword(email.trim(), password)
    setBusy(false)
    if (error) setErr(error.message)
  }

  return (
    <div className="d-flex align-items-center justify-content-center" style={{ minHeight: '100vh', padding: '1rem' }}>
      <div className="card" style={{ maxWidth: 420, width: '100%' }}>
        <div className="card-body p-4">
          <div className="text-center mb-4">
            <span className="logo-mark d-inline-flex mb-2"><i className="ri-flashlight-fill" /></span>
            <h4 className="mb-1">Wealth Hub</h4>
            <p className="text-muted mb-0">Sign in to continue</p>
          </div>

          <form onSubmit={submit}>
            <label className="form-label small mb-1">Email</label>
            <input
              type="email" required className="form-control mb-3" placeholder="you@example.com"
              value={email} onChange={(e) => setEmail(e.target.value)} autoFocus
            />
            <label className="form-label small mb-1">Password</label>
            <input
              type="password" required className="form-control mb-3" placeholder="••••••••"
              value={password} onChange={(e) => setPassword(e.target.value)}
            />
            {err && <div className="alert alert-danger py-2 small">{err}</div>}
            <button className="btn btn-primary w-100" disabled={busy}>
              {busy ? 'Signing in…' : <><i className="ri-login-box-line me-1" />Sign in</>}
            </button>
          </form>

          <p className="text-muted small text-center mt-3 mb-0">
            Create your login in Supabase → Authentication → Users → Add user (with a password &amp; Auto Confirm).
          </p>
        </div>
      </div>
    </div>
  )
}
