import { useEffect, useRef } from 'react'
import { SHOW_OPTIONS, isFiltering } from '../lib/homeFilter'
import { NARROW, useMedia } from '../lib/ui'

// Search box, Show (All / Open / Closed) and kind chips above Home's lists.
// "/" anywhere on the page jumps to the search box; Esc clears it.
export function HomeFilters({ filter, setFilter, kinds, shown, total }) {
  const narrow = useMedia(NARROW)
  const inputRef = useRef(null)
  const set = patch => setFilter(f => ({ ...f, ...patch }))

  useEffect(() => {
    const onKey = e => {
      if (e.key !== '/' || e.ctrlKey || e.metaKey || e.altKey) return
      const t = e.target
      if (t.closest?.('input, textarea, select, [contenteditable="true"], [role="dialog"]')) return
      if (document.querySelector('[role="dialog"][aria-modal="true"]')) return
      e.preventDefault()
      inputRef.current?.focus()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const segBtn = (on, last) => ({
    padding: '6px 12px', fontSize: 12, border: 'none', borderRight: last ? 'none' : '1px solid var(--rule)',
    background: on ? 'var(--ink)' : 'var(--bg)', color: on ? 'var(--bg)' : 'var(--ink)', textTransform: 'capitalize',
  })
  const chip = on => ({
    display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', fontSize: 12, borderRadius: 999,
    border: `1px solid ${on ? 'var(--ink)' : 'var(--rule)'}`, background: on ? 'var(--ink)' : 'var(--bg)', color: on ? 'var(--bg)' : 'var(--ink)',
  })

  return (
    <section aria-label="Search and filter decisions" style={{ marginBottom: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: narrow ? '1 1 100%' : '1 1 320px', maxWidth: narrow ? 'none' : 520 }}>
          <svg aria-hidden="true" width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"
            style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-faint)' }}>
            <circle cx="7" cy="7" r="4.75" /><path d="M10.5 10.5 14 14" />
          </svg>
          <input ref={inputRef} type="search" value={filter.query} aria-label="Search decisions"
            placeholder={narrow ? 'Search decisions…' : 'Search titles, options, considerations, notes…   ( / )'}
            onChange={e => set({ query: e.target.value })}
            onKeyDown={e => { if (e.key === 'Escape') { if (filter.query) set({ query: '' }); else e.currentTarget.blur() } }}
            style={{ width: '100%', padding: '8px 12px 8px 30px', fontSize: 14, border: '1px solid var(--rule)', borderRadius: 8, background: 'var(--bg)', color: 'var(--ink)' }} />
        </div>
        <div role="group" aria-label="Show" style={{ display: 'flex', border: '1px solid var(--rule)', borderRadius: 8, overflow: 'hidden' }}>
          {SHOW_OPTIONS.map((s, i) => (
            <button key={s} aria-pressed={filter.show === s} onClick={() => set({ show: s })} style={segBtn(filter.show === s, i === SHOW_OPTIONS.length - 1)}>{s}</button>
          ))}
        </div>
      </div>
      {kinds.length > 1 && (
        <div role="group" aria-label="Kind of decision" style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {kinds.map(k => {
            const on = filter.kind === k.label
            return (
              <button key={k.label} aria-pressed={on} onClick={() => set({ kind: on ? null : k.label })} style={chip(on)}>
                <span aria-hidden="true">{k.emoji}</span>{k.label}<span className="mono" style={{ fontSize: 11, opacity: 0.75 }}>{k.count}</span>
              </button>
            )
          })}
        </div>
      )}
      <div role="status" aria-live="polite" style={{ minHeight: 18, display: 'flex', alignItems: 'center', gap: 10 }}>
        {isFiltering(filter) && <>
          <span style={{ fontSize: 12, color: 'var(--ink-soft)' }}>Showing {shown} of {total}</span>
          <button className="linklike" onClick={() => setFilter({ query: '', kind: null, show: 'all' })}
            style={{ fontSize: 12, color: 'var(--accent-text)', textDecoration: 'underline' }}>Clear filters</button>
        </>}
      </div>
    </section>
  )
}
