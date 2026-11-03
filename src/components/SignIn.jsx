import { useState } from 'react'
import { supabase } from '../lib/supabase'

// =============================================================================
// SIGN IN
// =============================================================================
export function SignIn() {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const signIn = async () => {
    setBusy(true); setError(null)
    // come back to this exact page after Google; this URL must be in the
    // Supabase project's Auth > URL Configuration > Redirect URLs
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin + window.location.pathname },
    })
    if (error) { setError(error.message); setBusy(false) }
  }
  return (
    <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div className="card" style={{ width: 380, maxWidth: '100%', padding: '36px 32px', textAlign: 'center' }}>
        <div style={{ width: 52, height: 52, margin: '0 auto', background: 'linear-gradient(135deg, var(--accent), var(--accent-2))', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 28, borderRadius: 13, boxShadow: 'var(--shadow-sm)' }}>Σ</div>
        <h1 style={{ fontSize: 24, fontWeight: 600, letterSpacing: '-0.02em', margin: '18px 0 6px' }}>Sigma</h1>
        <p style={{ fontSize: 14, color: 'var(--ink-soft)', margin: '0 0 24px', lineHeight: 1.5 }}>Sign in to see your decisions. They're private to your account.</p>
        <button className="btn btn-primary" onClick={signIn} disabled={busy} style={{ width: '100%', justifyContent: 'center' }}>
          {busy ? 'Opening Google…' : 'Continue with Google'}
        </button>
        {error && <p role="alert" style={{ fontSize: 13, color: 'var(--neg)', margin: '14px 0 0' }}>{error}</p>}
      </div>
    </main>
  )
}
