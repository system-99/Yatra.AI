import { useState } from 'react'
import { Footer } from '../components/Layout'
import { AshokaChakra } from '../components/Layout'

const TIMELINE_STOPS = [
  { time: '09:00 AM', name: 'Dakshineswar Kali Temple', desc: 'Morning Darshan & Architecture tour.', done: true },
  { time: '11:30 AM', name: 'Victoria Memorial',        desc: '2.5 km · 30 mins', active: true, progress: 33 },
  { time: '01:30 PM', name: 'Peter Cat',                desc: 'Lunch Reservation (Chelo Kebab).' },
  { time: '03:00 PM', name: 'Indian Museum',            desc: 'Heritage walk through ancient artifacts.' },
]

const FILTERS = ['Hotels', 'Dining', 'Transit', 'Heritage', 'All']

export default function MapPage() {
  const [showPivot, setShowPivot] = useState(false)
  const [filter, setFilter] = useState('All')

  return (
    <>
      <div className="page-content" style={{ height: '100vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
          {/* Map background */}
          <div style={{
            position: 'absolute', inset: 0,
            backgroundColor: '#e8d7cb',
            backgroundImage: 'radial-gradient(#d3c2b5 1px, transparent 1px)',
            backgroundSize: '22px 22px',
          }} />

          {/* SVG route overlay */}
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

          {/* Map markers */}
          <MapMarker top={280} left={320} type="heritage" label="Victoria Memorial" icon="account_balance" color="#FF9933" />
          <MapMarker top={330} left={820} type="current" label="Current: Park Street" color="#138808" pulse />
          <MapMarker top={430} left={1120} type="dining" label="Dinner Reservation" icon="restaurant" />

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
              borderImage: 'linear-gradient(45deg,#FF9933,#fff,#138808) 1',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, paddingBottom: 14, borderBottom: '1px solid rgba(143,78,0,0.12)' }}>
                <h2 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 20, fontWeight: 700, color: 'var(--primary)' }}>Kolkata Heritage Tour</h2>
                <span style={{
                  padding: '3px 10px', borderRadius: 4, background: 'rgba(141,252,117,0.2)',
                  color: '#138808', fontFamily: 'JetBrains Mono, monospace', fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
                }}>Active</span>
              </div>

              <div style={{ flex: 1, overflowY: 'auto', position: 'relative' }}>
                <span style={{
                  display: 'block', fontFamily: 'JetBrains Mono, monospace',
                  fontSize: 10, fontWeight: 700, color: 'var(--outline)',
                  letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 16,
                }}>DAY 2 • NOV 15</span>

                <div style={{ position: 'relative' }}>
                  {/* Vertical line */}
                  <div style={{
                    position: 'absolute', left: 15, top: 0, bottom: 0,
                    width: 1, background: 'rgba(143,78,0,0.15)',
                  }} />

                  {TIMELINE_STOPS.map((stop, i) => (
                    <div key={i} style={{ display: 'flex', gap: 14, marginBottom: 20, position: 'relative', zIndex: 1 }}>
                      <div style={{
                        width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        ...(stop.active
                          ? { background: '#138808', border: '3px solid rgba(255,255,255,0.8)' }
                          : stop.done
                          ? { background: 'var(--surface-variant)', border: '2px solid rgba(143,78,0,0.2)' }
                          : { background: 'rgba(143,78,0,0.1)', border: '2px solid rgba(143,78,0,0.15)' }
                        ),
                      }}>
                        <span className="material-symbols-outlined" style={{
                          fontSize: 14,
                          color: stop.active ? '#fff' : 'var(--outline)',
                        }}>
                          {stop.active ? 'location_on' : stop.done ? 'check' : 'radio_button_unchecked'}
                        </span>
                      </div>
                      <div style={{ flex: 1, opacity: stop.done ? 0.6 : 1 }}>
                        <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: stop.active ? 'var(--primary)' : 'var(--outline)', fontWeight: stop.active ? 700 : 400, marginBottom: 2 }}>{stop.time}</div>
                        {stop.active ? (
                          <div className="neo-raised" style={{ borderRadius: 10, padding: 12, border: '1px solid rgba(255,153,51,0.2)' }}>
                            <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--on-surface)', marginBottom: 4 }}>{stop.name}</div>
                            <div style={{ fontSize: 12, color: 'var(--on-surface-variant)', marginBottom: 8 }}>{stop.desc}</div>
                            <div style={{ height: 4, borderRadius: 4, background: 'rgba(143,78,0,0.1)', overflow: 'hidden' }}>
                              <div style={{ height: '100%', width: `${stop.progress}%`, background: 'var(--primary)' }} />
                            </div>
                          </div>
                        ) : (
                          <div>
                            <div style={{ fontWeight: 500, fontSize: 14, color: 'var(--on-surface)' }}>{stop.name}</div>
                            <div style={{ fontSize: 12, color: 'var(--on-surface-variant)', marginTop: 2 }}>{stop.desc}</div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
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
              {/* Hero image */}
              <div style={{ height: 200, position: 'relative', overflow: 'hidden' }}>
                <div style={{
                  position: 'absolute', inset: 0,
                  backgroundImage: 'url(https://lh3.googleusercontent.com/aida-public/AB6AXuBLY2PrIlG4GYOJN_Gv8KQHawhobuDuhlWlPNOLaKNmPq2rUS_E0FLM2JYDNU-lWWeLoBfeOJH32LhKtR601C7bHDWMMMgS42cDQmUFabgs4LgYQH0bCXha7KFC8rv3Rt0wc1ORc9v-aM_U8uIL1jIs9u8LT0r98dpyCw0C_ZYXCwuPOBj2hJKtjKHKwIoXyT_qZka5G1-osH2z9Y7o5WW88ZNg7OyWeWxoBzo9rmEXL6zTB8aybmOq4w)',
                  backgroundSize: 'cover', backgroundPosition: 'center',
                }} />
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
                  <span style={{
                    display: 'inline-block', padding: '3px 10px',
                    background: 'rgba(255,153,51,0.75)', backdropFilter: 'blur(6px)',
                    borderRadius: 4, fontSize: 10, fontWeight: 700,
                    color: '#fff', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6,
                  }}>Heritage Site</span>
                  <h2 style={{
                    fontFamily: 'Cormorant Garamond, serif',
                    fontSize: 26, fontWeight: 700, color: '#fff',
                    textShadow: '0 2px 8px rgba(0,0,0,0.4)',
                  }}>Victoria Memorial</h2>
                </div>
              </div>

              {/* Card content */}
              <div style={{ flex: 1, padding: 20, display: 'flex', flexDirection: 'column', background: 'rgba(255,248,245,0.97)', overflowY: 'auto' }}>
                <p style={{ fontSize: 14, color: 'var(--on-surface-variant)', lineHeight: 1.65, marginBottom: 18 }}>
                  A majestic white marble monument built in memory of Queen Victoria. It serves as a museum housing a vast collection of paintings and manuscripts from the British period.
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
                  {[
                    { icon: 'schedule', label: 'Duration', value: '2.5 Hours' },
                    { icon: 'confirmation_number', label: 'Entry', value: '₹50 / person' },
                  ].map(info => (
                    <div key={info.label} className="neo-inset" style={{ borderRadius: 10, padding: '12px' }}>
                      <span className="material-symbols-outlined" style={{ color: 'var(--primary)', fontSize: 20, marginBottom: 4, display: 'block' }}>{info.icon}</span>
                      <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--outline)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{info.label}</div>
                      <div style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, fontSize: 14, color: 'var(--on-surface)', marginTop: 2 }}>{info.value}</div>
                    </div>
                  ))}
                </div>

                {/* AI alert */}
                <div className="neo-raised" style={{
                  borderLeft: '4px solid var(--primary)',
                  borderRadius: 10, padding: 14, marginBottom: 16,
                }}>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                    <AshokaChakra size={22} opacity={1} />
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Chakra Intelligence</div>
                      <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--on-surface)' }}>Rain expected at 4 PM.</p>
                      <p style={{ fontSize: 12, color: 'var(--on-surface-variant)', marginTop: 2 }}>Pivoting to indoor gallery tour first. Route optimized.</p>
                    </div>
                  </div>
                </div>

                <button className="btn-cta" style={{
                  width: '100%', padding: '14px', borderRadius: 12, fontSize: 15,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 20 }}>navigation</span>
                  Start Navigation
                </button>

                {/* Flight disruption pivot button */}
                <button onClick={() => setShowPivot(true)} style={{
                  marginTop: 10, width: '100%', padding: '12px',
                  borderRadius: 12, border: '2px solid var(--error)',
                  background: 'rgba(186,26,26,0.06)',
                  color: 'var(--error)', fontWeight: 700, fontSize: 14,
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 18 }}>warning</span>
                  Simulate Flight Disruption
                </button>
              </div>
            </div>
          </aside>
        </div>
      </div>

      {/* ── Disruption Pivot Modal ── */}
      {showPivot && <PivotModal onClose={() => setShowPivot(false)} />}

      <Footer />
    </>
  )
}

