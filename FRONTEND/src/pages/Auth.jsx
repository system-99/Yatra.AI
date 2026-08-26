import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { getStoredAuth, saveAuth } from '../services/api'
import { supabase, userForApp } from '../auth/supabase'

export default function AuthPage({ onAuth }) {
  const navigate = useNavigate()
  const [mode, setMode] = useState('login')
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const session = getStoredAuth()
    if (session?.token) {
      navigate('/', { replace: true })
    }
  }, [navigate])

  const handleChange = (event) => {
    const { name, value } = event.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')

    if (!form.email || !form.password || (mode === 'register' && !form.name)) {
      setError('Please fill in all required fields.')
      return
    }

    if (form.password.length < 8) {
      setError('Password must be at least 8 characters long.')
      return
    }

    try {
      setLoading(true)
      const result = mode === 'register'
        ? await supabase.auth.signUp({
            email: form.email.trim(),
            password: form.password,
            options: { data: { name: form.name.trim() } },
          })
        : await supabase.auth.signInWithPassword({ email: form.email.trim(), password: form.password })

      if (result.error) throw result.error
      if (!result.data.session) {
        setError('Account created. Check your email to verify your account, then sign in.')
        setMode('login')
        return
      }

      const appUser = userForApp(result.data.user)
      saveAuth({ token: result.data.session.access_token, user: appUser })
      onAuth?.(appUser)
      navigate('/', { replace: true })
    } catch (err) {
      setError(err.message || 'Authentication failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: 'calc(100vh - 80px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 20px', background: '#f4f4f4' }}>
      <div className="glass-panel flag-border" style={{ width: '100%', maxWidth: 480, borderRadius: 24, padding: 28 }}>
        <div style={{ marginBottom: 24, textAlign: 'center' }}>
          <div style={{ fontSize: 12, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#8f4e00', fontWeight: 700 }}>YATRA.AI</div>
          <h1 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 42, color: '#8f4e00', marginTop: 6 }}>
            {mode === 'login' ? 'Welcome back' : 'Create account'}
          </h1>
        </div>

        {error && (
          <div style={{ marginBottom: 16, padding: '12px 14px', borderRadius: 12, background: 'rgba(186,26,26,0.08)', border: '1px solid rgba(186,26,26,0.25)', color: '#ba1a1a', fontSize: 14 }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {mode === 'register' && (
            <div>
              <label style={{ display: 'block', marginBottom: 8, fontSize: 12, fontWeight: 700, color: '#554336', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Full name</label>
              <input
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder="Aarav Patel"
                style={inputStyle}
              />
            </div>
          )}

          <div>
            <label style={{ display: 'block', marginBottom: 8, fontSize: 12, fontWeight: 700, color: '#554336', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Email</label>
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              placeholder="you@example.com"
              style={inputStyle}
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: 8, fontSize: 12, fontWeight: 700, color: '#554336', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Password</label>
            <input
              type="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              placeholder="Minimum 8 characters"
              style={inputStyle}
            />
          </div>

          <button type="submit" className="btn-cta" style={{ height: 52, borderRadius: 14, fontSize: 16 }} disabled={loading}>
            {loading ? 'Please wait...' : mode === 'login' ? 'Sign In' : 'Create account'}
          </button>
        </form>

        <div style={{ marginTop: 20, textAlign: 'center', fontSize: 14, color: '#554336' }}>
          {mode === 'login' ? "Don't have an account?" : 'Already have an account?'}{' '}
          <button
            type="button"
            onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
            style={{ border: 'none', background: 'none', color: '#8f4e00', fontWeight: 700, cursor: 'pointer' }}
          >
            {mode === 'login' ? 'Sign up' : 'Login'}
          </button>
        </div>

        <div style={{ marginTop: 18, textAlign: 'center' }}>
          <Link to="/" style={{ color: '#554336', fontSize: 14, textDecoration: 'none' }}>← Back to home</Link>
        </div>
      </div>
    </div>
  )
}

const inputStyle = {
  width: '100%',
  padding: '14px 16px',
  borderRadius: 12,
  border: '1px solid rgba(143,78,0,0.2)',
  background: '#fff8f5',
  fontSize: 16,
  color: '#231a13',
  outline: 'none',
}
