import { useState, useEffect, useMemo, useRef } from 'react'
import { Pill, RawInput } from '../components/atoms'
import { hashString, mulberry32, shuffled } from '../lib/scoring'
import { onActivate, useDialogFocus } from '../lib/ui'

// =============================================================================
// BLIND SCORE OVERLAY
// =============================================================================
export function BlindOverlay({ data, onScoreUpdate, onClose }) {
  const [paramIdx, setParamIdx] = useState(0)
  const [revealed, setRevealed] = useState(false)
  // scores given in this pass, for the current parameter only. Earlier scores
  // stay hidden until reveal so they can't anchor the new ones.
  const [pass, setPass] = useState({})
  // new random order each time the overlay opens, stable while it's open
  const [seed] = useState(() => Math.floor(Math.random() * 2 ** 32))
  const params = data.parameters
  const param = params[paramIdx]
  const order = useMemo(
    () => param ? shuffled(data.options, mulberry32(seed ^ hashString(param.id))) : [],
    [data.options, param?.id, seed])
  const goTo = i => { setParamIdx(i); setRevealed(false); setPass({}) }

  useEffect(() => {
    const k = e => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k)
  }, [onClose])
  const dialogRef = useRef(null)
  useDialogFocus(dialogRef)

  if (!param) {
    return (
      <div className="overlay-bg" onClick={onClose}>
        <div ref={dialogRef} role="dialog" aria-modal="true" aria-label="Blind score mode" className="overlay-card" onClick={e => e.stopPropagation()} style={{ width: 520, padding: 40, textAlign: 'center' }}>
          <span className="label">no parameters yet</span>
          <p style={{ marginTop: 12, fontSize: 14, color: 'var(--ink-soft)' }}>Add some considerations first.</p>
          <button className="btn btn-primary" onClick={onClose} style={{ marginTop: 18 }}>OK</button>
        </div>
      </div>
    )
  }
  const scoredCount = order.filter(o => pass[o.id] != null).length

  return (
    <div className="overlay-bg" onClick={onClose}>
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="blind-title" className="overlay-card" onClick={e => e.stopPropagation()} style={{ width: 840, maxWidth: '95vw' }}>
        <div style={{ padding: '20px 32px 16px', borderBottom: '1px solid var(--rule)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, background: 'var(--bg)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Pill color="var(--hi)">blind mode</Pill>
            <span className="label">{paramIdx + 1} of {params.length}</span>
            <div style={{ display: 'flex', gap: 3 }}>
              {params.map((_, i) => <div key={i} style={{ width: 20, height: 3, background: i <= paramIdx ? 'var(--accent)' : 'var(--rule)', borderRadius: 1 }} />)}
            </div>
          </div>
          <button className="iconbtn" onClick={onClose} aria-label="Close">×</button>
        </div>
        <div style={{ padding: '28px 32px 40px' }}>
          <span className="label" style={{ color: 'var(--hi)' }}>anti-bias · halo-effect killer</span>
          <h2 id="blind-title" style={{ margin: '8px 0 6px', fontSize: 26, fontWeight: 500, letterSpacing: '-0.01em' }}>Score {param.name} across all options. Names hidden.</h2>
          <p style={{ margin: '0 0 24px', fontSize: 13, lineHeight: 1.6, color: 'var(--ink-soft)', maxWidth: 580 }}>
            Score this one thing for every option at once. Names are hidden — only raw evidence is shown. Reveal at the end: do your scores match your gut?
          </p>
          <div style={{ padding: '14px 18px', background: 'var(--bg-inset)', border: '1px solid var(--rule)', borderRadius: 6, display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
            <div>
              <span className="label">now scoring</span>
              <div style={{ marginTop: 2, fontSize: 22, fontWeight: 500 }}>{param.name}</div>
              <div style={{ fontSize: 11, color: 'var(--ink-soft)', marginTop: 2 }}>weight {param.weight} · {param.input_type || 'text'}{param.unit ? ` · ${param.unit}` : ''}</div>
            </div>
            <span className="label">{scoredCount}/{order.length} scored this pass</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {order.map((o, i) => {
              const score = data.scores.find(s => s.option_id === o.id && s.parameter_id === param.id)
              return <BlindCard key={o.id} letter={String.fromCharCode(65 + i)} option={o} score={score} param={param} revealed={revealed}
                passValue={pass[o.id]}
                onScore={v => { setPass(p => ({ ...p, [o.id]: v })); onScoreUpdate(o.id, param.id, { value: v }) }}
                onRaw={v => onScoreUpdate(o.id, param.id, { notes: v })} />
            })}
          </div>
          <div style={{ marginTop: 24, padding: '14px 18px', background: 'var(--bg-soft)', borderRadius: 6, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>
              <strong style={{ color: 'var(--ink)' }}>Tip:</strong> if scored gut feel doesn't match your originally-named pick, that's the bias.
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-outline btn-sm" onClick={() => setRevealed(r => !r)}>{revealed ? 'Hide names' : 'Reveal names'}</button>
              <button className="btn btn-outline btn-sm" disabled={paramIdx === 0} onClick={() => goTo(paramIdx - 1)}>← prev</button>
              {paramIdx < params.length - 1
                ? <button className="btn btn-primary btn-sm" onClick={() => goTo(paramIdx + 1)}>Next →</button>
                : <button className="btn btn-primary btn-sm" onClick={onClose}>Done</button>
              }
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export function BlindCard({ letter, option, score, param, revealed, passValue, onScore, onRaw }) {
  const [editingRaw, setEditingRaw] = useState(false)
  const hasRaw = score?.notes != null && score.notes !== ''
  const done = passValue != null
  const hadEarlier = score?.value != null && !done
  return (
    <div style={{ padding: '16px 20px', border: `1px solid ${done ? 'var(--rule)' : 'var(--hi)'}`, background: done ? 'var(--bg)' : 'var(--hi-soft)', borderRadius: 6, display: 'grid', gridTemplateColumns: '52px 1fr auto', gap: 18, alignItems: 'center' }}>
      <div style={{ width: 44, height: 44, background: revealed ? 'var(--accent)' : (done ? 'var(--bg-inset)' : 'var(--hi)'), borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 600, color: revealed ? 'var(--bg)' : (done ? 'var(--ink)' : 'var(--bg)'), transition: 'all 220ms' }}>
        {revealed ? option.name?.charAt(0).toUpperCase() : letter}
      </div>
      <div style={{ minWidth: 0 }}>
        <span className="label">{revealed ? option.name : 'option ' + letter}</span>
        <div style={{ marginTop: 4 }}>
          {editingRaw
            ? <RawInput label={`evidence for option ${letter}`} value={score?.notes} unit={param.unit} type={param.input_type} options={param.options} onChange={v => { onRaw(v); setEditingRaw(false) }} />
            : <div role="button" tabIndex={0} onClick={() => setEditingRaw(true)} onKeyDown={onActivate(() => setEditingRaw(true))} style={{ fontSize: 16, fontStyle: hasRaw ? 'italic' : 'normal', cursor: 'text', minHeight: 22 }}>
                {hasRaw ? `"${score.notes}${param.unit ? ' ' + param.unit : ''}"` : <span style={{ color: 'var(--ink-faint)' }}>+ add evidence</span>}
              </div>
          }
        </div>
        {hadEarlier && (
          <span className="label" style={{ marginTop: 6, display: 'block' }}>
            {revealed ? `earlier score ${Number(score.value).toFixed(1)}` : 'earlier score hidden · picking replaces it'}
          </span>
        )}
      </div>
      <div style={{ display: 'flex', gap: 4 }}>
        {[0, 2.5, 5, 7.5, 10].map(v => {
          const on = passValue === v
          return (
            <button key={v} onClick={() => onScore(v)} className="mono" aria-pressed={on}
              style={{ padding: '6px 11px', background: on ? 'var(--accent-fill)' : 'var(--bg)', border: `1px solid ${on ? 'var(--accent-fill)' : 'var(--rule)'}`, fontSize: 11, borderRadius: 4, color: on ? '#fff' : 'var(--ink)', fontWeight: on ? 600 : 400 }}
              onMouseEnter={e => { if (!on) { e.currentTarget.style.background = 'var(--ink)'; e.currentTarget.style.color = 'var(--bg)' } }}
              onMouseLeave={e => { if (!on) { e.currentTarget.style.background = 'var(--bg)'; e.currentTarget.style.color = 'var(--ink)' } }}
            >{v}</button>
          )
        })}
      </div>
    </div>
  )
}
