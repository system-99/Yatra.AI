import { useState } from 'react'
import { Footer } from '../components/Layout'
import { AshokaChakra } from '../components/Layout'

const TIMELINE = [
  {
    day: 'Day 1',
    title: 'Arrival in Jaipur',
    date: 'Dec 15 • 10:00 AM – 08:00 PM',
    status: 'completed',
    desc: 'Welcome to the Pink City. Settle into the regal ambiance before an evening exploring the vibrant local bazaars.',
    events: [
      { icon: 'flight_land',  color: '#FF9933', title: 'Flight 6E-201 Arrives',    sub: 'Jaipur International Airport • 10:30 AM' },
      { icon: 'castle',       color: '#C6A84B', title: 'Check-in: Rambagh Palace', sub: 'Luxury Suite • 12:00 PM' },
      { icon: 'restaurant',   color: '#FF9933', title: 'Dinner: Suvarna Mahal',    sub: 'Royal Indian Cuisine • 08:00 PM' },
    ],
  },
  {
    day: 'Day 2',
    title: 'Forts & Palaces',
    date: 'TODAY • Dec 16',
    status: 'active',
    desc: 'A deep dive into the architectural marvels of the Rajput era, featuring the iconic Amber Fort and City Palace.',
    events: [
      { icon: 'directions_car', color: '#887364', title: 'Private Transfer to Amber Fort', sub: 'Chauffeured Sedan • 09:00 AM', done: true },
      { icon: 'explore',        color: '#138808', title: 'Amber Fort Guided Tour',         sub: 'Happening Now • 10:00 AM – 01:00 PM', live: true },
      { icon: 'local_dining',   color: '#FF9933', title: 'Lunch: 1135 AD',                sub: 'Inside Amber Fort • 01:30 PM' },
    ],
  },
  {
    day: 'Day 3',
    title: 'Udaipur – City of Lakes',
    date: 'Dec 17',
    status: 'upcoming',
    desc: 'Travel to Udaipur, the Venice of the East, for a sunset lake cruise and rooftop dinner.',
    events: [
      { icon: 'train',      color: '#000080', title: 'Jaipur → Udaipur Express', sub: 'Departs 07:00 AM • 5h 30m' },
      { icon: 'water',      color: '#138808', title: 'Lake Pichola Sunset Cruise', sub: '05:00 PM' },
      { icon: 'restaurant', color: '#FF9933', title: 'Rooftop Dinner at Ambrai', sub: '08:00 PM' },
    ],
  },
]

const FEED = [
  { type: 'warning', icon: 'warning',     color: '#FF9933', title: 'WEATHER ALERT',    time: 'Just now',   msg: 'Heavy fog in Jaisalmer. AI suggests delaying tomorrow\'s departure by 2 hours for better visibility.' },
  { type: 'success', icon: 'auto_awesome',color: '#138808', title: 'ROUTE OPTIMIZED',  time: '45m ago',    msg: 'Flight 6E-201 was delayed. Automatically re-routed airport transfer to avoid peak traffic.' },
  { type: 'info',    icon: 'info',        color: '#000080', title: 'CULTURAL CONTEXT', time: '2h ago',     msg: 'The Amber Fort is built from pale yellow sandstone. Look for the Diwan-e-Khas mirror hall.' },
]

