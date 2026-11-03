import { useState, useEffect } from 'react'

// Layout switches. NARROW: phone-width screens get stacked layouts.
// NO_HOVER: touch screens, where hover-only buttons would never appear.
export const NARROW = '(max-width: 640px)'
export const NO_HOVER = '(hover: none)'
export function useMedia(query) {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches)
  useEffect(() => {
    const mq = window.matchMedia(query)
    const onChange = () => setMatches(mq.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [query])
  return matches
}

// Arrow / Page / Home / End keys on a 0–10 slider in 0.5 steps.
// Returns the new value, or undefined if the key isn't a slider key.
export function sliderKey(key, value) {
  const v = value ?? 0
  const step = { ArrowRight: 0.5, ArrowUp: 0.5, ArrowLeft: -0.5, ArrowDown: -0.5, PageUp: 2, PageDown: -2 }[key]
  if (step != null) return Math.max(0, Math.min(10, Math.round((v + step) * 2) / 2))
  if (key === 'Home') return 0
  if (key === 'End') return 10
}

// Enter / Space on a non-button element that acts as one
export function onActivate(fn) {
  return e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fn(e) } }
}

// Dialog focus: move focus into the dialog when it opens, keep Tab inside it,
// and give focus back to whatever opened it when it closes.
export function useDialogFocus(ref) {
  useEffect(() => {
    const opener = document.activeElement
    const el = ref.current
    if (!el) return
    const focusables = () => [...el.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')].filter(x => !x.disabled)
    ;(focusables()[0] || el).focus()
    const onKey = e => {
      if (e.key !== 'Tab') return
      const f = focusables(); if (!f.length) return
      const first = f[0], last = f[f.length - 1]
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
    }
    el.addEventListener('keydown', onKey)
    return () => { el.removeEventListener('keydown', onKey); opener?.focus?.() }
  }, [])
}

// weights move in 0.5 steps: show 7 as "7" and 7.5 as "7.5", never rounded
export function fmtWeight(w) { return Number.isInteger(w) ? String(w) : w.toFixed(1) }
