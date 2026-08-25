import { useState, useEffect, useCallback } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { Footer } from '../components/Layout'
import { AshokaChakra } from '../components/Layout'
import api from '../services/api'
import { useTripWebSocket } from '../hooks/useTripWebSocket'

/* ── Category → icon mapping ─────────────────────────────────────────── */
const CATEGORY_ICON = {
  sightseeing: 'explore',
  culture:     'museum',
  food:        'restaurant',
  dining:      'restaurant',
  relaxation:  'spa',
  nature:      'park',
  transit:     'train',
  shopping:    'shopping_bag',
  default:     'place',
}
const CATEGORY_COLOR = {
  sightseeing: '#FF9933',
  culture:     '#C6A84B',
  food:        '#FF9933',
  dining:      '#FF9933',
  relaxation:  '#138808',
  nature:      '#138808',
  transit:     '#000080',
  shopping:    '#C6A84B',
  default:     '#887364',
}

/* ── Disruption types ────────────────────────────────────────────────── */
const DISRUPTION_TYPES = [
  { value: 'weather',       label: '🌧️ Bad Weather' },
  { value: 'venue_closure', label: '🚫 Venue Closed' },
  { value: 'delay',         label: '⏱️ Delay / Traffic' },
  { value: 'fatigue',       label: '😴 Fatigue' },
  { value: 'budget',        label: '💸 Budget Change' },
  { value: 'custom',        label: '⚙️ Custom' },
]

