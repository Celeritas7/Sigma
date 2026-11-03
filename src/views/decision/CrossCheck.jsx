import { useState, useRef } from 'react'
import { Pill } from '../../components/atoms'
import { supabase } from '../../lib/supabase'

// AI cross-check — asks Claude to challenge the user's rating given the
// parameter, option, raw evidence, and current score. Inline popover.
//
// The cross-check Edge Function builds the prompt itself from the ids, reading
// the rows with the signed-in user's token, so it only works on the user's own
// decisions and can't be used as a general Claude proxy.
export async function askClaude(optionId, parameterId) {
  const { data, error } = await supabase.functions.invoke('cross-check', {
    body: { option_id: optionId, parameter_id: parameterId },
  })
  if (error) {
    let detail = error.message
    try { detail = (await error.context.json()).error || detail } catch {}
    throw new Error(`cross-check: ${detail}`)
  }
  return data?.text || ''
}

export function CrossCheck({ param, option, score }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [response, setResponse] = useState('')
  const [error, setError] = useState(null)
  const btnRef = useRef(null)
  const [pos, setPos] = useState({ top: 0, left: 0 })

  const ask = async () => {
    setLoading(true); setError(null); setResponse('')
    try {
      const text = await askClaude(option.id, param.id)
      setResponse(text)
    } catch (e) {
      setError(e?.message || String(e))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ position: 'relative' }}>
      <button ref={btnRef} aria-expanded={open} aria-label={`cross-check ${param.name} score for ${option.name}`} onClick={() => {
          const next = !open
          if (next && btnRef.current) {
            const r = btnRef.current.getBoundingClientRect()
            setPos({ top: Math.min(r.bottom + 6, window.innerHeight - 320), left: Math.max(8, Math.min(r.left, window.innerWidth - 336)) })
          }
          setOpen(next)
          if (next && !response && !loading) ask()
        }}
        disabled={score?.value == null}
        title={score?.value == null ? 'set a score first' : 'cross-check this rating'}
        style={{
          background: 'transparent', border: '1px solid var(--rule)', borderRadius: 4,
          padding: '2px 7px', fontSize: 10, color: 'var(--ink-soft)',
          display: 'inline-flex', alignItems: 'center', gap: 4, fontFamily: 'Geist Mono, monospace',
          letterSpacing: '0.04em', textTransform: 'uppercase',
          opacity: score?.value == null ? 0.3 : 1,
        }}>
        <span style={{ fontSize: 9 }} aria-hidden="true">◇</span> cross-check
      </button>
      {open && (
        <div role="dialog" aria-label={`Cross-check: ${param.name}`} aria-live="polite"
          onKeyDown={e => { if (e.key === 'Escape') { setOpen(false); btnRef.current?.focus() } }}
          style={{
          position: 'fixed', top: pos.top, left: pos.left, zIndex: 60,
          width: 320, padding: '14px 16px',
          background: 'var(--bg)', border: '1px solid var(--hi)', borderRadius: 6,
          boxShadow: '0 14px 30px rgba(0,0,0,0.18)',
        }}
        onClick={e => e.stopPropagation()}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <Pill color="var(--hi)">cross-check · {param.name}</Pill>
            <button onClick={() => setOpen(false)} className="iconbtn" aria-label="Close cross-check" style={{ width: 20, height: 20, fontSize: 12 }}>×</button>
          </div>
          {loading && <div style={{ fontSize: 12, color: 'var(--ink-soft)', fontStyle: 'italic' }}>thinking…</div>}
          {error && <div style={{ fontSize: 12, color: 'var(--neg)' }}>{error}</div>}
          {response && (
            <div style={{ fontSize: 12.5, lineHeight: 1.55, color: 'var(--ink)', whiteSpace: 'pre-wrap' }}>{response}</div>
          )}
          {response && (
            <button onClick={() => { setResponse(''); ask() }}
              style={{ marginTop: 10, background: 'transparent', border: '1px solid var(--rule)', borderRadius: 4, padding: '4px 8px', fontSize: 10, color: 'var(--ink-soft)', fontFamily: 'Geist Mono, monospace', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
              ↻ ask again
            </button>
          )}
        </div>
      )}
    </div>
  )
}
