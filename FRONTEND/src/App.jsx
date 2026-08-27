import { useEffect, useState } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { Navbar } from './components/Layout'
import Home from './pages/Home'
import Itinerary from './pages/Itinerary'
import MapPage from './pages/Map'
import Profile from './pages/Profile'
import AuthPage from './pages/Auth'
import Lenis from '@studio-freight/lenis'
import { api, getStoredAuth, saveAuth } from './services/api'
import { supabase, userForApp } from './auth/supabase'

function ProtectedRoute({ user, children }) {
  if (!user) {
    return <Navigate to="/auth" replace />
  }
  return children
}

function App() {
  const [user, setUser] = useState(() => getStoredAuth()?.user ?? null)

  const handleLogout = async () => {
    await supabase.auth.signOut()
    saveAuth(null)
    setUser(null)
  }

  useEffect(() => {
    const syncUser = () => {
      const session = getStoredAuth()
      if (!session?.token) {
        setUser(null)
        return
      }

      api.getCurrentUser().then((profile) => {
        setUser(profile)
        saveAuth({ token: session.token, user: profile })
      }).catch((error) => {
        if (error.status === 401) {
          saveAuth(null)
          setUser(null)
        }
      })
    }

    syncUser()
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session?.user) {
        saveAuth(null)
        setUser(null)
        return
      }
      const appUser = userForApp(session.user)
      saveAuth({ token: session.access_token, user: appUser })
      setUser(appUser)
    })
    const handleAuthChange = () => syncUser()
    window.addEventListener('yatra-auth-changed', handleAuthChange)
    window.addEventListener('storage', handleAuthChange)

    return () => {
      window.removeEventListener('yatra-auth-changed', handleAuthChange)
      window.removeEventListener('storage', handleAuthChange)
      listener.subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      direction: 'vertical',
      gestureDirection: 'vertical',
      smooth: true,
      mouseMultiplier: 1,
      smoothTouch: false,
      touchMultiplier: 2,
      infinite: false,
    })

    let rafId;

    function raf(time) {
      lenis.raf(time)
      rafId = requestAnimationFrame(raf)
    }

    rafId = requestAnimationFrame(raf)

    return () => {
      cancelAnimationFrame(rafId)
      lenis.destroy()
    }
  }, [])

  return (
    <>
      <Navbar user={user} onLogout={handleLogout} />
      <Routes>
        <Route path="/" element={<ProtectedRoute user={user}><Home user={user} /></ProtectedRoute>} />
        <Route path="/auth" element={<AuthPage onAuth={setUser} />} />
        <Route path="/itinerary" element={<ProtectedRoute user={user}><Itinerary /></ProtectedRoute>} />
        <Route path="/map" element={<ProtectedRoute user={user}><MapPage /></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute user={user}><Profile user={user} /></ProtectedRoute>} />
      </Routes>
    </>
  )
}

export default App
