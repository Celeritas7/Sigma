import { useState } from 'react'
import { Pill } from '../components/atoms'
import { completeness, rankedOptions, standing } from '../lib/scoring'
import { kindColor, kindEmoji, kindSoft } from '../lib/theme'
import { NARROW, NO_HOVER, useMedia } from '../lib/ui'

// =============================================================================
// HOME
// =============================================================================
export function Home({ decisions, onOpen, onNew, loading, loadError, onRetry, onDelete, onReopen }) {
  const narrow = useMedia(NARROW)
  const open = decisions.filter(d => d.status !== 'closed' && d.status !== 'archived')
  const closed = decisions.filter(d => d.status === 'closed')
  return (
    <div>
      <main style={{ maxWidth: 1200, margin: '0 auto', padding: narrow ? '20px 16px 48px' : '40px 28px 64px' }}>
        <div style={{
          position: 'relative', overflow: 'hidden', marginBottom: narrow ? 24 : 36,
          borderRadius: 18, padding: narrow ? '24px 20px 26px' : '40px 40px 44px',
          background: 'linear-gradient(135deg, var(--ink-deep), var(--ink))',
          color: '#fff', boxShadow: 'var(--shadow-lg)',
        }}>
          {/* colored glow accents */}
          <div style={{ position: 'absolute', top: -120, right: -60, width: 360, height: 360, borderRadius: '50%', background: 'radial-gradient(circle, oklch(0.6 0.18 150 / 0.55), transparent 70%)', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', bottom: -160, left: 120, width: 380, height: 380, borderRadius: '50%', background: 'radial-gradient(circle, oklch(0.55 0.18 285 / 0.4), transparent 70%)', pointerEvents: 'none' }} />
          {/* giant watermark sigma */}
          <div style={{ position: 'absolute', right: 24, top: -30, fontSize: 260, fontWeight: 700, lineHeight: 1, color: 'rgba(255,255,255,0.05)', fontFamily: 'Geist, sans-serif', pointerEvents: 'none', userSelect: 'none' }}>Σ</div>
          <div style={{ position: 'relative' }}>
            <span className="label" style={{ color: 'rgba(255,255,255,0.6)' }}>{loading ? 'loading…' : `${open.length} open · ${closed.length} closed`} · {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</span>
            <h1 style={{ fontSize: narrow ? 28 : 'clamp(32px, 4.5vw, 54px)', fontWeight: 600, letterSpacing: '-0.025em', margin: '14px 0 0', lineHeight: 1.04, maxWidth: 720 }}>
              {loading ? (
                <span>Picking up where you left off…</span>
              ) : open.length === 0 ? (
                <>No questions on your desk. <span style={{ background: 'linear-gradient(120deg, oklch(0.85 0.13 150), oklch(0.82 0.13 285))', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>Open a new one when something is weighing on you.</span></>
              ) : (
                <>{open.length} {open.length === 1 ? 'question' : 'questions'} on your desk. <span style={{ background: 'linear-gradient(120deg, oklch(0.85 0.13 150), oklch(0.82 0.13 285))', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>Make one a little less heavy today.</span></>
              )}
            </h1>
          </div>
        </div>
        {loadError && (
          <div style={{ marginBottom: 20, padding: '12px 16px', border: '1px solid var(--neg)', background: 'var(--neg-soft)', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 13, color: 'var(--neg)' }}>Couldn't load decisions: {loadError}</span>
            <button className="btn btn-outline btn-sm" onClick={onRetry}>Retry</button>
          </div>
        )}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
          <span className="label">open</span>
          <button className="btn btn-primary" onClick={onNew}>
            <span style={{ fontSize: 15, lineHeight: 1 }}>+</span> New decision
          </button>
        </div>
        <div className="card" style={{ overflow: 'hidden' }}>
          {!narrow && (
            <div style={{ display: 'grid', gridTemplateColumns: '36px 2.6fr 1.7fr 1.4fr 80px', gap: 16, padding: '11px 18px', background: 'var(--bg-soft)', borderBottom: '1px solid var(--rule)' }}>
              <span className="label">#</span><span className="label">question</span><span className="label">leading</span><span className="label">progress</span><span className="label" style={{ textAlign: 'right' }}>age</span>
            </div>
          )}
          {loading ? (
            <div style={{ padding: 48, textAlign: 'center' }}><span className="label">loading…</span></div>
          ) : open.length === 0 ? (
            <div style={{ padding: '56px 32px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
              <div style={{ width: 44, height: 44, borderRadius: 10, background: 'var(--bg-inset)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 600, color: 'var(--ink-faint)' }}>Σ</div>
              <div>
                <div style={{ fontSize: 17, fontWeight: 500, marginBottom: 4 }}>Nothing to weigh yet.</div>
                <div style={{ fontSize: 13, color: 'var(--ink-soft)', maxWidth: 380, lineHeight: 1.5 }}>
                  Start with a question you've been turning over — a job, a flat, a name. List what matters, score the options, let the math fight your bias.
                </div>
              </div>
              <button className="btn btn-primary" onClick={onNew}>
                <span style={{ fontSize: 15, lineHeight: 1 }}>+</span> New decision
              </button>
            </div>
          ) : (
            open.map((d, i) => <HomeRow key={d.id} d={d} idx={i + 1} onClick={() => onOpen(d.id)} onDelete={() => onDelete(d.id)} />)
          )}
        </div>
        {closed.length > 0 && (
          <div style={{ marginTop: 40 }}>
            <span className="label">recently closed</span>
            <div className="card" style={{ marginTop: 12, overflow: 'hidden', background: 'var(--bg-soft)' }}>
              {closed.map(d => <HomeRow key={d.id} d={d} onClick={() => onOpen(d.id)} onReopen={() => onReopen(d.id)} />)}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

export function HomeRow({ d, idx, onClick, onDelete, onReopen }) {
  const [hover, setHover] = useState(false)
  const narrow = useMedia(NARROW)
  const noHover = useMedia(NO_HOVER)
  const closed = d.status === 'closed'
  const ranked = rankedOptions(d._options, d._scores, d._parameters)
  const { top: leading, gap, tied } = standing(ranked)
  const hasScores = ranked.some(o => o._total != null)
  const c = completeness(d._parameters, d._options, d._scores)
  const daysOpen = Math.max(1, Math.floor((Date.now() - new Date(d.created_at).getTime()) / 86400000))
  const statusLabel = closed ? 'closed' : c.pct >= 0.7 ? 'ready to choose' : c.pct >= 0.35 ? 'still gathering' : 'just started'
  const kc = kindColor(d.type, d.title)
  const statusColor = closed ? 'var(--ink-faint)' : c.pct >= 0.7 ? 'var(--accent)' : c.pct >= 0.35 ? 'var(--warn)' : 'var(--ink-ghost)'
  const statusText = closed ? 'var(--ink-faint)' : c.pct >= 0.7 ? 'var(--accent-text)' : c.pct >= 0.35 ? 'var(--warn-text)' : 'var(--ink-faint)'

  const title = (
    <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', minWidth: 0, flex: 1 }}>
      <div style={{ width: 36, height: 36, flexShrink: 0, borderRadius: 9, background: kindSoft(d.type, d.title), border: `1px solid ${kc}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, marginTop: 1 }}>{kindEmoji(d.type, d.title)}</div>
      <div style={{ minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <button className="linklike" onClick={e => { e.stopPropagation(); onClick() }} style={{ fontSize: 15, fontWeight: 500 }}>{d.title?.trim() || <em style={{ color: 'var(--ink-faint)' }}>untitled question</em>}</button>
          {!closed && (tied ? <Pill color="var(--neg)">tied</Pill> : gap != null && gap < 0.6 && <Pill color="var(--neg)">tight</Pill>)}
          {c.pct === 0 && <Pill color="var(--ink-faint)">empty</Pill>}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 5 }}>
          <Pill color={kc}>{d.type || 'custom'}</Pill>
          <span className="label">{d._parameters.length}p × {d._options.length}o</span>
        </div>
      </div>
    </div>
  )
  // closed rows show what was actually chosen (and why), not the leader
  const picked = closed ? ranked.find(o => o.id === d.final_choice_id) : null
  const lead = closed ? (
    <div style={{ minWidth: 0 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
        <span className="label">picked</span>
        {picked
          ? <span style={{ fontSize: 14, fontWeight: 500 }}>{picked.name || 'unnamed'}</span>
          : <span className="label">no choice recorded</span>}
      </div>
      {d.notes && (
        <span title={d.notes} style={{ marginTop: 4, display: 'block', fontSize: 12, color: 'var(--ink-soft)', fontStyle: 'italic', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: narrow ? '100%' : 280 }}>“{d.notes}”</span>
      )}
    </div>
  ) : leading ? (
    <div style={{ minWidth: 0 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
        {narrow && <span className="label">leading</span>}
        <span style={{ fontSize: 14, fontWeight: 500 }}>{tied ? `${leading.name || 'unnamed'} = ${ranked[1].name || 'unnamed'}` : (leading.name || 'unnamed')}</span>
        <span className="mono" style={{ fontSize: 13, color: tied ? 'var(--ink-soft)' : 'var(--accent-text)' }}>{leading._total.toFixed(2)}</span>
      </div>
      {gap != null && !narrow && <span className="label" style={{ marginTop: 4, display: 'block' }}>{tied ? 'tied' : `+${gap.toFixed(2)} ahead`}</span>}
    </div>
  ) : (<span className="label">{hasScores ? 'not enough scores' : 'no scores yet'}</span>)
  const progress = (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ flex: 1, height: 5, background: 'var(--rule-soft)', borderRadius: 3, overflow: 'hidden' }}>
          <div style={{ width: `${c.pct * 100}%`, height: '100%', background: statusColor, transition: 'width 300ms, background 200ms' }} />
        </div>
        <span className="mono" style={{ fontSize: 11, color: 'var(--ink-soft)', minWidth: 32, textAlign: 'right' }}>{Math.round(c.pct * 100)}%</span>
      </div>
      <span className="label" style={{ marginTop: 6, display: 'block', color: statusText }}>{statusLabel}</span>
    </div>
  )
  // touch screens can't hover, so their row action is always shown
  const action = closed
    ? <button className="btn btn-ghost btn-sm" onClick={e => { e.stopPropagation(); onReopen() }}>Reopen</button>
    : <button className="iconbtn" title="archive decision" aria-label="archive decision" style={{ color: 'var(--neg)' }} onClick={e => { e.stopPropagation(); if (confirm(`Archive "${d.title || 'untitled'}"?`)) onDelete() }}>×</button>
  const age = <span className="mono" style={{ fontSize: 11, color: 'var(--ink-faint)' }}>{daysOpen}d</span>
  const rowStyle = { borderBottom: '1px solid var(--rule-soft)', cursor: 'pointer', background: hover ? kindSoft(d.type, d.title) : 'transparent', boxShadow: hover ? `inset 3px 0 0 ${kc}` : 'inset 0 0 0 transparent', transition: 'background 140ms, box-shadow 140ms' }

  if (narrow) {
    return (
      <div onClick={onClick} style={{ ...rowStyle, padding: '14px 14px 14px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>{title}{action}</div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }}>{lead}{!closed && age}</div>
        {progress}
      </div>
    )
  }
  return (
    <div onClick={onClick} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{ ...rowStyle, display: 'grid', gridTemplateColumns: '36px 2.6fr 1.7fr 1.4fr 80px', gap: 16, alignItems: 'center', padding: closed ? '14px 18px' : '18px 18px' }}>
      <span className="mono" style={{ fontSize: 12, color: closed ? 'var(--ink-faint)' : kc }}>{closed ? '—' : String(idx).padStart(2, '0')}</span>
      {title}
      {lead}
      {progress}
      <span style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 6 }}>
        {closed || hover || noHover ? action : null}
        {!closed && !(hover && !noHover) && age}
      </span>
    </div>
  )
}
