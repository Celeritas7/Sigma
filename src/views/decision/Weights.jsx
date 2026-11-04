import { useState } from 'react'
import { Pill, WeightSlider } from '../../components/atoms'
import { NARROW, NO_HOVER, fmtWeight, onActivate, useMedia } from '../../lib/ui'

// ── Weight editor: roomy panel with steppers + sliders + full labels ────────
export function WeightStep({ value, onChange, color, label }) {
  const set = d => onChange(Math.max(0, Math.min(10, Math.round((value + d) * 2) / 2)))
  const btn = { width: 26, height: 26, borderRadius: 7, border: '1px solid var(--rule)', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17, lineHeight: 1, color: 'var(--ink)', boxShadow: 'var(--shadow-sm)' }
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
      <button style={btn} onClick={() => set(-1)} title="−1" aria-label={`decrease ${label}`}>−</button>
      <span className="mono" style={{ minWidth: 22, textAlign: 'center', fontSize: 16, fontWeight: 600, color }}>{fmtWeight(value)}</span>
      <button style={btn} onClick={() => set(1)} title="+1" aria-label={`increase ${label}`}>+</button>
    </div>
  )
}

export function WeightPanel({ parameters, overrides, setOverrides, paramColors, paramHues, highlight, setHighlight, isWhatIf, kh, onReset, onSave, open, setOpen }) {
  const [view, setView] = useState('tiers') // 'tiers' | 'fine'
  const [dragId, setDragId] = useState(null)
  const [overLane, setOverLane] = useState(null)
  // tap-to-move (touch screens can't drag): tap a chip to pick it, tap a lane to drop it
  const [picked, setPicked] = useState(null)
  const narrow = useMedia(NARROW)
  const noHover = useMedia(NO_HOVER)
  const moveTo = (id, t) => {
    const pp = parameters.find(p => p.id === id)
    if (pp && tierOf(curW(pp)).key !== t.key) setW(pp, t.value)
  }
  const setW = (pp, v) => {
    setOverrides(prev => {
      const next = { ...(prev || {}) }
      if (Math.abs(v - Number(pp.weight)) > 0.01) next[pp.id] = v
      else delete next[pp.id]
      return Object.keys(next).length ? next : null
    })
  }
  // Each lane covers a range of weights, so a chip sits in the lane its real
  // weight falls in. Dropping onto a different lane sets the lane's `value`.
  const TIERS = [
    { key: 'must',  label: 'Must-have',      min: 9,    range: '9–10',    value: 10, hue: 145 },
    { key: 'imp',   label: 'Important',      min: 7,    range: '7–8.5',   value: 8,  hue: 75 },
    { key: 'nice',  label: 'Nice to have',   min: 4,    range: '4–6.5',   value: 5,  hue: 235 },
    { key: 'minor', label: 'Minor',          min: 1e-9, range: '0.5–3.5', value: 2,  hue: 25 },
    { key: 'skip',  label: "Doesn't matter", min: -Infinity, range: '0 · not counted', value: 0, hue: 285 },
  ]
  const tierOf = w => TIERS.find(t => w >= t.min)
  const curW = pp => overrides?.[pp.id] ?? Number(pp.weight)
  const isOver = pp => overrides?.[pp.id] != null && Math.abs(overrides[pp.id] - Number(pp.weight)) > 0.01
  return (
    <div className="card" style={{ background: isWhatIf ? 'var(--hi-soft)' : `oklch(var(--tone-tint) 0.03 ${kh})`, borderColor: isWhatIf ? 'var(--hi)' : `oklch(var(--tone-line) 0.05 ${kh})`, transition: 'background 200ms' }}>
      <div style={{ padding: '12px 18px 14px' }}>
        {/* header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <span className="label" style={isWhatIf ? { color: 'var(--hi)' } : undefined}>weights — what matters most?</span>
            {isWhatIf && <Pill color="var(--hi)">unsaved</Pill>}
            <span style={{ fontSize: 12, color: 'var(--ink-soft)' }}>{open ? (view === 'tiers' ? (picked ? 'now tap a lane to move it there' : noHover ? 'tap a chip, then a lane, to set its weight' : 'drag (or tap) onto a lane to set its weight') : 'tap −/+ or drag the slider') : 'higher = matters more'}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            {isWhatIf && <button className="btn btn-outline btn-sm" onClick={onReset}>Reset</button>}
            {isWhatIf && <button className="btn btn-accent btn-sm" onClick={onSave}>Save weights</button>}
            {open && parameters.length > 0 && (
              <div style={{ display: 'flex', gap: 2, padding: 2, background: 'var(--bg-inset)', borderRadius: 8, marginRight: 2 }}>
                {[{ id: 'tiers', label: '⠿ Tiers' }, { id: 'fine', label: '⊹ Fine' }].map(s => (
                  <button key={s.id} onClick={() => setView(s.id)}
                    style={{ padding: '5px 11px', fontSize: 12, fontWeight: 500, whiteSpace: 'nowrap', borderRadius: 6, border: 'none', background: view === s.id ? 'var(--bg)' : 'transparent', color: view === s.id ? 'var(--ink)' : 'var(--ink-soft)', boxShadow: view === s.id ? 'var(--shadow-sm)' : 'none' }}>{s.label}</button>
                ))}
              </div>
            )}
            <button className="btn btn-ghost btn-sm" onClick={() => setOpen(o => !o)}>{open ? 'Collapse ▴' : 'Adjust ▾'}</button>
          </div>
        </div>

        {/* body */}
        {parameters.length === 0 ? (
          <div style={{ padding: '8px 0' }}><span className="label">add a parameter to start weighting</span></div>
        ) : !open ? (
          <div style={{ marginTop: 10, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {parameters.map(pp => {
              const c = paramColors[pp.id]
              return (
                <div key={pp.id} title={pp.name} onMouseEnter={() => setHighlight(pp.id)} onMouseLeave={() => setHighlight(null)}
                  style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '5px 11px', borderRadius: 999, background: 'var(--bg)', border: `1px solid ${highlight === pp.id ? c : 'var(--rule)'}` }}>
                  <span style={{ width: 9, height: 9, borderRadius: '50%', background: c }} />
                  <span style={{ fontSize: 12, maxWidth: 150, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{pp.name}</span>
                  <span className="mono" style={{ fontSize: 12, fontWeight: 600, color: isOver(pp) ? 'var(--hi)' : 'var(--ink)' }}>{fmtWeight(curW(pp))}</span>
                </div>
              )
            })}
          </div>
        ) : view === 'fine' ? (
          <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 10 }}>
            {parameters.map((pp, i) => {
              const cur = curW(pp); const over = isOver(pp); const c = paramColors[pp.id]
              return (
                <div key={pp.id} onMouseEnter={() => setHighlight(pp.id)} onMouseLeave={() => setHighlight(null)}
                  style={{ padding: '10px 13px', borderRadius: 11, border: `1px solid ${highlight === pp.id ? c : 'var(--rule)'}`, background: 'var(--bg)', boxShadow: highlight === pp.id ? 'var(--shadow-sm)' : 'none', transition: 'border-color 150ms, box-shadow 150ms' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 9 }}>
                    <span style={{ width: 10, height: 10, borderRadius: 3, background: c, flexShrink: 0 }} />
                    <span style={{ fontSize: 13, fontWeight: 500, lineHeight: 1.25 }}>{pp.name}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <WeightStep value={cur} color={over ? 'var(--hi)' : `oklch(var(--tone-text) 0.13 ${paramHues[i % paramHues.length]})`} onChange={v => setW(pp, v)} label={`${pp.name} weight`} />
                    <div style={{ flex: 1 }}>
                      <WeightSlider label={`${pp.name} weight`} value={cur} original={Number(pp.weight)} ghostMark={isWhatIf} hue={over ? 260 : paramHues[i % paramHues.length]} onChange={v => setW(pp, v)} />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {TIERS.map(t => {
              const chips = parameters.filter(pp => tierOf(curW(pp)).key === t.key)
              const active = overLane === t.key
              const target = picked && tierOf(curW(parameters.find(p => p.id === picked))).key !== t.key
              return (
                <div key={t.key}
                  onClick={() => { if (picked) { moveTo(picked, t); setPicked(null) } }}
                  onDragOver={e => { e.preventDefault(); if (overLane !== t.key) setOverLane(t.key) }}
                  onDragLeave={() => setOverLane(l => l === t.key ? null : l)}
                  onDrop={e => { e.preventDefault(); moveTo(dragId || e.dataTransfer.getData('text/plain'), t); setDragId(null); setOverLane(null) }}
                  style={{ display: 'grid', gridTemplateColumns: narrow ? '104px 1fr' : '152px 1fr', alignItems: 'stretch', border: `1px ${target ? 'dashed' : 'solid'} ${active || target ? `oklch(0.6 0.15 ${t.hue})` : 'var(--rule)'}`, borderRadius: 11, background: active ? `oklch(calc(var(--tone-tint) + 0.015) 0.04 ${t.hue})` : 'var(--bg)', cursor: target ? 'pointer' : undefined, transition: 'border-color 120ms, background 120ms', minHeight: 52, overflow: 'hidden' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 2, padding: narrow ? '10px 10px' : '10px 14px', borderRight: '1px solid var(--rule-soft)', background: `oklch(calc(var(--tone-tint) + 0.01) 0.055 ${t.hue})` }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: `oklch(var(--tone-label) 0.13 ${t.hue})` }}>{t.label}</span>
                    <span className="label" style={{ color: `oklch(calc(var(--tone-label) + 0.03) 0.1 ${t.hue})` }}>weight {t.range}</span>
                    {target && (
                      <button className="btn btn-outline btn-sm" style={{ marginTop: 6, padding: '3px 8px', alignSelf: 'flex-start' }}
                        aria-label={`Move ${parameters.find(p => p.id === picked)?.name} to ${t.label}`}
                        onClick={e => { e.stopPropagation(); moveTo(picked, t); setPicked(null) }}>Move here</button>
                    )}
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, alignItems: 'center', padding: '8px 12px' }}>
                    {chips.length === 0 && <span className="label">{active ? 'release to drop' : target ? 'tap to move here' : 'drop here'}</span>}
                    {chips.map(pp => {
                      const c = paramColors[pp.id]; const over = isOver(pp)
                      return (
                        <div key={pp.id} draggable
                          onDragStart={e => { setDragId(pp.id); e.dataTransfer.setData('text/plain', pp.id); e.dataTransfer.effectAllowed = 'move' }}
                          onDragEnd={() => { setDragId(null); setOverLane(null) }}
                          onClick={e => { e.stopPropagation(); setPicked(id => id === pp.id ? null : pp.id) }}
                          role="button" tabIndex={0} aria-pressed={picked === pp.id}
                          onKeyDown={onActivate(e => { e.stopPropagation(); setPicked(id => id === pp.id ? null : pp.id) })}
                          onMouseEnter={() => setHighlight(pp.id)} onMouseLeave={() => setHighlight(null)}
                          style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 12px', borderRadius: 9, background: picked === pp.id ? `color-mix(in oklch, ${c} 14%, var(--bg))` : 'var(--bg)', border: `1px solid ${picked === pp.id ? c : over ? 'var(--hi)' : (highlight === pp.id ? c : 'var(--rule)')}`, boxShadow: picked === pp.id ? `0 0 0 3px color-mix(in oklch, ${c} 30%, transparent)` : 'var(--shadow-sm)', cursor: 'grab', opacity: dragId === pp.id ? 0.35 : 1, transition: 'opacity 120ms' }}>
                          <span style={{ width: 9, height: 9, borderRadius: 3, background: c, flexShrink: 0 }} />
                          <span style={{ fontSize: 13, fontWeight: 500 }}>{pp.name}</span>
                          <span className="mono" title={over ? `was ${fmtWeight(Number(pp.weight))}` : undefined} style={{ fontSize: 12, fontWeight: 600, color: over ? 'var(--hi)' : 'var(--ink-soft)' }}>{fmtWeight(curW(pp))}</span>
                          <span className="sr-only">, {t.label}. {picked === pp.id ? 'Picked: choose a lane' : 'Pick to move'}</span>
                          <span aria-hidden="true" style={{ fontSize: 13, color: 'var(--ink-ghost)', letterSpacing: '-2px', marginLeft: 2 }}>⠿</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
