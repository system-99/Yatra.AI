import { useState } from 'react'
import { Footer } from '../components/Layout'

const BOOKINGS = [
  {
    type: 'flight', icon: 'flight_takeoff', color: '#138808',
    badge: 'Upcoming Flight', title: 'Air India • AI-302',
    dep: { code: 'DEL', time: '10:45 AM', date: 'Oct 24, 2024' },
    arr: { code: 'BOM', time: '12:55 PM', date: 'Oct 24, 2024' },
    tags: ['🌿 Eco-Travel', 'Seat 14A'],
    qr: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDWeLxv6osFpTcpREFCFBvTpi1QrAX3I_MZvrdyrXYX4UPdnB2YK9P-ISD4gmpHeGHCoUJIe1X5WxD3kZ6FcQKdreO0k1-It8pYmWkXV8k3cmmgJgD9Adg0ykpFdmXJ81fOuRwKxrsHGb4FPibUgUi9Fg7Lu-kQrZhJziuxpjm9y9iIpJzvV4B1sbJ9PvttuF1h0HHJb1khfEcwgcCOWpoHzo0Jcy3aSCU9Jamg_keU-slqaL1Rvt_vJQ',
  },
  {
    type: 'hotel', icon: 'hotel', color: '#FF9933',
    badge: 'Hotel Booking', title: 'Rambagh Palace, Jaipur',
    dep: { code: 'Check-in', time: 'Dec 15', date: '12:00 PM' },
    arr: { code: 'Check-out', time: 'Dec 17', date: '11:00 AM' },
    tags: ['Luxury Suite', 'Breakfast Included'],
    qr: null,
  },
]

const DOCS = [
  { icon: 'badge',    label: 'E-Visa: India',          sub: 'Valid till: Dec 2024' },
  { icon: 'article',  label: 'Travel Insurance',        sub: 'Policy #HF-293841' },
  { icon: 'qr_code',  label: 'Amber Fort e-Ticket',    sub: 'Dec 16 • 10:00 AM' },
]

export default function VaultPage() {
  const [addHov, setAddHov] = useState(false)

  return (
    <>
      <div className="page-content" style={{ background: '#F4F4F4' }}>
        <main style={{ padding: '40px 40px 80px', maxWidth: 1280, margin: '0 auto', position: 'relative' }}>

          {}
          <div style={{
            position: 'fixed', top: '20%', right: 0,
            width: 400, height: 400, marginRight: '-150px',
            opacity: 0.04, pointerEvents: 'none', zIndex: 0,
          }}>
            <svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
              <circle cx="100" cy="100" r="90" stroke="#000080" strokeWidth="3" />
              <circle cx="100" cy="100" r="12" stroke="#000080" strokeWidth="3" />
              {Array.from({ length: 24 }).map((_, i) => {
                const rad = (i * 15 * Math.PI) / 180
                return <line key={i} x1={100 + 12*Math.cos(rad)} y1={100 + 12*Math.sin(rad)} x2={100 + 90*Math.cos(rad)} y2={100 + 90*Math.sin(rad)} stroke="#000080" strokeWidth="1.5" />
              })}
            </svg>
          </div>

          {}
          <div style={{ marginBottom: 40, position: 'relative', zIndex: 2 }}>
            <h1 style={{
              fontFamily: 'Cormorant Garamond, serif',
              fontSize: 64, fontWeight: 700,
              color: 'var(--primary)', marginBottom: 10,
              letterSpacing: '-0.02em',
            }}>Digital Vault</h1>
            <p style={{ fontSize: 18, color: 'var(--on-surface-variant)', maxWidth: 600, lineHeight: 1.65 }}>
              Your high-security AI concierge. Securely access active itineraries, e-visas, and digital passes with instant QR entry.
            </p>
          </div>

          {}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 28, position: 'relative', zIndex: 2 }}>

            {}
            <div>
              <h2 style={{
                fontFamily: 'Cormorant Garamond, serif', fontSize: 28, fontWeight: 600,
                color: 'var(--on-surface)', marginBottom: 22,
                display: 'flex', alignItems: 'center', gap: 10,
              }}>
                <span className="material-symbols-outlined" style={{ color: '#FF9933', fontSize: 28 }}>confirmation_number</span>
                Active Bookings
              </h2>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                {BOOKINGS.map((b, i) => (
                  <BookingCard key={i} booking={b} />
                ))}
              </div>
            </div>

            {}
            <div>
              <div style={{ position: 'sticky', top: 96 }}>
                <h2 style={{
                  fontFamily: 'Cormorant Garamond, serif', fontSize: 28, fontWeight: 600,
                  color: 'var(--on-surface)', marginBottom: 22,
                  display: 'flex', alignItems: 'center', gap: 10,
                }}>
                  <span className="material-symbols-outlined" style={{ color: 'var(--outline)', fontSize: 28 }}>folder_special</span>
                  Digital Documents
                </h2>

                <div className="glass-panel" style={{
                  borderRadius: 20, padding: '20px',
                  borderLeft: '4px solid var(--primary-container)',
                  display: 'flex', flexDirection: 'column', gap: 14,
                }}>
                  {DOCS.map((doc, i) => (
                    <button key={i} className="neo-raised" style={{
                      borderRadius: 12, padding: '14px 16px',
                      display: 'flex', alignItems: 'center', gap: 14,
                      border: 'none', cursor: 'pointer', width: '100%', textAlign: 'left',
                      transition: 'box-shadow 0.15s',
                    }}
                      onMouseEnter={e => e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.1)'}
                      onMouseLeave={e => e.currentTarget.style.boxShadow = ''}
                    >
                      <div style={{
                        width: 44, height: 44, borderRadius: 10,
                        background: 'rgba(255,255,255,0.7)',
                        border: '1px solid var(--outline-variant)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                      }}>
                        <span className="material-symbols-outlined" style={{ color: 'var(--primary)', fontSize: 22 }}>{doc.icon}</span>
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--on-surface)' }}>{doc.label}</div>
                        <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: 'var(--on-surface-variant)', marginTop: 3 }}>{doc.sub}</div>
                      </div>
                      <span className="material-symbols-outlined" style={{ color: 'var(--outline-variant)', fontSize: 20 }}>chevron_right</span>
                    </button>
                  ))}

                  {}
                  <button className="btn-cta" style={{
                    width: '100%', padding: '12px', borderRadius: 12, fontSize: 14,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    marginTop: 4,
                  }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 18 }}>add</span>
                    Add Document
                  </button>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>

      {}
      <button
        style={{
          position: 'fixed', bottom: 32, right: 40, zIndex: 100,
          width: 64, height: 64, borderRadius: '50%',
          background: 'var(--primary-container)', border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: addHov ? '0 0 30px rgba(198,168,75,0.8)' : '0 0 20px rgba(198,168,75,0.5)',
          transform: addHov ? 'translateY(-3px)' : '',
          transition: 'box-shadow 0.2s, transform 0.15s',
        }}
        onMouseEnter={() => setAddHov(true)}
        onMouseLeave={() => setAddHov(false)}
      >
        <span className="material-symbols-outlined" style={{ color: '#fff', fontSize: 32 }}>add</span>
      </button>

      <Footer />
    </>
  )
}

