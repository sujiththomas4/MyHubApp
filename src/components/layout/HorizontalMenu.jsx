import { useEffect, useRef } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { menu } from '@/data/menu'

/* Top-level groups shown as a horizontal bar. Groups with children reveal a
   dropdown of those children on hover; leaf groups navigate directly. Clicking
   a group with children still navigates to its landing page (`to`). */
export default function HorizontalMenu() {
  const { pathname } = useLocation()
  const groups = menu.filter((m) => !m.isTitle)
  const navRef = useRef(null)

  // The bar wraps to multiple rows when items don't fit, so its height is
  // variable. Publish the measured height so the page content below can offset
  // by exactly the right amount (see --horizontal-menu-height in layout.css).
  useEffect(() => {
    const el = navRef.current
    if (!el) return
    const root = document.documentElement
    const apply = () => root.style.setProperty('--horizontal-menu-height', `${el.offsetHeight}px`)
    apply()
    const ro = new ResizeObserver(apply)
    ro.observe(el)
    return () => {
      ro.disconnect()
      root.style.removeProperty('--horizontal-menu-height')
    }
  }, [])

  return (
    <nav className="horizontal-menu" ref={navRef}>
      {groups.map((g) => {
        const to = g.to || g.children?.find((c) => c.to)?.to || '#'
        const hasActiveChild = g.children?.some((c) => c.to === pathname)
        const isActive = to === pathname || hasActiveChild

        return (
          <div key={g.id} className={'h-menu-item' + (g.children ? ' has-children' : '')}>
            <NavLink to={to} className={'h-item' + (isActive ? ' active' : '')}>
              {g.icon && <i className={g.icon} />}
              <span>{g.label}</span>
              {g.children && <i className="ri-arrow-down-s-line h-caret" />}
            </NavLink>

            {g.children && (
              <ul className="h-dropdown">
                {g.children.map((c) => (
                  <li key={c.id}>
                    <NavLink
                      to={c.to || '#'}
                      className={({ isActive: active }) => 'h-dropdown-link' + (active ? ' active' : '')}
                    >
                      {c.label}
                    </NavLink>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )
      })}
    </nav>
  )
}
