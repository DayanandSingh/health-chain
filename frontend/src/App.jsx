import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Layout from "./components/Layout";
import AdminLayout from "./components/AdminLayout";
import DoctorLayout from "./components/DoctorLayout";

// Patient pages
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Register from "./pages/Register";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfService from "./pages/TermsOfService";
import Dashboard from "./pages/Dashboard";
import Records from "./pages/Records";
import Permissions from "./pages/Permissions";
import MedicalNotes from "./pages/MedicalNotes";
import Profile from "./pages/Profile";
import Audit from "./pages/Audit";

// Admin pages
import Admin from "./pages/Admin";
import AdminPatients from "./pages/admin/AdminPatients";
import AdminDoctors from "./pages/admin/AdminDoctors";
import AdminMedicalRecords from "./pages/admin/AdminMedicalRecords";
import AdminDoctorNotes from "./pages/admin/AdminDoctorNotes";

// Doctor pages
import DoctorDashboard from "./pages/doctor/DoctorDashboard";
import DoctorPatients from "./pages/doctor/DoctorPatients";
import DoctorSharedRecords from "./pages/doctor/DoctorSharedRecords";
import DoctorNotes from "./pages/doctor/DoctorNotes";
import DoctorProfile from "./pages/doctor/DoctorProfile";

const ADMIN_ROLES = ["system_admin", "hospital_admin", "admin"];

// Redirects admin → /admin, doctor → /doctor/dashboard, patient stays on Dashboard
function DashboardGate() {
  const { user } = useAuth();
  if (user?.role === "doctor") return <Navigate to="/doctor/dashboard" replace />;
  if (ADMIN_ROLES.includes(user?.role)) return <Navigate to="/admin" replace />;
  return <Dashboard />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/privacy-policy" element={<PrivacyPolicy />} />
      <Route path="/terms-of-service" element={<TermsOfService />} />

      {/* ── Patient routes (Layout) ─────────────────────────────────────── */}
      <Route
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard" element={<DashboardGate />} />
        <Route path="/records" element={<Records />} />
        <Route path="/permissions" element={<Permissions />} />
        <Route
          path="/medical-notes"
          element={
            <ProtectedRoute roles={["patient"]}>
              <MedicalNotes />
            </ProtectedRoute>
          }
        />
        <Route path="/profile" element={<Profile />} />
        <Route path="/audit" element={<Audit />} />
      </Route>

      {/* ── Admin routes (AdminLayout) ──────────────────────────────────── */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute roles={ADMIN_ROLES}>
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Admin />} />
        <Route path="patients"    element={<AdminPatients />} />
        <Route path="doctors"     element={<AdminDoctors />} />
        <Route path="records"      element={<AdminMedicalRecords />} />
        <Route path="doctor-notes" element={<AdminDoctorNotes />} />
        <Route path="permissions"  element={<Permissions />} />
        <Route path="audit"       element={<Audit />} />
        <Route path="profile"     element={<Profile />} />
      </Route>

      {/* ── Doctor routes (DoctorLayout) ────────────────────────────────── */}
      <Route
        path="/doctor"
        element={
          <ProtectedRoute roles={["doctor"]}>
            <DoctorLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/doctor/dashboard" replace />} />
        <Route path="dashboard"      element={<DoctorDashboard />} />
        <Route path="patients"       element={<DoctorPatients />} />
        <Route path="shared-records" element={<DoctorSharedRecords />} />
        <Route path="notes"          element={<DoctorNotes />} />
        <Route path="profile"        element={<DoctorProfile />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
