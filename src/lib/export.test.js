import { describe, it, expect } from 'vitest'
import { buildBackup, csvCell, decisionCsv, exportFilename, ranks } from './export'
import { rankedOptions } from './scoring'

const NOW = new Date('2026-11-04T12:00:00Z')
const P = (id, name, weight, i) => ({ id, decision_id: 'd', name, weight, display_order: i })
const O = (id, name, i) => ({ id, decision_id: 'd', name, display_order: i })
const S = (o, p, value, notes = null) => ({ id: o + p, option_id: o, parameter_id: p, value, notes, sigma_options: { decision_id: 'd' } })

// minimal RFC 4180 parser, to read back what decisionCsv wrote
function parseCsv(text) {
  const rows = []; let row = [], cell = '', q = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (q) { if (c === '"' && text[i + 1] === '"') { cell += '"'; i++ } else if (c === '"') q = false; else cell += c }
    else if (c === '"') q = true
    else if (c === ',') { row.push(cell); cell = '' }
    else if (c === '\r' && text[i + 1] === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; i++ }
    else cell += c
  }
  return rows
}

describe('csvCell', () => {
  it('quotes commas, quotes and newlines', () => {
    expect(csvCell('plain')).toBe('plain')
    expect(csvCell('a, b')).toBe('"a, b"')
    expect(csvCell('say "hi"')).toBe('"say ""hi"""')
    expect(csvCell('two\nlines')).toBe('"two\nlines"')
  })
  it('writes numbers as numbers and blanks for nothing', () => {
    expect(csvCell(7.5)).toBe('7.5')
    expect(csvCell(0)).toBe('0')
    expect(csvCell(null)).toBe('')
    expect(csvCell(undefined)).toBe('')
    expect(csvCell(NaN)).toBe('')
  })
  it('defuses text that a spreadsheet would run as a formula', () => {
    expect(csvCell('=HYPERLINK("x")')).toBe(`"'=HYPERLINK(""x"")"`)
    expect(csvCell('+1 555')).toBe("'+1 555")
    expect(csvCell('-5 min')).toBe("'-5 min")
    expect(csvCell('@sum')).toBe("'@sum")
    expect(csvCell(-5)).toBe('-5')  // a real number stays a number
  })
})

describe('ranks', () => {
  it('shares a rank for ties and skips options without enough scores', () => {
    const ranked = [
      { id: 'a', _ranked: true, _total: 8 }, { id: 'b', _ranked: true, _total: 8.001 - 0.001 },
      { id: 'c', _ranked: true, _total: 6 }, { id: 'd', _ranked: false, _total: 9 },
    ]
    const r = ranks(ranked)
    expect([r.get('a'), r.get('b'), r.get('c'), r.has('d')]).toEqual([1, 1, 3, false])
  })
})

