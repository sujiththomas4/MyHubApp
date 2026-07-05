import { useState, useRef, useEffect } from 'react'
import { useTheme } from '@/context/ThemeContext'
import { useAuth } from '@/context/AuthContext'

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
  const { signOut } = useAuth()
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
            <span className="topbar-badge badge rounded-pill bg-danger">3</span>
          </button>
          {openMenu === 'notif' && (
            <div className="hub-dropdown-menu">
              <div className="dd-header d-flex justify-content-between">
                <span>Notifications</span>
                <span className="badge bg-light text-dark">4 New</span>
              </div>
              {[
                { icon: 'ri-shopping-cart-line', text: 'Your order #VZ2112 was placed.', time: '30 sec ago' },
                { icon: 'ri-user-add-line', text: 'Angela Bernier commented on your report.', time: '48 min ago' },
                { icon: 'ri-mail-line', text: 'You received 20 new messages.', time: '2 hrs ago' },
              ].map((n, i) => (
                <div className="hub-dropdown-item" key={i}>
                  <span className="avatar-xs">
                    <span className="avatar-title bg-primary-subtle text-primary">
                      <i className={n.icon} />
                    </span>
                  </span>
                  <span className="flex-grow-1">
                    <span className="d-block">{n.text}</span>
                    <small className="text-muted">{n.time}</small>
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
              <span className="avatar-title bg-primary text-white rounded-circle">S</span>
            </span>
            <span className="d-none d-xl-inline text-start" style={{ lineHeight: 1.1 }}>
              <span className="d-block fw-medium" style={{ fontSize: '0.8rem' }}>Sujith Thomas</span>
              <small className="text-muted" style={{ fontSize: '0.65rem' }}>Founder</small>
            </span>
          </button>
          {openMenu === 'user' && (
            <div className="hub-dropdown-menu" style={{ minWidth: 200 }}>
              <div className="hub-dropdown-item"><i className="ri-user-line" /> Profile</div>
              <div className="hub-dropdown-item"><i className="ri-wallet-line" /> Balance: <b className="ms-1">$5,971.67</b></div>
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
