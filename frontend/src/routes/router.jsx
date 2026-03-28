import { createBrowserRouter, Navigate } from 'react-router-dom';
import AdminLayout from '../layouts/AdminLayout';
import LoginPage from '../features/auth/LoginPage';
import ProtectedRoute from '../components/ProtectedRoute';
import AdminDashboard from '../features/dashboard/AdminDashboard';
import SupervisorDashboard from '../features/dashboard/SupervisorDashboard';
import AgentDashboard from '../features/dashboard/AgentDashboard';
import RoleDashboardLoader from '../components/RoleDashboardLoader'; // Added import
import UserList from '../features/users/UserList';
import ClientList from '../features/clients/ClientList'; 
import ClientProfile from '../features/clients/ClientProfile';
import ClientEditPage from '../features/clients/ClientEditPage';
import BookingsPage from '../features/bookings/BookingsPage';
import AuthApprovalPage from '../features/bookings/AuthApprovalPage';
import ConsentProofPage from '../features/bookings/ConsentProofPage';
import MasterList from '../features/suppliers/MasterList';
import CallLoggingPage from '../features/activity-tracker/CallLoggingPage';
import ReportsPage from '../features/reports/ReportsPage';
import ActivityLogs from '../features/activity-tracker/ActivityLogs';
import AgentMonitorPage from '../features/activity-tracker/AgentMonitorPage';
import AuditTrailPage from '../features/reports/AuditTrailPage';
import SettingsPage from '../features/settings/SettingsPage';
const sharedRoutes = [
  { path: 'clients', element: <ClientList /> },
  { path: 'clients/new', element: <ClientList /> },
  { path: 'clients/:id/edit', element: <ClientEditPage /> },
  { path: 'clients/:id', element: <ClientProfile /> },
  { path: 'bookings', element: <BookingsPage /> },
  { path: 'bookings/new', element: <BookingsPage /> },
  { path: 'bookings/:id/edit', element: <BookingsPage /> },
  { path: 'bookings/:id/consent-proof', element: <ConsentProofPage /> },
  { path: 'reports', element: <ReportsPage /> },
  { path: 'call-logs', element: <CallLoggingPage /> }
];

const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    // Public route for client payment approval — no authentication needed
    path: '/authorize/:token',
    element: <AuthApprovalPage />,
  },
  {
    path: '/',
    element: <ProtectedRoute />, // Wrap everything
    children: [
      {
        path: '/',
        element: <AdminLayout />,
        children: [
          {
            index: true,
            element: <Navigate to="/dashboard" replace />
          },
          {
            path: 'dashboard',
            element: <ProtectedRoute allowedRoles={['admin', 'supervisor', 'agent']} />,
            children: [
              {
                index: true,
                element: <RoleDashboardLoader />
              }
            ]
          },
          {
            path: 'admin',
            element: <ProtectedRoute allowedRoles={['admin']} />,
            children: [
              { path: 'dashboard', element: <AdminDashboard /> },
              { path: 'users', element: <UserList /> },
              { path: 'activity', element: <ActivityLogs /> },
              { path: 'team-monitor', element: <AgentMonitorPage /> },
              { path: 'system-audit', element: <AuditTrailPage /> },
              { path: 'settings', element: <SettingsPage /> },
              { path: 'masters', children: [{ index: true, element: <MasterList /> }] },
              ...sharedRoutes
            ]
          },
          {
            path: 'supervisor',
            element: <ProtectedRoute allowedRoles={['supervisor']} />,
            children: [
              { path: 'dashboard', element: <SupervisorDashboard /> },
              { path: 'activity', element: <ActivityLogs /> },
              { path: 'team-monitor', element: <AgentMonitorPage /> },
              { path: 'masters', children: [{ index: true, element: <MasterList /> }] },
              ...sharedRoutes
            ]
          },
          {
            path: 'agent',
            element: <ProtectedRoute allowedRoles={['agent']} />,
            children: [
              { path: 'dashboard', element: <AgentDashboard /> },
              { path: 'activity', element: <ActivityLogs /> },
              ...sharedRoutes
            ]
          }
        ]
      }
    ]
  }
]);

export default router;
