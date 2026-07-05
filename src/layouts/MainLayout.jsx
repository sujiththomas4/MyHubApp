import { useState, useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Topbar from '@/components/layout/Topbar'
import Sidebar from '@/components/layout/Sidebar'
import HorizontalMenu from '@/components/layout/HorizontalMenu'
import Footer from '@/components/layout/Footer'
import ThemeCustomizer from '@/components/layout/ThemeCustomizer'
import { useTheme } from '@/context/ThemeContext'

export default function MainLayout() {
  const { settings } = useTheme()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [customizerOpen, setCustomizerOpen] = useState(false)
  const location = useLocation()

  // Close the mobile drawer whenever the route changes.
  useEffect(() => {
    setMobileOpen(false)
  }, [location.pathname])

  // Toggle a body class the CSS uses to slide the mobile drawer in.
  useEffect(() => {
    document.body.classList.toggle('sidebar-open', mobileOpen)
    return () => document.body.classList.remove('sidebar-open')
  }, [mobileOpen])

  const isHorizontal = settings.layout === 'horizontal'

  return (
    <div className="app-wrapper">
      <Topbar
        onHamburger={() => setMobileOpen((v) => !v)}
        onOpenCustomizer={() => setCustomizerOpen(true)}
      />

      {isHorizontal ? <HorizontalMenu /> : <Sidebar />}

      <div className="main-content">
        <div className="page-content">
          <div className="container-fluid">
            <Outlet />
          </div>
        </div>
        <Footer />
      </div>

      {/* Mobile backdrop */}
      <div className="sidebar-backdrop" onClick={() => setMobileOpen(false)} />

      {/* Floating gear + settings panel */}
      <button
        className="customizer-trigger"
        aria-label="Open theme settings"
        onClick={() => setCustomizerOpen(true)}
      >
        <i className="ri-settings-4-line" />
      </button>
      <ThemeCustomizer open={customizerOpen} onClose={() => setCustomizerOpen(false)} />
    </div>
  )
}
