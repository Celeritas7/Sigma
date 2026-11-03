import { describe, it, expect } from 'vitest'
import { STARTER_TEMPLATES, clampWeight, parameterRowsFromTemplate, templateFromDecision, templatesFromRows, templateSummary } from './templates'
import { KIND_FALLBACK, kindDef } from './theme'

describe('templates', () => {
  it('starters are well formed', () => {
    const ids = new Set()
    for (const t of STARTER_TEMPLATES) {
      expect(ids.has(t.id)).toBe(false); ids.add(t.id)
      expect(t.builtin).toBe(true)
      expect(t.parameters.length).toBeGreaterThan(2)
      for (const tp of t.parameters) {
        expect(tp.name.trim()).not.toBe('')
        expect(clampWeight(tp.weight)).toBe(tp.weight)
      }
      // each starter's type picks up its own icon, not the fallback
      expect(kindDef(t.type)).not.toBe(KIND_FALLBACK)
    }
  })

  it('clamps weights to 0–10 in 0.5 steps', () => {
    expect(clampWeight(7.3)).toBe(7.5)
    expect(clampWeight(-2)).toBe(0)
    expect(clampWeight(14)).toBe(10)
    expect(clampWeight('6')).toBe(6)
    expect(clampWeight(undefined)).toBe(5)
  })

  it('turns a template into parameter rows for a decision', () => {
    const rows = parameterRowsFromTemplate(STARTER_TEMPLATES[0], 'd1')
    expect(rows).toHaveLength(STARTER_TEMPLATES[0].parameters.length)
    expect(rows[0]).toMatchObject({ decision_id: 'd1', name: 'Pay and benefits', weight: 7, display_order: 0, input_type: 'text', has_uncertainty: false })
    expect(rows.map(r => r.display_order)).toEqual(rows.map((_, i) => i))
    expect(parameterRowsFromTemplate(null, 'd1')).toEqual([])
  })

  it('saves a decision as a template: names and weights, in order, no blanks', () => {
    const decision = { title: ' Which flat? ', type: 'home' }
    const params = [
      { name: 'Commute', weight: 7, display_order: 1, input_type: 'number', unit: 'min' },
      { name: 'Rent', weight: 9, display_order: 0, description: 'per month' },
      { name: '  ', weight: 3, display_order: 2 },
      { name: 'Old one', weight: 3, display_order: 3, archived_at: '2026-01-01' },
    ]
    const { template, parameters } = templateFromDecision(decision, params, '')
    expect(template).toEqual({ name: 'Which flat?', type: 'home', description: null })
    expect(parameters.map(x => x.name)).toEqual(['Rent', 'Commute'])
    expect(parameters[0]).toMatchObject({ default_weight: 9, description: 'per month', display_order: 0 })
    expect(parameters[1]).toMatchObject({ default_weight: 7, input_type: 'number', unit: 'min', display_order: 1 })
    expect(templateFromDecision({ title: '' }, [], '  My list ').template.name).toBe('My list')
    expect(templateFromDecision({ title: '' }, [], '').template).toMatchObject({ name: 'Untitled template', type: 'custom' })
  })

  it('round-trips through database rows', () => {
    const saved = templateFromDecision({ title: 'Flat', type: 'home' }, [{ name: 'Rent', weight: 9 }, { name: 'Light', weight: 4.5 }], 'Flats')
    const rows = [{ id: 't1', ...saved.template }]
    const paramRows = saved.parameters.map(x => ({ ...x, template_id: 't1', default_weight: String(x.default_weight) })).reverse()
    const [t] = templatesFromRows(rows, [...paramRows, { template_id: 'other', name: 'x', default_weight: 1 }])
    expect(t).toMatchObject({ id: 't1', name: 'Flats', type: 'home', builtin: false })
    expect(t.parameters.map(x => [x.name, x.weight])).toEqual([['Rent', 9], ['Light', 4.5]])
    expect(parameterRowsFromTemplate(t, 'd2').map(r => r.weight)).toEqual([9, 4.5])
  })

  it('summarises considerations', () => {
    expect(templateSummary({ parameters: [{ name: 'A' }, { name: 'B' }, { name: 'C' }, { name: 'D' }, { name: 'E' }] })).toBe('A · B · C +2')
    expect(templateSummary({ parameters: [{ name: 'A' }] })).toBe('A')
    expect(templateSummary({ parameters: [] })).toBe('no considerations')
  })
})
