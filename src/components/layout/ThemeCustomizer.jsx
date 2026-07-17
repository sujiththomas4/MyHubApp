import { THEME_OPTIONS } from '@/config/themeConfig'
import { useTheme } from '@/context/ThemeContext'

/* A tiny mock preview drawn inside each layout option card. */
function LayoutPreview({ value, scheme }) {
  const dark = scheme === 'dark'
  if (value === 'horizontal') {
    return (
      <div className={`preview${dark ? ' dark' : ''}`} style={{ flexDirection: 'column' }}>
        <div className="p-top" />
        <div className="p-main" style={{ paddingTop: 0 }}>
          <div className="p-block" />
        </div>
      </div>
    )
  }
  // vertical / light / dark generic
  return (
    <div className={`preview${dark ? ' dark' : ''}`}>
      <div className="p-side" style={{ background: dark ? '#2a2f34' : 'var(--bs-primary)' }} />
      <div className="p-main"><div className="p-top" /><div className="p-block" /></div>
    </div>
  )
}

function OptionCards({ groupKey, group, value, onSelect, scheme }) {
  return (
    <div className="option-grid">
      {group.options.map((opt) => (
        <button
          key={opt.value}
          className={'option-card' + (value === opt.value ? ' active' : '')}
          onClick={() => onSelect(groupKey, opt.value)}
        >
          <div className="preview-wrap">
            <LayoutPreview
              value={groupKey === 'layout' ? opt.value : opt.value === 'dark' ? 'dark-scheme' : 'vertical'}
              scheme={groupKey === 'colorScheme' ? opt.value : scheme}
            />
          </div>
          <span className="opt-label">{opt.label}</span>
        </button>
      ))}
    </div>
  )
}

function Swatches({ groupKey, group, value, onSelect }) {
  return (
    <div className="swatch-grid">
      {group.options.map((opt) => (
        <button
          key={opt.value}
          className={'swatch' + (value === opt.value ? ' active' : '')}
          style={{ background: opt.color }}
          title={opt.label}
          aria-label={opt.label}
          onClick={() => onSelect(groupKey, opt.value)}
        />
      ))}
    </div>
  )
}

export default function ThemeCustomizer({ open, onClose }) {
  const { settings, setSetting, reset } = useTheme()

  const handleSelect = (key, value) => setSetting(key, value)

  return (
    <>
      <div className={'customizer-backdrop' + (open ? ' open' : '')} onClick={onClose} />
      <aside className={'customizer' + (open ? ' open' : '')} aria-hidden={!open}>
        <div className="customizer-header">
          <div>
            <h5>Theme Customizer</h5>
            <p>Set your layout, color &amp; structure.</p>
          </div>
          <button className="customizer-close" onClick={onClose} aria-label="Close">
            <i className="ri-close-line" />
          </button>
        </div>

        <div className="customizer-body">
          {Object.entries(THEME_OPTIONS).map(([key, group]) => {
            // Hide options that don't apply to the current layout.
            if (group.dependsOnLayout && !group.dependsOnLayout.includes(settings.layout)) {
              return null
            }
            return (
              <div className="customizer-section" key={key}>
                <h6>{group.title}</h6>
                <p className="hint">{group.hint}</p>
                {group.type === 'swatch' ? (
                  <Swatches groupKey={key} group={group} value={settings[key]} onSelect={handleSelect} />
                ) : (
                  <OptionCards
                    groupKey={key}
                    group={group}
                    value={settings[key]}
                    onSelect={handleSelect}
                    scheme={settings.colorScheme}
                  />
                )}
              </div>
            )
          })}
        </div>

        <div className="customizer-footer d-flex gap-2">
          <button className="btn btn-soft-primary flex-grow-1" onClick={reset}>
            <i className="ri-refresh-line me-1" /> Reset to default
          </button>
        </div>
      </aside>
    </>
  )
}
