// =============================================================================
// IMPORT A BACKUP
// =============================================================================
// Reads a file made by "Download backup (JSON)" (buildBackup in export.js) and
// plans new rows for it. Import only ever adds: every decision and template
// becomes a new copy with fresh ids, so it can't overwrite or collide with
// anything already in the account. user_id and other owner fields in the file
// are ignored (the database fills user_id from the signed-in user), and only
// known columns are copied, checked against the database's constraints.
// Pure functions; App.jsx does the inserts.
import { BACKUP_VERSION } from './export'

export const MAX_BACKUP_BYTES = 20 * 1024 * 1024

const isObj = v => v != null && typeof v === 'object' && !Array.isArray(v)
const arr = v => (Array.isArray(v) ? v : [])
const str = (v, max = 10000) => (typeof v === 'string' ? v.slice(0, max) : null)
const num = (v, lo, hi) => {
  const n = typeof v === 'string' && v.trim() !== '' ? Number(v) : v
  return typeof n === 'number' && Number.isFinite(n) && n >= lo && n <= hi ? n : null
}
const oneOf = (v, allowed, fallback) => (allowed.includes(v) ? v : fallback)
const time = v => (typeof v === 'string' && !Number.isNaN(Date.parse(v)) ? v : null)
const bool = v => v === true
const json = v => (v === undefined ? null : v)

// Check the file is a Sigma backup this version can read. Returns
// { backup } or { error } with a message for the person importing.
export function parseBackup(text) {
  let data
  try { data = JSON.parse(text) } catch { return { error: "This file isn't a Sigma backup (it isn't valid JSON)." } }
  if (!isObj(data) || data.app !== 'sigma') return { error: "This file isn't a Sigma backup." }
  if (typeof data.version !== 'number' || data.version > BACKUP_VERSION)
    return { error: 'This backup was made by a newer version of Sigma. Reload the page and try again.' }
  if (!Array.isArray(data.decisions)) return { error: 'This backup is damaged: it has no list of decisions.' }
  return {
    backup: {
      exported_at: time(data.exported_at),
      decisions: data.decisions.filter(isObj),
      templates: arr(data.templates).filter(isObj),
    },
  }
}

// ── one row per table, only known columns, values the database accepts ─────
function decisionRow(d) {
  return {
    title: str(d.title, 500) ?? '',
    type: str(d.type, 100) || 'custom',
    status: oneOf(d.status, ['active', 'closed', 'decided', 'archived'], 'active'),
    notes: str(d.notes),
    outcome: oneOf(d.outcome, ['good', 'mixed', 'regret'], null),
    outcome_notes: str(d.outcome_notes),
    // every row needs the same keys: in a bulk insert a key missing from one
    // row becomes NULL there, and created_at is NOT NULL
    created_at: time(d.created_at) ?? new Date().toISOString(),
    decided_at: time(d.decided_at),
    reviewed_at: time(d.reviewed_at),
  }
}
function parameterRow(p, i) {
  return {
    name: str(p.name, 500) ?? '',
    weight: num(p.weight, 0, 10) ?? 5,
    category: str(p.category, 200),
    description: str(p.description),
    has_uncertainty: bool(p.has_uncertainty),
    input_type: oneOf(p.input_type, ['text', 'number', 'categorical'], 'text'),
    unit: str(p.unit, 100),
    options: json(p.options),
    display_order: Number.isInteger(p.display_order) ? p.display_order : i,
    archived_at: time(p.archived_at),
  }
}
function optionRow(o, i) {
  return {
    name: str(o.name, 500) ?? '',
    notes: str(o.notes),
    category: str(o.category, 200),
    display_order: Number.isInteger(o.display_order) ? o.display_order : i,
    archived_at: time(o.archived_at),
  }
}
function scoreRow(s) {
  let min = num(s.min_value, 0, 10), max = num(s.max_value, 0, 10)
  if (min != null && max != null && min > max) min = max = null
  return {
    value: num(s.value, 0, 10),
    min_value: min,
    max_value: max,
    confidence: Number.isInteger(s.confidence) ? num(s.confidence, 0, 100) : null,
    notes: str(s.notes),
    status: oneOf(s.status, ['estimate', 'confirmed'], 'estimate'),
  }
}
function templateRow(t) {
  return { name: str(t.name, 500) || 'Imported template', type: str(t.type, 100) || 'custom', description: str(t.description) }
}
function templateParameterRow(tp, i) {
  return {
    name: str(tp.name, 500) ?? '',
    default_weight: num(tp.default_weight, 0, 10) ?? 5,
    category: str(tp.category, 200),
    description: str(tp.description),
    has_uncertainty: bool(tp.has_uncertainty),
    input_type: oneOf(tp.input_type, ['text', 'number', 'categorical'], 'text'),
    unit: str(tp.unit, 100),
    options: json(tp.options),
    display_order: Number.isInteger(tp.display_order) ? tp.display_order : i,
  }
}

