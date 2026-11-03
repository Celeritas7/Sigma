// =============================================================================
// THEME STATE (persisted to localStorage)
// =============================================================================
export const ACCENT_OPTIONS = [
  { name: 'green', hue: 145 },
  { name: 'blue',  hue: 260 },
  { name: 'coral', hue: 30 },
  { name: 'plum',  hue: 320 },
]
export function applyAccent(hue) {
  const r = document.documentElement
  r.style.setProperty('--accent',      `oklch(0.58 0.16 ${hue})`)
  r.style.setProperty('--accent-soft', `oklch(0.93 0.05 ${hue})`)
  r.style.setProperty('--accent-ink',  `oklch(0.32 0.13 ${hue})`)
  r.style.setProperty('--accent-text', `oklch(0.50 0.15 ${hue})`)
  // second gradient stop, 30° round the hue wheel (green 145 → teal 175)
  r.style.setProperty('--accent-2',    `oklch(0.62 0.15 ${(hue + 30) % 360})`)
}

// ── color system ───────────────────────────────────────────────────────────
// Each decision "kind" resolves (by keyword) to a distinct icon + hue, so real
// type names like "Housing" or "Career" each get a unique icon, not a shared
// fallback. Each option gets a stable color by position.
export const KIND_DEFS = [
  { test: /job|career|work|offer|employ/i,                   emoji: '💼', hue: 255 },
  { test: /apart|hous|home|flat|rent|move|live|condo/i,      emoji: '🏠', hue: 155 },
  { test: /nam|brand|title|label/i,                          emoji: '🏷️', hue: 305 },
  { test: /strateg|focus|business|product|roadmap|q[1-4]/i,  emoji: '🎯', hue: 75 },
  { test: /school|study|colleg|univ|educat|course|degree/i,  emoji: '🎓', hue: 215 },
  { test: /car|vehicle|auto|bike/i,                          emoji: '🚗', hue: 25 },
  { test: /invest|money|financ|budget|stock|fund/i,          emoji: '💰', hue: 130 },
  { test: /travel|trip|vacation|holiday|flight/i,            emoji: '✈️', hue: 235 },
  { test: /health|doctor|medical|fitness/i,                  emoji: '🩺', hue: 10 },
  { test: /food|restaurant|eat|meal|recipe/i,                emoji: '🍽️', hue: 55 },
  { test: /relationship|partner|date|love|family/i,          emoji: '❤️', hue: 350 },
  { test: /life|personal/i,                                  emoji: '🧭', hue: 195 },
]
export const KIND_FALLBACK = { emoji: '🗳️', hue: 285 }
export function kindDef(kind) { const k = String(kind || ''); return KIND_DEFS.find(d => d.test.test(k)) || KIND_FALLBACK }
export function kindEmoji(kind) { return kindDef(kind).emoji }
export function kindHue(kind) { return kindDef(kind).hue }
export function kindColor(kind) { return `oklch(0.56 0.15 ${kindHue(kind)})` }
export function kindSoft(kind) { return `oklch(0.94 0.05 ${kindHue(kind)})` }
// option palette — distinct, evenly-spread hues, muted enough to coexist
export const OPTION_HUES = [255, 25, 155, 305, 75, 200, 340, 120, 285, 45]
export function optionColor(i) { return `oklch(0.6 0.14 ${OPTION_HUES[i % OPTION_HUES.length]})` }
export function optionSoft(i) { return `oklch(0.95 0.045 ${OPTION_HUES[i % OPTION_HUES.length]})` }
