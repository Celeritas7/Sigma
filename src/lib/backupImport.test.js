import { describe, it, expect } from 'vitest'
import { buildBackup, decisionCsv } from './export'
import { chunks, parseBackup, planImport, summarize, uuid } from './backupImport'

const counter = () => { let n = 0; return () => `new-${++n}` }
const P = (id, d, name, weight, i) => ({ id, decision_id: d, name, weight, display_order: i, input_type: 'text', has_uncertainty: false, user_id: 'someone' })
const O = (id, d, name, i) => ({ id, decision_id: d, name, display_order: i })
const S = (o, p, value, notes = null) => ({ id: o + p, option_id: o, parameter_id: p, value, notes, status: 'estimate' })

const backup = buildBackup({
  decisions: [
    { id: 'd1', title: 'Which flat?', type: 'home', status: 'closed', final_choice_id: 'o2', notes: 'quiet', outcome: 'good', created_at: '2026-10-01T00:00:00Z', user_id: 'someone-else', template_id: 't1' },
    { id: 'd2', title: 'Old car', type: 'car', status: 'archived', created_at: '2026-09-01T00:00:00Z' },
  ],
  parameters: [P('p1', 'd1', 'Rent', 9, 0), P('p2', 'd1', 'Light', 4.5, 1), P('p3', 'd2', 'Price', 7, 0)],
  options: [O('o1', 'd1', 'Elm', 0), O('o2', 'd1', 'Oak', 1), O('o3', 'd2', 'Beetle', 0)],
  scores: [S('o1', 'p1', 8, 'cheap'), S('o1', 'p2', 6), S('o2', 'p1', 5), S('o2', 'p2', 9), S('o3', 'p3', 4)],
  templates: [{ id: 't1', name: 'Flats', type: 'home', user_id: 'someone-else' }],
  templateParameters: [{ id: 'tp1', template_id: 't1', name: 'Rent', default_weight: 9, display_order: 0, input_type: 'text' }],
}, new Date('2026-11-04T12:00:00Z'))
const text = JSON.stringify(backup)

