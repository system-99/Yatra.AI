
import { Link, useLocation } from 'react-router-dom'

export function Navbar({ user, onLogout }) {
  const loc = useLocation()
  const active = (path) => loc.pathname === path ? 'active' : ''

  return (
    <nav className="topnav">
      <div className="topnav-inner">
        <Link to="/" className="brand">
          <AshokaChakraMini />
          YATRA.AI
        </Link>
        <div className="nav-links">
          <Link to="/" className={active('/')}>Explore</Link>
          <Link to="/itinerary" className={active('/itinerary')}>My Trips</Link>
          <Link to="/map" className={active('/map')}>Live Map</Link>
          <Link to="/profile" className={active('/profile')}>Profile</Link>
        </div>
        {user ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{
              fontSize: 14,
              color: 'var(--primary)',
              fontWeight: 700,
              background: 'rgba(255, 153, 51, 0.12)',
              padding: '6px 16px',
              borderRadius: 20,
              fontFamily: 'Plus Jakarta Sans, sans-serif',
              textTransform: 'capitalize',
              letterSpacing: '0.02em',
            }}>{user.name}</span>
            <button className="btn-signin" onClick={onLogout} type="button">Log Out</button>
          </div>
        ) : (
          <Link to="/auth" className="btn-signin" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>Sign In</Link>
        )}
      </div>
    </nav>
  )
}

export function Footer() {
  return (
    <footer className="footer">
      <div className="footer-brand">YATRA.AI</div>
      <div className="footer-links">
        <a href="#">Privacy Policy</a>
        <a href="#">Terms of Service</a>
        <a href="#">Heritage Partners</a>
        <a href="#">Contact Us</a>
      </div>
      <div className="footer-copy">© 2026 YATRA.AI Travel · Powered by Gemini AI · Made in Bharat 🇮🇳</div>
    </footer>
  )
}

export function AshokaChakra({ size = 120, opacity = 0.15, className = '' }) {
  return (
    <svg
      width={size} height={size}
      viewBox="0 0 200 200"
      className={`chakra-spin ${className}`}
      style={{ opacity }}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="100" cy="100" r="85" stroke="#C6A84B" strokeWidth="3.5" />
      <circle cx="100" cy="100" r="12" stroke="#C6A84B" strokeWidth="3.5" />
      {Array.from({ length: 24 }).map((_, i) => {
        const angle = (i * 360) / 24
        const rad = (angle * Math.PI) / 180
        const x1 = 100 + 12 * Math.cos(rad)
        const y1 = 100 + 12 * Math.sin(rad)
        const x2 = 100 + 85 * Math.cos(rad)
        const y2 = 100 + 85 * Math.sin(rad)
        return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#C6A84B" strokeWidth="1.5" strokeLinecap="round" />
      })}
    </svg>
  )
}

function AshokaChakraMini() {
  return (
    <svg width="28" height="28" viewBox="0 0 200 200" fill="none" className="chakra-spin">
      <circle cx="100" cy="100" r="85" stroke="#FF9933" strokeWidth="8" />
      <circle cx="100" cy="100" r="12" stroke="#FF9933" strokeWidth="8" />
      {Array.from({ length: 24 }).map((_, i) => {
        const rad = ((i * 360) / 24 * Math.PI) / 180
        return <line key={i} x1={100 + 12*Math.cos(rad)} y1={100 + 12*Math.sin(rad)} x2={100 + 85*Math.cos(rad)} y2={100 + 85*Math.sin(rad)} stroke="#FF9933" strokeWidth="4" strokeLinecap="round" />
      })}
    </svg>
  )
}
