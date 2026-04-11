import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import Background from './components/Background'
import Cursor from './components/Cursor'
import Navbar from './components/Navbar'
import Landing from './pages/Landing'
import Login, { Signup } from './pages/Login'
import Dashboard from './pages/Dashboard'
import Validate from './pages/Validate'
import Report from './pages/Report'
import { AuthProvider, useAuth } from './lib/auth'

function Protected({ children }: { children: JSX.Element }) {
  const { user, loading } = useAuth()
  if (loading) return null
  if (!user) return <Navigate to="/login" replace />
  return children
}

function AnimatedRoutes() {
  const location = useLocation()
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route
          path="/dashboard"
          element={
            <Protected>
              <Dashboard />
            </Protected>
          }
        />
        <Route
          path="/validate"
          element={
            <Protected>
              <Validate />
            </Protected>
          }
        />
        <Route
          path="/report/:id"
          element={
            <Protected>
              <Report />
            </Protected>
          }
        />
      </Routes>
    </AnimatePresence>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <Background />
      <Cursor />
      <Navbar />
      <AnimatedRoutes />
    </AuthProvider>
  )
}
