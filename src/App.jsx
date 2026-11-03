import { useState, useEffect, useRef } from 'react'
import { TopHeader } from './components/Header'
import { SignIn } from './components/SignIn'
import { completeness } from './lib/scoring'
import { supabase, supabaseInitError } from './lib/supabase'
import { ACCENT_OPTIONS, applyAccent, kindEmoji } from './lib/theme'
import { BlindOverlay } from './views/Blind'
import { Home } from './views/Home'
import { WhatIfOverlay } from './views/WhatIf'
import { DecisionView } from './views/decision/DecisionView'

// =============================================================================
// APP
// =============================================================================
export function App() {
  const [decisions, setDecisions] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [decisionData, setDecisionData] = useState({ parameters: [], options: [], scores: [] })
  const [loading, setLoading] = useState(true)
  const [configError, setConfigError] = useState(false)
  const [loadError, setLoadError] = useState(null)
  const [saveError, setSaveError] = useState(null)
  const detailReq = useRef(0)
  // dataRef always holds the latest decisionData, so async handlers never act
  // on a stale copy. Update both through patchData.
  const dataRef = useRef(decisionData)
  const selectedRef = useRef(selectedId)
  selectedRef.current = selectedId
  // cell key -> promise of the first insert for that score cell
  const scoreInserts = useRef(new Map())
  const [mode, setMode] = useState(null)

  function patchData(fn) {
    dataRef.current = fn(dataRef.current)
    setDecisionData(dataRef.current)
  }

  // Run a Supabase write. On failure, tell the user and reload from the
  // database so the screen doesn't keep showing a change that wasn't saved.
  async function save(what, query) {
    let res
    try { res = await query } catch (e) { res = { error: e } }
    if (!res.error) return res
    setSaveError(`Couldn't save ${what}: ${res.error.message || res.error}`)
    loadDecisions()
    if (selectedRef.current) loadDecisionDetail(selectedRef.current)
    return null
  }

  useEffect(() => {
    if (!saveError) return
    const t = setTimeout(() => setSaveError(null), 8000)
    return () => clearTimeout(t)
  }, [saveError])

  useEffect(() => {
    const accent = localStorage.getItem('sigma_accent') || 'green'
    const a = ACCENT_OPTIONS.find(x => x.name === accent) || ACCENT_OPTIONS[0]
    applyAccent(a.hue)
  }, [])

  // undefined while the stored session is being read, null when signed out
  const [session, setSession] = useState(undefined)
  const userId = session?.user?.id

  useEffect(() => {
    if (supabaseInitError) { setConfigError(true); setLoading(false); return }
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => setSession(s))
    return () => sub.subscription.unsubscribe()
  }, [])

  // token refreshes keep the same user id, so this only runs on sign-in/out
  useEffect(() => {
    if (userId) { loadDecisions(); return }
    setDecisions([]); setSelectedId(null); setMode(null)
    patchData(() => ({ parameters: [], options: [], scores: [] }))
  }, [userId])

  useEffect(() => {
    if (selectedId) loadDecisionDetail(selectedId)
  }, [selectedId])

  async function loadDecisions() {
    setLoading(true)
    const { data: decs, error } = await supabase.from('sigma_decisions').select('*')
      .neq('status', 'archived').order('updated_at', { ascending: false })
    if (error) { setLoadError(error.message); setDecisions([]); setLoading(false); return }
    setLoadError(null)
    if (!decs || decs.length === 0) { setDecisions([]); setLoading(false); return }
    const ids = decs.map(d => d.id)
    const [pRes, oRes, sRes] = await Promise.all([
      supabase.from('sigma_parameters').select('*').in('decision_id', ids).order('display_order'),
      supabase.from('sigma_options').select('*').in('decision_id', ids).order('display_order'),
      supabase.from('sigma_scores').select('*, sigma_options!inner(decision_id)').in('sigma_options.decision_id', ids),
    ])
    const enriched = decs.map(d => ({
      ...d,
      _parameters: (pRes.data || []).filter(p => p.decision_id === d.id),
      _options:    (oRes.data || []).filter(o => o.decision_id === d.id),
      _scores:     (sRes.data || []).filter(s => s.sigma_options?.decision_id === d.id),
    }))
    setDecisions(enriched)
    setLoading(false)
  }

  async function loadDecisionDetail(id) {
    const token = ++detailReq.current
    const [pRes, oRes, sRes] = await Promise.all([
      supabase.from('sigma_parameters').select('*').eq('decision_id', id).order('display_order'),
      supabase.from('sigma_options').select('*').eq('decision_id', id).order('display_order'),
      supabase.from('sigma_scores').select('*, sigma_options!inner(decision_id)').eq('sigma_options.decision_id', id),
    ])
    if (detailReq.current !== token) return
    patchData(() => ({ parameters: pRes.data || [], options: oRes.data || [], scores: sRes.data || [] }))
  }

  async function createDecision() {
    const res = await save('the new decision', supabase.from('sigma_decisions').insert({ title: '', type: 'custom', status: 'active' }).select().single())
    if (res?.data) {
      setDecisions(ds => [{ ...res.data, _parameters: [], _options: [], _scores: [] }, ...ds])
      setSelectedId(res.data.id)
      patchData(() => ({ parameters: [], options: [], scores: [] }))
    }
  }

  async function updateDecisionTitle(title) {
    setDecisions(ds => ds.map(d => d.id === selectedId ? { ...d, title } : d))
    await save('the title', supabase.from('sigma_decisions').update({ title }).eq('id', selectedId))
  }

  async function setDecisionStatus(id, status) {
    setDecisions(ds => ds.map(d => d.id === id ? { ...d, status } : d))
    await save('the decision status', supabase.from('sigma_decisions').update({ status }).eq('id', id))
  }

  async function deleteDecision(id) {
    setDecisions(ds => ds.filter(d => d.id !== id))
    if (selectedId === id) { setSelectedId(null); setMode(null) }
    await save('the archive', supabase.from('sigma_decisions').update({ status: 'archived' }).eq('id', id))
  }

  async function addParameter(name) {
    const res = await save('the consideration', supabase.from('sigma_parameters')
      .insert({ decision_id: selectedId, name, weight: 5.0, display_order: dataRef.current.parameters.length, input_type: 'text' })
      .select().single())
    if (res?.data) patchData(d => ({ ...d, parameters: [...d.parameters, res.data] }))
  }

  async function updateParameter(id, fields) {
    patchData(d => ({ ...d, parameters: d.parameters.map(p => p.id === id ? { ...p, ...fields } : p) }))
    await save('the consideration', supabase.from('sigma_parameters').update(fields).eq('id', id))
  }

  async function deleteParameter(id) {
    const p = dataRef.current.parameters.find(x => x.id === id)
    const n = dataRef.current.scores.filter(s => s.parameter_id === id).length
    if (!confirm(`Delete "${p?.name || 'this consideration'}"${n ? ` and its ${n} score${n === 1 ? '' : 's'}` : ''}? This can't be undone.`)) return
    patchData(d => ({ ...d, parameters: d.parameters.filter(p => p.id !== id), scores: d.scores.filter(s => s.parameter_id !== id) }))
    await save('the deletion', supabase.from('sigma_parameters').delete().eq('id', id))
  }

  async function addOption(name) {
    const res = await save('the option', supabase.from('sigma_options')
      .insert({ decision_id: selectedId, name, display_order: dataRef.current.options.length })
      .select().single())
    if (res?.data) patchData(d => ({ ...d, options: [...d.options, res.data] }))
  }

  async function updateOption(id, fields) {
    patchData(d => ({ ...d, options: d.options.map(o => o.id === id ? { ...o, ...fields } : o) }))
    await save('the option', supabase.from('sigma_options').update(fields).eq('id', id))
  }

  async function deleteOption(id) {
    const o = dataRef.current.options.find(x => x.id === id)
    const n = dataRef.current.scores.filter(s => s.option_id === id).length
    if (!confirm(`Delete "${o?.name || 'this option'}"${n ? ` and its ${n} score${n === 1 ? '' : 's'}` : ''}? This can't be undone.`)) return
    patchData(d => ({ ...d, options: d.options.filter(o => o.id !== id), scores: d.scores.filter(s => s.option_id !== id) }))
    await save('the deletion', supabase.from('sigma_options').delete().eq('id', id))
  }

  async function updateScore(optionId, parameterId, updates) {
    const key = optionId + ':' + parameterId
    // The first save of a cell is an insert. Changes made while it's in
    // flight wait for it, then apply to the new row instead of being dropped.
    while (scoreInserts.current.has(key)) await scoreInserts.current.get(key)
    const existing = dataRef.current.scores.find(s => s.option_id === optionId && s.parameter_id === parameterId)
    if (existing) {
      const merged = { ...existing, ...updates }
      if (merged.value == null && (!merged.notes || merged.notes === '')) {
        patchData(d => ({ ...d, scores: d.scores.filter(s => s.id !== existing.id) }))
        await save('the score', supabase.from('sigma_scores').delete().eq('id', existing.id))
        return
      }
      patchData(d => ({ ...d, scores: d.scores.map(s => s.id === existing.id ? merged : s) }))
      await save('the score', supabase.from('sigma_scores').update(updates).eq('id', existing.id))
      return
    }
    if (updates.value == null && (!updates.notes || updates.notes === '')) return
    // show the value straight away under a placeholder id; swap in the real row when the insert returns
    const tempId = 'pending:' + key
    patchData(d => ({ ...d, scores: [...d.scores, { id: tempId, option_id: optionId, parameter_id: parameterId, value: null, notes: null, ...updates }] }))
    const insert = save('the score', supabase.from('sigma_scores')
      .insert({ option_id: optionId, parameter_id: parameterId, ...updates }).select().single())
      .then(res => {
        patchData(d => ({ ...d, scores: res?.data
          ? d.scores.map(s => s.id === tempId ? res.data : s)
          : d.scores.filter(s => s.id !== tempId) }))
        scoreInserts.current.delete(key)
      })
    scoreInserts.current.set(key, insert)
    await insert
  }

  function goHome() { setSelectedId(null); setMode(null); loadDecisions() }
  const selectedDecision = decisions.find(d => d.id === selectedId)

  async function signOut() {
    const { error } = await supabase.auth.signOut()
    if (error) setSaveError(`Couldn't sign out: ${error.message}`)
  }

  if (configError) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 32 }}>
        <div style={{ maxWidth: 480 }}>
          <div style={{ fontSize: 40, color: 'var(--accent-text)' }}>Σ</div>
          <p className="label">configuration required</p>
          <p style={{ fontSize: 14, lineHeight: 1.6 }}>Supabase config error: {supabaseInitError}</p>
        </div>
      </div>
    )
  }

  if (session === undefined) {
    return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span className="label">loading…</span></div>
  }
  if (!session) return <SignIn />

  return (
    <div style={{ minHeight: '100vh' }}>
      <TopHeader
        middle={selectedDecision
          ? <span className="label" style={{ color: 'rgba(255,255,255,0.75)' }}>{kindEmoji(selectedDecision.type, selectedDecision.title)} {selectedDecision.type || 'custom'} · {completeness(decisionData.parameters, decisionData.options, decisionData.scores).filled}/{completeness(decisionData.parameters, decisionData.options, decisionData.scores).total} considered</span>
          : <span className="label" style={{ color: 'rgba(255,255,255,0.55)' }}>HOME</span>
        }
        onHome={goHome}
        onNew={createDecision}
        email={session.user.email}
        onSignOut={signOut}
      />

      {selectedId === null ? (
        <Home decisions={decisions} onOpen={setSelectedId} onNew={createDecision} loading={loading} loadError={loadError} onRetry={loadDecisions} onDelete={deleteDecision} onReopen={id => setDecisionStatus(id, 'active')} />
      ) : selectedDecision ? (
        <DecisionView
          decision={selectedDecision}
          data={decisionData}
          onBack={goHome}
          onTitleUpdate={updateDecisionTitle}
          paramHandlers={{ onAdd: addParameter, onUpdate: updateParameter, onDelete: deleteParameter }}
          optionHandlers={{ onAdd: addOption, onUpdate: updateOption, onDelete: deleteOption }}
          onScoreUpdate={updateScore}
          onOpenMode={setMode}
          onStatusChange={s => setDecisionStatus(selectedId, s)}
          onDelete={() => deleteDecision(selectedId)}
        />
      ) : (
        <div style={{ padding: '40px 28px' }}><span className="label">loading…</span></div>
      )}

      {selectedId && mode === 'whatif' && <WhatIfOverlay data={decisionData} onClose={() => setMode(null)} />}
      {selectedId && mode === 'blind'  && <BlindOverlay  data={decisionData} onScoreUpdate={updateScore} onClose={() => setMode(null)} />}

      {saveError && (
        <div role="alert" style={{ position: 'fixed', bottom: 20, left: '50%', transform: 'translateX(-50%)', zIndex: 70, maxWidth: 'calc(100vw - 32px)', display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px 10px 16px', background: 'var(--neg-soft)', border: '1px solid var(--neg)', borderRadius: 10, boxShadow: 'var(--shadow-md)', animation: 'popin 200ms' }}>
          <span style={{ fontSize: 13, color: 'var(--neg)' }}>{saveError}. Reloaded the saved data.</span>
          <button className="iconbtn" aria-label="dismiss" onClick={() => setSaveError(null)} style={{ color: 'var(--neg)' }}>×</button>
        </div>
      )}

      <footer style={{ borderTop: '1px solid var(--rule)', padding: '14px 28px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span className="label">Σ Sigma · v0.5 trajectory</span>
        <span className="label">decisions, decomposed</span>
      </footer>
    </div>
  )
}
