import { useState, useEffect, useMemo } from 'react'
import { useSearchParams, Link, useNavigate } from 'react-router-dom'
import { Footer, AshokaChakra } from '../components/Layout'
import api from '../services/api'
import { MapContainer, TileLayer, useMap, Marker, Popup, Polyline, CircleMarker } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

const TOMTOM_KEY = import.meta.env.VITE_TOMTOM_API_KEY?.trim()

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

const DAY_COLORS = ['#FF9933', '#138808', '#000080', '#C6A84B', '#8F4E00']

const createCustomIcon = (dayNumber, category, isPulse) => {
  const color = DAY_COLORS[(dayNumber - 1) % DAY_COLORS.length]
  const iconName = CATEGORY_ICON[category] || CATEGORY_ICON.default
  
  const html = `
    <div style="
      position: relative;
      width: 36px; height: 36px;
      border-radius: 50%;
      background: #fff;
      border: 3px solid ${color};
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      display: flex; align-items: center; justify-content: center;
      ${isPulse ? `animation: pulse-ring 2s ease-in-out infinite;` : ''}
    ">
      <span class="material-symbols-outlined" style="color: ${color}; font-size: 18px;">${iconName}</span>
      <div style="
        position: absolute; top: -6px; right: -6px;
        background: ${color}; color: #fff;
        width: 18px; height: 18px; border-radius: 50%;
        display: flex; align-items: center; justify-content: center;
        font-family: 'JetBrains Mono', monospace; font-size: 10px; font-weight: 700;
        border: 2px solid #fff;
      ">${dayNumber}</div>
    </div>
  `
  return L.divIcon({
    html,
    className: 'custom-leaflet-icon',
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -18]
  })
}

