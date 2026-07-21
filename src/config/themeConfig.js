/**
 * themeConfig.js
 * -----------------------------------------------------------------------------
 * Single source of truth for the whole theme engine.
 *
 * Every setting maps to a `data-*` attribute on the <html> element. CSS in
 * src/styles/theme.css + layout.css reacts to those attributes, so switching a
 * setting is just an attribute swap — no re-render of styles, no reload.
 *
 * To add a new option: add it here, add a matching CSS rule, and it will
 * automatically appear in the ThemeCustomizer (which is generated from this).
 */

// The attribute keys we write onto <html>. Keeping them in one place makes it
// trivial to reset / persist / hydrate the whole set.
export const THEME_ATTRIBUTES = {
  layout: 'data-layout',
  colorScheme: 'data-bs-theme', // Bootstrap 5.3 native dark-mode hook
  topbar: 'data-topbar',
  sidebar: 'data-sidebar',
  sidebarSize: 'data-sidebar-size',
  sidebarVisibility: 'data-sidebar-visibility',
  layoutWidth: 'data-layout-width',
  layoutPosition: 'data-layout-position',
  preset: 'data-preset', // primary/accent color preset
}

// Default state — chosen to match the reference "SaaS" look
// (green accent, dark sidebar, light topbar, fixed vertical layout).
export const DEFAULT_THEME = {
  // Which nav sections are visible — see menuForMode() in data/menu.js. Not in
  // THEME_ATTRIBUTES because it's filtered in JS, not by a CSS selector; it
  // still persists with the rest of the settings.
  profileMode: 'full',
  layout: 'vertical',
  colorScheme: 'light',
  topbar: 'light',
  sidebar: 'dark',
  sidebarSize: 'lg',
  sidebarVisibility: 'show',
  layoutWidth: 'fluid',
  layoutPosition: 'fixed',
  preset: 'green',
}

// The options rendered in the customizer panel. `value` is what gets written to
// the attribute; `label` is what the user sees.
export const THEME_OPTIONS = {
  layout: {
    title: 'Layout',
    hint: 'Choose your layout',
    type: 'card',
    options: [
      { value: 'vertical', label: 'Vertical' },
      { value: 'horizontal', label: 'Horizontal' },
    ],
  },
  colorScheme: {
    title: 'Color Scheme',
    hint: 'Choose Light or Dark scheme.',
    type: 'card',
    options: [
      { value: 'light', label: 'Light' },
      { value: 'dark', label: 'Dark' },
    ],
  },
  preset: {
    title: 'Accent Color',
    hint: 'Choose the primary/accent color.',
    type: 'swatch',
    options: [
      { value: 'green', label: 'Green', color: '#0ab39c' },
      { value: 'default', label: 'Indigo', color: '#405189' },
      { value: 'blue', label: 'Blue', color: '#3577f1' },
      { value: 'purple', label: 'Purple', color: '#6559cc' },
      { value: 'orange', label: 'Orange', color: '#f1963b' },
      { value: 'teal', label: 'Teal', color: '#02a8b5' },
      { value: 'black', label: 'Black', color: '#212529' },
    ],
  },
  topbar: {
    title: 'Topbar Color',
    hint: 'Choose Light or Dark topbar.',
    type: 'card',
    options: [
      { value: 'light', label: 'Light' },
      { value: 'dark', label: 'Dark' },
    ],
  },
  sidebarVisibility: {
    title: 'Sidebar Visibility',
    hint: 'Show or hide the sidebar.',
    type: 'card',
    options: [
      { value: 'show', label: 'Show' },
      { value: 'hidden', label: 'Hidden' },
    ],
  },
  sidebarSize: {
    title: 'Sidebar Size',
    hint: 'Choose a size of Sidebar.',
    type: 'card',
    // Only meaningful for the vertical layout.
    dependsOnLayout: ['vertical'],
    options: [
      { value: 'lg', label: 'Default' },
    ],
  },
  sidebar: {
    title: 'Sidebar Color',
    hint: 'Choose a color of Sidebar.',
    type: 'card',
    dependsOnLayout: ['vertical'],
    options: [
      { value: 'light', label: 'Light' },
      { value: 'dark', label: 'Dark' },
      { value: 'gradient', label: 'Gradient' },
    ],
  },
}

export const STORAGE_KEY = 'hub.theme.settings'
