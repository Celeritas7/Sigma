import { describe, it, expect } from 'vitest'
import { kindEmoji, KIND_DEFS, KIND_FALLBACK, KIND_TEXT_L } from './theme'

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

describe('decision colours', () => {
  it('kindText reaches 4.5:1 on the page and on a hovered row, for every kind', () => {
    const page = [0.985, 0.004, 95]  // --bg in styles.css
    for (const { hue } of [...KIND_DEFS, KIND_FALLBACK]) {
      const text = [KIND_TEXT_L, 0.15, hue]
      expect(contrast(text, page), `hue ${hue} on page`).toBeGreaterThanOrEqual(4.5)
      expect(contrast(text, [0.94, 0.05, hue]), `hue ${hue} on kindSoft`).toBeGreaterThanOrEqual(4.5)
    }
  })
})
