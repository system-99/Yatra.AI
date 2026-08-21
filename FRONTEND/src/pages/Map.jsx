import { useState, useEffect } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { Footer } from '../components/Layout'
import { AshokaChakra } from '../components/Layout'
import api from '../services/api'

const FILTERS = ['Hotels', 'Dining', 'Transit', 'Heritage', 'All']

/* Category → filter group */
const CAT_TO_FILTER = {
  food:        'Dining',
  dining:      'Dining',
  transit:     'Transit',
  culture:     'Heritage',
  sightseeing: 'Heritage',
  nature:      'Heritage',
  relaxation:  'Hotels',
  shopping:    'Heritage',
}

export default function MapPage() {
  const [searchParams] = useSearchParams()
  const tripId = searchParams.get('tripId')

  const [showPivot, setShowPivot] = useState(false)
  const [filter, setFilter]       = useState('All')
  const [tripDetail, setTripDetail] = useState(null)
  const [loading, setLoading]       = useState(false)
  const [selectedActivity, setSelectedActivity] = useState(null)

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

  /* Active activity = first one today, else first in list */
  const today = new Date().toISOString().split('T')[0]
  const todayActs = allActivities.filter(a => a.date === today)
  const activeAct = selectedActivity || todayActs[0] || allActivities[0] || null

  return (
    <>
      <div className="page-content" style={{ height: '100vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
          {/* Map background (decorative dot-grid placeholder) */}
          <div style={{
            position: 'absolute', inset: 0,
            backgroundColor: '#e8d7cb',
            backgroundImage: 'radial-gradient(#d3c2b5 1px, transparent 1px)',
            backgroundSize: '22px 22px',
          }} />

          {/* SVG route overlay — decorative */}
          <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 1 }}>
            <defs>
              <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto">
                <polygon points="0 0, 10 3.5, 0 7" fill="#FF9933" />
              </marker>
            </defs>
            <path
              d="M 320 280 C 420 180, 620 380, 820 330 S 1020 480, 1120 430"
              fill="none" stroke="#FF9933" strokeWidth="4"
              strokeDasharray="10 6" opacity="0.85"
              markerEnd="url(#arrowhead)"
            />
            <path
              d="M 820 330 C 920 300, 1020 350, 1120 430"
              fill="none" stroke="#138808" strokeWidth="3"
              strokeDasharray="6 6" opacity="0.6"
            />
          </svg>

          {/* Map markers use itinerary activities when the backend provides them. */}
          {allActivities.length > 0 ? (
            allActivities.slice(0, 3).map((act, i) => {
              // Distribute markers across the screen for visual effect
              const tops  = [280, 330, 430]
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
          }}>
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

          {/* Right: Active stop detail card */}
          <aside style={{
            position: 'absolute', top: 16, right: 16, bottom: 16,
            width: 340, zIndex: 10,
          }}>
            <div className="glass-surface" style={{
              borderRadius: 20, overflow: 'hidden',
              boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
              display: 'flex', flexDirection: 'column', height: '100%',
            }}>
              {/* Hero image area */}
              <div style={{ height: 200, position: 'relative', overflow: 'hidden', background: 'linear-gradient(135deg, #2d1a09 0%, #5a3018 100%)' }}>
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.12 }}>
                  <AshokaChakra size={180} opacity={1} />
                </div>
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.75) 0%, transparent 60%)' }} />
                <div style={{ position: 'absolute', top: 12, right: 12, display: 'flex', gap: 8 }}>
                  {['favorite', 'share'].map(ic => (
                    <button key={ic} style={{
                      width: 34, height: 34, borderRadius: '50%',
                      background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(8px)',
                      border: 'none', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: '#fff', transition: 'background 0.2s',
                    }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 16 }}>{ic}</span>
                    </button>
                  ))}
                </div>
                <div style={{ position: 'absolute', bottom: 14, left: 16, right: 16 }}>
                  {activeAct && (
                    <>
                      <span style={{
                        display: 'inline-block', padding: '3px 10px',
                        background: 'rgba(255,153,51,0.75)', backdropFilter: 'blur(6px)',
                        borderRadius: 4, fontSize: 10, fontWeight: 700,
                        color: '#fff', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6,
                      }}>{activeAct.category || 'Activity'}</span>
                      <h2 style={{
                        fontFamily: 'Cormorant Garamond, serif',
                        fontSize: 24, fontWeight: 700, color: '#fff',
                        textShadow: '0 2px 8px rgba(0,0,0,0.4)',
                      }}>{activeAct.title}</h2>
                    </>
                  )}
                  {!activeAct && (
                    <h2 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 24, fontWeight: 700, color: '#fff' }}>
                      {tripDetail ? tripDetail.destination : 'Select a stop'}
                    </h2>
                  )}
                </div>
              </div>

              {/* Card content */}
              <div style={{ flex: 1, padding: 20, display: 'flex', flexDirection: 'column', background: 'rgba(255,248,245,0.97)', overflowY: 'auto' }}>
                {activeAct ? (
                  <>
                    <p style={{ fontSize: 14, color: 'var(--on-surface-variant)', lineHeight: 1.65, marginBottom: 18 }}>
                      {activeAct.description || `${activeAct.time_slot} activity at ${activeAct.location || activeAct.title}.`}
                    </p>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
                      {[
                        { icon: 'schedule', label: 'Time Slot', value: activeAct.time_slot },
                        { icon: 'confirmation_number', label: 'Est. Cost', value: `₹${activeAct.estimated_cost?.toLocaleString('en-IN') || '0'}` },
                      ].map(info => (
                        <div key={info.label} className="neo-inset" style={{ borderRadius: 10, padding: '12px' }}>
                          <span className="material-symbols-outlined" style={{ color: 'var(--primary)', fontSize: 20, marginBottom: 4, display: 'block' }}>{info.icon}</span>
                          <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--outline)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{info.label}</div>
                          <div style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, fontSize: 14, color: 'var(--on-surface)', marginTop: 2 }}>{info.value}</div>
                        </div>
                      ))}
                    </div>

                    {activeAct.location && (
                      <div className="neo-raised" style={{ borderLeft: '4px solid var(--primary)', borderRadius: 10, padding: 14, marginBottom: 16 }}>
                        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                          <span className="material-symbols-outlined" style={{ color: 'var(--primary)', fontSize: 20 }}>location_on</span>
                          <div>
                            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Location</div>
                            <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--on-surface)' }}>{activeAct.location}</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {activeAct.is_weather_sensitive && (
                      <div className="neo-raised" style={{ borderLeft: '4px solid #FF9933', borderRadius: 10, padding: 14, marginBottom: 16 }}>
                        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                          <AshokaChakra size={22} opacity={1} />
                          <div>
                            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Chakra Intelligence</div>
                            <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--on-surface)' }}>This activity is weather-sensitive.</p>
                            <p style={{ fontSize: 12, color: 'var(--on-surface-variant)', marginTop: 2 }}>AI will automatically replan if adverse conditions are detected.</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--outline)' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 40, display: 'block', marginBottom: 12 }}>map</span>
                    <p style={{ fontSize: 14 }}>
                      {tripId ? 'Click an activity in the timeline to view details.' : 'No trip loaded. Create a trip to see your map.'}
                    </p>
                    {!tripId && (
                      <Link to="/" style={{ display: 'inline-block', marginTop: 14, fontSize: 14, color: 'var(--primary)', fontWeight: 700 }}>
                        Plan a Trip →
                      </Link>
                    )}
                  </div>
                )}

                {/* Simulate disruption button */}
                <button onClick={() => setShowPivot(true)} style={{
                  marginTop: 'auto', width: '100%', padding: '12px',
                  borderRadius: 12, border: '2px solid var(--error)',
                  background: 'rgba(186,26,26,0.06)',
                  color: 'var(--error)', fontWeight: 700, fontSize: 14,
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 18 }}>warning</span>
                  Simulate Disruption Pivot
                </button>
              </div>
            </div>
          </aside>
        </div>
      </div>

      {/* Disruption Pivot Modal */}
      {showPivot && <PivotModal onClose={() => setShowPivot(false)} tripId={tripId} activeAct={activeAct} />}

      <Footer />
    </>
  )
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

