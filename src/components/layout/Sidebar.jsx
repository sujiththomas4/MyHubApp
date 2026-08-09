import { useState, useMemo } from 'react' // useMemo used in VerticalMenu
import { NavLink, useLocation } from 'react-router-dom'
import SimpleBar from 'simplebar-react'
import { menuForRole } from '@/data/menu'
import { useTheme } from '@/context/ThemeContext'
import { useAuth } from '@/context/AuthContext'
import { usePlantationActivities } from '@/data/plantationRepo'

/* Live count badges for nav items (keyed by node id). Activities shows how many
   are pending (yellow) and delayed (red). */
function useNavBadges() {
  const activities = usePlantationActivities()
  const today = new Date().toISOString().slice(0, 10)
  const pending = activities.filter((a) => a.status !== 'done').length
  const delayed = activities.filter((a) => a.status !== 'done' && a.dueDate < today).length
  const act = []
  if (pending) act.push({ text: pending, variant: 'warning', title: `${pending} pending` })
  if (delayed) act.push({ text: delayed, variant: 'danger', title: `${delayed} delayed` })
  return { 'plantation-activities': act }
}

/* Find the id-path of ancestors that contain the active route, so those
   submenus start expanded. */
function findActiveTrail(nodes, pathname, trail = []) {
  for (const node of nodes) {
    if (node.to && node.to === pathname) return [...trail]
    if (node.children) {
      const found = findActiveTrail(node.children, pathname, [...trail, node.id])
      if (found) return found
    }
  }
  return null
}

function CountBadges({ badges }) {
  if (!badges || !badges.length) return null
  return (
    <span className="menu-badge d-inline-flex gap-1">
      {badges.map((b, i) => (
        <span key={i} className={`badge rounded-pill bg-${b.variant}` + (b.variant === 'warning' ? ' text-dark' : '')} title={b.title}>{b.text}</span>
      ))}
    </span>
  )
}

function MenuNode({ node, level, openIds, toggle, badges = {} }) {
  const { pathname } = useLocation()

  if (node.isTitle) return <li className="menu-title">{node.label}</li>

  // Leaf link
  if (!node.children) {
    return (
      <li className="menu-item">
        <NavLink
          to={node.to || '#'}
          end={node.to === '/'}
          className={({ isActive }) => 'menu-link' + (isActive ? ' active' : '')}
        >
          {node.icon && <i className={`menu-icon ${node.icon}`} />}
          <span className="menu-label">{node.label}</span>
          {node.badge && (
            <span className={`menu-badge badge bg-${node.badge.variant}`}>{node.badge.text}</span>
          )}
          <CountBadges badges={badges[node.id]} />
        </NavLink>
      </li>
    )
  }

  /* Parent with children. One click does both: opens the submenu AND goes to
     the section's own landing page. The chevron already signals expandability,
     so there's no second arrow — and folding navigation back into the row keeps
     pages like /loans and /wealth/savings reachable from the nav.
     `open` also starts true for the section containing the current route. Plain
     call (not a hook) so we never call hooks conditionally after the early
     returns above. */
  const isOpen = openIds.includes(node.id)
  const hasActiveChild = Boolean(findActiveTrail(node.children, pathname))

  return (
    <li className={'menu-item has-children' + (isOpen ? ' open' : '')}>
      <NavLink
        to={node.to || '#'}
        end={node.to === '/'}
        aria-expanded={isOpen}
        className={({ isActive }) => 'menu-link' + (isActive || hasActiveChild ? ' active' : '')}
        onClick={() => toggle(node.id)}
      >
        {node.icon && <i className={`menu-icon ${node.icon}`} />}
        <span className="menu-label">{node.label}</span>
        {node.badge && (
          <span className={`menu-badge badge bg-${node.badge.variant} me-2`}>{node.badge.text}</span>
        )}
        <CountBadges badges={badges[node.id]} />
        <i className="menu-arrow ri-arrow-right-s-line" />
      </NavLink>
      <ul className="submenu">
        {node.children.map((child) => (
          <MenuNode key={child.id} node={child} level={level + 1} openIds={openIds} toggle={toggle} badges={badges} />
        ))}
      </ul>
    </li>
  )
}

function VerticalMenu() {
  const { pathname } = useLocation()
  const { settings } = useTheme()
  const { role } = useAuth()
  // Admins get the mode-filtered menu; plantation members get Plantation only.
  const items = useMemo(() => menuForRole(role, settings.profileMode), [role, settings.profileMode])
  const initialOpen = useMemo(() => findActiveTrail(items, pathname) || ['loans'], [items, pathname])
  const [openIds, setOpenIds] = useState(initialOpen)
  const badges = useNavBadges()

  const toggle = (id) =>
    setOpenIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]))

  return (
    <ul className="menu-list">
      {items.map((node) => (
        <MenuNode key={node.id} node={node} level={0} openIds={openIds} toggle={toggle} badges={badges} />
      ))}
    </ul>
  )
}

/* Two-column: a slim icon rail + a panel showing the selected group's children. */
function TwoColumn() {
  const { settings } = useTheme()
  const { role } = useAuth()
  const groups = menuForRole(role, settings.profileMode).filter((m) => !m.isTitle)
  const [activeId, setActiveId] = useState(groups[0]?.id)
  const active = groups.find((g) => g.id === activeId)
  const badges = useNavBadges()

  return (
    <>
      <div className="twocolumn-rail">
        <div className="rail-logo">
          <span className="logo-mark"><i className="ri-flashlight-fill" /></span>
        </div>
        <SimpleBar style={{ flex: 1, width: '100%' }}>
          {groups.map((g) => (
            <button
              key={g.id}
              className={'rail-item' + (g.id === activeId ? ' active' : '')}
              title={g.label}
              onClick={() => setActiveId(g.id)}
            >
              <i className={g.icon || 'ri-circle-line'} />
            </button>
          ))}
        </SimpleBar>
      </div>
      <div className="twocolumn-panel">
        <div className="panel-title">{active?.label}</div>
        <SimpleBar style={{ maxHeight: 'calc(100vh - 70px)' }}>
          <ul className="menu-list py-2">
            {active?.children ? (
              active.children.map((child) => (
                <MenuNode key={child.id} node={child} level={0} openIds={[]} toggle={() => {}} badges={badges} />
              ))
            ) : (
              <li>
                <NavLink to={active?.to || '#'} className="menu-link">
                  <span className="menu-label">{active?.label}</span>
                </NavLink>
              </li>
            )}
          </ul>
        </SimpleBar>
      </div>
    </>
  )
}

export default function Sidebar() {
  const { settings } = useTheme()
  const isTwoColumn = settings.layout === 'twocolumn'

  return (
    <aside className="app-sidebar">
      {isTwoColumn ? (
        <TwoColumn />
      ) : (
        <>
          <div className="sidebar-logo">
            <span className="logo-mark"><i className="ri-flashlight-fill" /></span>
            <span className="logo-text">Hub</span>
          </div>
          {/* Native scroll rather than SimpleBar: SimpleBar has to measure a
              definite height to know it overflows, which kept failing at zoom
              levels / small viewports, and its custom bar replaces the native
              touch scrolling mobile needs. Flexbox gives this a real height and
              the browser handles the rest. */}
          <div className="sidebar-menu">
            <VerticalMenu />
          </div>
        </>
      )}
    </aside>
  )
}
