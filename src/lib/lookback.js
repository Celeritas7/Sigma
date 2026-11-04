// Look-back: once a decision has been closed for a while, ask how the choice
// turned out. The verdict is stored on sigma_decisions (outcome,
// outcome_notes, reviewed_at).

export const LOOKBACK_DAYS = 90

export const OUTCOMES = [
  { key: 'good',   label: 'Good call',   emoji: '👍', color: 'var(--accent-fill)', text: 'var(--accent-text)', on: '#fff' },
  { key: 'mixed',  label: 'Mixed',       emoji: '🤷', color: 'var(--warn)',     text: 'var(--warn-text)',   on: 'var(--on-warn)' },
  { key: 'regret', label: 'Regret it',   emoji: '👎', color: 'var(--neg-fill)', text: 'var(--neg)',         on: '#fff' },
]

export function outcomeDef(key) { return OUTCOMES.find(o => o.key === key) || null }

// Days since the decision was closed (decided_at, else updated_at), or null.
export function daysSinceDecided(d, now = Date.now()) {
  const t = Date.parse(d.decided_at || d.updated_at || '')
  return Number.isNaN(t) ? null : Math.floor((now - t) / 86400000)
}

// A closed decision with no verdict yet, LOOKBACK_DAYS or more after closing.
export function lookbackDue(d, now = Date.now()) {
  if (d.status !== 'closed' || d.outcome) return false
  const days = daysSinceDecided(d, now)
  return days != null && days >= LOOKBACK_DAYS
}

// Tally for the Home header: { reviewed, good, due }.
export function lookbackTally(decisions, now = Date.now()) {
  const closed = decisions.filter(d => d.status === 'closed')
  return {
    reviewed: closed.filter(d => d.outcome).length,
    good: closed.filter(d => d.outcome === 'good').length,
    due: closed.filter(d => lookbackDue(d, now)).length,
  }
}
