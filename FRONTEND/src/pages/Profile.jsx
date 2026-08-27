import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Footer } from '../components/Layout'
import api, { getStoredAuth, saveAuth } from '../services/api'
import { supabase, userForApp } from '../auth/supabase'

const JOURNEYS = [
  { icon: 'temple_hindu', color: '#FF9933', title: 'Rajasthan Royal Tour',     meta: 'OCT 2023 • 14 DAYS' },
  { icon: 'forest',       color: '#138808', title: 'Kerala Backwaters Retreat', meta: 'JAN 2024 • 7 DAYS' },
  { icon: 'location_city',color: '#000080', title: 'Tokyo Tech Exploratory',    meta: 'MAR 2024 • 10 DAYS' },
]

const NAV_ITEMS = [
  { icon: 'fingerprint',    label: 'My Identity' },
  { icon: 'security',       label: 'Security' },
]

export default function ProfilePage({ user }) {
  const navigate = useNavigate()
  const sessionUser = getStoredAuth()?.user || user
  const profileUser = useMemo(() => ({
    name: sessionUser?.name || 'Traveler',
    email: sessionUser?.email || 'traveler@example.com',
    avatar_url: sessionUser?.avatar_url || '',
  }), [sessionUser])

  const [profileForm, setProfileForm] = useState({
    name: profileUser.name,
    email: profileUser.email,
    avatar_url: profileUser.avatar_url,
  })
  const [statusMessage, setStatusMessage] = useState('')
  const [activeNav, setActiveNav] = useState(0)
  const [toggles, setToggles] = useState({ ws: true, auto: false, share: true })
  const toggle = (k) => setToggles(p => ({ ...p, [k]: !p[k] }))
  const [trips, setTrips] = useState([])

  const [passwordForm, setPasswordForm] = useState({ new: '', confirm: '' })
  const [passwordMessage, setPasswordMessage] = useState('')

  const handlePasswordUpdate = async () => {
    if (passwordForm.new !== passwordForm.confirm) {
      setPasswordMessage('Passwords do not match.')
      return
    }
    if (passwordForm.new.length < 6) {
      setPasswordMessage('Password must be at least 6 characters.')
      return
    }
    try {
      setPasswordMessage('')
      const { error } = await supabase.auth.updateUser({
        password: passwordForm.new
      })
      if (error) throw error
      setPasswordMessage('Password updated successfully.')
      setPasswordForm({ new: '', confirm: '' })
    } catch (err) {
      setPasswordMessage(`Error: ${err.message}`)
    }
  }

  useEffect(() => {
    api.listTrips().then(setTrips).catch(console.error)
  }, [])

  useEffect(() => {
    setProfileForm({
      name: profileUser.name,
      email: profileUser.email,
      avatar_url: profileUser.avatar_url,
    })
  }, [profileUser.name, profileUser.email, profileUser.avatar_url])

  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (event) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        const MAX_SIZE = 150
        let width = img.width
        let height = img.height
        if (width > height) {
          if (width > MAX_SIZE) {
            height *= MAX_SIZE / width
            width = MAX_SIZE
          }
        } else {
          if (height > MAX_SIZE) {
            width *= MAX_SIZE / height
            height = MAX_SIZE
          }
        }
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0, width, height)
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8)
        setProfileForm(prev => ({ ...prev, avatar_url: dataUrl }))
      }
      img.src = event.target.result
    }
    reader.readAsDataURL(file)
  }

  const handleProfileUpdate = async () => {
    const nextName = profileForm.name.trim() || 'Traveler'
    const nextEmail = profileForm.email.trim() || 'traveler@example.com'
    try {
      setStatusMessage('')
      const { data, error } = await supabase.auth.updateUser({
        email: nextEmail,
        data: { name: nextName, avatar_url: profileForm.avatar_url },
      })
      if (error) throw error
      const updatedUser = userForApp(data.user)
      const currentSession = getStoredAuth() || {}
      const nextSession = { ...currentSession, user: updatedUser }

      saveAuth(nextSession)
      window.dispatchEvent(new Event('yatra-auth-changed'))
      setStatusMessage('Profile updated successfully.')
    } catch (err) {
      setStatusMessage(`Error: ${err.message}`)
    }
  }

  return (
    <>
      <div className="page-content" style={{ background: '#F4F4F4' }}>
        <main style={{
          padding: '32px 40px 80px', maxWidth: 1280, margin: '0 auto',
          display: 'grid', gridTemplateColumns: '280px 1fr', gap: 28,
        }}>

          {}
          <aside>
            <div className="neo-raised" style={{ borderRadius: 20, padding: '28px 20px', position: 'sticky', top: 96 }}>
              {}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 28 }}>
                <div style={{ position: 'relative', marginBottom: 14 }}>
                  <input type="file" id="avatar-upload" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarChange} />
                  <label htmlFor="avatar-upload" style={{ cursor: 'pointer', display: 'block' }}>
                    <div className="neo-inset" style={{
                      width: 100, height: 100, borderRadius: '50%', padding: 4,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: '#fff', overflow: 'hidden'
                    }}>
                      {profileForm.avatar_url ? (
                        <img src={profileForm.avatar_url} alt="Profile" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                      ) : (
                        <span className="material-symbols-outlined" style={{ fontSize: 48, color: 'var(--on-surface-variant)' }}>person</span>
                      )}
                    </div>
                    <div style={{ position: 'absolute', bottom: 0, right: 0, background: 'var(--primary)', color: '#fff', borderRadius: '50%', width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 16 }}>edit</span>
                    </div>
                  </label>
                </div>

                <div style={{ width: '100%', marginBottom: 12 }}>
                  <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: 'var(--on-surface-variant)', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 4, textAlign: 'center' }}>Display Name</label>
                  <input
                    value={profileForm.name}
                    onChange={(e) => setProfileForm((prev) => ({ ...prev, name: e.target.value }))}
                    placeholder="Display Name"
                    style={{
                      width: '100%',
                      border: '1.5px solid rgba(143,78,0,0.25)',
                      borderRadius: 10,
                      padding: '10px 12px',
                      fontFamily: 'Plus Jakarta Sans, sans-serif',
                      fontSize: 16,
                      fontWeight: 600,
                      color: 'var(--on-surface)',
                      textAlign: 'center',
                      background: '#ffffff',
                      boxShadow: 'inset 2px 2px 5px rgba(0,0,0,0.03)',
                      transition: 'border-color 0.2s',
                    }}
                    onFocus={e => e.target.style.borderColor = 'var(--primary)'}
                    onBlur={e => e.target.style.borderColor = 'rgba(143,78,0,0.25)'}
                  />
                </div>
                <div style={{ width: '100%' }}>
                  <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: 'var(--on-surface-variant)', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 4, textAlign: 'center' }}>Email Address</label>
                  <input
                    value={profileForm.email}
                    onChange={(e) => setProfileForm((prev) => ({ ...prev, email: e.target.value }))}
                    placeholder="Email Address"
                    style={{
                      width: '100%',
                      border: '1.5px solid rgba(143,78,0,0.25)',
                      borderRadius: 10,
                      padding: '8px 10px',
                      fontFamily: 'JetBrains Mono, monospace',
                      fontSize: 11,
                      color: 'var(--on-surface-variant)',
                      background: '#ffffff',
                      textAlign: 'center',
                      boxShadow: 'inset 2px 2px 5px rgba(0,0,0,0.03)',
                      transition: 'border-color 0.2s',
                    }}
                    onFocus={e => e.target.style.borderColor = 'var(--primary)'}
                    onBlur={e => e.target.style.borderColor = 'rgba(143,78,0,0.25)'}
                  />
                </div>
              </div>

              {}
              <nav style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {NAV_ITEMS.map((item, i) => (
                  <button key={i} onClick={() => setActiveNav(i)} style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '12px 14px', borderRadius: 12, border: 'none', cursor: 'pointer',
                    fontFamily: 'Plus Jakarta Sans, sans-serif',
                    fontSize: 14, fontWeight: activeNav === i ? 700 : 400,
                    color: activeNav === i ? 'var(--primary)' : 'var(--on-surface-variant)',
                    ...(activeNav === i
                      ? { background: 'none', boxShadow: 'inset 3px 3px 6px #d0d0d0, inset -3px -3px 6px #fff' }
                      : { background: 'transparent' }
                    ),
                    transition: 'all 0.15s',
                  }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 20 }}>{item.icon}</span>
                    {item.label}
                  </button>
                ))}
              </nav>
            </div>
          </aside>

          {}
          <section style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {activeNav === 0 ? (
              <>
                {}
                <div className="neo-raised" style={{ borderRadius: 20, padding: '36px 36px', position: 'relative', overflow: 'hidden' }}>
                  <div style={{ position: 'absolute', top: -60, right: -60, width: 200, height: 200, background: 'rgba(255,153,51,0.08)', borderRadius: '50%', filter: 'blur(40px)' }} />
                  <div style={{ position: 'relative', zIndex: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
                    <div>
                      <h1 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 52, fontWeight: 700, color: 'var(--on-surface)', lineHeight: 1.1, marginBottom: 8 }}>Travel DNA</h1>
                      <p style={{ fontSize: 15, color: 'var(--on-surface-variant)', maxWidth: 480 }}>AI-analyzed preferences shaping your bespoke journeys. We learn from every step you take.</p>
                    </div>
                    <div className="chakra-pulse" style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      padding: '8px 18px', borderRadius: 999,
                      background: 'rgba(255,153,51,0.08)', border: '1px solid rgba(255,153,51,0.25)',
                    }}>
                      <span className="material-symbols-outlined spin-fast" style={{ color: 'var(--primary)', fontSize: 18 }}>sync</span>
                      <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 13, fontWeight: 700, color: 'var(--primary)' }}>AI Sync Active</span>
                    </div>
                  </div>

                  {}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 18, marginTop: 28 }}>
                    {[
                      { icon: 'account_balance', color: '#FF9933', title: 'Luxury Heritage', desc: 'Prefers premium stays with deep historical significance.' },
                      { icon: 'nature_people',   color: '#138808', title: 'Eco-Conscious',   desc: 'Prioritizes sustainable travel and low-carbon footprint.', tag: 'Green Tag' },
                    ].map(a => (
                      <div key={a.title} className="neo-raised" style={{ borderRadius: 14, padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                        <div className="neo-inset" style={{ width: 60, height: 60, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
                          <span className="material-symbols-outlined" style={{ color: a.color, fontSize: 28 }}>{a.icon}</span>
                        </div>
                        <h3 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 20, fontWeight: 600, color: 'var(--on-surface)', marginBottom: 6 }}>{a.title}</h3>
                        <p style={{ fontSize: 13, color: 'var(--on-surface-variant)', lineHeight: 1.55 }}>{a.desc}</p>
                        {a.tag && <span style={{ marginTop: 10, padding: '4px 14px', borderRadius: 999, border: '1px solid #138808', color: '#138808', fontSize: 11, fontWeight: 700 }}>{a.tag}</span>}
                      </div>
                    ))}

                    {}
                    <div className="neo-inset" style={{ borderRadius: 14, padding: '20px' }}>
                      <h4 style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, fontWeight: 700, color: 'var(--on-surface-variant)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 18 }}>Rhythm Analysis</h4>
                      {[
                        { label: 'Pace', value: 'Leisurely', pct: 30, color: 'var(--primary)' },
                        { label: 'Spontaneity', value: 'High', pct: 85, color: '#138808' },
                      ].map(r => (
                        <div key={r.label} style={{ marginBottom: 18 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                            <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: 'var(--on-surface)' }}>{r.label}</span>
                            <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: r.color, fontWeight: 700 }}>{r.value}</span>
                          </div>
                          <div style={{ height: 6, borderRadius: 4, background: 'rgba(143,78,0,0.1)', overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${r.pct}%`, background: r.color, borderRadius: 4 }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {}
                <div className="neo-raised" style={{ borderRadius: 20, padding: '28px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                    <h2 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 26, fontWeight: 600, color: 'var(--on-surface)' }}>My Journeys</h2>
                    <button onClick={() => navigate('/itinerary')} style={{ color: 'var(--primary)', fontWeight: 700, fontSize: 13, background: 'none', border: 'none', cursor: 'pointer' }}>View All</button>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {trips.length > 0 ? trips.map(t => (
                      <div key={t.id} className="neo-raised" onClick={() => navigate(`/itinerary?tripId=${t.id}`)} style={{
                        borderRadius: 12, padding: '14px 16px',
                        display: 'flex', alignItems: 'center', gap: 14,
                        cursor: 'pointer', transition: 'transform 0.15s',
                      }}
                        onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                        onMouseLeave={e => e.currentTarget.style.transform = ''}
                      >
                        <div style={{
                          width: 48, height: 48, borderRadius: '50%',
                          background: `rgba(255,153,51,0.15)`, border: `1.5px solid rgba(255,153,51,0.4)`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                        }}>
                          <span className="material-symbols-outlined" style={{ color: '#FF9933', fontSize: 22 }}>flight_takeoff</span>
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--on-surface)' }}>{t.destination || 'Unknown Destination'}</div>
                          <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: 'var(--on-surface-variant)', marginTop: 3 }}>
                            {t.start_date ? new Date(t.start_date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }).toUpperCase() : 'TBD'} • {t.total_days || 0} DAYS
                          </div>
                        </div>
                        <span className="material-symbols-outlined" style={{ color: 'var(--outline-variant)', fontSize: 20 }}>chevron_right</span>
                      </div>
                    )) : (
                      <div style={{ fontSize: 13, color: 'var(--on-surface-variant)', textAlign: 'center', padding: '20px 0' }}>No journeys saved yet.</div>
                    )}
                  </div>
                </div>

                {}
                <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 12 }}>
                  {statusMessage && (
                    <span style={{ fontSize: 13, color: '#138808', fontWeight: 600 }}>{statusMessage}</span>
                  )}
                  <button className="neo-raised" style={{
                    padding: '14px 36px', borderRadius: 12, border: 'none',
                    background: 'var(--primary-container)', color: '#fff',
                    fontFamily: 'Plus Jakarta Sans, sans-serif',
                    fontSize: 15, fontWeight: 700, cursor: 'pointer',
                    transition: 'transform 0.15s',
                  }}
                    onClick={handleProfileUpdate}
                    onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                    onMouseLeave={e => e.currentTarget.style.transform = ''}
                  >Update Profile</button>
                </div>
              </>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, alignItems: 'start' }}>
                <div className="neo-raised" style={{ borderRadius: 20, padding: '36px 36px' }}>
                  <h2 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 32, fontWeight: 700, color: 'var(--on-surface)', marginBottom: 24 }}>Security</h2>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                    <div>
                      <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--on-surface-variant)', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 8 }}>New Password</label>
                      <input
                        type="password"
                        value={passwordForm.new}
                        onChange={(e) => setPasswordForm((prev) => ({ ...prev, new: e.target.value }))}
                        placeholder="Enter new password"
                        style={{
                          width: '100%',
                          border: '1.5px solid rgba(143,78,0,0.25)',
                          borderRadius: 10,
                          padding: '12px 14px',
                          fontFamily: 'Plus Jakarta Sans, sans-serif',
                          fontSize: 15,
                          color: 'var(--on-surface)',
                          background: '#ffffff',
                          boxShadow: 'inset 2px 2px 5px rgba(0,0,0,0.03)',
                          transition: 'border-color 0.2s',
                        }}
                        onFocus={e => e.target.style.borderColor = 'var(--primary)'}
                        onBlur={e => e.target.style.borderColor = 'rgba(143,78,0,0.25)'}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--on-surface-variant)', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 8 }}>Confirm Password</label>
                      <input
                        type="password"
                        value={passwordForm.confirm}
                        onChange={(e) => setPasswordForm((prev) => ({ ...prev, confirm: e.target.value }))}
                        placeholder="Confirm new password"
                        style={{
                          width: '100%',
                          border: '1.5px solid rgba(143,78,0,0.25)',
                          borderRadius: 10,
                          padding: '12px 14px',
                          fontFamily: 'Plus Jakarta Sans, sans-serif',
                          fontSize: 15,
                          color: 'var(--on-surface)',
                          background: '#ffffff',
                          boxShadow: 'inset 2px 2px 5px rgba(0,0,0,0.03)',
                          transition: 'border-color 0.2s',
                        }}
                        onFocus={e => e.target.style.borderColor = 'var(--primary)'}
                        onBlur={e => e.target.style.borderColor = 'rgba(143,78,0,0.25)'}
                      />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 12 }}>
                      <button className="neo-raised" style={{
                        padding: '12px 28px', borderRadius: 12, border: 'none',
                        background: 'var(--primary)', color: '#fff',
                        fontFamily: 'Plus Jakarta Sans, sans-serif',
                        fontSize: 14, fontWeight: 700, cursor: 'pointer',
                        transition: 'transform 0.15s',
                      }}
                        onClick={handlePasswordUpdate}
                        onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                        onMouseLeave={e => e.currentTarget.style.transform = ''}
                      >Change Password</button>
                      {passwordMessage && (
                        <span style={{ fontSize: 13, color: passwordMessage.includes('Error') || passwordMessage.includes('match') || passwordMessage.includes('characters') ? '#d32f2f' : '#138808', fontWeight: 600 }}>{passwordMessage}</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="neo-raised" style={{ borderRadius: 20, padding: '28px' }}>
                  <h2 style={{
                    fontFamily: 'Cormorant Garamond, serif', fontSize: 26, fontWeight: 600,
                    color: 'var(--on-surface)', paddingBottom: 16,
                    borderBottom: '1px solid var(--outline-variant)', marginBottom: 24,
                  }}>System Dynamics</h2>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                    {[
                      { k: 'ws',   label: 'Real-time WebSocket Alerts', desc: 'Instant updates for flight changes & bookings.' },
                      { k: 'auto', label: 'Auto-optimize Itinerary',    desc: 'AI dynamically adjusts plans based on weather & traffic.' },
                      { k: 'share',label: 'Share Anonymous Data',       desc: 'Help improve the global travel AI model.' },
                    ].map(t => (
                      <div key={t.k} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--on-surface)', marginBottom: 3 }}>{t.label}</div>
                          <div style={{ fontSize: 13, color: 'var(--on-surface-variant)' }}>{t.desc}</div>
                        </div>
                        <button onClick={() => toggle(t.k)} style={{
                          width: 52, height: 28, borderRadius: 999,
                          background: toggles[t.k] ? 'var(--primary-container)' : 'var(--outline-variant)',
                          border: 'none', cursor: 'pointer', position: 'relative',
                          transition: 'background 0.2s',
                          flexShrink: 0,
                          boxShadow: 'inset 2px 2px 4px rgba(0,0,0,0.1)',
                        }}>
                          <div style={{
                            position: 'absolute', top: 4, left: toggles[t.k] ? 26 : 4,
                            width: 20, height: 20, borderRadius: '50%',
                            background: '#fff',
                            boxShadow: `2px 2px 6px rgba(0,0,0,0.2)`,
                            transition: 'left 0.2s',
                          }} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </section>
        </main>
      </div>
      <Footer />
    </>
  )
}
