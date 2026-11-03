import { useState, useMemo, useRef } from 'react'
import { InlineText, Pill } from '../../components/atoms'
import { completeness, rankedOptions, robustness, standing } from '../../lib/scoring'
import { kindColor, kindEmoji, kindHue, kindSoft, optionColor } from '../../lib/theme'
import { NARROW, useMedia } from '../../lib/ui'
import { Matrix } from './Matrix'
import { AddOptionRow, Legend, StandingsList } from './Standings'
import { WeightPanel } from './Weights'

// =============================================================================
// DECISION VIEW
// =============================================================================
export function DecisionView({ decision, data, onBack, onTitleUpdate, paramHandlers, optionHandlers, onScoreUpdate, onOpenMode, onStatusChange, onDelete }) {
  const [overrides, setOverrides] = useState(null)
  const [highlight, setHighlight] = useState(null)

  const ranked = useMemo(() => rankedOptions(data.options, data.scores, data.parameters, overrides), [data, overrides])
  const baseline = useMemo(() => rankedOptions(data.options, data.scores, data.parameters), [data])
  const { top, runner, gap, tied } = standing(ranked)
  const c = completeness(data.parameters, data.options, data.scores)
  const robust = useMemo(() => robustness(data.parameters, data.options, data.scores), [data])
  const isWhatIf = overrides != null

  const paramHues = [145, 30, 260, 75, 320, 200, 60, 290, 175, 240]
  const paramColors = {}
  data.parameters.forEach((pp, i) => { paramColors[pp.id] = `oklch(0.62 0.13 ${paramHues[i % paramHues.length]})` })
  const optColors = {}
  data.options.forEach((o, i) => { optColors[o.id] = optionColor(i) })

  // the weights panel is the one place weights are edited; it starts collapsed
  // so the standings are the first thing on the page
  const [weightsOpen, setWeightsOpen] = useState(false)
  const weightsRef = useRef(null)
  const openWeights = () => {
    setWeightsOpen(true)
    weightsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const kh = kindHue(decision.type, decision.title)
  const narrow = useMedia(NARROW)
  return (
    <div style={{
      minHeight: '100vh',
      background: `radial-gradient(1100px 460px at 50% -120px, oklch(0.93 0.06 ${kh} / 0.7), transparent 65%), linear-gradient(180deg, oklch(0.96 0.03 ${kh} / 0.45), transparent 340px)`,
    }}>
      <main style={{ maxWidth: 1280, margin: '0 auto', padding: narrow ? '16px 16px 64px' : '28px 28px 80px' }}>
        {/* title + actions */}
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 24, flexWrap: 'wrap', marginBottom: 24 }}>
          <div style={{ flex: '1 1 320px' }}>
            <button className="btn btn-ghost btn-sm" onClick={onBack} style={{ marginLeft: -10, marginBottom: 4 }}>← all decisions</button>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ width: 52, height: 52, flexShrink: 0, borderRadius: 13, background: kindSoft(decision.type, decision.title), border: `1px solid ${kindColor(decision.type, decision.title)}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, boxShadow: 'var(--shadow-sm)' }}>{kindEmoji(decision.type, decision.title)}</div>
              <h1 style={{ margin: 0, fontSize: 'clamp(24px, 3vw, 38px)', fontWeight: 500, letterSpacing: '-0.02em' }}>
                <InlineText value={decision.title} onCommit={onTitleUpdate} placeholder="What are you deciding?" label="Decision title" />
              </h1>
            </div>
            <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Pill color={kindColor(decision.type, decision.title)}>{decision.type || 'custom'}</Pill>
              <span className="label">started {new Date(decision.created_at).toLocaleDateString()}</span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button className="btn btn-outline btn-sm" onClick={() => onOpenMode('blind')}>Blind score mode</button>
            <button className="btn btn-outline btn-sm" onClick={() => onOpenMode('whatif')}>What-if</button>
            {decision.status === 'closed'
              ? <button className="btn btn-outline btn-sm" onClick={() => onStatusChange('active')}>Reopen</button>
              : <button className="btn btn-accent btn-sm" onClick={async () => { await onStatusChange('closed'); onBack() }}>✓ Close decision</button>}
            <button className="btn btn-ghost btn-sm" style={{ color: 'var(--neg)' }} onClick={() => { if (confirm('Archive this decision? It disappears from Home but stays in the database.')) onDelete() }}>Archive</button>
          </div>
        </div>

        {/* STANDINGS */}
        <section style={{ marginBottom: 32 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 14, gap: 12, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
              <span className="label">standings · weighted total</span>
              {isWhatIf && (
                <button onClick={openWeights} style={{ background: 'none', border: 'none', padding: 0 }}>
                  <Pill color="var(--hi)">unsaved weights · review</Pill>
                </button>
              )}
              {tied
                ? <Pill color="var(--neg)">tied · {top.name || 'option'} = {runner.name || 'option'}</Pill>
                : gap != null && gap < 0.6 && <Pill color="var(--neg)">tight · only {gap.toFixed(2)} ahead</Pill>}
              {robust != null && (
                <Pill color={robust >= 0.7 ? 'var(--accent)' : robust >= 0.4 ? 'var(--warn)' : 'var(--neg)'}>
                  robustness {robust.toFixed(2)}
                </Pill>
              )}
            </div>
            <span className="label">contribution stacks by parameter · {c.filled}/{c.total} considered</span>
          </div>

          {data.options.length === 0 && data.parameters.length === 0 ? (
            <EmptyState onAddParam={paramHandlers.onAdd} onAddOption={optionHandlers.onAdd} />
          ) : (
            <div className="card" style={{ overflow: 'hidden' }}>
              <StandingsList
                ranked={ranked} baseline={baseline}
                parameters={data.parameters} scores={data.scores}
                leaderId={top && !tied ? top.id : null}
                paramColors={paramColors} optColors={optColors} overrides={overrides}
                highlight={highlight} onHighlight={setHighlight} isWhatIf={isWhatIf}
                optionHandlers={optionHandlers}
              />
              <AddOptionRow onAdd={optionHandlers.onAdd} />
              <Legend parameters={data.parameters} paramColors={paramColors} highlight={highlight} onHighlight={setHighlight} overrides={overrides} />
            </div>
          )}
        </section>

        {/* WEIGHTS */}
        {data.parameters.length > 0 && (
          <section ref={weightsRef} style={{ marginBottom: 32, scrollMarginTop: 72 }}>
            <WeightPanel
              parameters={data.parameters}
              overrides={overrides} setOverrides={setOverrides}
              paramColors={paramColors} paramHues={paramHues}
              highlight={highlight} setHighlight={setHighlight}
              isWhatIf={isWhatIf} kh={kh}
              open={weightsOpen} setOpen={setWeightsOpen}
              onReset={() => setOverrides(null)}
              onSave={async () => {
                for (const [pid, w] of Object.entries(overrides)) await paramHandlers.onUpdate(pid, { weight: w })
                setOverrides(null)
              }}
            />
          </section>
        )}

        {/* MATRIX */}
        {(data.parameters.length > 0 || data.options.length > 0) && (
          <section>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 14 }}>
              <span className="label">matrix · type evidence, drag to score</span>
              <span className="label">{c.total - c.filled} empty</span>
            </div>
            <div className="card" style={{ overflow: 'auto' }}>
              <Matrix parameters={data.parameters} options={data.options} scores={data.scores}
                paramColors={paramColors} optColors={optColors} highlight={highlight} setHighlight={setHighlight}
                onScoreUpdate={onScoreUpdate} paramHandlers={paramHandlers} optionHandlers={optionHandlers}
                overrides={overrides} onEditWeights={openWeights}
              />
            </div>
          </section>
        )}
      </main>
    </div>
  )
}

// ── empty state ───
export function EmptyState({ onAddParam, onAddOption }) {
  const [pDraft, setPDraft] = useState('')
  const [oDraft, setODraft] = useState('')
  return (
    <div style={{ border: '1px dashed var(--rule)', borderRadius: 8, padding: 32, background: 'var(--bg-soft)' }}>
      <p style={{ fontSize: 14, color: 'var(--ink-soft)', marginTop: 0, marginBottom: 16 }}>
        Empty matrix. Add <strong>parameters</strong> (what matters to you) and <strong>options</strong> (what you're comparing).
      </p>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <input value={pDraft} onChange={e => setPDraft(e.target.value)} placeholder="+ first parameter…" aria-label="First consideration"
          onKeyDown={e => { if (e.key === 'Enter' && pDraft.trim()) { onAddParam(pDraft.trim()); setPDraft('') }}}
          style={{ padding: '8px 12px', border: '1px solid var(--rule)', borderRadius: 6, fontSize: 13, minWidth: 200, color: 'var(--ink)' }} />
        <input value={oDraft} onChange={e => setODraft(e.target.value)} placeholder="+ first option…" aria-label="First option"
          onKeyDown={e => { if (e.key === 'Enter' && oDraft.trim()) { onAddOption(oDraft.trim()); setODraft('') }}}
          style={{ padding: '8px 12px', border: '1px solid var(--rule)', borderRadius: 6, fontSize: 13, minWidth: 200, color: 'var(--ink)' }} />
      </div>
    </div>
  )
}
