import { useState, useEffect, useRef } from 'react'
import { ACCENT_OPTIONS, applyAccent } from '../lib/theme'
import { NARROW, useMedia } from '../lib/ui'

// =============================================================================
// HEADER
// =============================================================================
export function TopHeader({ middle, onHome, onNew, email, onSignOut }) {
  const narrow = useMedia(NARROW)
  return (
    <header style={{
      padding: narrow ? '10px 16px' : '12px 22px',
      display: 'grid', gridTemplateColumns: narrow ? '1fr auto' : '1fr auto 1fr', alignItems: 'center', gap: narrow ? 8 : 16,
      background: 'linear-gradient(100deg, var(--ink-deep), var(--ink))',
      color: '#fff', position: 'sticky', top: 0, zIndex: 30,
      boxShadow: 'var(--shadow-md)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <button onClick={onHome} style={{ display: 'flex', alignItems: 'center', gap: 9, background: 'transparent', border: 'none', padding: 0, color: '#fff' }}>
          <div style={{ width: 26, height: 26, background: 'linear-gradient(135deg, var(--accent), var(--accent-2))', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 15, borderRadius: 7, boxShadow: '0 2px 8px color-mix(in oklch, var(--accent) 40%, transparent)' }}>Σ</div>
          <span style={{ fontWeight: 600, fontSize: 15, letterSpacing: '-0.01em' }}>Sigma</span>
        </button>
        {!narrow && <>
          <span style={{ width: 1, height: 14, background: 'rgba(255,255,255,0.2)' }} />
          <span className="label" style={{ color: 'rgba(255,255,255,0.6)' }}>decisions, decomposed</span>
        </>}
      </div>
      {!narrow && <div style={{ textAlign: 'center', minWidth: 0 }}>{middle}</div>}
      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: narrow ? 4 : 10 }}>
        <button className="btn btn-sm" onClick={onNew} style={{ background: 'rgba(255,255,255,0.1)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)' }}>
          <span style={{ fontSize: 14, lineHeight: 1 }}>+</span> New
        </button>
        <AccentMenu />
        <button className="btn btn-sm" onClick={onSignOut} title={email ? `Signed in as ${email}` : undefined} style={{ background: 'transparent', color: 'rgba(255,255,255,0.7)', border: '1px solid transparent' }}>
          Sign out
        </button>
      </div>
    </header>
  )
}

export function AccentMenu() {
  const [open, setOpen] = useState(false)
  const rootRef = useRef(null)
  const cur = localStorage.getItem('sigma_accent') || 'green'
  useEffect(() => {
    if (!open) return
    const h = e => { if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false) }
    document.addEventListener('pointerdown', h)
    return () => document.removeEventListener('pointerdown', h)
  }, [open])
  return (
    <div ref={rootRef} style={{ position: 'relative' }}>
      <button onClick={() => setOpen(o => !o)} className="iconbtn" title="theme" aria-label="Accent colour" aria-expanded={open}>
        <span style={{ width: 14, height: 14, borderRadius: '50%', background: 'var(--accent)' }} />
      </button>
      {open && (
        <div onMouseLeave={() => setOpen(false)} style={{
          position: 'absolute', top: 36, right: 0, background: 'var(--bg)', border: '1px solid var(--rule)',
          borderRadius: 8, padding: 10, zIndex: 100, boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
          display: 'flex', gap: 6, flexDirection: 'column', minWidth: 130,
        }}>
          <div className="label">accent</div>
          <div style={{ display: 'flex', gap: 6 }}>
            {ACCENT_OPTIONS.map(a => (
              <button key={a.name} onClick={() => { applyAccent(a.hue); localStorage.setItem('sigma_accent', a.name); setOpen(false) }}
                style={{ width: 26, height: 26, borderRadius: 6, border: cur === a.name ? '2px solid var(--ink)' : '1px solid var(--rule)', background: `oklch(0.58 0.16 ${a.hue})`, cursor: 'pointer' }} title={a.name} aria-label={`${a.name} accent`} aria-pressed={cur === a.name} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
