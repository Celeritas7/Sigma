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
// Each decision resolves to an icon + hue by keyword: first its type, then (for
// types like "Custom" that say nothing) its title. Whole words only, so "car"
// doesn't match "card" and "eat" doesn't match "great". Each option gets a
// stable color by position.
export const KIND_DEFS = [
  { test: /\b(jobs?|careers?|work(place)?|offers?|employ\w*|hir(e|ing)|salary|promotion|resign\w*)\b/i, emoji: '💼', hue: 255 },
  { test: /\b(apartments?|hous(e|es|ing)|homes?|flats?|rent(al|ing)?|mov(e|ing)|reloca\w*|condos?|neighbou?rhoods?|commute)\b/i, emoji: '🏠', hue: 155 },
  { test: /\b(names?|naming|brand(s|ing)?|titles?|labels?|logos?)\b/i, emoji: '🏷️', hue: 305 },
  { test: /\b(strateg\w*|focus|business|products?|roadmaps?|q[1-4]|priorit\w*|goals?|plans?|planning)\b/i, emoji: '🎯', hue: 75 },
  { test: /\b(schools?|stud(y|ying|ies)|colleges?|univ\w*|educat\w*|courses?|degrees?|skills?|learn\w*|coding|class(es)?)\b/i, emoji: '🎓', hue: 215 },
  { test: /\b(cars?|vehicles?|auto|bikes?|scooters?|ev)\b/i, emoji: '🚗', hue: 25 },
  { test: /\b(invest\w*|money|financ\w*|budgets?|stocks?|funds?|savings?|loans?|mortgages?)\b/i, emoji: '💰', hue: 130 },
  { test: /\b(travel\w*|trips?|vacations?|holidays?|flights?|hotels?)\b/i, emoji: '✈️', hue: 235 },
  { test: /\b(health|doctors?|medical|fitness|gym|workouts?|diet)\b/i, emoji: '🩺', hue: 10 },
  { test: /\b(food|restaurants?|eat(ing)?|meals?|recipes?|dinner|lunch|cafes?)\b/i, emoji: '🍽️', hue: 55 },
  { test: /\b(relationships?|partners?|dates?|dating|love|family|wedding|gifts?)\b/i, emoji: '❤️', hue: 350 },
  { test: /\b(buy(ing)?|purchases?|laptops?|phones?|computers?|gadgets?)\b/i, emoji: '🛍️', hue: 280 },
  { test: /\b(life|personal)\b/i, emoji: '🧭', hue: 195 },
]
export const KIND_FALLBACK = { emoji: '⚖️', hue: 285 }
export function kindDef(kind, title) {
  const find = text => KIND_DEFS.find(d => d.test.test(String(text || '')))
  return find(kind) || find(title) || KIND_FALLBACK
}
export function kindEmoji(kind, title) { return kindDef(kind, title).emoji }
export function kindHue(kind, title) { return kindDef(kind, title).hue }
export function kindColor(kind, title) { return `oklch(0.56 0.15 ${kindHue(kind, title)})` }
export function kindSoft(kind, title) { return `oklch(0.94 0.05 ${kindHue(kind, title)})` }
// kindColor is for borders and fills; text needs this darker shade to reach
// 4.5:1 on both the page and kindSoft (a hovered row). Checked in theme.test.js.
export const KIND_TEXT_L = 0.48
export function kindText(kind, title) { return `oklch(${KIND_TEXT_L} 0.15 ${kindHue(kind, title)})` }
// option palette — distinct, evenly-spread hues, muted enough to coexist
export const OPTION_HUES = [255, 25, 155, 305, 75, 200, 340, 120, 285, 45]
export function optionColor(i) { return `oklch(0.6 0.14 ${OPTION_HUES[i % OPTION_HUES.length]})` }
export function optionSoft(i) { return `oklch(0.95 0.045 ${OPTION_HUES[i % OPTION_HUES.length]})` }
