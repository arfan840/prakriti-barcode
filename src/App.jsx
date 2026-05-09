import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import LoginPage from './pages/LoginPage';
import AdminDashboard from './pages/admin/Dashboard';
import AdminHospitals from './pages/admin/Hospitals';
import AdminUsers from './pages/admin/Users';
import AdminBags from './pages/admin/Bags';
import AdminDiscrepancies from './pages/admin/Discrepancies';
import AdminReports from './pages/admin/Reports';
import AdminAudit from './pages/admin/Audit';
import AdminCertificates from './pages/admin/Certificates';
import AdminVehicles from './pages/admin/Vehicles';
import PlantDashboard from './pages/plant/Dashboard';
import PlantGateScan from './pages/plant/GateScan';
import PlantReconciliation from './pages/plant/Reconciliation';
import PlantBatches from './pages/plant/Batches';
import PlantTreatment from './pages/plant/Treatment';
import DriverHome from './pages/driver/Home';
import DriverScan from './pages/driver/Scan';
import DriverCheckin from './pages/driver/Checkin';
import DriverWeigh from './pages/driver/Weigh';
import DriverManifest from './pages/driver/Manifest';
import DriverSync from './pages/driver/Sync';
import AppLayout from './components/AppLayout';

function ProtectedRoute({ children, roles }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading-spinner" />;
  if (!user) return <Navigate to="/login" />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/login" />;
  return children;
}

function AppRoutes() {
  const { user } = useAuth();

  const getDefaultRoute = () => {
    if (!user) return '/login';
    if (user.role === 'driver') return '/driver';
    if (user.role === 'plant_manager') return '/plant';
    return '/admin';
  };

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<Navigate to={getDefaultRoute()} />} />

      {/* Admin Routes */}
      <Route path="/admin" element={<ProtectedRoute roles={['plant_head', 'plant_manager', 'regulatory']}><AppLayout module="admin" /></ProtectedRoute>}>
        <Route index element={<AdminDashboard />} />
        <Route path="hospitals" element={<AdminHospitals />} />
        <Route path="users" element={<AdminUsers />} />
        <Route path="bags" element={<AdminBags />} />
        <Route path="vehicles" element={<AdminVehicles />} />
        <Route path="discrepancies" element={<AdminDiscrepancies />} />
        <Route path="reports" element={<AdminReports />} />
        <Route path="audit" element={<AdminAudit />} />
        <Route path="certificates" element={<AdminCertificates />} />
      </Route>

      {/* Plant Routes */}
      <Route path="/plant" element={<ProtectedRoute roles={['plant_head', 'plant_manager']}><AppLayout module="plant" /></ProtectedRoute>}>
        <Route index element={<PlantDashboard />} />
        <Route path="gate-scan" element={<PlantGateScan />} />
        <Route path="reconciliation" element={<PlantReconciliation />} />
        <Route path="batches" element={<PlantBatches />} />
        <Route path="treatment" element={<PlantTreatment />} />
      </Route>

      {/* Driver Routes */}
      <Route path="/driver" element={<ProtectedRoute roles={['driver']}><AppLayout module="driver" /></ProtectedRoute>}>
        <Route index element={<DriverHome />} />
        <Route path="scan" element={<DriverScan />} />
        <Route path="checkin" element={<DriverCheckin />} />
        <Route path="weigh" element={<DriverWeigh />} />
        <Route path="manifest" element={<DriverManifest />} />
        <Route path="sync" element={<DriverSync />} />
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
