import { useEffect, useRef, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { AshokaChakra, Footer } from '../components/Layout'
import api, { getStoredAuth } from '../services/api'

/* ── Frame sequence config ──────────────────────────────────────────── */
const FRAME_COUNT  = 208          // frames 001 → 208
const FRAME_START  = 1
const SCROLL_HEIGHT = '600vh'     // total sticky scroll distance

function frameSrc(n) {
  return `/frames/ezgif-frame-${String(n).padStart(3, '0')}.jpg`
}

/* ── Scroll-phase text content ──────────────────────────────────────── */
const PHASES = [
  {
    headline: 'Discover India, Reimagined',
    body: 'Experience the subcontinent through the lens of advanced AI. A hyper-personalized journey curated just for you.',
    badges: null,
  },
  {
    headline: 'Your Journey, Dynamically Replanned',
    body: 'Disruption ahead? Flight delayed? We rebuild your perfect itinerary in seconds — powered by Gemini AI.',
    badges: null,
  },
  {
    headline: 'Real-Time Disruption Intelligence',
    body: 'Live WebSocket feeds monitor your trip 24/7. From missed trains to sudden closures — YATRA.AI acts instantly.',
    badges: ['🤖 LLM Powered', '⚡ WebSocket Live', '🗺️ Smart Routing', '🔔 Instant Alerts'],
  },
  {
    headline: 'Plan Once. Adapt Forever.',
    body: 'Whether exploring Kolkata\'s colonial grandeur or tracking a train from Jaipur — YATRA.AI is your personal AI co-pilot.',
    badges: null,
  },
  {
    headline: 'Your Next Adventure Begins Here',
    body: 'Tell us where you want to go.\nWe\'ll handle the rest.',
    badges: null,
    typewriter: true,
  },
]

/* ── Suggestion chips ────────────────────────────────────────────────── */
const CHIPS = [
  '🏔️ Hill Stations', '🏖️ Beaches', '🕌 Heritage Sites',
  '🚂 Train Journey', '🌿 Nature & Wildlife', '🎭 Cultural Experience',
  '🏙️ City Breaks', '🛕 Temple Circuits', '🍛 Food Trail',
]

const PLACEHOLDERS = [
  'Plan a 5-day trip to Rajasthan with heritage stays and desert safaris...',
  'Weekend trip from Kolkata to Darjeeling, budget ₹8000 per person...',
  'Family-friendly itinerary for Kerala backwaters, 7 days...',
  'Solo backpacking through Northeast India — Meghalaya, Sikkim, Arunachal...',
]

/* ── Interest categories mapped from chips ─────────────────────────── */
const CHIP_TO_INTEREST = {
  '🏔️ Hill Stations':      'nature',
  '🏖️ Beaches':            'nature',
  '🕌 Heritage Sites':     'culture',
  '🚂 Train Journey':      'sightseeing',
  '🌿 Nature & Wildlife':  'nature',
  '🎭 Cultural Experience':'culture',
  '🏙️ City Breaks':        'sightseeing',
  '🛕 Temple Circuits':    'culture',
  '🍛 Food Trail':         'food',
}

/* ── Helper: today + N days ─────────────────────────────────────────── */
function dateOffset(days) {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString().split('T')[0]
}

export default function HomePage({ user }) {
  const navigate = useNavigate()

  /* canvas scroll state */
  const canvasRef      = useRef(null)
  const imagesRef      = useRef([])
  const loadedRef      = useRef(0)
  const [activePhase,  setActivePhase]  = useState(0)
  const [activeChips,  setActiveChips]  = useState([])
  const [phaseVisible, setPhaseVisible] = useState(true)
  const prevPhaseRef   = useRef(0)
  const heroRef        = useRef(null)

  /* trip form state */
  const [showForm,     setShowForm]     = useState(false)
  const [loading,      setLoading]      = useState(false)
  const [error,        setError]        = useState(null)
  const [tripForm,     setTripForm]     = useState({
    destination: '',
    start_date: dateOffset(7),
    end_date: dateOffset(12),
    budget: 15000,
    pace: 'moderate',
  })

  /* ── Pre-load all frames ─────────────────────────────────────────── */
  useEffect(() => {
    const imgs = []
    for (let i = 0; i < FRAME_COUNT; i++) {
      const img = new Image()
      img.src = frameSrc(FRAME_START + i)
      img.onload = () => { loadedRef.current++ }
      imgs.push(img)
    }
    imagesRef.current = imgs
  }, [])

  /* ── Draw frame to canvas ─────────────────────────────────────────── */
  const drawFrame = useCallback((idx) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const img = imagesRef.current[idx]
    if (!img || !img.complete) return
    const ctx = canvas.getContext('2d')
    const dpr = window.devicePixelRatio || 1
    const displayW = canvas.offsetWidth
    const displayH = canvas.offsetHeight
    canvas.width  = displayW * dpr
    canvas.height = displayH * dpr
    canvas.style.width  = displayW + 'px'
    canvas.style.height = displayH + 'px'
    ctx.scale(dpr, dpr)
    const scale = Math.max(displayW / img.naturalWidth, displayH / img.naturalHeight)
    const sw = img.naturalWidth * scale
    const sh = img.naturalHeight * scale
    const sx = (displayW - sw) / 2
    const sy = (displayH - sh) / 2
    ctx.drawImage(img, sx, sy, sw, sh)
  }, [])

  /* ── Scroll handler ───────────────────────────────────────────────── */
  useEffect(() => {
    let animFrame
    const onScroll = () => {
      cancelAnimationFrame(animFrame)
      animFrame = requestAnimationFrame(() => {
        const hero = heroRef.current
        if (!hero) return
        const rect   = hero.getBoundingClientRect()
        const ratio  = Math.max(0, Math.min(1, -rect.top / (rect.height - window.innerHeight)))
        const frameIdx = Math.min(FRAME_COUNT - 1, Math.floor(ratio * FRAME_COUNT))
        drawFrame(frameIdx)
        const phaseIdx = Math.min(PHASES.length - 1, Math.floor(ratio * PHASES.length))
        if (phaseIdx !== prevPhaseRef.current) {
          prevPhaseRef.current = phaseIdx
          setPhaseVisible(false)
          setTimeout(() => {
            setActivePhase(phaseIdx)
            setPhaseVisible(true)
          }, 220)
        }
      })
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => { window.removeEventListener('scroll', onScroll); cancelAnimationFrame(animFrame) }
  }, [drawFrame])



  /* ── Draw first frame on mount ───────────────────────────────────── */
  useEffect(() => {
    const img = new Image()
    img.src = frameSrc(FRAME_START)
    img.onload = () => drawFrame(0)
    imagesRef.current[0] = img
  }, [drawFrame])

  /* ── Chip toggle ──────────────────────────────────────────────────── */
  const toggleChip = (chip) =>
    setActiveChips(prev =>
      prev.includes(chip) ? prev.filter(c => c !== chip) : [...prev, chip]
    )

  /* ── Open form ────────────────────────────────────────────────────── */
  const openForm = () => {
    if (!user) {
      navigate('/auth')
      return
    }
    setShowForm(true)
    setError(null)
  }

  /* ── Submit trip to backend ───────────────────────────────────────── */
  const handleSubmit = async (e) => {
    e.preventDefault()
    if (loading) return
    setError(null)

    const session = getStoredAuth()
    if (!session?.token) {
      navigate('/auth')
      return
    }

    // Validate required fields
    if (!tripForm.destination || tripForm.destination.trim().length < 2) {
      setError('Please enter a valid destination (at least 2 characters).')
      return
    }
    if (new Date(tripForm.end_date) < new Date(tripForm.start_date)) {
      setError('End date cannot be earlier than start date.')
      return
    }
    if (tripForm.budget <= 0) {
      setError('Budget must be a positive number.')
      return
    }

    // Build interests from active chips
    const interests = [...new Set(
      activeChips.map(c => CHIP_TO_INTEREST[c] || 'sightseeing')
    )]

    const tripPayload = {
      destination: tripForm.destination.trim(),
      start_date: tripForm.start_date,
      end_date: tripForm.end_date,
      budget: parseFloat(tripForm.budget),
      interests: interests.length > 0 ? interests : ['sightseeing'],
      pace: tripForm.pace,
    }

    try {
      setLoading(true)

      // Step 1: Create trip
      const createdTrip = await api.createTrip(tripPayload)
      const tripId = createdTrip.id

      // Step 2: Generate itinerary
      await api.generateItinerary(tripId)

      // Step 3: Navigate to itinerary page
      navigate(`/itinerary?tripId=${tripId}`)
    } catch (err) {
      console.error('Trip creation failed:', err)
      if (err.message.includes('Failed to fetch') || err.message.includes('NetworkError')) {
        setError('Cannot connect to the server. Please make sure the backend is running.')
      } else {
        setError(err.message || 'Something went wrong. Please try again.')
      }
      setLoading(false)
    }
  }

  const phase = PHASES[activePhase]

  return (
    <>
      {/* ════ HERO SCROLL SECTION ════ */}
      <section ref={heroRef} style={{ height: SCROLL_HEIGHT, position: 'relative' }}>
        <div style={{
          position: 'sticky', top: 0, height: '100vh',
          overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <canvas
            ref={canvasRef}
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
          />
          <div style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(to bottom, rgba(35,26,19,0.25) 0%, rgba(35,26,19,0.55) 100%)',
          }} />
          <div style={{
            position: 'absolute', top: '50%', left: '50%',
            transform: 'translate(-50%,-50%)',
            pointerEvents: 'none', zIndex: 1,
          }}>
            <AshokaChakra size={Math.min(window.innerWidth * 0.6, 700)} opacity={0.08} />
          </div>

          <div
            className="glass-panel flag-border"
            style={{
              position: 'relative', zIndex: 10,
              maxWidth: 680, width: '90%', padding: '44px 48px',
              borderRadius: 24, textAlign: 'center',
              transition: 'opacity 0.3s ease, transform 0.3s ease',
              opacity: phaseVisible ? 1 : 0,
              transform: phaseVisible ? 'translateY(0)' : 'translateY(24px)',
            }}
          >
            <h1 style={{
              fontFamily: 'Cormorant Garamond, serif',
              fontSize: activePhase === 0 ? 58 : 46,
              fontWeight: 700, lineHeight: 1.1,
              color: '#FF9933',
              marginBottom: 18,
              textShadow: '0 2px 12px rgba(0,0,0,0.18)',
              letterSpacing: '-0.01em',
            }}>
              {phase.headline}
            </h1>

            <p style={{
              fontFamily: 'Plus Jakarta Sans, sans-serif',
              fontSize: 18, lineHeight: 1.7,
              color: 'rgba(255,255,255,0.92)',
              maxWidth: 520, margin: '0 auto',
              whiteSpace: 'pre-line',
            }}>
              {phase.body}
            </p>

            {phase.badges && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'center', marginTop: 24 }}>
                {phase.badges.map(b => (
                  <span key={b} style={{
                    padding: '7px 18px', borderRadius: 999,
                    background: 'rgba(255,255,255,0.18)',
                    border: '1px solid rgba(255,255,255,0.35)',
                    backdropFilter: 'blur(8px)',
                    fontSize: 13, fontWeight: 600,
                    color: '#fff', letterSpacing: '0.03em',
                  }}>{b}</span>
                ))}
              </div>
            )}

            {activePhase === 0 && (
              <div style={{ marginTop: 32, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                <div style={{
                  width: 1, height: 40,
                  background: 'linear-gradient(to bottom, rgba(255,153,51,0.8), transparent)',
                }}/>
                <span className="bounce-anim" style={{
                  fontSize: 28, color: '#FF9933', display: 'block',
                }}>⌄</span>
                <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                  Scroll to explore
                </span>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ════ AI PROMPT SECTION ════ */}
      <section style={{
        minHeight: '100vh', padding: '80px 40px',
        position: 'relative', zIndex: 30,
        background: '#F4F4F4',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: `url(${frameSrc(208)})`,
          backgroundSize: 'cover', backgroundPosition: 'center',
          opacity: 0.08, filter: 'blur(6px)',
          pointerEvents: 'none',
        }} />

        <div style={{ maxWidth: 780, width: '100%', position: 'relative', zIndex: 2 }}>
          <div className="neo-surface flag-border" style={{
            borderRadius: 28, padding: '52px 48px',
            overflow: 'hidden', position: 'relative',
          }}>
            <div style={{
              position: 'absolute', top: 0, left: 0, right: 0, height: 100,
              background: 'rgba(255,248,245,0.5)', backdropFilter: 'blur(12px)',
              borderBottom: '1px solid rgba(255,255,255,0.6)',
            }} />

            <div style={{ position: 'relative', zIndex: 2 }}>
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 28 }}>
                <div style={{
                  width: 48, height: 48, borderRadius: '50%',
                  background: 'rgba(255,153,51,0.15)',
                  border: '1.5px solid rgba(255,153,51,0.4)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <AshokaChakra size={28} opacity={1} />
                </div>
                <div>
                  <h2 style={{
                    fontFamily: 'Cormorant Garamond, serif',
                    fontSize: 34, fontWeight: 700,
                    color: 'var(--primary)',
                  }}>Plan Your Perfect Journey</h2>
                  <p style={{ fontSize: 14, color: 'var(--on-surface-variant)', marginTop: 2 }}>
                    Describe your dream trip — destination, dates, preferences, or anything
                  </p>
                </div>
              </div>

              {/* Error Banner */}
              {error && (
                <div style={{
                  marginBottom: 18, padding: '14px 18px', borderRadius: 12,
                  background: 'rgba(186,26,26,0.08)',
                  border: '1px solid rgba(186,26,26,0.25)',
                  display: 'flex', alignItems: 'flex-start', gap: 10,
                }}>
                  <span className="material-symbols-outlined" style={{ color: 'var(--error)', fontSize: 20, flexShrink: 0, marginTop: 1 }}>error</span>
                  <p style={{ fontSize: 14, color: 'var(--error)', margin: 0, lineHeight: 1.5 }}>{error}</p>
                </div>
              )}

              {/* Textarea */}
              {!showForm && (
                <div style={{
                  display: 'flex', flexDirection: 'column',
                  alignItems: 'center', padding: '40px 0 20px',
                }}>
                  <button
                    className="btn-calligraphy"
                    onClick={openForm}
                  >
                    <span className="btn-calligraphy__shimmer" />
                    <span className="btn-calligraphy__text">
                      {user ? 'Generate my Itinerary' : 'Login to Plan'}
                    </span>
                  </button>
                </div>
              )}

              {/* ── Trip Details Form ── */}
              {showForm && (
                <form onSubmit={handleSubmit}>
                  <div style={{ marginBottom: 16 }}>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--on-surface-variant)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>
                      Destination *
                    </label>
                    <div className="neo-surface-inset" style={{ borderRadius: 12, overflow: 'hidden' }}>
                      <input
                        type="text"
                        required
                        minLength={2}
                        value={tripForm.destination}
                        onChange={e => setTripForm(f => ({ ...f, destination: e.target.value }))}
                        placeholder="e.g. Darjeeling, Rajasthan, Kerala"
                        style={{
                          width: '100%', padding: '14px 16px',
                          border: 'none', outline: 'none',
                          fontFamily: 'Plus Jakarta Sans, sans-serif',
                          fontSize: 16, background: 'transparent',
                          color: 'var(--on-surface)',
                        }}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 16 }}>
                    <div>
                      <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--on-surface-variant)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>
                        Start Date *
                      </label>
                      <div className="neo-surface-inset" style={{ borderRadius: 12, overflow: 'hidden' }}>
                        <input
                          type="date"
                          required
                          value={tripForm.start_date}
                          min={dateOffset(0)}
                          onChange={e => setTripForm(f => ({ ...f, start_date: e.target.value }))}
                          style={{
                            width: '100%', padding: '14px 16px',
                            border: 'none', outline: 'none',
                            fontFamily: 'JetBrains Mono, monospace',
                            fontSize: 14, background: 'transparent',
                            color: 'var(--on-surface)',
                          }}
                        />
                      </div>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--on-surface-variant)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>
                        End Date *
                      </label>
                      <div className="neo-surface-inset" style={{ borderRadius: 12, overflow: 'hidden' }}>
                        <input
                          type="date"
                          required
                          value={tripForm.end_date}
                          min={tripForm.start_date}
                          onChange={e => setTripForm(f => ({ ...f, end_date: e.target.value }))}
                          style={{
                            width: '100%', padding: '14px 16px',
                            border: 'none', outline: 'none',
                            fontFamily: 'JetBrains Mono, monospace',
                            fontSize: 14, background: 'transparent',
                            color: 'var(--on-surface)',
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 16 }}>
                    <div>
                      <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--on-surface-variant)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>
                        Budget (₹) *
                      </label>
                      <div className="neo-surface-inset" style={{ borderRadius: 12, overflow: 'hidden' }}>
                        <input
                          type="number"
                          required
                          min={100}
                          value={tripForm.budget}
                          onChange={e => setTripForm(f => ({ ...f, budget: e.target.value }))}
                          style={{
                            width: '100%', padding: '14px 16px',
                            border: 'none', outline: 'none',
                            fontFamily: 'JetBrains Mono, monospace',
                            fontSize: 14, background: 'transparent',
                            color: 'var(--on-surface)',
                          }}
                        />
                      </div>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--on-surface-variant)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>
                        Pace
                      </label>
                      <div className="neo-surface-inset" style={{ borderRadius: 12, overflow: 'hidden' }}>
                        <select
                          value={tripForm.pace}
                          onChange={e => setTripForm(f => ({ ...f, pace: e.target.value }))}
                          style={{
                            width: '100%', padding: '14px 16px',
                            border: 'none', outline: 'none',
                            fontFamily: 'Plus Jakarta Sans, sans-serif',
                            fontSize: 14, background: 'transparent',
                            color: 'var(--on-surface)', cursor: 'pointer',
                          }}
                        >
                          <option value="relaxed">😌 Relaxed</option>
                          <option value="moderate">🚶 Moderate</option>
                          <option value="fast-paced">⚡ Fast-paced</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Interests from chips */}
                  <div style={{ marginBottom: 24 }}>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--on-surface-variant)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 10 }}>
                      Interests (choose any)
                    </label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                      {CHIPS.map(chip => (
                        <button
                          key={chip}
                          type="button"
                          className={`chip ${activeChips.includes(chip) ? 'active' : ''}`}
                          onClick={() => toggleChip(chip)}
                          style={{ fontSize: 13, padding: '6px 14px' }}
                        >
                          {chip}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div style={{ borderTop: '1px solid rgba(143,78,0,0.12)', marginBottom: 20 }} />

                  <div style={{ display: 'flex', gap: 12 }}>
                    <button
                      type="button"
                      onClick={() => { setShowForm(false); setError(null) }}
                      className="neo-raised"
                      style={{
                        flex: 1, height: 54, borderRadius: 14,
                        border: '1.5px solid var(--outline-variant)',
                        background: 'none', fontSize: 15, fontWeight: 600,
                        color: 'var(--on-surface-variant)', cursor: 'pointer',
                      }}
                    >
                      ← Back
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="btn-cta"
                      style={{
                        flex: 2, height: 54,
                        borderRadius: 14, fontSize: 17,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                        opacity: loading ? 0.75 : 1,
                        cursor: loading ? 'not-allowed' : 'pointer',
                      }}
                    >
                      {loading ? (
                        <>
                          <span className="material-symbols-outlined spin-fast" style={{ fontSize: 20 }}>sync</span>
                          Generating Itinerary…
                        </>
                      ) : (
                        <>
                          <span style={{ fontSize: 20 }}>✨</span>
                          Generate My Itinerary
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}

              <p style={{
                textAlign: 'center', fontSize: 11,
                color: 'var(--on-surface-variant)', marginTop: 14,
                fontFamily: 'JetBrains Mono, monospace',
              }}>
                🔒 Powered by Gemini AI · Real-time disruption monitoring via WebSocket
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ════ FEATURES SECTION ════ */}
      <section style={{ padding: '80px 40px', background: 'var(--surface)', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: '10%', left: '50%', transform: 'translateX(-50%)', pointerEvents: 'none' }}>
          <AshokaChakra size={600} opacity={0.03} />
        </div>
        <div style={{ maxWidth: 1280, margin: '0 auto', position: 'relative', zIndex: 2 }}>
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <h2 style={{
              fontFamily: 'Cormorant Garamond, serif',
              fontSize: 48, fontWeight: 700,
              color: 'var(--primary)', marginBottom: 14,
            }}>The YATRA.AI Advantage</h2>
            <p style={{ fontSize: 18, color: 'var(--on-surface-variant)', maxWidth: 600, margin: '0 auto' }}>
              Seamlessly blending India's cultural grandeur with cutting-edge AI to deliver unparalleled travel experiences.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 28 }}>
            {[
              { icon: 'psychology',          color: '#FF9933', title: 'AI Itinerary Generator',         desc: 'Describe your trip in plain English. Get a day-by-day itinerary with hotels, activities, and dining — in seconds.' },
              { icon: 'sync',                color: '#138808', title: 'Live Disruption Replanning',     desc: 'Flight cancelled? Train delayed? We detect disruptions via WebSocket and instantly rebuild your perfect plan.' },
              { icon: 'map',                 color: '#000080', title: 'Interactive Trip Map',           desc: 'Visualize your entire journey on a live map with stops, routes, and real-time alternative paths.' },
              { icon: 'calendar_view_week',  color: '#C6A84B', title: 'Itinerary Dashboard',           desc: 'Day-wise breakdown with hotel bookings, activities, and travel segments — all in one beautiful timeline view.' },
              { icon: 'notifications_active',color: '#FF9933', title: 'Smart Disruption Alerts',       desc: 'Get push notifications for disruptions, gate changes, and weather updates before they affect your trip.' },
              { icon: 'memory',              color: '#138808', title: 'Context-Aware AI Memory',       desc: 'YATRA.AI remembers your preferences, budget, and travel style — improving every itinerary it creates for you.' },
            ].map(f => (
              <FeatureCard key={f.title} {...f} />
            ))}
          </div>
        </div>
      </section>

      {/* ════ HOW IT WORKS ════ */}
      <section style={{ padding: '80px 40px', background: '#F4F4F4' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <h2 style={{
              fontFamily: 'Cormorant Garamond, serif',
              fontSize: 48, fontWeight: 700, color: 'var(--primary)', marginBottom: 12,
            }}>How It Works</h2>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 0, position: 'relative' }}>
            <div style={{
              position: 'absolute', top: 40, left: '16.7%', right: '16.7%',
              height: 2,
              background: 'linear-gradient(90deg, #FF9933, #C6A84B, #138808)',
              borderRadius: 2, zIndex: 0,
            }} />
            {[
              { num: '01', color: '#FF9933', icon: 'edit_note', title: 'Describe Your Trip', desc: 'Type or speak your destination, dates, and preferences in plain language.' },
              { num: '02', color: '#C6A84B', icon: 'auto_awesome', title: 'AI Builds Your Plan', desc: 'Gemini AI generates a complete, personalized day-by-day itinerary in seconds.' },
              { num: '03', color: '#138808', icon: 'travel_explore', title: 'Travel Smart', desc: 'Real-time monitoring replans your trip if anything disrupts it — zero lost moments.' },
            ].map((step) => (
              <div key={step.num} style={{
                flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
                textAlign: 'center', padding: '0 24px', position: 'relative', zIndex: 1,
              }}>
                <div className="neo-raised" style={{
                  width: 80, height: 80, borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  border: `3px solid ${step.color}`,
                  marginBottom: 20,
                }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 32, color: step.color }}>{step.icon}</span>
                </div>
                <span style={{
                  fontFamily: 'JetBrains Mono, monospace',
                  fontSize: 11, fontWeight: 700, color: step.color,
                  letterSpacing: '0.1em', marginBottom: 8,
                }}>{step.num}</span>
                <h3 style={{
                  fontFamily: 'Cormorant Garamond, serif',
                  fontSize: 22, fontWeight: 600,
                  color: 'var(--on-surface)', marginBottom: 10,
                }}>{step.title}</h3>
                <p style={{ fontSize: 14, color: 'var(--on-surface-variant)', lineHeight: 1.6 }}>{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════ PARTNERS STRIP ════ */}
      <section style={{
        padding: '48px 40px',
        background: 'var(--surface)',
        borderTop: '1px solid rgba(143,78,0,0.1)',
        borderBottom: '1px solid rgba(143,78,0,0.1)',
      }}>
        <div style={{ maxWidth: 1000, margin: '0 auto', textAlign: 'center' }}>
          <p style={{
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: 11, fontWeight: 700,
            color: 'var(--on-surface-variant)',
            letterSpacing: '0.12em', textTransform: 'uppercase',
            marginBottom: 28,
          }}>Trusted Heritage Partners &amp; Featured In</p>
          <div style={{
            display: 'flex', flexWrap: 'wrap',
            justifyContent: 'center', alignItems: 'center', gap: 48,
            opacity: 0.55, filter: 'grayscale(30%)',
            transition: 'opacity 0.4s',
          }}
            onMouseEnter={e => e.currentTarget.style.opacity = '1'}
            onMouseLeave={e => e.currentTarget.style.opacity = '0.55'}
          >
            {['🏛️ Incredible India', '✈️ Air India', '🏨 Taj Hotels', '🚂 IRCTC Premium'].map(p => (
              <span key={p} style={{
                fontFamily: 'Cormorant Garamond, serif',
                fontSize: 20, fontWeight: 700, color: 'var(--on-surface)',
              }}>{p}</span>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </>
  )
}

function FeatureCard({ icon, color, title, desc }) {
  const [hov, setHov] = useState(false)
  return (
    <div
      className="glass-panel-light flag-border"
      style={{
        borderRadius: 20, padding: '32px 28px',
        transition: 'transform 0.2s, box-shadow 0.2s',
        transform: hov ? 'translateY(-6px)' : '',
        boxShadow: hov ? '0 20px 40px rgba(0,0,0,0.1)' : undefined,
        cursor: 'default',
      }}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
    >
      <div style={{
        width: 56, height: 56, borderRadius: '50%',
        background: `${color}18`,
        border: `1.5px solid ${color}44`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginBottom: 20,
      }}>
        <span className="material-symbols-outlined" style={{ color, fontSize: 28 }}>{icon}</span>
      </div>
      <h3 style={{
        fontFamily: 'Cormorant Garamond, serif',
        fontSize: 22, fontWeight: 600,
        color: 'var(--on-surface)', marginBottom: 10,
      }}>{title}</h3>
      <p style={{ fontSize: 15, color: 'var(--on-surface-variant)', lineHeight: 1.65 }}>{desc}</p>
      <div style={{
        marginTop: 20, height: 2, borderRadius: 2,
        background: `linear-gradient(90deg, ${color}, transparent)`,
        opacity: hov ? 1 : 0.4, transition: 'opacity 0.2s',
      }} />
    </div>
  )
}
