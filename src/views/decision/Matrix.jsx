import { useState, useEffect, useRef } from 'react'
import { InlineText, RawInput } from '../../components/atoms'
import { NARROW, fmtWeight, sliderKey, useMedia } from '../../lib/ui'
import { CrossCheck } from './CrossCheck'

// =============================================================================
// MATRIX
// =============================================================================
export function Matrix({ parameters, options, scores, paramColors, optColors, highlight, setHighlight, onScoreUpdate, paramHandlers, optionHandlers, overrides, onEditWeights }) {
  const narrow = useMedia(NARROW)
  const [addParamDraft, setAddParamDraft] = useState('')
  return (
    <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: 720 }}>
      <thead>
        <tr style={{ background: 'var(--bg-soft)', borderBottom: '1px solid var(--rule)' }}>
          <th style={{ padding: narrow ? '12px 12px' : '12px 18px', textAlign: 'left', minWidth: narrow ? 130 : 200, position: 'sticky', left: 0, background: 'var(--bg-soft)', zIndex: 2 }}><span className="label">consideration</span></th>
          <th style={{ padding: '12px 12px', textAlign: 'left', width: 60 }}><span className="label">w</span></th>
          {options.map((o, oi) => (
            <th key={o.id} style={{ padding: '12px 12px', textAlign: 'left', minWidth: 160, borderTop: `2px solid ${optColors[o.id]}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 13, fontWeight: 500 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: optColors[o.id], flexShrink: 0 }} />
                <InlineText value={o.name} onCommit={v => optionHandlers.onUpdate(o.id, { name: v })} placeholder="option" label="Option name" style={{ fontSize: 13, fontWeight: 500 }} />
              </div>
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {parameters.map(pp => {
          const isHi = highlight === pp.id
          return (
            <tr key={pp.id} onMouseEnter={() => setHighlight(pp.id)} onMouseLeave={() => setHighlight(null)}
              style={{ borderTop: '1px solid var(--rule-soft)', background: isHi ? 'var(--bg-soft)' : 'transparent', transition: 'background 150ms' }}>
              <td style={{ padding: '12px 18px', position: 'sticky', left: 0, background: isHi ? 'var(--bg-soft)' : 'var(--bg)', zIndex: 1 }}>
                <ParameterRow parameter={pp} color={paramColors[pp.id]} onUpdate={fields => paramHandlers.onUpdate(pp.id, fields)} onDelete={() => paramHandlers.onDelete(pp.id)} />
              </td>
              <td style={{ padding: '12px 12px' }}>
                {(() => {
                  const over = overrides?.[pp.id] != null
                  const w = over ? overrides[pp.id] : Number(pp.weight)
                  return (
                    <button onClick={onEditWeights} title={over ? `unsaved (was ${fmtWeight(Number(pp.weight))}) · edit in Weights` : 'edit in Weights'}
                      aria-label={`${pp.name} weight ${fmtWeight(w)}${over ? ', unsaved' : ''}. Edit in Weights`}
                      className="mono" style={{ minWidth: 40, padding: '3px 8px', fontSize: 13, fontWeight: 600, textAlign: 'center', border: `1px solid ${over ? 'var(--hi)' : 'var(--rule)'}`, borderRadius: 6, background: over ? 'var(--hi-soft)' : 'var(--bg)', color: over ? 'var(--hi)' : 'var(--ink)' }}>
                      {fmtWeight(w)}
                    </button>
                  )
                })()}
              </td>
              {options.map(o => (
                <Cell key={o.id} param={pp} option={o}
                  score={scores.find(s => s.option_id === o.id && s.parameter_id === pp.id)}
                  onUpdate={fields => onScoreUpdate(o.id, pp.id, fields)} />
              ))}
            </tr>
          )
        })}
        <tr style={{ borderTop: '1px solid var(--rule-soft)' }}>
          <td colSpan={2 + options.length} style={{ padding: '12px 18px', background: 'var(--bg-soft)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span className="label">+</span>
              <input value={addParamDraft} onChange={e => setAddParamDraft(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && addParamDraft.trim()) { paramHandlers.onAdd(addParamDraft.trim()); setAddParamDraft('') }}}
                placeholder="add a consideration…" aria-label="Add a consideration"
                style={{ border: 'none', padding: 0, fontSize: 14, color: 'var(--ink)', flex: 1 }} />
              <span className="label">enter</span>
            </div>
          </td>
        </tr>
      </tbody>
    </table>
  )
}

export function ParameterRow({ parameter, color, onUpdate, onDelete }) {
  const [showType, setShowType] = useState(false)
  const options = Array.isArray(parameter.options) ? parameter.options : []
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
      <span style={{ width: 4, height: 20, background: color, borderRadius: 1, flexShrink: 0, marginTop: 2 }} />
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 500 }}>
          <InlineText value={parameter.name} onCommit={v => onUpdate({ name: v })} placeholder="parameter" label="Consideration name" style={{ fontSize: 13, fontWeight: 500 }} />
        </div>
        <button onClick={() => setShowType(s => !s)} aria-expanded={showType} className="label" style={{ background: 'none', border: 'none', padding: '2px 0', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          <span aria-hidden="true" style={{ opacity: 0.6 }}>{showType ? '▾' : '▸'}</span>
          <span className="sr-only">{parameter.name} type: </span>
          {parameter.input_type || 'text'}{parameter.unit ? ` · ${parameter.unit}` : ''}{parameter.input_type === 'categorical' ? ` · ${options.length} opts` : ''}
        </button>
        {showType && (
          <div style={{ marginTop: 8, padding: 10, background: 'var(--bg-inset)', borderRadius: 4 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
              <span className="label" style={{ fontSize: 9 }}>type</span>
              <select value={parameter.input_type || 'text'} aria-label={`${parameter.name} input type`} onChange={e => {
                const t = e.target.value
                const u = { input_type: t }
                if (t !== 'number') u.unit = null
                if (t === 'categorical' && options.length === 0) u.options = ['', '']
                if (t !== 'categorical') u.options = null
                onUpdate(u)
              }} style={{ fontSize: 11, border: '1px solid var(--rule)', borderRadius: 3, padding: '2px 4px', background: 'var(--bg)', color: 'var(--ink)' }}>
                <option value="text">text</option>
                <option value="number">number</option>
                <option value="categorical">categorical</option>
              </select>
            </div>
            {parameter.input_type === 'number' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                <span className="label" style={{ fontSize: 9 }}>unit</span>
                <input value={parameter.unit || ''} onChange={e => onUpdate({ unit: e.target.value })}
                  placeholder="e.g. 万円, %, h" aria-label={`${parameter.name} unit`}
                  style={{ fontSize: 11, border: '1px solid var(--rule)', borderRadius: 3, padding: '2px 4px', color: 'var(--ink)' }} />
              </div>
            )}
            {parameter.input_type === 'categorical' && (
              <div>
                <div className="label" style={{ fontSize: 9, marginBottom: 4 }}>options</div>
                {options.map((opt, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 3 }}>
                    <input value={opt} aria-label={`choice ${i + 1}`} onChange={e => { const n = [...options]; n[i] = e.target.value; onUpdate({ options: n }) }}
                      style={{ flex: 1, fontSize: 11, border: '1px solid var(--rule)', borderRadius: 3, padding: '2px 4px', color: 'var(--ink)' }} />
                    <button onClick={() => onUpdate({ options: options.filter((_, j) => j !== i) })} aria-label={`remove choice ${i + 1}`} className="iconbtn" style={{ width: 20, height: 20, fontSize: 11 }}>×</button>
                  </div>
                ))}
                <button className="label" onClick={() => onUpdate({ options: [...options, ''] })} style={{ background: 'none', border: 'none', padding: 0 }}>+ add option</button>
              </div>
            )}
            <button className="iconbtn" onClick={onDelete} title="delete parameter" style={{ color: 'var(--neg)', marginTop: 6 }}>delete row</button>
          </div>
        )}
      </div>
    </div>
  )
}

// Score slider — drag 0–10 with visible value. Variant of WeightSlider sized
// to fit inside a matrix cell.
// While dragging, the value lives in local state; it's saved once on release,
// not on every pointer move (each change is a database write).
export function ScoreSlider({ value, onChange, label }) {
  const trackRef = useRef(null)
  const [draft, setDraft] = useState(null)
  const draftRef = useRef(null)
  const dragging = draft != null
  const v = draft ?? value ?? null
  const move = cx => {
    if (!trackRef.current) return
    const r = trackRef.current.getBoundingClientRect()
    const t = Math.max(0, Math.min(1, (cx - r.left) / r.width))
    draftRef.current = Math.round(t * 20) / 2
    setDraft(draftRef.current)
  }
  useEffect(() => {
    if (!dragging) return
    const m = e => move(e.clientX)
    const u = () => {
      const next = draftRef.current
      draftRef.current = null
      setDraft(null)
      if (next != null && next !== value) onChange(next)
    }
    window.addEventListener('pointermove', m)
    window.addEventListener('pointerup', u)
    window.addEventListener('pointercancel', u)
    return () => { window.removeEventListener('pointermove', m); window.removeEventListener('pointerup', u); window.removeEventListener('pointercancel', u) }
  }, [dragging, value, onChange])
  // keyboard: holding an arrow key repeats keydown; save once on keyup
  const commitKey = () => {
    const next = draftRef.current
    if (next == null) return
    draftRef.current = null
    setDraft(null)
    if (next !== value) onChange(next)
  }
  const onKeyDown = e => {
    if ((e.key === 'Delete' || e.key === 'Backspace') && value != null) { e.preventDefault(); onChange(null); return }
    if (e.key === 'Escape' && draftRef.current != null) { draftRef.current = null; setDraft(null); return }
    const next = sliderKey(e.key, draftRef.current ?? value)
    if (next === undefined) return
    e.preventDefault()
    draftRef.current = next
    setDraft(next)
  }
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div ref={trackRef} role="slider" tabIndex={0} aria-label={label}
        aria-valuemin={0} aria-valuemax={10} aria-valuenow={v ?? undefined} aria-valuetext={v == null ? 'not scored' : `${v} out of 10`}
        onKeyDown={onKeyDown} onKeyUp={commitKey} onBlur={commitKey}
        onPointerDown={e => move(e.clientX)}
        style={{ position: 'relative', flex: 1, height: 22, cursor: 'pointer', touchAction: 'none', userSelect: 'none' }}>
        {/* track */}
        <div style={{ position: 'absolute', top: 10, left: 0, right: 0, height: 2, background: 'var(--rule)', borderRadius: 1 }} />
        {/* fill (0 if unset) */}
        {v != null && (
          <div style={{ position: 'absolute', top: 10, left: 0, height: 2, width: `${(v / 10) * 100}%`, background: 'var(--accent)', borderRadius: 1, transition: dragging ? 'none' : 'width 180ms' }} />
        )}
        {/* tick marks at 0, 5, 10 */}
        {[0, 5, 10].map(t => (
          <div key={t} style={{ position: 'absolute', top: 7, left: `${(t / 10) * 100}%`, width: 1, height: 8, background: 'var(--ink-ghost)' }} />
        ))}
        {/* thumb */}
        {v != null ? (
          <div style={{ position: 'absolute', top: 4, left: `calc(${(v / 10) * 100}% - 7px)`, width: 14, height: 14, background: 'var(--accent)', border: '2px solid var(--bg)', borderRadius: '50%', boxShadow: dragging ? '0 0 0 4px color-mix(in oklch, var(--accent) 25%, transparent)' : '0 0 0 1px var(--accent)', transition: dragging ? 'none' : 'left 180ms' }} />
        ) : (
          // empty thumb hint at the start
          <div style={{ position: 'absolute', top: 4, left: -7, width: 14, height: 14, background: 'transparent', border: '2px dashed var(--ink-ghost)', borderRadius: '50%' }} />
        )}
      </div>
      <span className="mono" style={{ fontSize: 12, color: v != null ? 'var(--accent-text)' : 'var(--ink-faint)', minWidth: 26, textAlign: 'right', fontWeight: 500 }}>
        {v != null ? v.toFixed(1) : '—'}
      </span>
      {v != null && (
        <button onClick={() => onChange(null)} title="clear" aria-label={`clear ${label || 'score'}`}
          style={{ background: 'transparent', border: 'none', color: 'var(--ink-faint)', padding: 0, width: 14, height: 14, fontSize: 11, lineHeight: 1 }}>×</button>
      )}
    </div>
  )
}

// Raw value on top, draggable slider for the rating, AI cross-check below.
export function Cell({ param, option, score, onUpdate }) {
  return (
    <td style={{ padding: '10px 12px', minWidth: 210, verticalAlign: 'top' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <RawInput
          label={`${param.name} evidence for ${option.name}`}
          value={score?.notes}
          unit={param.unit}
          type={param.input_type}
          options={param.options}
          onChange={v => onUpdate({ notes: v })}
        />
        <ScoreSlider
          label={`${param.name} score for ${option.name}`}
          value={score?.value != null ? Number(score.value) : null}
          onChange={v => onUpdate({ value: v })}
        />
        {score?.value != null && (
          <div>
            <CrossCheck
              param={param}
              option={option}
              score={score}
            />
          </div>
        )}
      </div>
    </td>
  )
}
