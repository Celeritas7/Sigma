// =============================================================================
// THEME STATE (persisted to localStorage)
// =============================================================================
export const ACCENT_OPTIONS = [
  { name: 'green', hue: 145 },
  { name: 'blue',  hue: 260 },
  { name: 'coral', hue: 30 },
  { name: 'plum',  hue: 320 },
]
// styles.css builds every accent token from --accent-h, per theme
export function applyAccent(hue) {
  document.documentElement.style.setProperty('--accent-h', String(hue))
}

// ── light / dark ───────────────────────────────────────────────────────────
// The choice is 'system', 'light' or 'dark', kept per browser. The page reads
// <html data-theme="light|dark">; index.html sets it before first paint (keep
// that copy in step with resolveTheme).
export const THEME_PREFS = ['system', 'light', 'dark']
const THEME_KEY = 'sigma_theme'
const DARK_QUERY = '(prefers-color-scheme: dark)'
export function resolveTheme(pref, systemDark) {
  return pref === 'light' || pref === 'dark' ? pref : systemDark ? 'dark' : 'light'
}
export function readThemePref() {
  try { const v = localStorage.getItem(THEME_KEY); return THEME_PREFS.includes(v) ? v : 'system' } catch { return 'system' }
}
export function applyTheme(pref = readThemePref()) {
  document.documentElement.dataset.theme = resolveTheme(pref, window.matchMedia(DARK_QUERY).matches)
}
export function setThemePref(pref) {
  try { localStorage.setItem(THEME_KEY, pref) } catch { /* private mode: still applies for this page */ }
  applyTheme(pref)
}
// follow the OS when it switches (only matters while the choice is 'system')
export function watchSystemTheme() {
  const mq = window.matchMedia(DARK_QUERY)
  const onChange = () => applyTheme()
  mq.addEventListener('change', onChange)
  return () => mq.removeEventListener('change', onChange)
}

// ── color system ───────────────────────────────────────────────────────────
// Each decision resolves to an icon + hue by keyword: first its type, then (for
// types like "Custom" that say nothing) its title. Whole words only, so "car"
// doesn't match "card" and "eat" doesn't match "great". Each option gets a
// stable color by position.
export const KIND_DEFS = [
  { test: /\b(jobs?|careers?|work(place)?|offers?|employ\w*|hir(e|ing)|salary|promotion|resign\w*)\b/i, label: 'Work', emoji: '💼', hue: 255 },
  { test: /\b(apartments?|hous(e|es|ing)|homes?|flats?|rent(al|ing)?|mov(e|ing)|reloca\w*|condos?|neighbou?rhoods?|commute)\b/i, label: 'Home', emoji: '🏠', hue: 155 },
  { test: /\b(names?|naming|brand(s|ing)?|titles?|labels?|logos?)\b/i, label: 'Naming', emoji: '🏷️', hue: 305 },
  { test: /\b(strateg\w*|focus|business|products?|roadmaps?|q[1-4]|priorit\w*|goals?|plans?|planning)\b/i, label: 'Strategy', emoji: '🎯', hue: 75 },
  { test: /\b(schools?|stud(y|ying|ies)|colleges?|univ\w*|educat\w*|courses?|degrees?|skills?|learn\w*|coding|class(es)?)\b/i, label: 'Learning', emoji: '🎓', hue: 215 },
  { test: /\b(cars?|vehicles?|auto|bikes?|scooters?|ev)\b/i, label: 'Vehicles', emoji: '🚗', hue: 25 },
  { test: /\b(invest\w*|money|financ\w*|budgets?|stocks?|funds?|savings?|loans?|mortgages?)\b/i, label: 'Money', emoji: '💰', hue: 130 },
  { test: /\b(travel\w*|trips?|vacations?|holidays?|flights?|hotels?)\b/i, label: 'Travel', emoji: '✈️', hue: 235 },
  { test: /\b(health|doctors?|medical|fitness|gym|workouts?|diet)\b/i, label: 'Health', emoji: '🩺', hue: 10 },
  { test: /\b(food|restaurants?|eat(ing)?|meals?|recipes?|dinner|lunch|cafes?)\b/i, label: 'Food', emoji: '🍽️', hue: 55 },
  { test: /\b(relationships?|partners?|dates?|dating|love|family|wedding|gifts?)\b/i, label: 'People', emoji: '❤️', hue: 350 },
  { test: /\b(buy(ing)?|purchases?|laptops?|phones?|computers?|gadgets?)\b/i, label: 'Shopping', emoji: '🛍️', hue: 280 },
  { test: /\b(life|personal)\b/i, label: 'Life', emoji: '🧭', hue: 195 },
]
export const KIND_FALLBACK = { label: 'Other', emoji: '⚖️', hue: 285 }
export function kindDef(kind, title) {
  const find = text => KIND_DEFS.find(d => d.test.test(String(text || '')))
  return find(kind) || find(title) || KIND_FALLBACK
}
export function kindEmoji(kind, title) { return kindDef(kind, title).emoji }
export function kindHue(kind, title) { return kindDef(kind, title).hue }
// Lightness comes from the --tone-* tokens in styles.css, so one string works
// in both themes. kindColor is for borders and fills; kindText is for text and
// reaches 4.5:1 on the page and on kindSoft (a hovered row), checked for every
// kind and both themes in theme.test.js.
export function kindColor(kind, title) { return `oklch(var(--tone-mark) 0.15 ${kindHue(kind, title)})` }
export function kindSoft(kind, title) { return `oklch(var(--tone-soft) 0.05 ${kindHue(kind, title)})` }
export function kindText(kind, title) { return `oklch(var(--tone-text) 0.15 ${kindHue(kind, title)})` }
// option palette — distinct, evenly-spread hues, muted enough to coexist
export const OPTION_HUES = [255, 25, 155, 305, 75, 200, 340, 120, 285, 45]
export function optionColor(i) { return `oklch(0.6 0.14 ${OPTION_HUES[i % OPTION_HUES.length]})` }
export function optionSoft(i) { return `oklch(calc(var(--tone-soft) + 0.01) 0.045 ${OPTION_HUES[i % OPTION_HUES.length]})` }
