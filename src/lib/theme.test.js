import { describe, it, expect } from 'vitest'
import { kindEmoji, KIND_FALLBACK } from './theme'

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
