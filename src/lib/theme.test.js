import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { ACCENT_OPTIONS, kindEmoji, KIND_DEFS, KIND_FALLBACK, resolveTheme } from './theme'

describe('decision icons', () => {
  it('match the type first', () => {
    expect(kindEmoji('Relocation', 'Housing (Ageo commute)')).toBe('🏠')
    expect(kindEmoji('Priority', 'What to start next (skills & goals)')).toBe('🎯')
    expect(kindEmoji('Career', 'anything')).toBe('💼')
  })
  it('fall back to the title when the type says nothing', () => {
    expect(kindEmoji('custom', 'Job change')).toBe('💼')
    expect(kindEmoji('custom', 'Date spot — Karve Nagar / Warje')).toBe('❤️')
    expect(kindEmoji('custom', 'Which laptop to buy')).toBe('🛍️')
  })
  it('use the generic icon when nothing matches', () => {
    expect(kindEmoji('custom', '')).toBe(KIND_FALLBACK.emoji)
    expect(kindEmoji(null, undefined)).toBe(KIND_FALLBACK.emoji)
  })
  it('match whole words only', () => {
    expect(kindEmoji('custom', 'Which card to use')).toBe(KIND_FALLBACK.emoji)  // not 🚗
    expect(kindEmoji('custom', 'A great idea')).toBe(KIND_FALLBACK.emoji)        // not 🍽️
    expect(kindEmoji('custom', 'Software update')).toBe(KIND_FALLBACK.emoji)    // not ❤️
    expect(kindEmoji('custom', 'Vietnam or Thailand trip')).toBe('✈️')          // not 🏷️ (…nam)
  })
})

// OKLCH -> sRGB (Björn Ottosson's matrices), then the WCAG contrast ratio.
function oklchToRgb(L, C, h) {
  const a = C * Math.cos(h * Math.PI / 180), b = C * Math.sin(h * Math.PI / 180)
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3
  const s = (L - 0.0894841775 * a - 1.2914855480 * b) ** 3
  const lin = [4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s]
  return lin.map(v => Math.min(1, Math.max(0, v)))
}
const luminance = ([r, g, b]) => 0.2126 * r + 0.7152 * g + 0.0722 * b
function contrast(x, y) {
  const a = luminance(oklchToRgb(...x)), b = luminance(oklchToRgb(...y))
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)
}

// The real tokens, read from styles.css: light is :root, dark is :root plus
// the [data-theme="dark"] overrides.
const css = readFileSync(new URL('../styles.css', import.meta.url), 'utf8')
function block(selector) {
  const start = css.indexOf(selector + ' {')
  const body = css.slice(start, css.indexOf('\n}', start))
  return Object.fromEntries([...body.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/(--[\w-]+):\s*([^;]+);/g)].map(m => [m[1], m[2].trim()]))
}
const LIGHT = block(':root')
const DARK = { ...LIGHT, ...block(':root[data-theme="dark"]') }
// resolve var() and calc(a + b), then parse "oklch(L C H)" into numbers
function resolve(value, vars) {
  let v = value
  for (let i = 0; i < 10 && v.includes('var('); i++) v = v.replace(/var\((--[\w-]+)\)/g, (_, n) => vars[n])
  v = v.replace(/calc\(([\d.]+) ([+-]) ([\d.]+)\)/g, (_, a, op, b) => String(op === '+' ? +a + +b : a - b))
  return v
}
const WHITE = [1, 0, 0]
function color(value, vars) {
  const v = resolve(value, vars)
  if (v === '#fff') return WHITE
  const m = v.match(/^oklch\(([\d.]+) ([\d.]+) ([\d.]+)\)$/)
  if (!m) throw new Error(`can't parse ${value} -> ${v}`)
  return [+m[1], +m[2], +m[3]]
}
const tok = (vars, name) => color(`var(${name})`, vars)

describe.each([['light', LIGHT], ['dark', DARK]])('%s theme contrast', (_, vars) => {
  const atLeast = (fg, bg, label, min = 4.5) => expect(contrast(fg, bg), label).toBeGreaterThanOrEqual(min)

  it('body text on every surface', () => {
    for (const bg of ['--bg', '--bg-soft', '--bg-inset'])
      for (const fg of ['--ink', '--ink-soft']) atLeast(tok(vars, fg), tok(vars, bg), `${fg} on ${bg}`)
    for (const bg of ['--bg', '--bg-soft']) atLeast(tok(vars, '--ink-faint'), tok(vars, bg), `--ink-faint on ${bg}`)
  })

  it('status colours as text, on the page and on their own tint', () => {
    for (const [fg, soft] of [['--neg', '--neg-soft'], ['--warn-text', '--warn-soft'], ['--hi', '--hi-soft']])
      for (const bg of ['--bg', '--bg-soft', soft]) atLeast(tok(vars, fg), tok(vars, bg), `${fg} on ${bg}`)
  })

  it('accent text for every accent choice', () => {
    for (const { name, hue } of ACCENT_OPTIONS) {
      const v = { ...vars, '--accent-h': String(hue) }
      for (const bg of ['--bg', '--bg-soft', '--accent-soft']) atLeast(tok(v, '--accent-text'), tok(v, bg), `${name}: --accent-text on ${bg}`)
      atLeast(tok(v, '--accent-ink'), tok(v, '--accent-soft'), `${name}: --accent-ink on --accent-soft`)
      for (const fill of ['--accent-fill', '--accent-fill-2']) atLeast(WHITE, tok(v, fill), `${name}: #fff on ${fill}`)
    }
  })

  it('text on fills', () => {
    atLeast(WHITE, tok(vars, '--neg-fill'), '#fff on --neg-fill')
    atLeast(tok(vars, '--on-warn'), tok(vars, '--warn'), '--on-warn on --warn')
  })

  it('kindText on the page and on a hovered row, for every kind', () => {
    for (const { hue } of [...KIND_DEFS, KIND_FALLBACK]) {
      const text = color(`oklch(var(--tone-text) 0.15 ${hue})`, vars)
      atLeast(text, tok(vars, '--bg'), `hue ${hue} on page`)
      atLeast(text, color(`oklch(var(--tone-soft) 0.05 ${hue})`, vars), `hue ${hue} on kindSoft`)
    }
  })

  it('consideration colours as text (weight numbers), for every consideration hue', () => {
    for (const hue of [145, 30, 260, 75, 320, 200, 60, 290, 175, 240])  // paramHues in DecisionView
      atLeast(color(`oklch(var(--tone-text) 0.13 ${hue})`, vars), tok(vars, '--bg'), `param hue ${hue}`)
  })

  it('weight tier names on their lane', () => {
    for (const hue of [145, 75, 235, 25, 285]) {
      const lane = color(`oklch(calc(var(--tone-tint) + 0.01) 0.055 ${hue})`, vars)
      atLeast(color(`oklch(var(--tone-label) 0.13 ${hue})`, vars), lane, `tier ${hue} name`)
      atLeast(color(`oklch(calc(var(--tone-label) + 0.03) 0.1 ${hue})`, vars), lane, `tier ${hue} range`)
    }
  })
})

describe('theme choice', () => {
  it('System follows the OS; Light and Dark override it', () => {
    expect(resolveTheme('system', true)).toBe('dark')
    expect(resolveTheme('system', false)).toBe('light')
    expect(resolveTheme('light', true)).toBe('light')
    expect(resolveTheme('dark', false)).toBe('dark')
    expect(resolveTheme(null, true)).toBe('dark')
  })
})
