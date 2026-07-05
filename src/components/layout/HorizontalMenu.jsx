import { NavLink, useLocation } from 'react-router-dom'
import { menu } from '@/data/menu'

/* Flattened top-level groups shown as a horizontal bar. Clicking a group with
   children navigates to its first child; leaf items navigate directly. */
export default function HorizontalMenu() {
  const { pathname } = useLocation()
  const groups = menu.filter((m) => !m.isTitle)

  return (
    <nav className="horizontal-menu">
      {groups.map((g) => {
        const to = g.to || g.children?.find((c) => c.to)?.to || '#'
        const isActive = to === pathname
        return (
          <NavLink
            key={g.id}
            to={to}
            className={'h-item' + (isActive ? ' active' : '')}
          >
            {g.icon && <i className={g.icon} />}
            <span>{g.label}</span>
            {g.children && <i className="ri-arrow-down-s-line" />}
          </NavLink>
        )
      })}
    </nav>
  )
}
