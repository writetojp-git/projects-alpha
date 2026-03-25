import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import AppLayout from './components/layout/AppLayout'

// Auth pages
import Login from './pages/auth/Login'
import Register from './pages/auth/Register'
import ForgotPassword from './pages/auth/ForgotPassword'

// App pages
import Dashboard from './pages/dashboard/Dashboard'
import Portfolio from './pages/portfolio/Portfolio'
import Intake from './pages/intake/Intake'
import Workspace from './pages/workspace/Workspace'
import Charter from './pages/charter/Charter'
import Execution from './pages/execution/Execution'
import Templates from './pages/templates/Templates'
import Activity from './pages/activity/Activity'
import Billing from './pages/billing/Billing'
import Settings from './pages/settings/Settings'

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public auth routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />

          {/* Protected app routes */}
          <Route element={<AppLayout />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/portfolio" element={<Portfolio />} />
            <Route path="/intake" element={<Intake />} />
            <Route path="/workspace" element={<Workspace />} />
            <Route path="/charter" element={<Charter />} />
            <Route path="/execution" element={<Execution />} />
            <Route path="/templates" element={<Templates />} />
            <Route path="/activity" element={<Activity />} />
            <Route path="/billing" element={<Billing />} />
            <Route path="/settings" element={<Settings />} />
          </Route>

          {/* Default redirect */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