function BookingCard({ booking: b }) {
  const [hov, setHov] = useState(false)
  return (
    <article className="flag-border" style={{
      borderRadius: 20, position: 'relative', overflow: 'hidden',
    }}>
      <div className="glass-panel" style={{
        borderRadius: 19, padding: '24px',
        transition: 'box-shadow 0.2s',
        boxShadow: hov ? '0 12px 32px rgba(0,0,0,0.1)' : undefined,
      }}
        onMouseEnter={() => setHov(true)}
        onMouseLeave={() => setHov(false)}
      >
        <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>
          {}
          <div style={{ flex: 1 }}>
            {}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
              <div style={{
                width: 40, height: 40, borderRadius: '50%',
                background: `${b.color}14`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <span className="material-symbols-outlined" style={{ color: b.color, fontSize: 20 }}>{b.icon}</span>
              </div>
              <div>
                <span style={{
                  fontFamily: 'JetBrains Mono, monospace', fontSize: 10,
                  fontWeight: 700, color: b.color,
                  letterSpacing: '0.1em', textTransform: 'uppercase', display: 'block', marginBottom: 3,
                }}>{b.badge}</span>
                <h3 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 22, fontWeight: 600, color: 'var(--on-surface)' }}>{b.title}</h3>
              </div>
            </div>

            {}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 18 }}>
              {[b.dep, b.arr].map((seg, i) => (
                <div key={i}>
                  <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, fontWeight: 700, color: 'var(--outline)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>{seg.code}</p>
                  <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 20, fontWeight: 700, color: '#000080' }}>{seg.time}</p>
                  <p style={{ fontSize: 13, color: 'var(--on-surface-variant)', marginTop: 2 }}>{seg.date}</p>
                </div>
              ))}
            </div>

            {}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {b.tags.map(tag => (
                <span key={tag} style={{
                  padding: '5px 14px', borderRadius: 999,
                  border: tag.includes('🌿') ? '1px solid #138808' : '1px solid var(--outline-variant)',
                  background: tag.includes('🌿') ? 'rgba(19,136,8,0.08)' : 'rgba(143,115,100,0.08)',
                  fontSize: 12, fontWeight: 700,
                  color: tag.includes('🌿') ? '#138808' : 'var(--on-surface-variant)',
                }}>{tag}</span>
              ))}
            </div>
          </div>

          {}
          {b.qr && (
            <div style={{
              width: 140, flexShrink: 0,
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              padding: '16px', background: 'rgba(255,255,255,0.5)',
              borderRadius: 12, border: '1px solid rgba(255,255,255,0.6)',
            }}>
              <img src={b.qr} alt="QR" style={{ width: 100, height: 100, borderRadius: 8, marginBottom: 10 }} />
              <span style={{
                fontFamily: 'JetBrains Mono, monospace', fontSize: 10,
                fontWeight: 700, color: 'var(--primary)',
                letterSpacing: '0.08em', textTransform: 'uppercase',
                display: 'flex', alignItems: 'center', gap: 4,
              }}>
                <span className="material-symbols-outlined" style={{ fontSize: 14 }}>qr_code_scanner</span>
                Instant Entry
              </span>
            </div>
          )}
        </div>
      </div>
    </article>
  )
}
