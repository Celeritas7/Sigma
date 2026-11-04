import { describe, it, expect } from 'vitest'
import { EMPTY_FILTER, filterDecisions, isFiltering, kindCounts, kindLabel, matchesQuery, normalize } from './homeFilter'
import { KIND_DEFS, KIND_FALLBACK } from './theme'

const D = (id, title, extra = {}) => ({ id, title, type: 'custom', status: 'active', _options: [], _parameters: [], ...extra })
const flat = D('f', 'Which flat?', { _options: [{ name: 'Café Street' }, { name: 'Oak Ave' }], _parameters: [{ name: 'Commute' }] })
const job = D('j', 'Job change', { status: 'closed', notes: 'better team', outcome_notes: 'still happy' })
const name = D('n', 'Name for the cat')
const old = D('o', 'Old flat', { status: 'archived' })
const all = [flat, job, name, old]

describe('normalize', () => {
  it('ignores case, accents and extra spaces', () => {
    expect(normalize('  Café   DÜSSELDORF ')).toBe('cafe dusseldorf')
    expect(normalize(null)).toBe('')
  })
})

describe('matchesQuery', () => {
  it('matches title, options, considerations and notes', () => {
    expect(matchesQuery(flat, 'flat')).toBe(true)
    expect(matchesQuery(flat, 'cafe')).toBe(true)        // option, accent-insensitive
    expect(matchesQuery(flat, 'COMMUTE')).toBe(true)     // consideration
    expect(matchesQuery(job, 'better')).toBe(true)       // why note
    expect(matchesQuery(job, 'happy')).toBe(true)        // look-back note
    expect(matchesQuery(flat, 'salary')).toBe(false)
  })
  it('needs every word, in any field and any order', () => {
    expect(matchesQuery(flat, 'oak commute')).toBe(true)
    expect(matchesQuery(flat, 'commute oak')).toBe(true)
    expect(matchesQuery(flat, 'oak salary')).toBe(false)
  })
  it('an empty query matches everything', () => {
    expect(matchesQuery(flat, '')).toBe(true)
    expect(matchesQuery(flat, '   ')).toBe(true)
  })
  it('does not match across field boundaries', () => {
    expect(matchesQuery(D('x', 'ab', { _options: [{ name: 'cd' }] }), 'bc')).toBe(false)
  })
})

describe('filterDecisions', () => {
  it('splits into open and closed and never shows archived', () => {
    const r = filterDecisions(all, EMPTY_FILTER)
    expect(r.open.map(d => d.id)).toEqual(['f', 'n'])
    expect(r.closed.map(d => d.id)).toEqual(['j'])
    expect(filterDecisions(all, { ...EMPTY_FILTER, query: 'old' }).open).toEqual([])
  })
  it('filters by kind', () => {
    const r = filterDecisions(all, { ...EMPTY_FILTER, kind: 'Home' })
    expect([...r.open, ...r.closed].map(d => d.id)).toEqual(['f'])
  })
  it('shows only open or only closed', () => {
    expect(filterDecisions(all, { ...EMPTY_FILTER, show: 'open' }).closed).toEqual([])
    expect(filterDecisions(all, { ...EMPTY_FILTER, show: 'closed' }).open).toEqual([])
  })
  it('combines search, kind and show', () => {
    const r = filterDecisions(all, { query: 'team', kind: 'Work', show: 'closed' })
    expect(r.closed.map(d => d.id)).toEqual(['j'])
    expect(filterDecisions(all, { query: 'team', kind: 'Home', show: 'all' })).toEqual({ open: [], closed: [] })
  })
  it('knows when a filter is on', () => {
    expect(isFiltering(EMPTY_FILTER)).toBe(false)
    expect(isFiltering({ ...EMPTY_FILTER, query: '  ' })).toBe(false)
    expect(isFiltering({ ...EMPTY_FILTER, query: 'x' })).toBe(true)
    expect(isFiltering({ ...EMPTY_FILTER, kind: 'Work' })).toBe(true)
    expect(isFiltering({ ...EMPTY_FILTER, show: 'open' })).toBe(true)
  })
})

describe('kinds', () => {
  it('every kind has a distinct label', () => {
    const labels = [...KIND_DEFS, KIND_FALLBACK].map(k => k.label)
    expect(labels.every(Boolean)).toBe(true)
    expect(new Set(labels).size).toBe(labels.length)
  })
  it('counts the kinds present, most common first, without archived', () => {
    expect(kindLabel(flat)).toBe('Home')
    const extra = D('f2', 'Second flat')
    expect(kindCounts([...all, extra]).map(k => `${k.label}:${k.count}`)).toEqual(['Home:2', 'Naming:1', 'Work:1'])
  })
})
