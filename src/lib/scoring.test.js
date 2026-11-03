import { describe, it, expect } from 'vitest'
import {
  weightedTotal, rankedOptions, standing, robustness, perWeightSensitivity,
  completeness, paramContribution, shuffled, mulberry32, hashString,
} from './scoring'

const score = (option_id, parameter_id, value) => ({ option_id, parameter_id, value })
const four = [{ id: 'a', weight: 8 }, { id: 'b', weight: 8 }, { id: 'c', weight: 8 }, { id: 'd', weight: 8 }]

describe('weightedTotal', () => {
  it('averages scored cells by weight', () => {
    const params = [{ id: 'x', weight: 9 }, { id: 'y', weight: 6 }]
    expect(weightedTotal('o', [score('o', 'x', 10), score('o', 'y', 3)], params)).toBeCloseTo((90 + 18) / 15)
  })
  it('ignores zero-weight considerations', () => {
    const params = [{ id: 'x', weight: 5 }, { id: 'y', weight: 0 }]
    expect(weightedTotal('o', [score('o', 'x', 4), score('o', 'y', 10)], params)).toBe(4)
  })
  it('uses what-if overrides instead of saved weights', () => {
    const params = [{ id: 'x', weight: 5 }, { id: 'y', weight: 5 }]
    const s = [score('o', 'x', 10), score('o', 'y', 0)]
    expect(weightedTotal('o', s, params, { y: 0 })).toBe(10)
  })
  it('is null with no scores', () => {
    expect(weightedTotal('o', [], four)).toBeNull()
  })
})

describe('rankedOptions coverage rule', () => {
  const full = ['a', 'b', 'c', 'd'].map(p => score('full', p, 7))
  it('does not rank an option scored on under half the considerations', () => {
    const r = rankedOptions([{ id: 'half' }, { id: 'full' }], [...full, score('half', 'a', 9)], four)
    expect(r.map(o => [o.id, o._ranked])).toEqual([['full', true], ['half', false]])
    expect(standing(r).top.id).toBe('full')
  })
  it('ranks an option once it reaches half', () => {
    const r = rankedOptions([{ id: 'half' }, { id: 'full' }], [...full, score('half', 'a', 9), score('half', 'b', 8)], four)
    expect(standing(r).top.id).toBe('half')
  })
  it('reports scored / active counts', () => {
    const [o] = rankedOptions([{ id: 'half' }], [score('half', 'a', 9)], four)
    expect([o._scored, o._active]).toEqual([1, 4])
  })
})

describe('standing', () => {
  it('flags totals equal to 2 decimals as a tie', () => {
    const params = [{ id: 'x', weight: 5 }]
    const st = standing(rankedOptions([{ id: 'p' }, { id: 'q' }], [score('p', 'x', 5), score('q', 'x', 5.004)], params))
    expect(st.tied).toBe(true)
  })
  it('has no leader when nothing is ranked', () => {
    expect(standing(rankedOptions([{ id: 'p' }], [], four)).top).toBeNull()
  })
})

describe('bars', () => {
  it('segment shares of the total add up to the total', () => {
    const params = [{ id: 'x', weight: 9 }, { id: 'y', weight: 6 }]
    const s = [score('o', 'x', 7), score('o', 'y', 4)]
    const total = weightedTotal('o', s, params)
    const contribs = params.map(p => paramContribution('o', p.id, s, params))
    const sum = contribs.reduce((a, b) => a + b, 0)
    expect(contribs.map(c => (c / sum) * total).reduce((a, b) => a + b, 0)).toBeCloseTo(total)
  })
})

describe('robustness', () => {
  // equal weights; p wins on the saved weights but loses if y matters more than x
  const params = [{ id: 'x', weight: 8 }, { id: 'y', weight: 8 }]
  const opts = [{ id: 'p' }, { id: 'q' }]
  const s = [score('p', 'x', 9), score('p', 'y', 3), score('q', 'x', 3), score('q', 'y', 8.5)]
  it('perturbs equal weights independently (the old jitter always said 1.00 here)', () => {
    const r = robustness(params, opts, s)
    expect(r).toBeGreaterThan(0.3)
    expect(r).toBeLessThan(1)
  })
  it('is deterministic', () => {
    expect(robustness(params, opts, s)).toBe(robustness(params, opts, s))
  })
  it('is null for a tie', () => {
    expect(robustness([{ id: 'x', weight: 5 }], opts, [score('p', 'x', 5), score('q', 'x', 5)])).toBeNull()
  })
})

describe('perWeightSensitivity', () => {
  it('finds where sweeping a weight flips the leader', () => {
    const params = [{ id: 'x', weight: 10 }, { id: 'y', weight: 1 }]
    const s = [score('p', 'x', 9), score('p', 'y', 1), score('q', 'x', 5), score('q', 'y', 9)]
    const rows = perWeightSensitivity(params, [{ id: 'p' }, { id: 'q' }], s)
    expect(rows.find(r => r.p.id === 'y').flipAt).toBe(5.5)
  })
})

describe('completeness', () => {
  it('counts filled cells', () => {
    expect(completeness(four, [{ id: 'o' }], [score('o', 'a', 1), score('o', 'b', null)])).toEqual({ filled: 1, total: 4, pct: 0.25 })
  })
})

describe('blind-mode shuffle', () => {
  it('is a permutation and spreads orders evenly', () => {
    const counts = {}
    for (let seed = 0; seed < 3000; seed++) {
      const order = shuffled(['A', 'B', 'C'], mulberry32(seed ^ hashString('param-1'))).join('')
      counts[order] = (counts[order] || 0) + 1
    }
    expect(Object.keys(counts).sort()).toEqual(['ABC', 'ACB', 'BAC', 'BCA', 'CAB', 'CBA'])
    for (const n of Object.values(counts)) expect(n).toBeGreaterThan(400)  // ~500 each
  })
})
