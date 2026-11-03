import { useState, useEffect, useRef } from 'react'
import { templateFromDecision } from '../../lib/templates'
import { useDialogFocus } from '../../lib/ui'

// Save this decision's considerations and weights as a template. Options and
// scores stay with the decision.
export function SaveTemplateDialog({ decision, parameters, onSave, onCancel }) {
  const [name, setName] = useState(decision.title?.trim() || '')
  const [saving, setSaving] = useState(false)
  const dialogRef = useRef(null)
  useDialogFocus(dialogRef)
  const { parameters: kept } = templateFromDecision(decision, parameters, name)

  useEffect(() => {
    const k = e => { if (e.key === 'Escape') onCancel() }
    window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k)
  }, [onCancel])

  const save = async () => {
    if (saving || !name.trim() || !kept.length) return
    setSaving(true)
    const ok = await onSave(name.trim())
    if (!ok) setSaving(false)
  }

  return (
    <div className="overlay-bg" onClick={onCancel}>
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="tpl-save-title" className="overlay-card"
        onClick={e => e.stopPropagation()} style={{ width: 480, maxWidth: '95vw', padding: '24px 28px 26px' }}>
        <span className="label">save as template</span>
        <h2 id="tpl-save-title" style={{ margin: '6px 0 4px', fontSize: 22, fontWeight: 500, letterSpacing: '-0.01em' }}>Reuse these considerations</h2>
        <p style={{ margin: '0 0 16px', fontSize: 13, color: 'var(--ink-soft)', lineHeight: 1.5 }}>
          The template keeps the {kept.length} consideration{kept.length === 1 ? '' : 's'} and their weights. Options and scores stay here.
        </p>
        <label style={{ display: 'block' }}>
          <span className="label">template name</span>
          <input value={name} onChange={e => setName(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') save() }}
            placeholder="e.g. Job offers"
            style={{ display: 'block', width: '100%', marginTop: 6, padding: '8px 10px', fontSize: 14, border: '1px solid var(--rule)', borderRadius: 8, color: 'var(--ink)' }} />
        </label>
        <ul style={{ margin: '14px 0 0', padding: 0, listStyle: 'none', display: 'flex', flexWrap: 'wrap', gap: 6 }} aria-label="Considerations to save">
          {kept.map(tp => (
            <li key={tp.display_order} style={{ fontSize: 12, padding: '3px 8px', borderRadius: 6, background: 'var(--bg-soft)', border: '1px solid var(--rule-soft)' }}>
              {tp.name} <span className="mono" style={{ color: 'var(--ink-soft)' }}>{tp.default_weight}</span>
            </li>
          ))}
        </ul>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 18 }}>
          <button className="btn btn-outline btn-sm" onClick={onCancel}>Cancel</button>
          <button className="btn btn-accent btn-sm" onClick={save} disabled={saving || !name.trim() || !kept.length}>{saving ? 'Saving…' : 'Save template'}</button>
        </div>
      </div>
    </div>
  )
}
