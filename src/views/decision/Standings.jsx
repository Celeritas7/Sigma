import { useState, useEffect, useRef } from 'react'
import { InlineText, Pill } from '../../components/atoms'
import { paramContribution } from '../../lib/scoring'
import { NARROW, NO_HOVER, fmtWeight, useMedia } from '../../lib/ui'

// ── animation helpers ──────────────────────────────────────────────────────
// (Score totals update instantly with a color transition; bar widths animate
//  via CSS. We deliberately avoid requestAnimationFrame count-ups, which
//  freeze in background tabs.)

// FLIP list — rows reorder instantly via React reconciliation; the bar-width
// transitions and a short rank-change pulse carry the motion.
export function StandingsList({ ranked, baseline, optionHandlers, optColors, ...shared }) {
  return ranked.map((o, i) => (
    <LeaderRow key={o.id} option={o} rank={i} baselineRank={baseline.findIndex(x => x.id === o.id)}
      optColor={optColors[o.id]}
      onRename={v => optionHandlers.onUpdate(o.id, { name: v })}
      onDelete={() => optionHandlers.onDelete(o.id)}
      {...shared} />
  ))
}

// rank · name + bar · total · delete
export const standingsCols = narrow => narrow ? '26px 1fr 62px 28px' : '40px 1fr 100px 36px'

