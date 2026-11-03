import { describe, it, expect } from 'vitest'
import { LOOKBACK_DAYS, daysSinceDecided, lookbackDue, lookbackTally, outcomeDef } from './lookback'

const DAY = 86400000
const now = Date.parse('2026-11-03T12:00:00Z')
const closedDaysAgo = (n, extra = {}) => ({ status: 'closed', decided_at: new Date(now - n * DAY).toISOString(), ...extra })

describe('lookback', () => {
  it('counts days since the decision was closed', () => {
    expect(daysSinceDecided(closedDaysAgo(10), now)).toBe(10)
    expect(daysSinceDecided({ status: 'closed', updated_at: new Date(now - 3 * DAY).toISOString() }, now)).toBe(3)
    expect(daysSinceDecided({ status: 'closed' }, now)).toBeNull()
  })
  it('is due after LOOKBACK_DAYS with no verdict', () => {
    expect(lookbackDue(closedDaysAgo(LOOKBACK_DAYS - 1), now)).toBe(false)
    expect(lookbackDue(closedDaysAgo(LOOKBACK_DAYS), now)).toBe(true)
    expect(lookbackDue(closedDaysAgo(200, { outcome: 'good' }), now)).toBe(false)
    expect(lookbackDue({ status: 'active', decided_at: new Date(now - 400 * DAY).toISOString() }, now)).toBe(false)
  })
  it('tallies reviewed, good and due', () => {
    const ds = [closedDaysAgo(100, { outcome: 'good' }), closedDaysAgo(100, { outcome: 'regret' }), closedDaysAgo(100), closedDaysAgo(5), { status: 'active' }]
    expect(lookbackTally(ds, now)).toEqual({ reviewed: 2, good: 1, due: 1 })
  })
  it('resolves outcome definitions', () => {
    expect(outcomeDef('mixed').label).toBe('Mixed')
    expect(outcomeDef(null)).toBeNull()
  })
})