describe('decisionCsv', () => {
  const params = [P('p2', 'Light', 4.5, 1), P('p1', 'Rent, monthly', 9, 0), P('p3', 'Garden', 0, 2)]
  const options = [O('o2', 'Oak Ave', 1), O('o1', 'Elm St', 0), O('o3', 'Pine Rd', 2)]
  const scores = [S('o1', 'p1', 8, '€1,200'), S('o1', 'p2', 6), S('o2', 'p1', 5, '=cheap'), S('o2', 'p2', 9), S('o3', 'p2', 10)]
  const decision = { title: 'Which flat?', type: 'home', status: 'active', created_at: '2026-11-01T09:00:00Z' }
  const text = decisionCsv(decision, params, options, scores, NOW)
  const rows = parseCsv(text.slice(1))

  it('starts with a UTF-8 BOM and ends rows with CRLF', () => {
    expect(text.charCodeAt(0)).toBe(0xfeff)
    expect(text.endsWith('\r\n')).toBe(true)
  })
  it('writes the details, then the matrix in display order', () => {
    expect(rows[0]).toEqual(['Decision', 'Which flat?'])
    expect(rows.find(r => r[0] === 'Exported')).toEqual(['Exported', '2026-11-04'])
    const h = rows.findIndex(r => r[0] === 'Consideration')
    expect(rows[h]).toEqual(['Consideration', 'Weight', 'Elm St score', 'Elm St evidence', 'Oak Ave score', 'Oak Ave evidence', 'Pine Rd score', 'Pine Rd evidence'])
    expect(rows[h + 1]).toEqual(['Rent, monthly', '9', '8', '€1,200', '5', "'=cheap", '', ''])
    expect(rows[h + 2]).toEqual(['Light', '4.5', '6', '', '9', '', '10', ''])
    expect(rows[h + 3]).toEqual(['Garden', '0', '', '', '', '', '', ''])
  })
  it('totals and ranks match the scoring code', () => {
    const ranked = rankedOptions([...options].sort((a, b) => a.display_order - b.display_order), scores, params)
    const total = id => String(Math.round(ranked.find(o => o.id === id)._total * 100) / 100)
    const t = rows.find(r => r[0] === 'Weighted total (0–10)')
    expect([t[2], t[4]]).toEqual([total('o1'), total('o2')])
    expect(t[6]).toBe('10')  // Pine Rd: one of two weighted considerations scored = 50%, enough to rank
    const r = rows.find(r => r[0] === 'Rank')
    expect([r[2], r[4], r[6]]).toEqual(['2', '3', '1'])
  })
  it('says when an option has too few scores to rank', () => {
    const few = decisionCsv(decision, params, options, [S('o1', 'p1', 8), S('o1', 'p2', 6)], NOW)
    const r = parseCsv(few.slice(1)).find(r => r[0] === 'Rank')
    expect([r[2], r[4]]).toEqual(['1', 'not enough scores'])
  })
  it('records the choice, the reason and the look-back on a closed decision', () => {
    const closed = { ...decision, status: 'closed', final_choice_id: 'o2', notes: 'Quieter street', outcome: 'good', outcome_notes: 'Still happy' }
    const r = parseCsv(decisionCsv(closed, params, options, scores, NOW).slice(1))
    expect(r.find(x => x[0] === 'Chose')).toEqual(['Chose', 'Oak Ave'])
    expect(r.find(x => x[0] === 'Why')).toEqual(['Why', 'Quieter street'])
    expect(r.find(x => x[0] === 'Looking back')).toEqual(['Looking back', 'Good call — Still happy'])
  })
  it('handles an empty decision', () => {
    const r = parseCsv(decisionCsv({ title: '', status: 'active' }, [], [], [], NOW).slice(1))
    expect(r[0]).toEqual(['Decision', 'untitled'])
    expect(r.find(x => x[0] === 'Consideration')).toEqual(['Consideration', 'Weight'])
  })
})

describe('buildBackup', () => {
  it('nests rows under their decision and template, without the join helper', () => {
    const b = buildBackup({
      decisions: [{ id: 'd', title: 'Flat' }, { id: 'e', title: 'Car', status: 'archived' }],
      parameters: [P('p2', 'Light', 4.5, 1), P('p1', 'Rent', 9, 0)],
      options: [O('o1', 'Elm', 0)],
      scores: [S('o1', 'p1', 8), { id: 'x', option_id: 'other', parameter_id: 'p1', value: 1 }],
      templates: [{ id: 't', name: 'Flats' }],
      templateParameters: [{ id: 'tp', template_id: 't', name: 'Rent', default_weight: 9, display_order: 0 }],
    }, NOW)
    expect(b).toMatchObject({ app: 'sigma', version: 1, exported_at: '2026-11-04T12:00:00.000Z' })
    expect(b.decisions[0].parameters.map(p => p.name)).toEqual(['Rent', 'Light'])
    expect(b.decisions[0].scores).toEqual([{ id: 'o1p1', option_id: 'o1', parameter_id: 'p1', value: 8, notes: null }])
    expect(b.decisions[1]).toMatchObject({ title: 'Car', status: 'archived', parameters: [], options: [], scores: [] })
    expect(b.templates[0].parameters.map(p => p.name)).toEqual(['Rent'])
  })
})

describe('exportFilename', () => {
  it('makes a safe, dated name', () => {
    expect(exportFilename('Which flat?', 'csv', NOW)).toBe('sigma-which-flat-2026-11-04.csv')
    expect(exportFilename('Café / Düsseldorf', 'csv', NOW)).toBe('sigma-cafe-dusseldorf-2026-11-04.csv')
    expect(exportFilename('', 'json', NOW)).toBe('sigma-2026-11-04.json')
    expect(exportFilename('🏠🏠', 'csv', NOW)).toBe('sigma-2026-11-04.csv')
  })
})
