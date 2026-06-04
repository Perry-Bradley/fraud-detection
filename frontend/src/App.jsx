import { Navigate, Route, Routes } from 'react-router-dom'
import Login from './pages/Login.jsx'
import Landing from './pages/Landing.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Students from './pages/Students.jsx'
import StudentDetail from './pages/StudentDetail.jsx'
import Payments from './pages/Payments.jsx'
import Reports from './pages/Reports.jsx'
import AuditLogPage from './pages/AuditLog.jsx'
import Announcements from './pages/Announcements.jsx'
import Anomalies from './pages/Anomalies.jsx'
import Timetable from './pages/Timetable.jsx'
import Gradebook from './pages/Gradebook.jsx'
import ReportCards from './pages/ReportCards.jsx'
import Attendance from './pages/Attendance.jsx'
import Exams from './pages/Exams.jsx'
import Admissions from './pages/Admissions.jsx'
import Staff from './pages/Staff.jsx'
import StaffLayout from './components/Layout.jsx'
import StudentLayout from './components/StudentLayout.jsx'
import PortalDashboard from './pages/portal/PortalDashboard.jsx'
import PortalPayments from './pages/portal/PortalPayments.jsx'
import PortalPay from './pages/portal/PortalPay.jsx'
import PortalSettings from './pages/portal/PortalSettings.jsx'
import { useAuth } from './context/AuthContext.jsx'

function Home() {
  const { user, loading } = useAuth()
  if (loading) return <div style={{ padding: 24 }}>Loading...</div>
  // Logged-in users go to their dashboard; everyone else sees the landing page.
  if (user) return <Navigate to={user.role === 'student' ? '/portal' : '/staff'} replace />
  return <Landing />
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
      <Route path="/" element={<Home />} />

      {/* Staff */}
      <Route path="/staff" element={<StaffOnly><Dashboard /></StaffOnly>} />
      <Route path="/staff/students" element={<StaffOnly><Students /></StaffOnly>} />
      <Route path="/staff/students/:id" element={<StaffOnly><StudentDetail /></StaffOnly>} />
      <Route path="/staff/payments" element={<StaffOnly><Payments /></StaffOnly>} />
      <Route path="/staff/anomalies" element={<StaffOnly><Anomalies /></StaffOnly>} />
      <Route path="/staff/timetable" element={<StaffOnly><Timetable /></StaffOnly>} />
      <Route path="/staff/gradebook" element={<StaffOnly><Gradebook /></StaffOnly>} />
      <Route path="/staff/report-cards" element={<StaffOnly><ReportCards /></StaffOnly>} />
      <Route path="/staff/attendance" element={<StaffOnly><Attendance /></StaffOnly>} />
      <Route path="/staff/exams" element={<StaffOnly><Exams /></StaffOnly>} />
      <Route path="/staff/admissions" element={<StaffOnly><Admissions /></StaffOnly>} />
      <Route path="/staff/staff" element={<StaffOnly><Staff /></StaffOnly>} />
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
