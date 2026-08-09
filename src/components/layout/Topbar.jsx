import { useState, useRef, useEffect } from 'react'
import { useTheme } from '@/context/ThemeContext'
import { useAuth } from '@/context/AuthContext'
import { PROFILE_MODES } from '@/data/menu'
import { usePlantationActivities } from '@/data/plantationRepo'

const todayISO = () => new Date().toISOString().slice(0, 10)
const dueLabel = (iso) => {
  if (!iso) return ''
  const d = new Date(iso + 'T00:00:00'); d.setHours(0, 0, 0, 0)
  const now = new Date(); now.setHours(0, 0, 0, 0)
  const days = Math.round((d - now) / 86400000)
  if (days === 0) return 'today'
  if (days === 1) return 'tomorrow'
  if (days === -1) return 'yesterday'
  if (days > 1) return `in ${days} days`
  return `${-days} days ago`
}

function useClickOutside(ref, handler) {
  useEffect(() => {
    function onClick(e) {
      if (ref.current && !ref.current.contains(e.target)) handler()
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [ref, handler])
}

export default function Topbar({ onHamburger, onOpenCustomizer }) {
  const { settings, setSetting } = useTheme()
  const { signOut, userName, isAdmin, session } = useAuth()
  const activities = usePlantationActivities()
  const uid = session?.user?.id || ''
  const today = todayISO()
  const mine = activities.filter((a) => Array.isArray(a.assignedTo) && a.assignedTo.includes(uid) && a.status !== 'done')
  const delayed = mine.filter((a) => a.dueDate && a.dueDate < today).sort((a, b) => a.dueDate.localeCompare(b.dueDate))
  const pending = mine.filter((a) => !a.dueDate || a.dueDate >= today).sort((a, b) => (a.dueDate || '').localeCompare(b.dueDate || ''))
  const notifItems = [...delayed.map((a) => ({ a, kind: 'delayed' })), ...pending.map((a) => ({ a, kind: 'pending' }))]
  const userInitial = (userName || '?').trim().charAt(0).toUpperCase() || '?'
  const roleLabel = isAdmin ? 'Admin' : 'Plantation Member'
  const [openMenu, setOpenMenu] = useState(null) // 'notif' | 'user' | null
  const notifRef = useRef(null)
  const userRef = useRef(null)

  useClickOutside(notifRef, () => setOpenMenu((m) => (m === 'notif' ? null : m)))
  useClickOutside(userRef, () => setOpenMenu((m) => (m === 'user' ? null : m)))

  const toggleColorScheme = () => {
    setSetting('colorScheme', settings.colorScheme === 'dark' ? 'light' : 'dark')
  }

  return (
    <header className="app-topbar">
      <div className="topbar-left">
        <a href="/" className="navbar-brand">
          <span className="logo-mark"><i className="ri-flashlight-fill" /></span>
          <span className="logo-text">Hub</span>
        </a>
      </div>

      <button className="hamburger-btn" aria-label="Toggle menu" onClick={onHamburger}>
        <i className="ri-menu-2-line" />
      </button>

      <div className="topbar-search ms-3 d-none d-md-block">
        <i className="ri-search-line search-icon" />
        <input type="text" placeholder="Search anything..." aria-label="Search" />
      </div>

      {/* Which sections of the nav are visible — see menuForMode(). */}
      <div className="profile-mode ms-3" role="group" aria-label="Profile mode">
        {PROFILE_MODES.map((m) => {
          const on = (settings.profileMode || 'full') === m.id
          return (
            <button
              key={m.id}
              type="button"
              className={'profile-mode-btn' + (on ? ' active' : '')}
              aria-pressed={on}
              title={`${m.label} mode — ${m.hint}`}
              onClick={() => setSetting('profileMode', m.id)}
            >
              <i className={m.icon} />
              <span>{m.label}</span>
            </button>
          )
        })}
      </div>

      <div className="topbar-actions">
        <button
          className="topbar-btn"
          aria-label="Toggle color scheme"
          onClick={toggleColorScheme}
          title="Light / Dark"
        >
          <i className={settings.colorScheme === 'dark' ? 'ri-sun-line' : 'ri-moon-line'} />
        </button>

        <button className="topbar-btn d-none d-sm-inline-flex" aria-label="Fullscreen"
          onClick={() => {
            if (!document.fullscreenElement) document.documentElement.requestFullscreen?.()
            else document.exitFullscreen?.()
          }}>
          <i className="ri-fullscreen-line" />
        </button>

        {/* Notifications */}
        <div className="hub-dropdown" ref={notifRef}>
          <button
            className="topbar-btn"
            aria-label="Notifications"
            onClick={() => setOpenMenu((m) => (m === 'notif' ? null : 'notif'))}
          >
            <i className="ri-notification-3-line" />
            {notifItems.length > 0 && (
              <span className={'topbar-badge badge rounded-pill ' + (delayed.length ? 'bg-danger' : 'bg-warning text-dark')}>{notifItems.length}</span>
            )}
          </button>
          {openMenu === 'notif' && (
            <div className="hub-dropdown-menu">
              <div className="dd-header d-flex justify-content-between">
                <span>My tasks</span>
                <span className="badge bg-light text-dark">{delayed.length} delayed · {pending.length} pending</span>
              </div>
              {notifItems.length === 0 ? (
                <div className="hub-dropdown-item text-muted"><span className="flex-grow-1">You are all caught up. 🎉</span></div>
              ) : notifItems.slice(0, 12).map(({ a, kind }) => (
                <div className="hub-dropdown-item" key={a.id}>
                  <span className="avatar-xs">
                    <span className={'avatar-title ' + (kind === 'delayed' ? 'bg-danger-subtle text-danger' : 'bg-warning-subtle text-warning')}>
                      <i className={kind === 'delayed' ? 'ri-alarm-warning-line' : 'ri-time-line'} />
                    </span>
                  </span>
                  <span className="flex-grow-1">
                    <span className="d-block">{a.activity}</span>
                    <small className={kind === 'delayed' ? 'text-danger' : 'text-muted'}>{kind === 'delayed' ? 'Delayed' : 'Due'} {dueLabel(a.dueDate)}</small>
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* User */}
        <div className="hub-dropdown" ref={userRef}>
          <button
            className="topbar-btn"
            style={{ width: 'auto', borderRadius: '2rem', padding: '0 0.5rem 0 0.25rem', gap: '0.5rem' }}
            aria-label="Account"
            onClick={() => setOpenMenu((m) => (m === 'user' ? null : 'user'))}
          >
            <span className="avatar-xs">
              <span className="avatar-title bg-primary text-white rounded-circle">{userInitial}</span>
            </span>
            <span className="d-none d-xl-inline text-start" style={{ lineHeight: 1.1 }}>
              <span className="d-block fw-medium" style={{ fontSize: '0.8rem' }}>{userName}</span>
              {roleLabel && <small className="text-muted" style={{ fontSize: '0.65rem' }}>{roleLabel}</small>}
            </span>
          </button>
          {openMenu === 'user' && (
            <div className="hub-dropdown-menu" style={{ minWidth: 200 }}>
              <div className="hub-dropdown-item"><i className="ri-user-line" /> {userName}</div>
              <div className="hub-dropdown-item" onClick={onOpenCustomizer}><i className="ri-settings-3-line" /> Settings</div>
              <div className="hub-dropdown-item"><i className="ri-lock-line" /> Lock screen</div>
              <div className="hub-dropdown-item text-danger" onClick={signOut}><i className="ri-logout-box-r-line" /> Logout</div>
            </div>
          )}
        </div>

        <button className="topbar-btn" aria-label="Settings" onClick={onOpenCustomizer}>
          <i className="ri-settings-3-line" />
        </button>
      </div>
    </header>
  )
}