function MapMarker({ top, left, type, label, icon, color = '#FF9933', pulse = false }) {
  const [hov, setHov] = useState(false)
  return (
    <div
      style={{
        position: 'absolute', top, left,
        transform: 'translate(-50%,-50%)',
        zIndex: 5, display: 'flex', flexDirection: 'column', alignItems: 'center',
        cursor: 'pointer',
      }}
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
          whiteSpace: 'nowrap',
        }}>{label}</div>
      )}
    </div>
  )
}

function PivotModal({ onClose }) {
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
              <h2 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 26, fontWeight: 700, color: 'var(--on-surface)' }}>Flight 6E-201 Delayed</h2>
              <p style={{ fontSize: 14, color: 'var(--on-surface-variant)', marginTop: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>smart_toy</span>
                Chakra AI has proposed an optimal itinerary pivot.
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

        {/* Body: two columns */}
        <div style={{ padding: '28px', display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 16, background: 'rgba(255,248,245,0.6)' }}>
          {/* Original */}
          <div>
            <h3 style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, fontWeight: 700, color: 'var(--outline)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 14 }}>Original Plan</h3>
            <div className="neo-raised" style={{ borderRadius: 14, padding: '20px', opacity: 0.7 }}>
              <TimelineItem time="10:00 AM" title="City Palace Tour" loc="Jaipur, Rajasthan" />
              <TimelineItem time="02:30 PM" title="Albert Hall Museum" loc="Delay impact detected" error />
            </div>
          </div>

          {/* Arrow */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div className="neo-raised" style={{ width: 40, height: 40, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span className="material-symbols-outlined" style={{ color: 'var(--primary)' }}>arrow_forward</span>
            </div>
          </div>

          {/* AI Pivot */}
          <div>
            <h3 style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 14, display: 'flex', gap: 6, alignItems: 'center' }}>
              <span className="material-symbols-outlined" style={{ fontSize: 14 }}>auto_awesome</span>
              AI Proposed Pivot
            </h3>
            <div className="neo-raised" style={{ borderRadius: 14, padding: '20px', border: '1px solid rgba(255,153,51,0.25)', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: -30, right: -30, width: 100, height: 100, background: 'rgba(255,153,51,0.08)', borderRadius: '50%', filter: 'blur(20px)' }} />
              <TimelineItem time="09:30 AM" title="Albert Hall Museum" badge="Moved Earlier" loc="Beats the afternoon heat." primary />
              <TimelineItem time="07:00 PM" title="Heritage Dinner at Chokhi Dhani" badge="New Addition" loc="Fills the evening gap nicely." green />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: '18px 28px', borderTop: '1px solid rgba(143,78,0,0.12)',
          background: 'rgba(255,248,245,0.8)',
          display: 'flex', justifyContent: 'flex-end', gap: 12,
        }}>
          <button onClick={onClose} className="neo-raised" style={{
            padding: '12px 24px', borderRadius: 999, border: '1px solid var(--outline-variant)',
            background: 'none', fontSize: 15, fontWeight: 600, color: 'var(--on-surface-variant)', cursor: 'pointer',
          }}>Keep Original</button>
          <button className="btn-cta" onClick={onClose} style={{
            padding: '12px 28px', borderRadius: 999, fontSize: 15,
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>check_circle</span>
            Confirm Re-plan
          </button>
        </div>
      </div>
    </div>
  )
}

function TimelineItem({ time, title, loc, error, primary, green, badge }) {
  return (
    <div style={{ display: 'flex', gap: 12, marginBottom: 20, alignItems: 'flex-start' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
        <div style={{ width: 12, height: 12, borderRadius: '50%', background: error ? 'var(--error)' : primary ? 'var(--primary)' : green ? '#138808' : 'var(--outline)' }} />
        <div style={{ width: 1, height: 36, background: 'rgba(143,78,0,0.12)', margin: '4px 0' }} />
      </div>
      <div style={{
        flex: 1, padding: '10px 12px', borderRadius: 8,
        background: error ? 'rgba(186,26,26,0.06)' : primary ? 'rgba(255,153,51,0.06)' : 'transparent',
        border: error ? '1px solid rgba(186,26,26,0.15)' : primary ? '1px solid rgba(255,153,51,0.18)' : 'none',
      }}>
        <div style={{
          fontFamily: 'JetBrains Mono, monospace', fontSize: 12, marginBottom: 2,
          color: error ? 'var(--error)' : primary ? 'var(--primary)' : green ? '#138808' : 'var(--on-surface-variant)',
          textDecoration: error ? 'line-through' : 'none',
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          {time}
          {badge && <span style={{
            fontSize: 10, padding: '2px 8px', background: 'rgba(143,115,100,0.12)',
            borderRadius: 4, color: 'var(--outline)',
          }}>{badge}</span>}
        </div>
        <div style={{ fontWeight: 600, fontSize: 15, color: 'var(--on-surface)', textDecoration: error ? 'line-through' : 'none' }}>{title}</div>
        <div style={{ fontSize: 12, marginTop: 3, color: error ? 'var(--error)' : 'var(--on-surface-variant)' }}>{loc}</div>
      </div>
    </div>
  )
}