export default function ItineraryPage() {
  const [feedItems, setFeedItems] = useState(FEED)
  const [replanning, setReplanning] = useState(false)

  const replan = () => {
    setReplanning(true)
    setTimeout(() => {
      setReplanning(false)
      setFeedItems(prev => [{
        type: 'success', icon: 'sync', color: '#138808',
        title: 'ITINERARY REPLANNED', time: 'Just now',
        msg: 'AI has successfully generated an optimized itinerary based on current conditions.',
      }, ...prev])
    }, 2200)
  }

  return (
    <>
      <div className="page-content" style={{ background: '#F4F4F4' }}>
        <main style={{ padding: '32px 40px 80px', maxWidth: 1280, margin: '0 auto' }}>

          {/* ── Hero banner ── */}
          <header style={{
            borderRadius: 16, overflow: 'hidden',
            height: 280, position: 'relative', marginBottom: 28,
            backgroundImage: 'url(https://lh3.googleusercontent.com/aida-public/AB6AXuBlrg3hWB4P1yhRBticQLiNCCAYJV3OtxPoWGMNNuximSEwj9AYfuC97DvECVEwkeaiC4rRgcYv846QnI3x-080D0AQcSPPWZUcr7BPjuz3zD4PZcDiwCAzSNTJ0-VQBlUkc2x7FNob6Wu9VTgJin7zL8BdOmQJVPA8Cg150OlKNIT-Ip2luClt0tvAeh1QcN8Vsrlma6t8Ljpw3GTG3ZDzvuP-GP-4JfJO3ObvhialCEk6cl08q3JjgQ)',
            backgroundSize: 'cover', backgroundPosition: 'center',
            boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
          }}>
            <div style={{
              position: 'absolute', inset: 0,
              background: 'linear-gradient(to top, rgba(35,26,19,0.85) 0%, rgba(35,26,19,0.2) 100%)',
            }} />
            <div style={{
              position: 'absolute', bottom: 0, left: 0, right: 0,
              padding: '24px 32px',
              display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end',
              background: 'rgba(255,248,245,0.18)',
              backdropFilter: 'blur(12px)',
              borderTop: '1px solid rgba(255,255,255,0.2)',
            }}>
              <div>
                <span style={{
                  display: 'inline-block', padding: '4px 14px',
                  background: 'rgba(255,153,51,0.25)', border: '1px solid rgba(255,153,51,0.5)',
                  borderRadius: 999, fontSize: 11, fontWeight: 700,
                  color: '#FF9933', letterSpacing: '0.1em', textTransform: 'uppercase',
                  marginBottom: 10,
                }}>12-Day Heritage Journey</span>
                <h1 style={{
                  fontFamily: 'Cormorant Garamond, serif',
                  fontSize: 40, fontWeight: 700, color: '#fff',
                  textShadow: '0 2px 8px rgba(0,0,0,0.4)', lineHeight: 1.15,
                }}>The Grand Rajputana<br/>Heritage Trail</h1>
                <p style={{
                  fontFamily: 'JetBrains Mono, monospace',
                  fontSize: 13, color: 'rgba(255,255,255,0.75)', marginTop: 8,
                  display: 'flex', alignItems: 'center', gap: 6,
                }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 16 }}>calendar_month</span>
                  Dec 15 – Dec 27
                </p>
              </div>
              <div className="neo-raised" style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '8px 20px', borderRadius: 999,
              }}>
                <span style={{
                  width: 10, height: 10, borderRadius: '50%',
                  background: '#138808', display: 'inline-block',
                  boxShadow: '0 0 0 3px rgba(19,136,8,0.25)',
                  animation: 'ping 1.4s ease-in-out infinite',
                }} />
                <span style={{
                  fontFamily: 'JetBrains Mono, monospace',
                  fontSize: 11, fontWeight: 700,
                  color: '#138808', letterSpacing: '0.1em', textTransform: 'uppercase',
                }}>LIVE STATUS: ACTIVE</span>
              </div>
            </div>
          </header>

          {/* ── Stats tiles ── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 18, marginBottom: 28 }}>
            {[
              { icon: 'route',                   color: '#FF9933', label: 'DISTANCE COVERED', value: '845 / 1250 km' },
              { icon: 'account_balance_wallet',  color: '#C6A84B', label: 'BUDGET SPENT',      value: '₹1.2L / ₹1.8L' },
              { icon: 'auto_awesome',            color: '#000080', label: 'AI ADJUSTMENTS',    value: '4 Optimizations', spin: true },
              { icon: 'location_on',             color: '#138808', label: 'NEXT STOP',         value: 'Udaipur' },
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

              <div style={{ display: 'flex', flexDirection: 'column', gap: 20, position: 'relative' }}>
                {TIMELINE.map((day, di) => (
                  <DayCard key={day.day} day={day} isLast={di === TIMELINE.length - 1} />
                ))}
              </div>
            </div>

            {/* Right: AI Sidebar */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

              {/* Weather widget */}
              <div className="glass-surface" style={{ borderRadius: 16, padding: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span className="material-symbols-outlined" style={{ color: '#FF9933' }}>partly_cloudy_day</span>
                    <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, fontWeight: 700, color: 'var(--on-surface-variant)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>LIVE WEATHER</span>
                  </div>
                  <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 13, fontWeight: 700, color: 'var(--primary)' }}>Jaipur, RJ</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 16, borderBottom: '1px solid rgba(143,78,0,0.12)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 52, color: '#FF9933' }}>sunny</span>
                    <div>
                      <div style={{ fontSize: 36, fontWeight: 700, color: 'var(--on-surface)' }}>32°C</div>
                      <div style={{ fontSize: 12, color: 'var(--on-surface-variant)' }}>Feels like 34°C</div>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 600, color: '#138808', fontSize: 14 }}>Clear Skies</div>
                    <div style={{ fontSize: 11, fontFamily: 'JetBrains Mono, monospace', color: 'var(--on-surface-variant)' }}>Perfect for sightseeing</div>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginTop: 14 }}>
                  {[{ d: 'TOM', i: 'sunny', t: '31°' }, { d: 'WED', i: 'cloud', t: '29°' }, { d: 'THU', i: 'sunny', t: '33°' }].map(w => (
                    <div key={w.d} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                      <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--on-surface-variant)', letterSpacing: '0.1em' }}>{w.d}</span>
                      <span className="material-symbols-outlined" style={{ fontSize: 18, color: '#FF9933' }}>{w.i}</span>
                      <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 13, fontWeight: 700 }}>{w.t}</span>
                    </div>
                  ))}
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
                    background: '#138808', display: 'inline-block',
                    boxShadow: '0 0 0 3px rgba(19,136,8,0.25)',
                  }} />
                </div>

                <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {feedItems.map((item, i) => (
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
                          {item.type === 'warning' && (
                            <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                              <button className="btn-cta" style={{ padding: '5px 14px', borderRadius: 6, fontSize: 12 }}>Accept Delay</button>
                              <button className="neo-raised" style={{
                                border: 'none', padding: '5px 14px', borderRadius: 6,
                                fontSize: 12, cursor: 'pointer', color: 'var(--on-surface)',
                              }}>Ignore</button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Action buttons */}
                <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <button className="btn-cta" style={{
                    width: '100%', padding: '14px', borderRadius: 10, fontSize: 15,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  }} onClick={replan}>
                    <span className={`material-symbols-outlined ${replanning ? 'spin-fast' : ''}`} style={{ fontSize: 20 }}>sync</span>
                    {replanning ? 'Replanning…' : 'Replan My Trip'}
                  </button>
                  <button className="neo-raised" style={{
                    width: '100%', padding: '14px', borderRadius: 10, fontSize: 15, fontWeight: 700,
                    border: '2px solid #000080', color: '#000080', background: 'transparent',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 20 }}>download</span>
                    Export Itinerary
                  </button>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
      <Footer />
    </>
  )
}

function DayCard({ day }) {
  const isActive    = day.status === 'active'
  const isCompleted = day.status === 'completed'
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
            }}>{day.day}: {day.title}</h3>
            <p style={{
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: 12, fontWeight: 700, marginTop: 4,
              color: isActive ? '#138808' : 'var(--on-surface-variant)',
            }}>{day.date}</p>
          </div>
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
        </div>
        <p style={{ fontSize: 14, color: 'var(--on-surface-variant)', marginBottom: 18, lineHeight: 1.6 }}>{day.desc}</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {day.events.map((ev, i) => (
            <div key={i} className={ev.live ? '' : 'neo-inset'} style={{
              borderRadius: 10, padding: '14px',
              display: 'flex', alignItems: 'center', gap: 14,
              ...(ev.live ? {
                background: 'rgba(19,136,8,0.06)',
                border: '1px solid rgba(19,136,8,0.25)',
                borderLeft: '4px solid #138808',
              } : {}),
              opacity: ev.done ? 0.55 : 1,
            }}>
              <div style={{
                width: 36, height: 36, borderRadius: 8,
                background: ev.live ? 'rgba(19,136,8,0.12)' : 'rgba(255,255,255,0.7)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '2px 2px 6px rgba(0,0,0,0.06)',
              }}>
                <span className="material-symbols-outlined" style={{ color: ev.color, fontSize: 20 }}>{ev.icon}</span>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{
                  fontWeight: 600, fontSize: 14, color: 'var(--on-surface)',
                  textDecoration: ev.done ? 'line-through' : 'none',
                }}>{ev.title}</div>
                <div style={{
                  fontFamily: 'JetBrains Mono, monospace',
                  fontSize: 12,
                  color: ev.live ? '#138808' : 'var(--on-surface-variant)',
                  fontWeight: ev.live ? 700 : 400,
                  marginTop: 2,
                }}>{ev.sub}</div>
              </div>
              {ev.live && (
                <button className="btn-cta" style={{ padding: '6px 14px', borderRadius: 8, fontSize: 12 }}>
                  View Tickets
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
