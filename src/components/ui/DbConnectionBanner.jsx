import { isSupabaseConfigured } from '@/lib/supabase'

/**
 * DbConnectionBanner
 * -----------------------------------------------------------------------------
 * Fail-loud guard against the silent local-only fallback. When the Supabase
 * env vars are missing, the whole data layer quietly reads/writes localStorage
 * (per-device), so changes never sync across devices. That's expected in local
 * dev, but in a deployed build it's almost always a misconfiguration — the
 * VITE_SUPABASE_* vars weren't set at build time.
 *
 * This renders a fixed banner whenever Supabase isn't configured, with sharper
 * wording in a production build. It's non-blocking: the app still works in
 * local-only mode, but nobody can mistake it for the real thing.
 */
export default function DbConnectionBanner() {
  if (isSupabaseConfigured) return null

  const isProd = import.meta.env.PROD

  return (
    <div role="alert" style={styles.bar(isProd)}>
      <span style={styles.dot} />
      <span>
        <strong>⚠ Not connected to the database.</strong>{' '}
        {isProd
          ? 'This deployment has no Supabase credentials. No data can be loaded or saved. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in the hosting env vars, then redeploy.'
          : 'No Supabase env vars found, so every screen will be empty. Add them to .env.local and restart the dev server.'}
      </span>
    </div>
  )
}

const styles = {
  bar: (isProd) => ({
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 2000,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.55rem',
    padding: '0.5rem 1rem',
    fontSize: '0.8125rem',
    lineHeight: 1.35,
    textAlign: 'center',
    color: '#fff',
    background: isProd ? '#dc3545' : '#f7b84b',
    ...(isProd ? {} : { color: '#3a2c00' }),
    boxShadow: '0 1px 6px rgba(0,0,0,0.2)',
  }),
  dot: {
    width: 8,
    height: 8,
    borderRadius: '50%',
    background: 'currentColor',
    flexShrink: 0,
    animation: 'none',
  },
}
