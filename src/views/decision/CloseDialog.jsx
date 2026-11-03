import { useState, useEffect, useRef } from 'react'
import { useDialogFocus } from '../../lib/ui'

// Closing a decision records what was actually chosen (which may not be the
// leader) and, optionally, why. Saved to sigma_decisions.final_choice_id /
// notes / decided_at.
export function CloseDialog({ ranked, leaderId, decision, onConfirm, onCancel }) {
  const [choice, setChoice] = useState(decision.final_choice_id || leaderId || '')
  const [why, setWhy] = useState(decision.notes || '')
  const [saving, setSaving] = useState(false)
  const dialogRef = useRef(null)
  useDialogFocus(dialogRef)

  useEffect(() => {
    const k = e => { if (e.key === 'Escape') onCancel() }
    window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k)
  }, [onCancel])

  const confirm = async () => {
    setSaving(true)
    await onConfirm({ choiceId: choice || null, why: why.trim() || null })
  }

  const row = (value, children) => (
    <label key={value || 'none'} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderRadius: 8, cursor: 'pointer',
      border: `1px solid ${choice === value ? 'var(--accent)' : 'var(--rule)'}`, background: choice === value ? 'var(--accent-soft)' : 'var(--bg)' }}>
      <input type="radio" name="final-choice" value={value} checked={choice === value} onChange={() => setChoice(value)} />
      {children}
    </label>
  )

  return (
    <div className="overlay-bg" onClick={onCancel}>
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="close-title" className="overlay-card"
        onClick={e => e.stopPropagation()} style={{ width: 520, maxWidth: '95vw', padding: '24px 28px 26px' }}>
        <span className="label">close decision</span>
        <h2 id="close-title" style={{ margin: '6px 0 4px', fontSize: 22, fontWeight: 500, letterSpacing: '-0.01em' }}>What did you choose?</h2>
        <p style={{ margin: '0 0 16px', fontSize: 13, color: 'var(--ink-soft)', lineHeight: 1.5 }}>
          It doesn't have to be the leader. Recording what you actually picked, and why, makes this decision worth looking back on.
        </p>
        <fieldset style={{ border: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <legend className="sr-only">Chosen option</legend>
          {ranked.map(o => row(o.id, <>
            <span style={{ flex: 1, fontSize: 14, fontWeight: 500 }}>{o.name || 'unnamed'}</span>
            {o.id === leaderId && <span className="label" style={{ color: 'var(--accent-text)' }}>leading</span>}
            <span className="mono" style={{ fontSize: 13, color: 'var(--ink-soft)' }}>{o._total != null ? o._total.toFixed(2) : '—'}</span>
          </>))}
          {row('', <span style={{ flex: 1, fontSize: 14, color: 'var(--ink-soft)' }}>None of these / not recorded</span>)}
        </fieldset>
        <label style={{ display: 'block', marginTop: 16 }}>
          <span className="label">why? (optional)</span>
          <textarea value={why} onChange={e => setWhy(e.target.value)} rows={3}
            placeholder="e.g. the commute won it, even though salary was lower"
            style={{ display: 'block', width: '100%', marginTop: 6, padding: '8px 10px', fontSize: 13, lineHeight: 1.5, border: '1px solid var(--rule)', borderRadius: 8, resize: 'vertical', color: 'var(--ink)' }} />
        </label>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 18 }}>
          <button className="btn btn-outline btn-sm" onClick={onCancel}>Cancel</button>
          <button className="btn btn-accent btn-sm" onClick={confirm} disabled={saving}>{saving ? 'Closing…' : '✓ Close decision'}</button>
        </div>
      </div>
    </div>
  )
}