export default function ItineraryPage() {
  const [searchParams] = useSearchParams()
  const tripId = searchParams.get('tripId')

  const [tripDetail, setTripDetail]     = useState(null)
  const [loading, setLoading]           = useState(true)
  const [error, setError]               = useState(null)
  const [feedItems, setFeedItems]       = useState([])
  const [replanning, setReplanning]     = useState(false)
  const [replanError, setReplanError]   = useState(null)

  /* Disruption form */
  const [showDisruptionForm, setShowDisruptionForm] = useState(false)
  const [disruptionType, setDisruptionType]         = useState('weather')
  const [disruptionDesc, setDisruptionDesc]         = useState('')
  const [disruptionDay,  setDisruptionDay]          = useState(1)

  /* ── Fetch trip detail ─────────────────────────────────────────────── */
  const fetchTrip = useCallback(async () => {
    if (!tripId) return
    try {
      setLoading(true)
      setError(null)
      const data = await api.getTripDetail(tripId)
      setTripDetail(data)

      // Seed feed with any existing disruption history
      if (data.disruptions && data.disruptions.length > 0) {
        const historyItems = data.disruptions.map(d => ({
          type: 'success',
          icon: 'auto_awesome',
          color: '#138808',
          title: `${d.disruption_type.toUpperCase().replace('_', ' ')} REPLANNED`,
          time: new Date(d.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          msg: d.replan_explanation || d.impact_summary || 'Itinerary was replanned.',
        }))
        setFeedItems(historyItems)
      }
    } catch (err) {
      console.error('Failed to fetch trip:', err)
      if (err.status === 404 || err.message.includes('Trip not found') || err.message.includes('404')) {
        setError(`Trip #${tripId} not found. Please create a new trip.`)
      } else if (err.message.includes('Failed to fetch') || err.message.includes('NetworkError')) {
        setError('Cannot connect to the server. Please make sure the backend is running.')
      } else {
        setError(err.message || 'Failed to load itinerary.')
      }
    } finally {
      setLoading(false)
    }
  }, [tripId])

  useEffect(() => {
    if (tripId) {
      fetchTrip()
    } else {
      setLoading(false)
      setError('No trip selected. Please create a trip from the home page.')
    }
  }, [tripId, fetchTrip])

  /* ── WebSocket live updates ────────────────────────────────────────── */
  const handleWebSocketEvent = useCallback((event) => {
    if (event.event === 'itinerary_replanned') {
      setFeedItems(prev => [{
        type: 'success',
        icon: 'sync',
        color: '#138808',
        title: 'LIVE REPLAN RECEIVED',
        time: 'Just now',
        msg: event.explanation || 'Itinerary was dynamically replanned.',
        changes: event.changes_summary || [],
      }, ...prev])
      // Reload fresh itinerary data
      fetchTrip()
    } else if (event.event === 'pong') {
      // Keep-alive pong — ignore silently
    }
  }, [fetchTrip])

  const { connected } = useTripWebSocket(tripId ? parseInt(tripId) : null, handleWebSocketEvent)

  /* ── Manual replan ─────────────────────────────────────────────────── */
  const handleReplan = async (e) => {
    e.preventDefault()
    if (replanning || !tripId) return
    setReplanning(true)
    setReplanError(null)

    try {
      const result = await api.replanTrip(tripId, {
        disruption_type: disruptionType,
        description: disruptionDesc || `Disruption: ${disruptionType}`,
        affected_day: disruptionDay || null,
      })

      // Add to feed
      setFeedItems(prev => [{
        type: 'success',
        icon: 'auto_awesome',
        color: '#138808',
        title: 'ITINERARY REPLANNED',
        time: 'Just now',
        msg: result.explanation || 'Itinerary successfully updated.',
        changes: result.changes_summary || [],
      }, ...prev])

      // Reload fresh data
      await fetchTrip()
      setShowDisruptionForm(false)
      setDisruptionDesc('')
    } catch (err) {
      console.error('Replan failed:', err)
      setReplanError(err.message || 'Replanning failed. Please try again.')
    } finally {
      setReplanning(false)
    }
  }

  /* ── Derived stats ─────────────────────────────────────────────────── */
  const totalDays      = tripDetail?.total_days || 0
  const totalCost      = tripDetail?.total_estimated_cost || 0
  const budgetUsedPct  = tripDetail ? Math.min(100, Math.round((totalCost / tripDetail.budget) * 100)) : 0

  /* ── Render helpers ────────────────────────────────────────────────── */
  if (loading) {
    return (
      <div className="page-content" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '80vh', gap: 20 }}>
        <div style={{ position: 'relative' }}>
          <AshokaChakra size={100} opacity={0.7} />
        </div>
        <p style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 22, color: 'var(--primary)' }}>
          Loading your itinerary…
        </p>
        <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: 'var(--outline)' }}>
          Trip #{tripId}
        </p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="page-content" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '80vh', gap: 20, padding: '40px' }}>
        <span className="material-symbols-outlined" style={{ fontSize: 56, color: 'var(--error)' }}>error_outline</span>
        <h2 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 28, color: 'var(--error)', textAlign: 'center' }}>
          {error}
        </h2>
        <Link to="/" className="btn-cta" style={{ padding: '14px 32px', borderRadius: 12, fontSize: 16, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <span className="material-symbols-outlined" style={{ fontSize: 20 }}>arrow_back</span>
          Plan a New Trip
        </Link>
      </div>
    )
  }

  if (!tripDetail) return null

  const trip = tripDetail
  const days = trip.days || []

  return (
    <>
      <div className="page-content" style={{ background: '#F4F4F4' }}>
        <main style={{ padding: '32px 40px 80px', maxWidth: 1280, margin: '0 auto' }}>

          {/* ── Hero banner ── */}
          <header style={{
            borderRadius: 16, overflow: 'hidden',
            height: 280, position: 'relative', marginBottom: 28,
            background: 'linear-gradient(135deg, #1a0f07 0%, #3d2010 100%)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
          }}>
            <div style={{
              position: 'absolute', inset: 0,
              background: 'linear-gradient(to top, rgba(35,26,19,0.9) 0%, rgba(35,26,19,0.2) 100%)',
            }} />
            {/* Background Chakra watermark */}
            <div style={{ position: 'absolute', top: '50%', right: '-60px', transform: 'translateY(-50%)', pointerEvents: 'none', opacity: 0.06 }}>
              <AshokaChakra size={320} opacity={1} />
            </div>
            <div style={{
              position: 'absolute', bottom: 0, left: 0, right: 0,
              padding: '24px 32px',
              display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end',
            }}>
              <div>
                <span style={{
                  display: 'inline-block', padding: '4px 14px',
                  background: 'rgba(255,153,51,0.25)', border: '1px solid rgba(255,153,51,0.5)',
                  borderRadius: 999, fontSize: 11, fontWeight: 700,
                  color: '#FF9933', letterSpacing: '0.1em', textTransform: 'uppercase',
                  marginBottom: 10,
                }}>{totalDays}-Day Journey</span>
                <h1 style={{
                  fontFamily: 'Cormorant Garamond, serif',
                  fontSize: 40, fontWeight: 700, color: '#fff',
                  textShadow: '0 2px 8px rgba(0,0,0,0.4)', lineHeight: 1.15,
                }}>{trip.destination}</h1>
                <p style={{
                  fontFamily: 'JetBrains Mono, monospace',
                  fontSize: 13, color: 'rgba(255,255,255,0.75)', marginTop: 8,
                  display: 'flex', alignItems: 'center', gap: 6,
                }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 16 }}>calendar_month</span>
                  {trip.start_date} – {trip.end_date}
                </p>
              </div>
              {/* Live/WS status indicator */}
              <div className="neo-raised" style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '8px 20px', borderRadius: 999,
              }}>
                <span style={{
                  width: 10, height: 10, borderRadius: '50%',
                  background: connected ? '#138808' : '#FF9933',
                  display: 'inline-block',
                  boxShadow: connected ? '0 0 0 3px rgba(19,136,8,0.25)' : '0 0 0 3px rgba(255,153,51,0.25)',
                  animation: 'ping 1.4s ease-in-out infinite',
                }} />
                <span style={{
                  fontFamily: 'JetBrains Mono, monospace',
                  fontSize: 11, fontWeight: 700,
                  color: connected ? '#138808' : '#FF9933',
                  letterSpacing: '0.1em', textTransform: 'uppercase',
                }}>{connected ? 'LIVE: CONNECTED' : 'LIVE: RECONNECTING'}</span>
              </div>
            </div>
          </header>

          {/* ── Stats tiles ── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 18, marginBottom: 28 }}>
            {[
              { icon: 'calendar_view_week',      color: '#FF9933', label: 'TOTAL DAYS',       value: `${totalDays} Days` },
              { icon: 'account_balance_wallet',  color: '#C6A84B', label: 'ESTIMATED COST',   value: `₹${totalCost.toLocaleString('en-IN')}` },
              { icon: 'savings',                 color: '#000080', label: 'BUDGET',           value: `₹${Number(trip.budget).toLocaleString('en-IN')}` },
              { icon: 'auto_awesome',            color: '#138808', label: 'AI ADJUSTMENTS',  value: `${trip.disruptions?.length || 0} Replans`, spin: true },
            ].map(t => (
              <div key={t.label} className="neo-raised" style={{
                padding: '20px', borderRadius: 14,
                display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center',
              }}>
                <div style={{
                  width: 48, height: 48, borderRadius: '50%',
                  background: `${t.color}18`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 10,
                }}>
                  <span className={`material-symbols-outlined ${t.spin ? 'spin-fast' : ''}`}
                    style={{ color: t.color, fontSize: 24 }}>{t.icon}</span>
                </div>
                <span style={{
                  fontFamily: 'JetBrains Mono, monospace',
                  fontSize: 10, fontWeight: 700, color: 'var(--on-surface-variant)',
                  letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4,
                }}>{t.label}</span>
                <span style={{
                  fontFamily: 'JetBrains Mono, monospace',
                  fontSize: 15, fontWeight: 700, color: 'var(--on-surface)',
                }}>{t.value}</span>
              </div>
            ))}
          </div>

          {/* ── Main grid ── */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 24 }}>

            {/* Left: Timeline */}
            <div>
              <h2 style={{
                fontFamily: 'Cormorant Garamond, serif',
                fontSize: 28, fontWeight: 600, color: 'var(--on-surface)',
                marginBottom: 24,
              }}>Itinerary Timeline</h2>

              {days.length === 0 ? (
                <div className="neo-raised" style={{ borderRadius: 16, padding: '40px', textAlign: 'center' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 48, color: 'var(--outline)', marginBottom: 16, display: 'block' }}>calendar_today</span>
                  <p style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 22, color: 'var(--on-surface-variant)' }}>
                    No activities yet
                  </p>
                  <p style={{ fontSize: 14, color: 'var(--outline)', marginTop: 8 }}>
                    The itinerary is being generated. Please wait or refresh.
                  </p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20, position: 'relative' }}>
                  {days.map((day, di) => (
                    <DayCard key={day.day_number} day={day} isLast={di === days.length - 1} />
                  ))}
                </div>
              )}
            </div>

            {/* Right: AI Sidebar */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

              {/* Budget progress */}
              <div className="glass-surface" style={{ borderRadius: 16, padding: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span className="material-symbols-outlined" style={{ color: '#C6A84B' }}>account_balance_wallet</span>
                    <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, fontWeight: 700, color: 'var(--on-surface-variant)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>BUDGET TRACKER</span>
                  </div>
                  <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, fontWeight: 700, color: budgetUsedPct > 90 ? 'var(--error)' : 'var(--primary)' }}>
                    {budgetUsedPct}% used
                  </span>
                </div>
                <div style={{ height: 8, borderRadius: 999, background: 'rgba(143,78,0,0.1)', overflow: 'hidden' }}>
                  <div style={{
                    height: '100%',
                    width: `${budgetUsedPct}%`,
                    borderRadius: 999,
                    background: budgetUsedPct > 90 ? 'var(--error)' : budgetUsedPct > 70 ? '#FF9933' : '#138808',
                    transition: 'width 0.5s ease',
                  }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
                  <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: 'var(--outline)' }}>₹{totalCost.toLocaleString('en-IN')} est.</span>
                  <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: 'var(--outline)' }}>₹{Number(trip.budget).toLocaleString('en-IN')} budget</span>
                </div>
              </div>

              {/* Chakra AI Feed */}
              <div className="glass-surface" style={{ borderRadius: 16, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                <div style={{
                  padding: '16px 20px',
                  borderBottom: '1px solid rgba(143,78,0,0.12)',
                  display: 'flex', alignItems: 'center', gap: 10,
                  background: 'rgba(255,248,245,0.6)',
                }}>
                  <div className="chakra-pulse" style={{
                    width: 32, height: 32, borderRadius: '50%',
                    background: 'rgba(198,168,75,0.12)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <AshokaChakra size={22} opacity={1} />
                  </div>
                  <span style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 18, fontWeight: 600, color: '#000080', flex: 1 }}>
                    Chakra Intelligence Feed
                  </span>
                  <span style={{
                    width: 8, height: 8, borderRadius: '50%',
                    background: connected ? '#138808' : '#FF9933',
                    display: 'inline-block',
                    boxShadow: connected ? '0 0 0 3px rgba(19,136,8,0.25)' : '0 0 0 3px rgba(255,153,51,0.25)',
                  }} />
                </div>

                <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 12, maxHeight: 400, overflowY: 'auto' }}>
                  {feedItems.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '20px', color: 'var(--outline)' }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 32, display: 'block', marginBottom: 8 }}>notifications_none</span>
                      <p style={{ fontSize: 13 }}>No alerts yet. Your trip is running smoothly!</p>
                    </div>
                  ) : (
                    feedItems.map((item, i) => (
                      <div key={i} className={`neo-raised alert-${item.type === 'warning' ? 'saffron' : item.type === 'success' ? 'green' : 'blue'}`}
                        style={{ borderRadius: 10, padding: '14px' }}>
                        <div style={{ display: 'flex', gap: 10 }}>
                          <span className="material-symbols-outlined" style={{ color: item.color, fontSize: 20, marginTop: 2 }}>{item.icon}</span>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                              <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, fontWeight: 700, color: item.color, letterSpacing: '0.08em' }}>{item.title}</span>
                              <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: 'var(--on-surface-variant)' }}>{item.time}</span>
                            </div>
                            <p style={{ fontSize: 13, color: 'var(--on-surface)', lineHeight: 1.5 }}>{item.msg}</p>
                            {item.changes && item.changes.length > 0 && (
                              <ul style={{ marginTop: 8, paddingLeft: 16 }}>
                                {item.changes.map((c, ci) => (
                                  <li key={ci} style={{ fontSize: 12, color: 'var(--on-surface-variant)', lineHeight: 1.5 }}>{c}</li>
                                ))}
                              </ul>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Disruption form */}
                {showDisruptionForm && (
                  <form onSubmit={handleReplan} style={{ padding: '0 16px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div style={{ borderTop: '1px solid rgba(143,78,0,0.12)', paddingTop: 14 }}>
                      <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, fontWeight: 700, color: 'var(--on-surface-variant)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
                        Report Disruption
                      </p>
                      <select
                        value={disruptionType}
                        onChange={e => setDisruptionType(e.target.value)}
                        style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid rgba(143,78,0,0.2)', fontSize: 13, background: 'var(--surface)', color: 'var(--on-surface)', marginBottom: 8 }}
                      >
                        {DISRUPTION_TYPES.map(dt => (
                          <option key={dt.value} value={dt.value}>{dt.label}</option>
                        ))}
                      </select>
                      <input
                        type="text"
                        placeholder="Describe the disruption…"
                        value={disruptionDesc}
                        onChange={e => setDisruptionDesc(e.target.value)}
                        style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid rgba(143,78,0,0.2)', fontSize: 13, background: 'var(--surface)', color: 'var(--on-surface)', marginBottom: 8 }}
                      />
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                        <label style={{ fontSize: 12, color: 'var(--on-surface-variant)', whiteSpace: 'nowrap' }}>Affected Day:</label>
                        <input
                          type="number"
                          min={1}
                          max={totalDays || 99}
                          value={disruptionDay}
                          onChange={e => setDisruptionDay(parseInt(e.target.value))}
                          style={{ flex: 1, padding: '8px 12px', borderRadius: 8, border: '1px solid rgba(143,78,0,0.2)', fontSize: 13, background: 'var(--surface)', color: 'var(--on-surface)' }}
                        />
                      </div>
                      {replanError && (
                        <p style={{ fontSize: 12, color: 'var(--error)', marginBottom: 8 }}>{replanError}</p>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button type="button" onClick={() => { setShowDisruptionForm(false); setReplanError(null) }}
                        className="neo-raised"
                        style={{ flex: 1, padding: '10px', borderRadius: 8, border: 'none', fontSize: 13, cursor: 'pointer', color: 'var(--on-surface-variant)' }}>
                        Cancel
                      </button>
                      <button type="submit" disabled={replanning} className="btn-cta"
                        style={{ flex: 2, padding: '10px', borderRadius: 8, fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                        {replanning ? (
                          <><span className="material-symbols-outlined spin-fast" style={{ fontSize: 16 }}>sync</span>Replanning…</>
                        ) : (
                          <><span className="material-symbols-outlined" style={{ fontSize: 16 }}>auto_fix_high</span>Replan Now</>
                        )}
                      </button>
                    </div>
                  </form>
                )}

                {/* Action buttons */}
                <div style={{ padding: '0 16px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <button className="btn-cta" style={{
                    width: '100%', padding: '14px', borderRadius: 10, fontSize: 15,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  }} onClick={() => { setShowDisruptionForm(v => !v); setReplanError(null) }}>
                    <span className={`material-symbols-outlined ${replanning ? 'spin-fast' : ''}`} style={{ fontSize: 20 }}>sync</span>
                    {showDisruptionForm ? 'Hide Form' : 'Replan My Trip'}
                  </button>
                  <Link to="/" className="neo-raised" style={{
                    width: '100%', padding: '14px', borderRadius: 10, fontSize: 15, fontWeight: 700,
                    border: '2px solid #000080', color: '#000080', background: 'transparent',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    textDecoration: 'none',
                  }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 20 }}>add_circle</span>
                    New Trip
                  </Link>
                </div>
              </div>

              {/* Trip info card */}
              <div className="glass-surface" style={{ borderRadius: 16, padding: 20 }}>
                <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, fontWeight: 700, color: 'var(--on-surface-variant)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 14 }}>Trip Details</p>
                {[
                  { icon: 'location_on', label: 'Destination', value: trip.destination },
                  { icon: 'speed', label: 'Pace', value: trip.pace.charAt(0).toUpperCase() + trip.pace.slice(1) },
                  { icon: 'interests', label: 'Interests', value: (trip.interests || []).join(', ') || 'General' },
                ].map(info => (
                  <div key={info.label} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 12 }}>
                    <span className="material-symbols-outlined" style={{ color: 'var(--primary)', fontSize: 18, marginTop: 2, flexShrink: 0 }}>{info.icon}</span>
                    <div>
                      <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: 'var(--outline)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{info.label}</div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--on-surface)', marginTop: 2 }}>{info.value}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </main>
      </div>
      <Footer />
    </>
  )
}

function DayCard({ day, isLast }) {
  const [expanded, setExpanded] = useState(true)
  const today = new Date().toISOString().split('T')[0]
  const isToday = day.date === today
  const isActive = isToday
  const isCompleted = day.date && day.date < today

  return (
    <div className="flag-border" style={{
      borderRadius: 16, padding: 1,
      transform: isActive ? 'scale(1.01)' : '',
      boxShadow: isActive ? '0 8px 28px rgba(19,136,8,0.12)' : undefined,
    }}>
      <div className={isActive ? '' : 'glass-surface'} style={{
        borderRadius: 15, padding: '24px',
        background: isActive ? 'var(--surface)' : undefined,
        border: isActive ? '1px solid rgba(19,136,8,0.2)' : undefined,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
          <div>
            <h3 style={{
              fontFamily: 'Cormorant Garamond, serif',
              fontSize: 24, fontWeight: 600, color: 'var(--on-surface)',
            }}>Day {day.day_number}: {day.theme || `Exploring`}</h3>
            <p style={{
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: 12, fontWeight: 700, marginTop: 4,
              color: isActive ? '#138808' : 'var(--on-surface-variant)',
            }}>{isToday ? 'TODAY • ' : ''}{day.date || ''}</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{
              padding: '5px 14px', borderRadius: 999, fontSize: 11, fontWeight: 700,
              fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.06em',
              display: 'flex', alignItems: 'center', gap: 6,
              ...(isCompleted
                ? { background: 'rgba(19,136,8,0.1)', color: '#138808', border: '1px solid rgba(19,136,8,0.3)' }
                : isActive
                ? { background: 'rgba(255,153,51,0.1)', color: '#FF9933', border: '1px solid rgba(255,153,51,0.3)' }
                : { background: 'rgba(143,115,100,0.1)', color: 'var(--outline)', border: '1px solid var(--outline-variant)' }
              ),
            }}>
              <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
                {isCompleted ? 'check_circle' : isActive ? 'directions_walk' : 'schedule'}
              </span>
              {isCompleted ? 'Completed' : isActive ? 'In Progress' : 'Upcoming'}
            </span>
            <button onClick={() => setExpanded(v => !v)} style={{
              width: 32, height: 32, borderRadius: '50%', border: 'none', cursor: 'pointer',
              background: 'rgba(143,78,0,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <span className="material-symbols-outlined" style={{ fontSize: 18, color: 'var(--outline)' }}>
                {expanded ? 'expand_less' : 'expand_more'}
              </span>
            </button>
          </div>
        </div>

        {expanded && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 4 }}>
            {(day.activities || []).map((act) => (
              <ActivityRow key={act.id} act={act} />
            ))}
            {(!day.activities || day.activities.length === 0) && (
              <p style={{ fontSize: 13, color: 'var(--outline)', fontStyle: 'italic', padding: '8px 0' }}>No activities for this day yet.</p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function ActivityRow({ act }) {
  const icon  = CATEGORY_ICON[act.category] || CATEGORY_ICON.default
  const color = CATEGORY_COLOR[act.category] || CATEGORY_COLOR.default
  const isReplaced = act.status === 'replaced'
  const isAdjusted = act.status === 'adjusted'
  const isCancelled = act.status === 'cancelled'

  return (
    <div className="neo-inset" style={{
      borderRadius: 10, padding: '14px',
      display: 'flex', alignItems: 'center', gap: 14,
      opacity: isCancelled ? 0.45 : 1,
      borderLeft: isReplaced ? '4px solid #138808' : isAdjusted ? '4px solid #FF9933' : undefined,
    }}>
      <div style={{
        width: 36, height: 36, borderRadius: 8, flexShrink: 0,
        background: `${color}18`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '2px 2px 6px rgba(0,0,0,0.06)',
      }}>
        <span className="material-symbols-outlined" style={{ color, fontSize: 20 }}>{icon}</span>
      </div>
      <div style={{ flex: 1 }}>
        <div style={{
          fontWeight: 600, fontSize: 14, color: 'var(--on-surface)',
          textDecoration: isCancelled ? 'line-through' : 'none',
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          {act.title}
          {(isReplaced || isAdjusted) && (
            <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 999, background: isReplaced ? 'rgba(19,136,8,0.1)' : 'rgba(255,153,51,0.1)', color: isReplaced ? '#138808' : '#FF9933', fontFamily: 'JetBrains Mono, monospace', fontWeight: 700 }}>
              {isReplaced ? 'REPLACED' : 'ADJUSTED'}
            </span>
          )}
        </div>
        <div style={{
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: 11,
          color: 'var(--on-surface-variant)',
          marginTop: 3, display: 'flex', gap: 12, flexWrap: 'wrap',
        }}>
          <span>{act.time_slot}</span>
          {act.location && <span>📍 {act.location}</span>}
          {act.estimated_cost > 0 && <span>₹{act.estimated_cost.toLocaleString('en-IN')}</span>}
          {act.is_weather_sensitive && <span title="Weather sensitive">🌦️</span>}
        </div>
        {act.description && (
          <p style={{ fontSize: 12, color: 'var(--outline)', marginTop: 4, lineHeight: 1.5 }}>{act.description}</p>
        )}
      </div>
    </div>
  )
}