export default function MapPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const tripIdParam = searchParams.get('tripId')

  const [trips, setTrips] = useState([])
  const [tripData, setTripData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('All')
  const [liveLocation, setLiveLocation] = useState(null)
  const [isCollapsed, setIsCollapsed] = useState(false)
  useEffect(() => {
    if (!tripIdParam) {
      api.listTrips().then(setTrips).catch(console.error)
    }
  }, [tripIdParam])
  useEffect(() => {
    if (!tripIdParam) {
      setTripData(null)
      return
    }
    let cancelled = false
    setLoading(true)
    api.getGeocodedDays(tripIdParam)
      .then(data => { if (!cancelled) setTripData(data) })
      .catch(err => console.warn('Map: Could not load geocoded data:', err.message))
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [tripIdParam])
  useEffect(() => {
    if (!navigator.geolocation) return undefined
    const watchId = navigator.geolocation.watchPosition(
      ({ coords }) => setLiveLocation({ latitude: coords.latitude, longitude: coords.longitude }),
      (error) => console.warn('Location error:', error.message),
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 15000 },
    )
    return () => navigator.geolocation.clearWatch(watchId)
  }, [])
  const days = tripData?.days || []
  const visibleDays = activeTab === 'All' ? days : days.filter(d => d.day_number === activeTab)
  const allMarkers = useMemo(() => {
    return visibleDays.flatMap(d => 
      (d.locations || []).map((loc, idx) => ({
        ...loc,
        day_number: d.day_number,
        date: d.date,
        theme: d.theme,
        key: `${d.day_number}-${idx}`
      }))
    )
  }, [visibleDays])
  const routesPerDay = useMemo(() => {
    return visibleDays.map(d => {
      const positions = (d.locations || []).map(loc => [loc.lat, loc.lng])
      return {
        day_number: d.day_number,
        positions,
        color: DAY_COLORS[(d.day_number - 1) % DAY_COLORS.length]
      }
    }).filter(r => r.positions.length > 1)
  }, [visibleDays])

  const bounds = useMemo(() => {
    if (allMarkers.length === 0) return null
    const lats = allMarkers.map(m => m.lat)
    const lngs = allMarkers.map(m => m.lng)
    return [
      [Math.min(...lats), Math.min(...lngs)],
      [Math.max(...lats), Math.max(...lngs)]
    ]
  }, [allMarkers])

  return (
    <>
      <div className="page-content" style={{ height: '100vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
          
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
              <CircleMarker
                center={[liveLocation.latitude, liveLocation.longitude]}
                radius={9}
                pathOptions={{ color: '#fff', weight: 3, fillColor: '#1877F2', fillOpacity: 1 }}
              />
            )}
            
            {bounds && <FitBounds bounds={bounds} />}

            {}
            {routesPerDay.map((route) => (
              <Polyline
                key={`route-${route.day_number}`}
                positions={route.positions}
                pathOptions={{
                  color: route.color,
                  weight: 4,
                  opacity: 0.8,
                  dashArray: '8, 8',
                  lineCap: 'round',
                  lineJoin: 'round',
                }}
              />
            ))}

            {}
            {allMarkers.map(m => (
              <Marker
                key={m.key}
                position={[m.lat, m.lng]}
                icon={createCustomIcon(m.day_number, m.category, false)}
              >
                <Popup className="custom-popup">
                  <div style={{ padding: '4px', minWidth: '180px' }}>
                    <div style={{ fontFamily: 'JetBrains Mono', fontSize: 10, color: DAY_COLORS[(m.day_number - 1) % DAY_COLORS.length], fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>
                      Day {m.day_number} • {m.time_slot}
                    </div>
                    <div style={{ fontFamily: 'Cormorant Garamond', fontSize: 18, fontWeight: 700, color: '#231A13', marginBottom: 4, lineHeight: 1.2 }}>
                      {m.title}
                    </div>
                    {m.description && (
                      <div style={{ fontSize: 12, color: '#6B5D54', lineHeight: 1.4 }}>
                        {m.description}
                      </div>
                    )}
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>

          {}
          <aside style={{
            position: 'absolute', top: 16, left: 16, bottom: 16,
            width: 320, zIndex: 10,
            display: 'flex', flexDirection: 'column', gap: 10,
            transform: isCollapsed ? 'translateX(-336px)' : 'translateX(0)',
            transition: 'transform 0.4s cubic-bezier(0.25, 1, 0.5, 1)',
          }}>
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              style={{
                position: 'absolute', top: '50%', left: 320, width: 24, height: 48,
                borderRadius: '0 8px 8px 0', border: '1px solid rgba(143,78,0,0.12)', borderLeft: 'none',
                background: 'rgba(255, 248, 245, 0.95)', backdropFilter: 'blur(8px)',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '4px 0 10px rgba(0,0,0,0.08)', zIndex: 11, transform: 'translateY(-50%)',
              }}
              title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 16, color: 'var(--primary)', fontWeight: 'bold' }}>
                {isCollapsed ? 'chevron_right' : 'chevron_left'}
              </span>
            </button>

            {}
            <div className="glass-surface" style={{ borderRadius: 16, padding: '16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 24, fontWeight: 700, color: 'var(--primary)' }}>
                  Live Map
                </h2>
                <span className="material-symbols-outlined" style={{ color: 'var(--primary)', fontSize: 24 }}>map</span>
              </div>
              
              {!tripIdParam && trips.length > 0 && (
                <select
                  onChange={(e) => navigate(`/map?tripId=${e.target.value}`)}
                  defaultValue=""
                  style={{
                    width: '100%', padding: '10px 14px', borderRadius: 10,
                    border: '1px solid var(--outline-variant)', background: '#fff',
                    fontFamily: 'Plus Jakarta Sans', fontSize: 14, color: 'var(--on-surface)',
                    cursor: 'pointer',
                  }}
                >
                  <option value="" disabled>Select a Trip...</option>
                  {trips.map(t => (
                    <option key={t.id} value={t.id}>{t.destination} ({t.start_date})</option>
                  ))}
                </select>
              )}
              {!tripIdParam && trips.length === 0 && (
                <div style={{ fontSize: 13, color: 'var(--outline)' }}>
                  No saved trips. <Link to="/#planner">Plan a trip first.</Link>
                </div>
              )}
              {tripIdParam && tripData && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--on-surface)' }}>{tripData.destination}</div>
                  <Link to="/map" style={{ fontSize: 12, color: 'var(--primary)', textDecoration: 'underline' }}>Change Trip</Link>
                </div>
              )}
            </div>

            {}
            {tripIdParam && (
              <div className="glass-surface" style={{ flex: 1, borderRadius: 16, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                {loading ? (
                   <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', padding: 20 }}>
                     <AshokaChakra size={48} opacity={0.6} />
                     <p style={{ fontSize: 13, color: 'var(--outline)', marginTop: 12 }}>Geocoding locations...</p>
                   </div>
                ) : (
                  <>
                    {}
                    <div style={{ display: 'flex', overflowX: 'auto', padding: '16px', gap: 8, borderBottom: '1px solid rgba(143,78,0,0.1)' }}>
                      <button
                        onClick={() => setActiveTab('All')}
                        style={{
                          padding: '6px 14px', borderRadius: 999, border: 'none',
                          fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 12, fontWeight: 700, cursor: 'pointer',
                          background: activeTab === 'All' ? 'var(--primary)' : 'rgba(255,255,255,0.7)',
                          color: activeTab === 'All' ? '#fff' : 'var(--on-surface-variant)',
                          whiteSpace: 'nowrap',
                          boxShadow: activeTab === 'All' ? '0 4px 10px rgba(143,78,0,0.2)' : 'none',
                        }}
                      >All</button>
                      {days.map(d => (
                        <button
                          key={d.day_number}
                          onClick={() => setActiveTab(d.day_number)}
                          style={{
                            padding: '6px 14px', borderRadius: 999, border: 'none',
                            fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 12, fontWeight: 700, cursor: 'pointer',
                            background: activeTab === d.day_number ? DAY_COLORS[(d.day_number - 1) % DAY_COLORS.length] : 'rgba(255,255,255,0.7)',
                            color: activeTab === d.day_number ? '#fff' : 'var(--on-surface-variant)',
                            whiteSpace: 'nowrap',
                            boxShadow: activeTab === d.day_number ? '0 4px 10px rgba(0,0,0,0.15)' : 'none',
                          }}
                        >Day {d.day_number}</button>
                      ))}
                    </div>

                    {}
                    <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
                      {visibleDays.map(d => (
                        <div key={d.day_number} style={{ marginBottom: 24 }}>
                          <div style={{ fontFamily: 'JetBrains Mono', fontSize: 11, fontWeight: 700, color: DAY_COLORS[(d.day_number-1)%DAY_COLORS.length], textTransform: 'uppercase', marginBottom: 12 }}>
                            Day {d.day_number} • {d.date}
                            <div style={{ fontSize: 14, fontFamily: 'Cormorant Garamond', fontWeight: 600, color: 'var(--on-surface)', marginTop: 2, textTransform: 'none' }}>
                              {d.theme}
                            </div>
                          </div>
                          
                          <div style={{ position: 'relative', paddingLeft: 12 }}>
                            <div style={{ position: 'absolute', left: 16, top: 12, bottom: 12, width: 2, background: 'rgba(143,78,0,0.1)' }} />
                            {(d.locations || []).map((loc, idx) => (
                              <div key={idx} style={{ display: 'flex', gap: 12, marginBottom: 16, position: 'relative', zIndex: 1 }}>
                                <div style={{
                                  width: 10, height: 10, borderRadius: '50%', background: '#fff',
                                  border: `2px solid ${DAY_COLORS[(d.day_number-1)%DAY_COLORS.length]}`,
                                  marginTop: 4, flexShrink: 0,
                                }} />
                                <div>
                                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--on-surface)' }}>{loc.title}</div>
                                  <div style={{ fontSize: 11, color: 'var(--on-surface-variant)', marginTop: 2 }}>{loc.time_slot}</div>
                                </div>
                              </div>
                            ))}
                            {(d.locations || []).length === 0 && (
                              <div style={{ fontSize: 12, color: 'var(--outline)', paddingLeft: 16 }}>No locations mapped for this day.</div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}
          </aside>

        </div>
      </div>
      <Footer />
      <style>{`
        .custom-popup .leaflet-popup-content-wrapper {
          border-radius: 12px;
          box-shadow: 0 8px 24px rgba(0,0,0,0.15);
        }
        .custom-popup .leaflet-popup-tip {
          box-shadow: 0 8px 24px rgba(0,0,0,0.15);
        }
      `}</style>
    </>
  )
}

function FitBounds({ bounds }) {
  const map = useMap()
  useEffect(() => {
    if (bounds) {
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14, animate: true })
    }
  }, [map, bounds])
  return null
}


