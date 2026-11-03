import { useState, useEffect, useRef } from 'react'
import { STARTER_TEMPLATES, templateSummary } from '../lib/templates'
import { kindColor, kindEmoji, kindSoft } from '../lib/theme'
import { NARROW, useDialogFocus, useMedia } from '../lib/ui'

// Start a decision blank or from a template: the starters that ship with the
// app, then any the user has saved from their own decisions.
export function NewDecisionDialog({ templates, onCreate, onDeleteTemplate, onCancel }) {
  const [busy, setBusy] = useState(false)
  const narrow = useMedia(NARROW)
  const dialogRef = useRef(null)
  useDialogFocus(dialogRef)

  useEffect(() => {
    const k = e => { if (e.key === 'Escape') onCancel() }
    window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k)
  }, [onCancel])

  const create = async t => {
    if (busy) return
    setBusy(true)
    await onCreate(t)
  }

  const grid = { display: 'grid', gridTemplateColumns: narrow ? '1fr' : 'repeat(auto-fill, minmax(220px, 1fr))', gap: 8 }

  const card = t => (
    <div key={t.id} style={{ position: 'relative' }}>
      <button className="tpl-card" onClick={() => create(t)} disabled={busy}
        style={{ '--kc': kindColor(t.type, t.name), '--ks': kindSoft(t.type, t.name) }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 10, paddingRight: t.builtin ? 0 : 24 }}>
          <span aria-hidden="true" style={{ width: 30, height: 30, flexShrink: 0, borderRadius: 8, background: 'var(--ks)', border: '1px solid var(--kc)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>{kindEmoji(t.type, t.name)}</span>
          <span style={{ fontSize: 14, fontWeight: 500, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.name}</span>
        </span>
        {t.description && <span style={{ fontSize: 12, color: 'var(--ink-soft)', lineHeight: 1.4 }}>{t.description}</span>}
        <span style={{ fontSize: 11, color: 'var(--ink-soft)', lineHeight: 1.4 }}>
          <span className="sr-only">Considerations: </span>{templateSummary(t)}
        </span>
      </button>
      {!t.builtin && (
        <button className="iconbtn" aria-label={`delete template ${t.name}`} title="delete template" disabled={busy}
          onClick={() => { if (confirm(`Delete the template "${t.name}"? Decisions made from it are kept.`)) onDeleteTemplate(t.id) }}
          style={{ position: 'absolute', top: 10, right: 8, color: 'var(--neg)' }}>×</button>
      )}
    </div>
  )

  return (
    <div className="overlay-bg" onClick={onCancel}>
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="new-title" className="overlay-card"
        onClick={e => e.stopPropagation()} style={{ width: 760, maxWidth: '95vw', padding: narrow ? '20px 16px 20px' : '24px 28px 26px' }}>
        <span className="label">new decision</span>
        <h2 id="new-title" style={{ margin: '6px 0 4px', fontSize: 22, fontWeight: 500, letterSpacing: '-0.01em' }}>Start blank, or from a template?</h2>
        <p style={{ margin: '0 0 16px', fontSize: 13, color: 'var(--ink-soft)', lineHeight: 1.5 }}>
          A template fills in the considerations and their weights. You add the options, and can change anything.
        </p>

        <button className="btn btn-primary" onClick={() => create(null)} disabled={busy}>
          <span style={{ fontSize: 15, lineHeight: 1 }}>+</span> Blank decision
        </button>

        {templates.length > 0 && (
          <section aria-labelledby="tpl-mine" style={{ marginTop: 20 }}>
            <h3 id="tpl-mine" className="label" style={{ margin: '0 0 8px' }}>your templates</h3>
            <div style={grid}>{templates.map(card)}</div>
          </section>
        )}

        <section aria-labelledby="tpl-starters" style={{ marginTop: 20 }}>
          <h3 id="tpl-starters" className="label" style={{ margin: '0 0 8px' }}>starters</h3>
          <div style={grid}>{STARTER_TEMPLATES.map(card)}</div>
        </section>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginTop: 18, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 12, color: 'var(--ink-soft)' }}>{busy ? 'Creating…' : 'Save your own from any decision with "Save as template".'}</span>
          <button className="btn btn-outline btn-sm" onClick={onCancel}>Cancel</button>
        </div>
      </div>
    </div>
  )
}