function PivotModal({ onClose, tripId, activeAct }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 200,
      background: 'rgba(35,26,19,0.5)', backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 24,
    }}>
      <div className="glass-surface flag-border" style={{
        width: '100%', maxWidth: 820, borderRadius: 24,
        overflow: 'hidden', boxShadow: '0 24px 60px rgba(0,0,0,0.25)',
      }}>
        {/* Header */}
        <div style={{
          padding: '20px 28px', borderBottom: '1px solid rgba(143,78,0,0.12)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          background: 'rgba(255,248,245,0.7)',
        }}>
          <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
            <div className="chakra-pulse" style={{
              width: 48, height: 48, borderRadius: '50%',
              background: 'rgba(186,26,26,0.1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: '1px solid rgba(186,26,26,0.3)',
            }}>
              <span className="material-symbols-outlined" style={{ color: 'var(--error)', fontSize: 28 }}>warning</span>
            </div>
            <div>
              <h2 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 26, fontWeight: 700, color: 'var(--on-surface)' }}>Disruption Detected</h2>
              <p style={{ fontSize: 14, color: 'var(--on-surface-variant)', marginTop: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>smart_toy</span>
                Chakra AI will propose an optimal itinerary pivot.
              </p>
            </div>
          </div>
          <button onClick={onClose} style={{
            width: 38, height: 38, borderRadius: '50%', border: 'none', cursor: 'pointer',
            background: 'rgba(143,115,100,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <span className="material-symbols-outlined" style={{ color: 'var(--on-surface-variant)' }}>close</span>
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '28px', display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 16, background: 'rgba(255,248,245,0.6)' }}>
          <div>
            <h3 style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, fontWeight: 700, color: 'var(--outline)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 14 }}>Original Plan</h3>
            <div className="neo-raised" style={{ borderRadius: 14, padding: '20px', opacity: 0.7 }}>
              {activeAct ? (
                <MapTimelineItem time={activeAct.time_slot} title={activeAct.title} loc={activeAct.location || ''} error />
              ) : (
                <MapTimelineItem time="10:00 AM" title="Current Activity" loc="Disruption impact detected" error />
              )}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div className="neo-raised" style={{ width: 40, height: 40, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span className="material-symbols-outlined" style={{ color: 'var(--primary)' }}>arrow_forward</span>
            </div>
          </div>

          <div>
            <h3 style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 14, display: 'flex', gap: 6, alignItems: 'center' }}>
              <span className="material-symbols-outlined" style={{ fontSize: 14 }}>auto_awesome</span>
              AI Proposed Pivot
            </h3>
            <div className="neo-raised" style={{ borderRadius: 14, padding: '20px', border: '1px solid rgba(255,153,51,0.25)', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: -30, right: -30, width: 100, height: 100, background: 'rgba(255,153,51,0.08)', borderRadius: '50%', filter: 'blur(20px)' }} />
              <MapTimelineItem time="Alternative" title="Indoor Cultural Experience" badge="AI Suggested" loc="Curated for current conditions." primary />
            </div>
          </div>
        </div>

        <div style={{
          padding: '18px 28px', borderTop: '1px solid rgba(143,78,0,0.12)',
          background: 'rgba(255,248,245,0.8)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          {tripId && (
            <Link to={`/itinerary?tripId=${tripId}`} className="btn-cta" style={{
              padding: '12px 24px', borderRadius: 999, fontSize: 14, textDecoration: 'none',
              display: 'inline-flex', alignItems: 'center', gap: 8,
            }}>
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>sync</span>
              Go to Itinerary to Replan
            </Link>
          )}
          <div style={{ display: 'flex', gap: 12, marginLeft: 'auto' }}>
            <button onClick={onClose} className="neo-raised" style={{
              padding: '12px 24px', borderRadius: 999, border: '1px solid var(--outline-variant)',
              background: 'none', fontSize: 15, fontWeight: 600, color: 'var(--on-surface-variant)', cursor: 'pointer',
            }}>Keep Original</button>
            <button className="btn-cta" onClick={onClose} style={{
              padding: '12px 28px', borderRadius: 999, fontSize: 15,
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>check_circle</span>
              Confirm Pivot
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function MapTimelineItem({ time, title, loc, error, primary, badge }) {
  return (
    <div style={{ display: 'flex', gap: 12, marginBottom: 20, alignItems: 'flex-start' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
        <div style={{ width: 12, height: 12, borderRadius: '50%', background: error ? 'var(--error)' : primary ? 'var(--primary)' : 'var(--outline)' }} />
        <div style={{ width: 1, height: 36, background: 'rgba(143,78,0,0.12)', margin: '4px 0' }} />
      </div>
      <div style={{
        flex: 1, padding: '10px 12px', borderRadius: 8,
        background: error ? 'rgba(186,26,26,0.06)' : primary ? 'rgba(255,153,51,0.06)' : 'transparent',
        border: error ? '1px solid rgba(186,26,26,0.15)' : primary ? '1px solid rgba(255,153,51,0.18)' : 'none',
      }}>
        <div style={{
          fontFamily: 'JetBrains Mono, monospace', fontSize: 12, marginBottom: 2,
          color: error ? 'var(--error)' : primary ? 'var(--primary)' : 'var(--on-surface-variant)',
          textDecoration: error ? 'line-through' : 'none',
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          {time}
          {badge && <span style={{ fontSize: 10, padding: '2px 8px', background: 'rgba(143,115,100,0.12)', borderRadius: 4, color: 'var(--outline)' }}>{badge}</span>}
        </div>
        <div style={{ fontWeight: 600, fontSize: 15, color: 'var(--on-surface)', textDecoration: error ? 'line-through' : 'none' }}>{title}</div>
        <div style={{ fontSize: 12, marginTop: 3, color: error ? 'var(--error)' : 'var(--on-surface-variant)' }}>{loc}</div>
      </div>
    </div>
  )
}
