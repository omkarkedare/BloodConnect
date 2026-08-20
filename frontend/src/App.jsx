import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';

// Layouts
import PublicLayout from './layouts/PublicLayout';
import DashboardLayout from './layouts/DashboardLayout';

// Route guards
import ProtectedRoute from './routes/ProtectedRoute';

// Public pages
import HomePage from './pages/public/HomePage';
import AboutPage from './pages/public/AboutPage';
import HowItWorksPage from './pages/public/HowItWorksPage';
import BloodGroupsPage from './pages/public/BloodGroupsPage';
import ContactPage from './pages/public/ContactPage';
import LoginPage from './pages/public/LoginPage';
import RegisterPage from './pages/public/RegisterPage';

// Donor pages
import DonorDashboard from './pages/donor/DonorDashboard';
import DonorProfile from './pages/donor/DonorProfile';
import DonorRequests from './pages/donor/DonorRequests';
import DonorRequestDetail from './pages/donor/DonorRequestDetail';
import DonorDonations from './pages/donor/DonorDonations';
import DonorSettings from './pages/donor/DonorSettings';

// Requester pages
import RequesterDashboard from './pages/requester/RequesterDashboard';
import CreateRequest from './pages/requester/CreateRequest';
import SearchDonors from './pages/requester/SearchDonors';
import DonorDetail from './pages/requester/DonorDetail';
import RequesterRequests from './pages/requester/RequesterRequests';
import RequesterRequestDetail from './pages/requester/RequesterRequestDetail';
import RequesterSettings from './pages/requester/RequesterSettings';

// Admin pages
import AdminDashboard from './pages/admin/AdminDashboard';
import ManageUsers from './pages/admin/ManageUsers';
import ManageDonors from './pages/admin/ManageDonors';
import ManageRequests from './pages/admin/ManageRequests';
import ManageDonations from './pages/admin/ManageDonations';
import Reports from './pages/admin/Reports';
import AdminSettings from './pages/admin/AdminSettings';

import NotFound from './pages/NotFound';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#1e293b',
              color: '#f8fafc',
              borderRadius: '12px',
              fontSize: '14px',
            },
          }}
        />
        <Routes>
          {/* Auth Routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* Public Routes */}
          <Route element={<PublicLayout />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/how-it-works" element={<HowItWorksPage />} />
            <Route path="/blood-groups" element={<BloodGroupsPage />} />
            <Route path="/contact" element={<ContactPage />} />
          </Route>

          {/* Donor Routes */}
          <Route
            element={
              <ProtectedRoute allowedRoles={['donor']}>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route path="/donor/dashboard" element={<DonorDashboard />} />
            <Route path="/donor/profile" element={<DonorProfile />} />
            <Route path="/donor/requests" element={<DonorRequests />} />
            <Route path="/donor/requests/:id" element={<DonorRequestDetail />} />
            <Route path="/donor/donations" element={<DonorDonations />} />
            <Route path="/donor/settings" element={<DonorSettings />} />
          </Route>

          {/* Requester Routes */}
          <Route
            element={
              <ProtectedRoute allowedRoles={['requester']}>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route path="/requester/dashboard" element={<RequesterDashboard />} />
            <Route path="/requester/create-request" element={<CreateRequest />} />
            <Route path="/requester/donors" element={<SearchDonors />} />
            <Route path="/requester/donors/:id" element={<DonorDetail />} />
            <Route path="/requester/requests" element={<RequesterRequests />} />
            <Route path="/requester/requests/:id" element={<RequesterRequestDetail />} />
            <Route path="/requester/settings" element={<RequesterSettings />} />
          </Route>

          {/* Admin Routes */}
          <Route
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route path="/admin/dashboard" element={<AdminDashboard />} />
            <Route path="/admin/users" element={<ManageUsers />} />
            <Route path="/admin/donors" element={<ManageDonors />} />
            <Route path="/admin/requests" element={<ManageRequests />} />
            <Route path="/admin/donations" element={<ManageDonations />} />
            <Route path="/admin/reports" element={<Reports />} />
            <Route path="/admin/settings" element={<AdminSettings />} />
          </Route>

          {/* 404 */}
          <Route element={<PublicLayout />}>
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
