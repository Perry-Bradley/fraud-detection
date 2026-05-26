import { Navigate, Route, Routes } from 'react-router-dom'
import Login from './pages/Login.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Students from './pages/Students.jsx'
import StudentDetail from './pages/StudentDetail.jsx'
import Payments from './pages/Payments.jsx'
import Reports from './pages/Reports.jsx'
import AuditLogPage from './pages/AuditLog.jsx'
import Announcements from './pages/Announcements.jsx'
import StaffLayout from './components/Layout.jsx'
import StudentLayout from './components/StudentLayout.jsx'
import PortalDashboard from './pages/portal/PortalDashboard.jsx'
import PortalPayments from './pages/portal/PortalPayments.jsx'
import PortalPay from './pages/portal/PortalPay.jsx'
import PortalSettings from './pages/portal/PortalSettings.jsx'
import { useAuth } from './context/AuthContext.jsx'

function RoleHome() {
  const { user } = useAuth()
  return <Navigate to={user?.role === 'student' ? '/portal' : '/staff'} replace />
}

function StaffOnly({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <div style={{ padding: 24 }}>Loading...</div>
  if (!user) return <Navigate to="/login" replace />
  if (user.role === 'student') return <Navigate to="/portal" replace />
  return <StaffLayout>{children}</StaffLayout>
}

function StudentOnly({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <div style={{ padding: 24 }}>Loading...</div>
  if (!user) return <Navigate to="/login" replace />
  if (user.role !== 'student') return <Navigate to="/staff" replace />
  return <StudentLayout>{children}</StudentLayout>
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<RoleHome />} />

      {/* Staff */}
      <Route path="/staff" element={<StaffOnly><Dashboard /></StaffOnly>} />
      <Route path="/staff/students" element={<StaffOnly><Students /></StaffOnly>} />
      <Route path="/staff/students/:id" element={<StaffOnly><StudentDetail /></StaffOnly>} />
      <Route path="/staff/payments" element={<StaffOnly><Payments /></StaffOnly>} />
      <Route path="/staff/reports" element={<StaffOnly><Reports /></StaffOnly>} />
      <Route path="/staff/announcements" element={<StaffOnly><Announcements /></StaffOnly>} />
      <Route path="/staff/audit" element={<StaffOnly><AuditLogPage /></StaffOnly>} />

      {/* Student portal */}
      <Route path="/portal" element={<StudentOnly><PortalDashboard /></StudentOnly>} />
      <Route path="/portal/payments" element={<StudentOnly><PortalPayments /></StudentOnly>} />
      <Route path="/portal/pay" element={<StudentOnly><PortalPay /></StudentOnly>} />
      <Route path="/portal/announcements" element={<StudentOnly><Announcements /></StudentOnly>} />
      <Route path="/portal/settings" element={<StudentOnly><PortalSettings /></StudentOnly>} />

      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  )
}
