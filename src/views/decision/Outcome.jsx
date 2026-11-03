import { useState, useEffect } from 'react'
import { OUTCOMES, outcomeDef, daysSinceDecided, lookbackDue } from '../../lib/lookback'

// "How did it turn out?" on a closed decision. Pick a verdict, add a note,
// save; afterwards shows the verdict and lets you change it.
export function Outcome({ decision, onSave }) {
  const current = outcomeDef(decision.outcome)
  const [editing, setEditing] = useState(!current)
  const [pick, setPick] = useState(decision.outcome || null)
  const [note, setNote] = useState(decision.outcome_notes || '')
  const [saving, setSaving] = useState(false)
  useEffect(() => { setPick(decision.outcome || null); setNote(decision.outcome_notes || ''); setEditing(!decision.outcome) }, [decision.id, decision.outcome, decision.outcome_notes])

  const days = daysSinceDecided(decision)
  const due = lookbackDue(decision)

  const save = async () => {
    if (!pick) return
    setSaving(true)
    await onSave({ outcome: pick, note: note.trim() || null })
    setSaving(false); setEditing(false)
  }

  if (!editing && current) {
    return (
      <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid color-mix(in oklch, var(--accent) 30%, transparent)' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
          <span className="label">looking back</span>
          <span style={{ fontSize: 15, fontWeight: 500, color: current.text }}><span aria-hidden="true">{current.emoji}</span> {current.label}</span>
          {decision.reviewed_at && <span className="label">reviewed {new Date(decision.reviewed_at).toLocaleDateString()}</span>}
          <button className="linklike label" onClick={() => setEditing(true)} style={{ textDecoration: 'underline' }}>change</button>
        </div>
        {decision.outcome_notes && <p style={{ margin: '6px 0 0', fontSize: 14, lineHeight: 1.5, color: 'var(--ink-soft)', whiteSpace: 'pre-wrap' }}>{decision.outcome_notes}</p>}
      </div>
    )
  }

  return (
    <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid color-mix(in oklch, var(--accent) 30%, transparent)' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
        <span className="label" style={due ? { color: 'var(--warn-text)' } : undefined}>{due ? 'look back due' : 'looking back'}</span>
        <span style={{ fontSize: 14, fontWeight: 500 }}>How did it turn out?</span>
        {days != null && <span className="label">{days} day{days === 1 ? '' : 's'} since</span>}
      </div>
      <fieldset style={{ border: 'none', padding: 0, margin: '10px 0 0', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <legend className="sr-only">Verdict</legend>
        {OUTCOMES.map(o => {
          const on = pick === o.key
          return (
            <button key={o.key} type="button" aria-pressed={on} onClick={() => setPick(o.key)} className="btn btn-sm"
              style={{ background: on ? o.color : 'var(--bg)', color: on ? '#fff' : 'var(--ink)', borderColor: on ? o.color : 'var(--rule)' }}>
              <span aria-hidden="true">{o.emoji}</span> {o.label}
            </button>
          )
        })}
      </fieldset>
      <textarea value={note} onChange={e => setNote(e.target.value)} rows={2} aria-label="Look-back note"
        placeholder="What would you tell yourself at the time?"
        style={{ display: 'block', width: '100%', marginTop: 10, padding: '8px 10px', fontSize: 13, lineHeight: 1.5, border: '1px solid var(--rule)', borderRadius: 8, resize: 'vertical', color: 'var(--ink)', background: 'var(--bg)' }} />
      <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
        <button className="btn btn-accent btn-sm" onClick={save} disabled={!pick || saving}>{saving ? 'Saving…' : 'Save look-back'}</button>
        {current && <button className="btn btn-outline btn-sm" onClick={() => { setPick(decision.outcome); setNote(decision.outcome_notes || ''); setEditing(false) }}>Cancel</button>}
      </div>
    </div>
  )
}
