// =============================================================================
// EXPORT
// =============================================================================
// Two formats:
//   - decisionCsv: one decision as a spreadsheet (Excel, Sheets, Numbers);
//   - buildBackup: everything the user owns as JSON, to keep a copy.
// Pure functions; the download itself is downloadFile in ui.js.
import { rankedOptions, TIE_EPSILON } from './scoring'
import { outcomeDef } from './lookback'

// ── CSV ────────────────────────────────────────────────────────────────────
// A text cell that starts with = + - @ (or a tab / carriage return) would run
// as a formula when the file is opened in a spreadsheet. Prefix it with ' so
// it shows as text. Numbers are written as numbers and never prefixed.
export function csvCell(v) {
  if (v == null) return ''
  if (typeof v === 'number') return Number.isFinite(v) ? String(v) : ''
  let s = String(v)
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}
export const csvRow = cells => cells.map(csvCell).join(',')

const byOrder = (a, b) => (a.display_order ?? 0) - (b.display_order ?? 0)
const round2 = n => Math.round(n * 100) / 100

// Rank the options that have enough scores; totals within TIE_EPSILON share a
// rank (they display identically). Returns Map id -> rank.
export function ranks(ranked) {
  const out = new Map()
  let rank = 0, prev = null
  ranked.filter(o => o._ranked).forEach((o, i) => {
    if (prev == null || prev - o._total >= TIE_EPSILON) rank = i + 1
    out.set(o.id, rank)
    prev = o._total
  })
  return out
}

export function decisionCsv(decision, parameters, options, scores, now = new Date()) {
  const params = [...parameters].sort(byOrder)
  const opts = [...options].sort(byOrder)
  const ranked = rankedOptions(opts, scores, params)
  const rankOf = ranks(ranked)
  const totalOf = new Map(ranked.map(o => [o.id, o._total]))
  const scoreOf = (o, p) => scores.find(s => s.option_id === o.id && s.parameter_id === p.id)
  const name = o => o.name || 'unnamed'

  const rows = [
    ['Decision', decision.title || 'untitled'],
    ['Type', decision.type || 'custom'],
    ['Status', decision.status],
    ['Started', (decision.created_at || '').slice(0, 10)],
  ]
  if (decision.status === 'closed') {
    const chosen = opts.find(o => o.id === decision.final_choice_id)
    rows.push(['Chose', chosen ? name(chosen) : 'not recorded'])
    if (decision.notes) rows.push(['Why', decision.notes])
    const out = outcomeDef(decision.outcome)
    if (out) rows.push(['Looking back', out.label + (decision.outcome_notes ? ` — ${decision.outcome_notes}` : '')])
  }
  rows.push(['Exported', now.toISOString().slice(0, 10)], [])

  // the matrix: a score and an evidence column per option
  rows.push(['Consideration', 'Weight', ...opts.flatMap(o => [`${name(o)} score`, `${name(o)} evidence`])])
  for (const p of params) {
    rows.push([p.name, Number(p.weight), ...opts.flatMap(o => {
      const s = scoreOf(o, p)
      return [s?.value != null ? Number(s.value) : null, s?.notes ?? null]
    })])
  }
  rows.push([])
  rows.push(['Weighted total (0–10)', null, ...opts.flatMap(o => {
    const t = totalOf.get(o.id)
    return [t != null ? round2(t) : null, null]
  })])
  rows.push(['Rank', null, ...opts.flatMap(o => [rankOf.get(o.id) ?? 'not enough scores', null])])

  // BOM so Excel reads the file as UTF-8 (accents, emoji); CRLF per RFC 4180
  return '﻿' + rows.map(csvRow).join('\r\n') + '\r\n'
}

// ── JSON backup ────────────────────────────────────────────────────────────
// Raw rows from the six sigma_ tables -> one nested document.
export const BACKUP_VERSION = 1
export function buildBackup({ decisions, parameters, options, scores, templates, templateParameters }, now = new Date()) {
  const strip = ({ sigma_options, ...row }) => row  // drop the join helper from score rows
  return {
    app: 'sigma',
    version: BACKUP_VERSION,
    exported_at: now.toISOString(),
    decisions: (decisions || []).map(d => {
      const opts = (options || []).filter(o => o.decision_id === d.id).sort(byOrder)
      const optIds = new Set(opts.map(o => o.id))
      return {
        ...d,
        parameters: (parameters || []).filter(p => p.decision_id === d.id).sort(byOrder),
        options: opts,
        scores: (scores || []).filter(s => optIds.has(s.option_id)).map(strip),
      }
    }),
    templates: (templates || []).map(t => ({
      ...t,
      parameters: (templateParameters || []).filter(tp => tp.template_id === t.id).sort(byOrder),
    })),
  }
}

// "Which flat?" -> "sigma-which-flat-2026-11-04.csv"
export function exportFilename(title, ext, now = new Date()) {
  const slug = String(title || '').toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 50)
  return `sigma-${slug ? slug + '-' : ''}${now.toISOString().slice(0, 10)}.${ext}`
}
