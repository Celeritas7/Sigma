import { useEffect, useMemo, useRef } from 'react'
import { perWeightSensitivity, rankedOptions, robustness, standing } from '../lib/scoring'
import { useDialogFocus } from '../lib/ui'

// =============================================================================
// WHAT-IF OVERLAY
// =============================================================================
export function WhatIfOverlay({ data, onClose }) {
  const baseline = useMemo(() => rankedOptions(data.options, data.scores, data.parameters), [data])
  const { top: baseTop, runner: baseRunner, tied } = standing(baseline)
  const robust = useMemo(() => robustness(data.parameters, data.options, data.scores), [data])
  const baseSens = useMemo(() => perWeightSensitivity(data.parameters, data.options, data.scores), [data])

  useEffect(() => {
    const k = e => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k)
  }, [onClose])
  const dialogRef = useRef(null)
  useDialogFocus(dialogRef)

  return (
    <div className="overlay-bg" onClick={onClose}>
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="whatif-title" className="overlay-card" onClick={e => e.stopPropagation()} style={{ width: 1080, maxWidth: '95vw' }}>
        <div style={{ padding: '24px 32px 18px', borderBottom: '1px solid var(--rule)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', position: 'sticky', top: 0, background: 'var(--bg)', zIndex: 1 }}>
          <div>
            <span className="label">what-if · sensitivity</span>
            <h2 id="whatif-title" style={{ margin: '6px 0 0', fontSize: 26, fontWeight: 500, letterSpacing: '-0.02em' }}>Is the answer robust to how you weighted things?</h2>
          </div>
          <button className="iconbtn" onClick={onClose} aria-label="Close">×</button>
        </div>
        <div style={{ padding: '24px 32px 40px' }}>
          {robust == null && (
            <div style={{ padding: '18px 22px', background: 'var(--bg-inset)', border: '1px solid var(--rule)', borderRadius: 8, fontSize: 14, lineHeight: 1.55, marginBottom: 28 }}>
              {tied
                ? <><strong>{baseTop.name || 'option'}</strong> and <strong>{baseRunner.name || 'option'}</strong> are tied, so there's no leader to stress-test. Score more considerations or adjust weights to separate them.</>
                : 'Not enough scores yet to test. Each option needs scores on at least half of the weighted considerations.'}
            </div>
          )}
          {robust != null && baseTop && (
            <div style={{ padding: '24px 28px', background: 'var(--chrome-2)', color: '#fff', borderRadius: 8, display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 32, alignItems: 'center', marginBottom: 28 }}>
              <div>
                <span className="label" style={{ color: 'oklch(0.7 0.05 240)' }}>robustness</span>
                <div style={{ fontSize: 56, fontWeight: 500, lineHeight: 1, marginTop: 6 }}>{robust.toFixed(2)}</div>
              </div>
              <div style={{ fontSize: 14, lineHeight: 1.55 }}>
                Across 100 weight perturbations (±2 on each weight), <strong>{baseTop.name}</strong> stays on top{' '}
                <strong style={{ color: 'var(--accent)' }}>{Math.round(robust * 100)}%</strong> of the time.{' '}
                {robust >= 0.7 ? 'The pick is robust.' : robust >= 0.4 ? 'Mixed — sleep on it.' : 'Fragile — different weights would pick differently.'}
              </div>
            </div>
          )}
          {baseSens.length > 0 && <section>
            <span className="label">per-weight sensitivity · how often does sweeping each weight 0→10 flip the leader?</span>
            <div style={{ marginTop: 14, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))', gap: 12 }}>
              {baseSens.map((row, i) => {
                const flag = row.sens > 0.4
                return (
                  <div key={i} style={{ padding: '14px 16px', border: `1px solid ${flag ? 'var(--neg)' : 'var(--rule)'}`, background: flag ? 'var(--neg-soft)' : 'var(--bg)', borderRadius: 6 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
                      <span style={{ fontSize: 13, fontWeight: 500 }}>{row.p.name}</span>
                      <span className="mono" style={{ fontSize: 13, color: flag ? 'var(--neg)' : 'var(--ink)' }}>{row.sens.toFixed(2)}</span>
                    </div>
                    <div style={{ height: 4, background: 'var(--rule-soft)', borderRadius: 2 }}>
                      <div style={{ width: `${row.sens * 100}%`, height: '100%', background: flag ? 'var(--neg)' : 'var(--ink)', borderRadius: 2, transition: 'width 300ms' }} />
                    </div>
                    <span className="label" style={{ marginTop: 6, display: 'block', color: flag ? 'var(--neg)' : undefined }}>
                      {flag ? `⚠ flips around w=${row.flipAt?.toFixed(1) ?? '?'}` : row.sens > 0.15 ? 'medium impact' : 'low impact'}
                    </span>
                  </div>
                )
              })}
            </div>
          </section>}
        </div>
      </div>
    </div>
  )
}