// What the preview lists: one entry per decision / template in the file.
// existing: Set of ids already in the account; those start unticked.
export function summarize(backup, existing = new Set()) {
  return {
    decisions: backup.decisions.map((d, i) => ({
      key: 'd' + i, title: str(d.title, 500) || 'untitled', type: str(d.type, 100) || 'custom',
      status: oneOf(d.status, ['active', 'closed', 'decided', 'archived'], 'active'),
      considerations: arr(d.parameters).length, options: arr(d.options).length,
      present: existing.has(d.id),
    })),
    templates: backup.templates.map((t, i) => ({
      key: 't' + i, name: str(t.name, 500) || 'Imported template', considerations: arr(t.parameters).length,
      present: existing.has(t.id),
    })),
  }
}

// Rows to insert for the chosen entries, with fresh ids (newId) and every
// link remapped to them. Scores whose option or consideration isn't in the
// same decision are dropped, as are duplicates of the same cell. The chosen
// option is set afterwards (finalChoices), since it must exist first.
export function planImport(backup, chosenKeys, newId) {
  const plan = { decisions: [], parameters: [], options: [], scores: [], finalChoices: [], templates: [], templateParameters: [] }
  const templateIds = new Map()
  backup.templates.forEach((t, i) => {
    if (!chosenKeys.has('t' + i)) return
    const id = newId()
    if (t.id != null) templateIds.set(t.id, id)
    plan.templates.push({ id, ...templateRow(t) })
    arr(t.parameters).filter(isObj).forEach((tp, j) => plan.templateParameters.push({ id: newId(), template_id: id, ...templateParameterRow(tp, j) }))
  })
  backup.decisions.forEach((d, i) => {
    if (!chosenKeys.has('d' + i)) return
    const id = newId()
    plan.decisions.push({ id, ...decisionRow(d), template_id: templateIds.get(d.template_id) ?? null })
    const paramIds = new Map(), optionIds = new Map()
    arr(d.parameters).filter(isObj).forEach((p, j) => {
      const nid = newId(); if (p.id != null) paramIds.set(p.id, nid)
      plan.parameters.push({ id: nid, decision_id: id, ...parameterRow(p, j) })
    })
    arr(d.options).filter(isObj).forEach((o, j) => {
      const nid = newId(); if (o.id != null) optionIds.set(o.id, nid)
      plan.options.push({ id: nid, decision_id: id, ...optionRow(o, j) })
    })
    const seen = new Set()
    for (const s of arr(d.scores).filter(isObj)) {
      const o = optionIds.get(s.option_id), p = paramIds.get(s.parameter_id)
      if (!o || !p || seen.has(o + p)) continue
      seen.add(o + p)
      plan.scores.push({ id: newId(), option_id: o, parameter_id: p, ...scoreRow(s) })
    }
    const choice = optionIds.get(d.final_choice_id)
    if (choice) plan.finalChoices.push({ id, final_choice_id: choice })
  })
  return plan
}

// A v4 UUID. crypto.randomUUID exists only on secure (https) pages;
// getRandomValues works everywhere.
export function uuid() {
  if (globalThis.crypto?.randomUUID) return crypto.randomUUID()
  const b = crypto.getRandomValues(new Uint8Array(16))
  b[6] = (b[6] & 0x0f) | 0x40; b[8] = (b[8] & 0x3f) | 0x80
  const h = [...b].map(x => x.toString(16).padStart(2, '0')).join('')
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`
}

export function chunks(rows, size = 500) {
  const out = []
  for (let i = 0; i < rows.length; i += size) out.push(rows.slice(i, i + size))
  return out
}
