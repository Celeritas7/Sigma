import { useState, useEffect, useRef } from 'react'
import { Pill } from '../components/atoms'
import { kindColor } from '../lib/theme'
import { useDialogFocus } from '../lib/ui'

// Preview of a backup file: tick what to bring in, then import. Entries that
// are already in the account start unticked, so importing the same backup
// twice doesn't duplicate by accident.
export function ImportDialog({ summary, exportedAt, onImport, onClose }) {
  const all = [...summary.decisions, ...summary.templates]
  const [chosen, setChosen] = useState(() => new Set(all.filter(e => !e.present).map(e => e.key)))
  const [stage, setStage] = useState('choose')  // choose | importing | done
  const [result, setResult] = useState(null)
  const dialogRef = useRef(null)
  useDialogFocus(dialogRef)

  useEffect(() => {
    const k = e => { if (e.key === 'Escape' && stage !== 'importing') onClose() }
    window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k)
  }, [onClose, stage])

  const toggle = key => setChosen(s => { const n = new Set(s); n.has(key) ? n.delete(key) : n.add(key); return n })
  const nDec = summary.decisions.filter(d => chosen.has(d.key)).length
  const nTpl = summary.templates.filter(t => chosen.has(t.key)).length
  const plural = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`
  const what = [nDec && plural(nDec, 'decision'), nTpl && plural(nTpl, 'template')].filter(Boolean).join(' and ')

  const run = async () => {
    setStage('importing')
    let r
    try { r = await onImport(chosen) } catch (e) { r = { error: e.message || String(e) } }
    setResult(r); setStage('done')
  }

  const row = (e, children) => (
    <label key={e.key} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '9px 12px', borderRadius: 8, cursor: 'pointer',
      border: `1px solid ${chosen.has(e.key) ? 'var(--accent)' : 'var(--rule)'}`, background: chosen.has(e.key) ? 'var(--accent-soft)' : 'var(--bg)' }}>
      <input type="checkbox" checked={chosen.has(e.key)} onChange={() => toggle(e.key)} disabled={stage !== 'choose'} />
      {children}
      {e.present && <Pill color="var(--warn)">already here</Pill>}
    </label>
  )

  return (
    <div className="overlay-bg" onClick={() => stage !== 'importing' && onClose()}>
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="import-title" className="overlay-card"
        onClick={e => e.stopPropagation()} style={{ width: 560, maxWidth: '95vw', padding: '24px 28px 26px' }}>
        <span className="label">import backup{exportedAt ? ` · made ${new Date(exportedAt).toLocaleDateString()}` : ''}</span>
        <h2 id="import-title" style={{ margin: '6px 0 4px', fontSize: 22, fontWeight: 500, letterSpacing: '-0.01em' }}>
          {stage === 'done' ? (result?.error ? "Couldn't import" : 'Imported') : 'What should come in?'}
        </h2>

        {stage === 'done' ? (
          <p role="status" style={{ margin: '8px 0 0', fontSize: 14, lineHeight: 1.5, color: result?.error ? 'var(--neg)' : 'var(--ink-soft)' }}>
            {result?.error
              ? <>{/[.!?]$/.test(result.error) ? result.error : result.error + '.'} Nothing was added.</>
              : <>Added {result.what}. They're new copies; nothing that was already here changed.{result.archived ? ` ${plural(result.archived, 'archived decision')} came in archived, so ${result.archived === 1 ? "it isn't" : "they aren't"} on Home.` : ''}</>}
          </p>
        ) : (
          <>
            <p style={{ margin: '0 0 14px', fontSize: 13, color: 'var(--ink-soft)', lineHeight: 1.5 }}>
              Each one comes in as a new copy. Nothing already in your account is changed or replaced.
            </p>
            {summary.decisions.length > 0 && (
              <fieldset style={{ border: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
                <legend className="label" style={{ marginBottom: 6 }}>decisions</legend>
                {summary.decisions.map(d => row(d, <>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ fontSize: 14, fontWeight: 500 }}>{d.title}</span>
                    <span className="label" style={{ display: 'block', marginTop: 2 }}>{d.considerations}p × {d.options}o</span>
                  </span>
                  <Pill color={kindColor(d.type, d.title)}>{d.status === 'active' ? 'open' : d.status}</Pill>
                </>))}
              </fieldset>
            )}
            {summary.templates.length > 0 && (
              <fieldset style={{ border: 'none', padding: 0, margin: '14px 0 0', display: 'flex', flexDirection: 'column', gap: 6 }}>
                <legend className="label" style={{ marginBottom: 6 }}>templates</legend>
                {summary.templates.map(t => row(t, <>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ fontSize: 14, fontWeight: 500 }}>{t.name}</span>
                    <span className="label" style={{ display: 'block', marginTop: 2 }}>{plural(t.considerations, 'consideration')}</span>
                  </span>
                </>))}
              </fieldset>
            )}
            {all.length === 0 && <p style={{ fontSize: 14, color: 'var(--ink-soft)' }}>This backup is empty.</p>}
          </>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 8, marginTop: 18 }}>
          {stage === 'done'
            ? <button className="btn btn-accent btn-sm" onClick={onClose}>Done</button>
            : <>
                <button className="btn btn-outline btn-sm" onClick={onClose} disabled={stage === 'importing'}>Cancel</button>
                <button className="btn btn-accent btn-sm" onClick={run} disabled={stage === 'importing' || chosen.size === 0}>
                  {stage === 'importing' ? 'Importing…' : chosen.size ? `Import ${what}` : 'Import'}
                </button>
              </>}
        </div>
      </div>
    </div>
  )
}
