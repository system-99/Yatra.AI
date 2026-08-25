import { useState, useEffect } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { Footer } from '../components/Layout'
import { AshokaChakra } from '../components/Layout'
import api from '../services/api'
import { CircleMarker, MapContainer, TileLayer, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'

const FILTERS = ['Hotels', 'Dining', 'Transit', 'Heritage', 'All']
const TOMTOM_KEY = import.meta.env.VITE_TOMTOM_API_KEY?.trim()

/* Category → filter group */
const CAT_TO_FILTER = {
  food: 'Dining',
  dining: 'Dining',
  transit: 'Transit',
  culture: 'Heritage',
  sightseeing: 'Heritage',
  nature: 'Heritage',
  relaxation: 'Hotels',
  shopping: 'Heritage',
}

export default function MapPage() {
  const [searchParams] = useSearchParams()
  const tripId = searchParams.get('tripId')

  const [filter, setFilter] = useState('All')
  const [tripDetail, setTripDetail] = useState(null)
  const [loading, setLoading] = useState(false)
  const [selectedActivity, setSelectedActivity] = useState(null)
  const [liveLocation, setLiveLocation] = useState(null)
  const [isCollapsed, setIsCollapsed] = useState(false)

  /* Browser GPS is kept local until authenticated location storage is added. */
  useEffect(() => {
    if (!navigator.geolocation) return undefined
    const watchId = navigator.geolocation.watchPosition(
      ({ coords }) => setLiveLocation({ latitude: coords.latitude, longitude: coords.longitude }),
      (error) => console.warn('Location permission/error:', error.message),
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 15000 },
    )
    return () => navigator.geolocation.clearWatch(watchId)
  }, [])

  /* Fetch trip if tripId is available */
  useEffect(() => {
    if (!tripId) return
    let cancelled = false
    setLoading(true)
    api.getTripDetail(tripId)
      .then(data => { if (!cancelled) { setTripDetail(data) } })
      .catch(err => console.warn('Map: Could not load trip data:', err.message))
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [tripId])

  /* Flatten all activities into one list for the timeline */
  const allActivities = (tripDetail?.days || []).flatMap(d =>
    (d.activities || []).map(a => ({ ...a, day_number: d.day_number, date: d.date }))
  )

  /* Apply filter */
  const filteredActivities = filter === 'All'
    ? allActivities
    : allActivities.filter(a => (CAT_TO_FILTER[a.category] || 'Heritage') === filter)

  const today = new Date().toISOString().split('T')[0]
  const todayActs = allActivities.filter(a => a.date === today)

  return (
    <>
      <div className="page-content" style={{ height: '100vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
          {/* Live TomTom map. The browser key must be VITE_TOMTOM_API_KEY. */}
          <MapContainer
            center={[20.5937, 78.9629]}
            zoom={5}
            style={{ position: 'absolute', inset: 0, zIndex: 0 }}
          >
            <TileLayer
              attribution={TOMTOM_KEY ? '&copy; TomTom' : '&copy; OpenStreetMap contributors'}
              url={TOMTOM_KEY
                ? `https://api.tomtom.com/map/1/tile/basic/main/{z}/{x}/{y}.png?key=${TOMTOM_KEY}`
                : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'}
            />
            {liveLocation && (
              <>
                <RecenterMap position={[liveLocation.latitude, liveLocation.longitude]} />
                <CircleMarker
                  center={[liveLocation.latitude, liveLocation.longitude]}
                  radius={9}
                  pathOptions={{ color: '#fff', weight: 3, fillColor: '#1877F2', fillOpacity: 1 }}
                />
              </>
            )}
          </MapContainer>



          {/* Map markers use itinerary activities when the backend provides them. */}
          {allActivities.length > 0 ? (
            allActivities.slice(0, 3).map((act, i) => {
              // Distribute markers across the screen for visual effect
              const tops = [280, 330, 430]
              const lefts = [320, 820, 1120]
              return (
                <MapMarker
                  key={act.id}
                  top={tops[i] || 280 + i * 60}
                  left={lefts[i] || 320 + i * 200}
                  label={act.title}
                  icon="place"
                  color={act.date === today ? '#138808' : '#FF9933'}
                  pulse={act.date === today}
                  onClick={() => setSelectedActivity(act)}
                />
              )
            })
          ) : null}

          {/* Left sidebar: Timeline */}
          <aside style={{
            position: 'absolute', top: 16, left: 16, bottom: 16,
            width: 320, zIndex: 10,
            display: 'flex', flexDirection: 'column', gap: 10,
            transform: isCollapsed ? 'translateX(-336px)' : 'translateX(0)',
            transition: 'transform 0.4s cubic-bezier(0.25, 1, 0.5, 1)',
          }}>
            {/* Collapse toggle button */}
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              style={{
                position: 'absolute',
                top: '50%',
                left: 320,
                width: 24,
                height: 48,
                borderRadius: '0 8px 8px 0',
                border: '1px solid rgba(143,78,0,0.12)',
                borderLeft: 'none',
                background: 'rgba(255, 248, 245, 0.95)',
                backdropFilter: 'blur(8px)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '4px 0 10px rgba(0,0,0,0.08)',
                zIndex: 11,
                transform: 'translateY(-50%)',
              }}
              title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 16, color: 'var(--primary)', fontWeight: 'bold' }}>
                {isCollapsed ? 'chevron_right' : 'chevron_left'}
              </span>
            </button>
            {/* Filter chips */}
            <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
              {FILTERS.map(f => (
                <button key={f}
                  onClick={() => setFilter(f)}
                  style={{
                    padding: '6px 16px', borderRadius: 999, border: 'none',
                    fontFamily: 'Plus Jakarta Sans, sans-serif',
                    fontSize: 12, fontWeight: 700, cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    background: filter === f ? '#138808' : 'rgba(255,255,255,0.8)',
                    color: filter === f ? '#fff' : 'var(--on-surface-variant)',
                    backdropFilter: 'blur(8px)',
                    boxShadow: '2px 2px 6px rgba(0,0,0,0.08)',
                  }}
                >{f}</button>
              ))}
            </div>

            {/* Timeline panel */}
            <div className="glass-surface" style={{
              flex: 1, borderRadius: 16, padding: 18,
              display: 'flex', flexDirection: 'column', overflow: 'hidden',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, paddingBottom: 14, borderBottom: '1px solid rgba(143,78,0,0.12)' }}>
                <h2 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 20, fontWeight: 700, color: 'var(--primary)' }}>
                  {tripDetail ? tripDetail.destination : 'Live Map'}
                </h2>
                {tripDetail && (
                  <span style={{
                    padding: '3px 10px', borderRadius: 4, background: 'rgba(141,252,117,0.2)',
                    color: '#138808', fontFamily: 'JetBrains Mono, monospace', fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
                  }}>Active</span>
                )}
              </div>

              {!tripId && (
                <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--outline)' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 36, display: 'block', marginBottom: 8 }}>explore</span>
                  <p style={{ fontSize: 13, lineHeight: 1.6 }}>
                    Create a trip to see your itinerary on the map.
                  </p>
                  <Link to="/" style={{ marginTop: 12, display: 'inline-block', fontSize: 13, color: 'var(--primary)', fontWeight: 600 }}>
                    Plan a Trip →
                  </Link>
                </div>
              )}

              {tripId && loading && (
                <div style={{ textAlign: 'center', padding: '20px 0' }}>
                  <AshokaChakra size={48} opacity={0.6} />
                  <p style={{ fontSize: 13, color: 'var(--outline)', marginTop: 8 }}>Loading activities…</p>
                </div>
              )}

              {tripId && !loading && (
                <div style={{ flex: 1, overflowY: 'auto', position: 'relative' }}>
                  {filteredActivities.length === 0 ? (
                    <p style={{ fontSize: 13, color: 'var(--outline)', textAlign: 'center', marginTop: 20 }}>No activities in this category.</p>
                  ) : (
                    <div style={{ position: 'relative' }}>
                      {/* Vertical line */}
                      <div style={{
                        position: 'absolute', left: 15, top: 0, bottom: 0,
                        width: 1, background: 'rgba(143,78,0,0.15)',
                      }} />

                      {filteredActivities.map((act, i) => {
                        const isActive = act.date === today
                        const isDone = act.date && act.date < today
                        return (
                          <div key={act.id} style={{ display: 'flex', gap: 14, marginBottom: 20, position: 'relative', zIndex: 1, cursor: 'pointer' }}
                            onClick={() => setSelectedActivity(act)}>
                            <div style={{
                              width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              ...(isActive
                                ? { background: '#138808', border: '3px solid rgba(255,255,255,0.8)' }
                                : isDone
                                  ? { background: 'var(--surface-variant)', border: '2px solid rgba(143,78,0,0.2)' }
                                  : { background: 'rgba(143,78,0,0.1)', border: '2px solid rgba(143,78,0,0.15)' }
                              ),
                            }}>
                              <span className="material-symbols-outlined" style={{
                                fontSize: 14,
                                color: isActive ? '#fff' : 'var(--outline)',
                              }}>
                                {isActive ? 'location_on' : isDone ? 'check' : 'radio_button_unchecked'}
                              </span>
                            </div>
                            <div style={{ flex: 1, opacity: isDone ? 0.6 : 1 }}>
                              <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: isActive ? 'var(--primary)' : 'var(--outline)', fontWeight: isActive ? 700 : 400, marginBottom: 2 }}>
                                Day {act.day_number} • {act.time_slot}
                              </div>
                              {isActive ? (
                                <div className="neo-raised" style={{ borderRadius: 10, padding: 12, border: '1px solid rgba(255,153,51,0.2)' }}>
                                  <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--on-surface)', marginBottom: 4 }}>{act.title}</div>
                                  <div style={{ fontSize: 12, color: 'var(--on-surface-variant)' }}>{act.location || act.description || ''}</div>
                                </div>
                              ) : (
                                <div>
                                  <div style={{ fontWeight: 500, fontSize: 14, color: 'var(--on-surface)' }}>{act.title}</div>
                                  <div style={{ fontSize: 12, color: 'var(--on-surface-variant)', marginTop: 2 }}>{act.location || ''}</div>
                                </div>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          </aside>


        </div>
      </div>

      <Footer />
    </>
  )
}

function RecenterMap({ position }) {
  const map = useMap()
  useEffect(() => {
    map.setView(position, Math.max(map.getZoom(), 15), { animate: true })
  }, [map, position])
  return null
}

function MapMarker({ top, left, label, icon, color = '#FF9933', pulse = false, onClick }) {
  const [hov, setHov] = useState(false)
  return (
    <div
      style={{
        position: 'absolute', top, left,
        transform: 'translate(-50%,-50%)',
        zIndex: 5, display: 'flex', flexDirection: 'column', alignItems: 'center',
        cursor: 'pointer',
      }}
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
    >
      <div style={{
        width: pulse ? 24 : 36, height: pulse ? 24 : 36,
        borderRadius: '50%',
        background: pulse ? '#138808' : '#fff',
        boxShadow: pulse ? '0 0 0 4px rgba(19,136,8,0.25)' : '0 4px 12px rgba(0,0,0,0.15)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        animation: pulse ? 'pulse-ring 2s ease-in-out infinite' : '',
        border: pulse ? '2px solid rgba(255,255,255,0.8)' : 'none',
      }}>
        {!pulse && icon && <span className="material-symbols-outlined" style={{ color, fontSize: 18 }}>{icon}</span>}
        {!pulse && !icon && <AshokaChakra size={20} opacity={1} />}
      </div>
      {hov && (
        <div style={{
          marginTop: 6, padding: '4px 12px',
          background: 'rgba(255,248,245,0.95)', backdropFilter: 'blur(8px)',
          borderRadius: 999, boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
          fontSize: 12, fontWeight: 700,
          color: pulse ? '#138808' : 'var(--primary)',
          whiteSpace: 'nowrap', maxWidth: 200,
          overflow: 'hidden', textOverflow: 'ellipsis',
        }}>{label}</div>
      )}
    </div>
  )
}