describe('parseBackup', () => {
  it('accepts a Sigma backup', () => {
    const { backup: b, error } = parseBackup(text)
    expect(error).toBeUndefined()
    expect(b.decisions).toHaveLength(2)
    expect(b.templates).toHaveLength(1)
    expect(b.exported_at).toBe('2026-11-04T12:00:00.000Z')
  })
  it('rejects anything else with a clear message', () => {
    expect(parseBackup('not json').error).toMatch(/isn't valid JSON/)
    expect(parseBackup('[]').error).toMatch(/isn't a Sigma backup/)
    expect(parseBackup('{"app":"other","version":1,"decisions":[]}').error).toMatch(/isn't a Sigma backup/)
    expect(parseBackup('{"app":"sigma","version":2,"decisions":[]}').error).toMatch(/newer version/)
    expect(parseBackup('{"app":"sigma","version":1}').error).toMatch(/damaged/)
  })
})

describe('summarize', () => {
  it('lists what is in the file and marks what is already here', () => {
    const s = summarize(parseBackup(text).backup, new Set(['d1']))
    expect(s.decisions).toEqual([
      { key: 'd0', title: 'Which flat?', type: 'home', status: 'closed', considerations: 2, options: 2, present: true },
      { key: 'd1', title: 'Old car', type: 'car', status: 'archived', considerations: 1, options: 1, present: false },
    ])
    expect(s.templates).toEqual([{ key: 't0', name: 'Flats', considerations: 1, present: false }])
  })
})

describe('planImport', () => {
  const b = parseBackup(text).backup

  it('imports only what was chosen', () => {
    const plan = planImport(b, new Set(['d1']), counter())
    expect(plan.decisions.map(d => d.title)).toEqual(['Old car'])
    expect(plan.templates).toEqual([])
    expect(plan.parameters).toHaveLength(1)
    expect(plan.scores).toHaveLength(1)
  })

  it('gives every row a fresh id and remaps every link', () => {
    const plan = planImport(b, new Set(['d0', 't0']), counter())
    const oldIds = ['d1', 'd2', 'p1', 'p2', 'p3', 'o1', 'o2', 'o3', 't1', 'tp1']
    const all = Object.values(plan).flat()
    for (const row of all) for (const v of Object.values(row)) expect(oldIds).not.toContain(v)
    const [d] = plan.decisions
    expect(plan.templates[0].id).toBe(d.template_id)  // template imported alongside: linked
    expect(plan.parameters.every(p => p.decision_id === d.id)).toBe(true)
    expect(plan.options.every(o => o.decision_id === d.id)).toBe(true)
    const optIds = new Set(plan.options.map(o => o.id)), paramIds = new Set(plan.parameters.map(p => p.id))
    expect(plan.scores.every(s => optIds.has(s.option_id) && paramIds.has(s.parameter_id))).toBe(true)
    const oak = plan.options.find(o => o.name === 'Oak')
    expect(plan.finalChoices).toEqual([{ id: d.id, final_choice_id: oak.id }])
    expect(plan.templateParameters[0].template_id).toBe(plan.templates[0].id)
  })

  it('never copies owner fields and gives rows of one table the same keys', () => {
    const plan = planImport(b, new Set(['d0', 'd1', 't0']), counter())
    for (const rows of Object.values(plan)) {
      for (const row of rows) expect(row).not.toHaveProperty('user_id')
      const keys = rows.map(r => Object.keys(r).sort().join())
      expect(new Set(keys).size).toBeLessThanOrEqual(1)
    }
    expect(plan.decisions[0]).not.toHaveProperty('final_choice_id')  // set afterwards
  })

  it('unlinks a template that is not imported with the decision', () => {
    const plan = planImport(b, new Set(['d0']), counter())
    expect(plan.decisions[0].template_id).toBeNull()
  })

  it('keeps values inside what the database accepts', () => {
    const bad = parseBackup(JSON.stringify({ app: 'sigma', version: 1, decisions: [{
      id: 'x', title: 42, status: 'deleted', outcome: 'meh', created_at: 'yesterday',
      parameters: [{ id: 'a', name: 'A', weight: 11, input_type: 'emoji' }, { id: 'b', name: 'B', weight: '6.5' }, 'junk'],
      options: [{ id: 'm', name: 'M' }],
      scores: [
        { option_id: 'm', parameter_id: 'a', value: -1, min_value: 7, max_value: 3, confidence: 150, status: 'sure' },
        { option_id: 'm', parameter_id: 'a', value: 5 },          // same cell again: dropped
        { option_id: 'm', parameter_id: 'b', value: 8 },
        { option_id: 'elsewhere', parameter_id: 'b', value: 8 },  // option not in this decision: dropped
      ],
    }] })).backup
    const plan = planImport(bad, new Set(['d0']), counter())
    const [d] = plan.decisions
    expect([d.title, d.status, d.outcome]).toEqual(['', 'active', null])
    expect(Date.parse(d.created_at)).not.toBeNaN()
    expect(plan.parameters.map(p => [p.name, p.weight, p.input_type])).toEqual([['A', 5, 'text'], ['B', 6.5, 'text']])
    expect(plan.scores).toHaveLength(2)
    expect(plan.scores[0]).toMatchObject({ value: null, min_value: null, max_value: null, confidence: null, status: 'estimate' })
    expect(plan.scores[1].value).toBe(8)
  })

  it('round-trips: backup -> import -> backup gives the same decision', () => {
    const plan = planImport(b, new Set(['d0', 'd1', 't0']), counter())
    const again = buildBackup({ ...plan, templateParameters: plan.templateParameters,
      decisions: plan.decisions.map(d => ({ ...d, final_choice_id: plan.finalChoices.find(f => f.id === d.id)?.final_choice_id ?? null })) })
    const csv = (bk, i) => { const d = bk.decisions[i]; return decisionCsv(d, d.parameters, d.options, d.scores, new Date(0)) }
    expect(csv(again, 0)).toBe(csv(backup, 0))  // same matrix, totals, ranks, choice and look-back
    expect(csv(again, 1)).toBe(csv(backup, 1))
  })
})

describe('chunks', () => {
  it('splits rows into batches', () => {
    expect(chunks([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]])
    expect(chunks([], 2)).toEqual([])
  })
})

describe('uuid', () => {
  it('makes v4 UUIDs, with or without crypto.randomUUID', () => {
    const v4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
    expect(uuid()).toMatch(v4)
    const real = crypto.randomUUID
    try {
      Object.defineProperty(crypto, 'randomUUID', { value: undefined, configurable: true })
      const ids = new Set(Array.from({ length: 1000 }, uuid))
      expect([...ids].every(id => v4.test(id))).toBe(true)
      expect(ids.size).toBe(1000)
    } finally { Object.defineProperty(crypto, 'randomUUID', { value: real, configurable: true }) }
  })
})