export function LeaderRow({ option, rank, parameters, scores, paramColors, optColor, leaderId, chosenId, overrides, highlight, onHighlight, baselineRank, isWhatIf, onRename, onDelete }) {
  const [hover, setHover] = useState(false)
  const narrow = useMedia(NARROW)
  const noHover = useMedia(NO_HOVER)
  const [pulse, setPulse] = useState(false)
  const prevRank = useRef(rank)
  useEffect(() => {
    if (prevRank.current !== rank) {
      setPulse(true)
      prevRank.current = rank
      const t = setTimeout(() => setPulse(false), 700)
      return () => clearTimeout(t)
    }
  }, [rank])
  const isTop = option.id === leaderId
  const shift = baselineRank - rank
  const parts = parameters.map(p => ({ p, contrib: paramContribution(option.id, p.id, scores, parameters, overrides) }))
  // the bar is drawn on the same 0–10 scale as the total; each segment is
  // that parameter's share of it, so the segments add up to the number shown
  const contribSum = parts.reduce((s, x) => s + x.contrib, 0)
  const total = option._total ?? 0
  const incomplete = option._scored < option._active
  return (
    <div onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{ display: 'grid', gridTemplateColumns: standingsCols(narrow), gap: narrow ? 10 : 16, alignItems: 'center', padding: narrow ? '14px 12px' : '18px 22px', borderBottom: '1px solid var(--rule-soft)',
        background: isTop ? (isWhatIf ? 'linear-gradient(90deg, var(--hi-soft), transparent 70%)' : 'linear-gradient(90deg, var(--accent-soft), transparent 70%)') : (hover ? 'var(--bg-soft)' : 'transparent'),
        boxShadow: isTop ? `inset 4px 0 0 ${isWhatIf ? 'var(--hi)' : 'var(--accent)'}` : (pulse ? `inset 3px 0 0 ${optColor}` : 'inset 0 0 0 transparent'),
        transition: 'background 150ms, box-shadow 500ms' }}>
      <span className="mono" style={{ fontSize: narrow ? 16 : 22, fontWeight: 600, color: isTop ? (isWhatIf ? 'var(--hi)' : 'var(--accent-text)') : 'var(--ink-faint)' }}>{option._ranked ? String(rank + 1).padStart(2, '0') : '––'}</span>
      <div style={{ minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 8, flexWrap: 'wrap' }}>
          <span style={{ width: 9, height: 9, borderRadius: '50%', background: optColor, alignSelf: 'center', flexShrink: 0 }} />
          <span style={{ fontSize: 16, fontWeight: 500 }}>
            <InlineText value={option.name} onCommit={onRename} placeholder="option" label="Option name" style={{ fontSize: 16, fontWeight: 500 }} />
          </span>
          {isTop && <Pill color={isWhatIf ? 'var(--hi)' : 'var(--accent)'}>leading</Pill>}
          {option.id === chosenId && <Pill color="var(--hi)">✓ chosen</Pill>}
          {option._ranked && shift > 0 && <Pill color="var(--accent)">↑{shift}</Pill>}
          {option._ranked && shift < 0 && <Pill color="var(--neg)">↓{Math.abs(shift)}</Pill>}
          {incomplete && <Pill color="var(--warn)">{option._scored}/{option._active} scored</Pill>}
        </div>
        <div style={{ height: isTop ? 14 : 10, borderRadius: 3, background: 'var(--bg-inset)', boxShadow: '0 0 0 1px var(--rule-soft)', overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${(total / 10) * 100}%`, display: 'flex', opacity: option._ranked ? 1 : 0.45, transition: 'width 320ms ease-out' }}>
            {parts.map(({ p, contrib }) => contrib > 0 && (
              <div key={p.id} title={`${p.name}: +${((contrib / contribSum) * total).toFixed(2)}`}
                onMouseEnter={() => onHighlight(p.id)} onMouseLeave={() => onHighlight(null)}
                style={{ width: `${(contrib / contribSum) * 100}%`, height: '100%', background: paramColors[p.id],
                  opacity: highlight == null || highlight === p.id ? 1 : 0.18,
                  transition: 'opacity 150ms, width 320ms ease-out' }} />
            ))}
          </div>
        </div>
      </div>
      <div style={{ textAlign: 'right' }}>
        <span className="mono" style={{ fontSize: narrow ? 20 : 26, fontWeight: 500, color: isTop ? (isWhatIf ? 'var(--hi)' : 'var(--accent-text)') : option._ranked ? 'var(--ink)' : 'var(--ink-faint)', transition: 'color 200ms' }}>
          {option._total != null ? option._total.toFixed(2) : '—'}
        </span>
        <div style={{ marginTop: 2 }}><span className="label">{option._ranked || option._total == null ? 'of 10' : 'not ranked'}</span></div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        {(hover || noHover || narrow) && <button className="iconbtn" onClick={onDelete} title="remove option" aria-label="remove option">×</button>}
      </div>
    </div>
  )
}

export function Legend({ parameters, paramColors, highlight, onHighlight, overrides }) {
  return (
    <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', padding: '12px 22px', borderTop: '1px solid var(--rule-soft)', background: 'var(--bg-soft)' }}>
      {parameters.map(pp => {
        const cur = overrides?.[pp.id] ?? Number(pp.weight)
        return (
          <button key={pp.id} onMouseEnter={() => onHighlight(pp.id)} onMouseLeave={() => onHighlight(null)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'transparent', border: 'none', padding: 0,
              }}>
            <span style={{ width: 10, height: 10, borderRadius: 2, background: paramColors[pp.id], opacity: highlight == null || highlight === pp.id ? 1 : 0.3, transition: 'opacity 150ms' }} />
            <span style={{ fontSize: 11, color: highlight == null || highlight === pp.id ? 'var(--ink-soft)' : 'var(--ink-faint)' }}>{pp.name}</span>
            <span className="mono" style={{ fontSize: 10, color: 'var(--ink-faint)' }}>w{fmtWeight(cur)}</span>
          </button>
        )
      })}
    </div>
  )
}

export function AddOptionRow({ onAdd }) {
  const [draft, setDraft] = useState('')
  const narrow = useMedia(NARROW)
  const commit = () => { if (draft.trim()) { onAdd(draft.trim()); setDraft('') } }
  return (
    <div style={{ display: 'grid', gridTemplateColumns: standingsCols(narrow), gap: narrow ? 10 : 16, alignItems: 'center', padding: narrow ? '14px 12px' : '14px 22px', borderBottom: '1px solid var(--rule-soft)', background: 'var(--bg-soft)' }}>
      <span className="label">+</span>
      <input value={draft} onChange={e => setDraft(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') commit() }} onBlur={commit}
        placeholder="add an option to compare…" aria-label="Add an option"
        style={{ border: 'none', padding: 0, fontSize: 14, color: 'var(--ink)', width: '100%' }} />
      <span className="label">enter</span><span />
    </div>
  )
}
