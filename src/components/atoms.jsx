import { useState, useEffect, useRef, useCallback } from 'react'
import { fmtWeight, onActivate, sliderKey } from '../lib/ui'

// =============================================================================
// SMALL UI ATOMS
// =============================================================================

export function Pill({ children, color, bg, style }) {
  const c = color || 'var(--ink)'
  return <span className="pill" style={{
    background: bg || `color-mix(in oklch, ${c} 14%, var(--bg))`,
    // text is the pill colour pulled 40% toward ink, so it stays readable on its tint
    color: `color-mix(in oklch, ${c} 60%, var(--ink))`, ...style,
  }}>{children}</span>
}

export function InlineText({ value, onCommit, placeholder, style, multiline, label }) {
  const [draft, setDraft] = useState(value ?? '')
  const [editing, setEditing] = useState(false)
  useEffect(() => setDraft(value ?? ''), [value])
  if (!editing) {
    return <span role="button" tabIndex={0} aria-label={`${label || placeholder || 'text'}: ${value || 'empty'}. Edit`}
      onClick={() => setEditing(true)} onKeyDown={onActivate(() => setEditing(true))} style={{
      cursor: 'text', display: 'inline-block', minHeight: '1em',
      color: value ? (style?.color || 'var(--ink)') : 'var(--ink-faint)',
      fontStyle: value ? 'normal' : 'italic', ...style,
    }}>{value || placeholder || '—'}</span>
  }
  const Tag = multiline ? 'textarea' : 'input'
  return <Tag autoFocus value={draft} aria-label={label || placeholder}
    onChange={e => setDraft(e.target.value)}
    onBlur={() => { setEditing(false); if (draft !== value) onCommit(draft) }}
    onKeyDown={e => { if (e.key === 'Enter' && !multiline) e.target.blur(); if (e.key === 'Escape') { setDraft(value ?? ''); setEditing(false) }}}
    placeholder={placeholder}
    rows={multiline ? 3 : undefined}
    style={{
      ...style, background: 'var(--bg-soft)', border: '1px solid var(--rule)',
      borderRadius: 4, padding: '4px 6px', width: '100%',
      fontFamily: 'inherit', fontSize: 'inherit', fontWeight: 'inherit',
      resize: multiline ? 'vertical' : 'none', color: 'var(--ink)',
    }}
  />
}

export function WeightSlider({ value, original, onChange, hue, ghostMark, height = 22, thumbSize = 14, label }) {
  const trackRef = useRef(null)
  const [dragging, setDragging] = useState(false)
  const color = hue != null ? `oklch(0.58 0.16 ${hue})` : 'var(--ink)'
  const move = useCallback(cx => {
    if (!trackRef.current) return
    const r = trackRef.current.getBoundingClientRect()
    const t = Math.max(0, Math.min(1, (cx - r.left) / r.width))
    onChange(Math.round(t * 20) / 2)
  }, [onChange])
  useEffect(() => {
    if (!dragging) return
    const m = e => move(e.clientX)
    const u = () => setDragging(false)
    window.addEventListener('pointermove', m)
    window.addEventListener('pointerup', u)
    return () => { window.removeEventListener('pointermove', m); window.removeEventListener('pointerup', u) }
  }, [dragging, move])
  const showGhost = ghostMark && original != null && Math.abs(original - value) > 0.01
  return (
    <div ref={trackRef} role="slider" tabIndex={0} aria-label={label}
      aria-valuemin={0} aria-valuemax={10} aria-valuenow={value} aria-valuetext={`weight ${fmtWeight(value)} of 10`}
      onKeyDown={e => { const next = sliderKey(e.key, value); if (next !== undefined) { e.preventDefault(); onChange(next) } }}
      onPointerDown={e => { setDragging(true); move(e.clientX) }}
      style={{ position: 'relative', height, cursor: 'pointer', touchAction: 'none', userSelect: 'none', borderRadius: 4 }}>
      <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: 3, marginTop: -1.5, background: 'var(--bg-inset)', border: '1px solid var(--rule)', borderRadius: 2 }} />
      <div style={{ position: 'absolute', top: '50%', left: 0, marginTop: -1.5, width: `${(value / 10) * 100}%`, height: 3, background: color, borderRadius: 2, transition: dragging ? 'none' : 'width 180ms' }} />
      {showGhost && <div style={{ position: 'absolute', top: 4, left: `calc(${(original / 10) * 100}% - 1px)`, width: 2, height: height - 8, background: 'var(--ink-faint)', opacity: 0.5 }} />}
      <div style={{ position: 'absolute', top: `calc(50% - ${thumbSize / 2}px)`, left: `calc(${(value / 10) * 100}% - ${thumbSize / 2}px)`, width: thumbSize, height: thumbSize, background: color, borderRadius: 4, boxShadow: dragging ? `0 0 0 4px color-mix(in oklch, ${color} 25%, transparent)` : 'none', transition: dragging ? 'none' : 'left 180ms' }} />
    </div>
  )
}

export function RawInput({ value, onChange, unit, type, options, label }) {
  const [draft, setDraft] = useState(value ?? '')
  useEffect(() => setDraft(value ?? ''), [value])
  if (type === 'categorical' && options?.length) {
    return (
      <select value={value ?? ''} aria-label={label} onChange={e => onChange(e.target.value || null)}
        style={{ width: '100%', padding: '4px 6px', fontSize: 12, border: '1px solid var(--rule)', borderRadius: 4, background: 'var(--bg)', appearance: 'none', color: 'var(--ink)' }}>
        <option value="">—</option>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    )
  }
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
      <input type="text" value={draft} aria-label={label} onChange={e => setDraft(e.target.value)}
        onBlur={() => draft !== value && onChange(draft || null)}
        onKeyDown={e => { if (e.key === 'Enter') e.target.blur() }}
        placeholder="raw evidence"
        style={{ width: '100%', padding: '4px 6px', fontFamily: 'Geist Mono, ui-monospace, monospace', fontSize: 11, border: '1px solid var(--rule)', borderRadius: 4, color: 'var(--ink-soft)' }}
      />
      {unit && <span className="label" style={{ flexShrink: 0 }}>{unit}</span>}
    </div>
  )
}
