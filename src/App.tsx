import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { AuthProvider } from './contexts/AuthContext';
import Layout from './components/Layout/Layout';
import Dashboard from './pages/Dashboard';
import StudentList from './pages/StudentList';
import StudentForm from './pages/StudentForm';
import StudentProfile from './pages/StudentProfile';
import Reports from './pages/Reports';
import AuditLog from './pages/AuditLog';
import Downloads from './pages/Downloads';
import Settings from './pages/Settings';
import Admissions from './pages/Admissions';
import TransferCertificates from './pages/TransferCertificates';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID ?? '';

export default function App() {
  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Layout />}>
              <Route index element={<Dashboard />} />
              <Route path="students" element={<StudentList />} />
              <Route path="students/add" element={<StudentForm />} />
              <Route path="students/:id" element={<StudentProfile />} />
              <Route path="students/:id/edit" element={<StudentForm />} />
              <Route path="admissions" element={<Admissions />} />
              <Route path="transfer-certificates" element={<TransferCertificates />} />
              <Route path="reports" element={<Reports />} />
              <Route path="downloads" element={<Downloads />} />
              <Route path="audit-logs" element={<AuditLog />} />
              <Route path="settings" element={<Settings />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </GoogleOAuthProvider>
  );
}
