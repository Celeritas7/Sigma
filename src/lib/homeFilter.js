// =============================================================================
// HOME SEARCH AND FILTERS
// =============================================================================
// Pure: which decisions Home shows for a search, a kind and a show setting.
import { kindDef } from './theme'

export const SHOW_OPTIONS = ['all', 'open', 'closed']
export const EMPTY_FILTER = { query: '', kind: null, show: 'all' }

// lower case, accents removed ("Café" -> "cafe"), whitespace collapsed
export function normalize(s) {
  return String(s ?? '').normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim()
}

// Everything a person might remember a decision by.
function haystack(d) {
  return normalize([
    d.title, d.type, d.notes, d.outcome_notes,
    ...(d._options || []).map(o => o.name),
    ...(d._parameters || []).map(p => p.name),
  ].filter(Boolean).join(' \u0000 '))
}

// Every word of the query must appear somewhere (in any field, any order).
export function matchesQuery(d, query) {
  const words = normalize(query).split(' ').filter(Boolean)
  if (!words.length) return true
  const text = haystack(d)
  return words.every(w => text.includes(w))
}

export const kindLabel = d => kindDef(d.type, d.title).label
const isClosed = d => d.status === 'closed'

export function isFiltering(f) {
  return !!normalize(f.query) || f.kind != null || f.show !== 'all'
}

// -> { open, closed }, each in the order given
export function filterDecisions(decisions, f) {
  const keep = decisions.filter(d => d.status !== 'archived'
    && (f.kind == null || kindLabel(d) === f.kind)
    && matchesQuery(d, f.query))
  return {
    open: f.show === 'closed' ? [] : keep.filter(d => !isClosed(d)),
    closed: f.show === 'open' ? [] : keep.filter(isClosed),
  }
}

// The kinds present, for the chips: most common first, then by name.
export function kindCounts(decisions) {
  const counts = new Map()
  for (const d of decisions) {
    if (d.status === 'archived') continue
    const k = kindDef(d.type, d.title)
    const c = counts.get(k.label) || { label: k.label, emoji: k.emoji, count: 0 }
    c.count++
    counts.set(k.label, c)
  }
  return [...counts.values()].sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
}

// Remembered for the browser tab, so opening a decision and coming back keeps
// the filter. Bad or missing values fall back to no filter.
const KEY = 'sigma_home_filter'
export function readFilter() {
  try {
    const v = JSON.parse(sessionStorage.getItem(KEY) || 'null')
    if (!v || typeof v !== 'object') return EMPTY_FILTER
    return {
      query: typeof v.query === 'string' ? v.query.slice(0, 200) : '',
      kind: typeof v.kind === 'string' ? v.kind : null,
      show: SHOW_OPTIONS.includes(v.show) ? v.show : 'all',
    }
  } catch { return EMPTY_FILTER }
}
export function saveFilter(f) {
  try { sessionStorage.setItem(KEY, JSON.stringify(f)) } catch { /* private mode: not remembered */ }
}
