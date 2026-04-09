import React, { lazy, Suspense } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import AdminLayout from '../layouts/AdminLayout';
import LoginPage from '../features/auth/LoginPage';
import ProtectedRoute from '../components/ProtectedRoute';
import RoleDashboardLoader from '../components/RoleDashboardLoader'; 
import RolePathRedirect from '../components/RolePathRedirect';
import { RefreshCw } from 'lucide-react';

// Lazy load heavy features
const AdminDashboard = lazy(() => import('../features/dashboard/AdminDashboard'));
const SupervisorDashboard = lazy(() => import('../features/dashboard/SupervisorDashboard'));
const AgentDashboard = lazy(() => import('../features/dashboard/AgentDashboard'));
const UserList = lazy(() => import('../features/users/UserList'));
const ClientList = lazy(() => import('../features/clients/ClientList'));
const ClientProfile = lazy(() => import('../features/clients/ClientProfile'));
const ClientEditPage = lazy(() => import('../features/clients/ClientEditPage'));
const BookingsPage = lazy(() => import('../features/bookings/BookingsPage'));
const BookingDetailsPage = lazy(() => import('../features/bookings/BookingDetailsPage'));
const AuthApprovalPage = lazy(() => import('../features/bookings/AuthApprovalPage'));
const ConsentProofPage = lazy(() => import('../features/bookings/ConsentProofPage'));
const ChargeQueuePage = lazy(() => import('../features/bookings/ChargeQueuePage'));
const MasterList = lazy(() => import('../features/suppliers/MasterList'));
const CallLoggingPage = lazy(() => import('../features/activity-tracker/CallLoggingPage'));
const ReportsPage = lazy(() => import('../features/reports/ReportsPage'));
const ActivityLogs = lazy(() => import('../features/activity-tracker/ActivityLogs'));
const AgentMonitorPage = lazy(() => import('../features/activity-tracker/AgentMonitorPage'));
const AuditTrailPage = lazy(() => import('../features/reports/AuditTrailPage'));
const SettingsPage = lazy(() => import('../features/settings/SettingsPage'));

// Helper to wrap lazy components with Suspense
const LazyPage = ({ children }) => (
  <Suspense fallback={
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', color: 'var(--text-muted)' }}>
      <RefreshCw className="animate-spin" size={32} />
      <span style={{ marginLeft: '12px' }}>Loading...</span>
    </div>
  }>
    {children}
  </Suspense>
);

const sharedRoutes = [
  { path: 'clients', element: <LazyPage><ClientList /></LazyPage> },
  { path: 'clients/new', element: <RolePathRedirect target="clients" /> },
  { path: 'clients/:id/edit', element: <LazyPage><ClientEditPage /></LazyPage> },
  { path: 'clients/:id', element: <LazyPage><ClientProfile /></LazyPage> },
  { path: 'bookings', element: <LazyPage><BookingsPage /></LazyPage> },
  { path: 'bookings/new', element: <LazyPage><BookingsPage /></LazyPage> },
  { path: 'bookings/:id', element: <LazyPage><BookingDetailsPage /></LazyPage> },
  { path: 'bookings/:id/edit', element: <LazyPage><BookingsPage /></LazyPage> },
  { path: 'bookings/:id/consent-proof', element: <LazyPage><ConsentProofPage /></LazyPage> },
  { path: 'reports', element: <LazyPage><ReportsPage /></LazyPage> },
  { path: 'call-logs', element: <LazyPage><CallLoggingPage /></LazyPage> }
];

const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    // Public route for client payment approval — no authentication needed
    path: '/authorize/:token',
    element: <LazyPage><AuthApprovalPage /></LazyPage>,
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
          { path: 'bookings', element: <RolePathRedirect target="bookings" /> },
          { path: 'bookings/new', element: <RolePathRedirect target="bookings/new" /> },
          { path: 'bookings/:id', element: <RolePathRedirect target={({ id }) => `bookings/${id}`} /> },
          { path: 'bookings/:id/edit', element: <RolePathRedirect target={({ id }) => `bookings/${id}/edit`} /> },
          { path: 'bookings/:id/consent-proof', element: <RolePathRedirect target={({ id }) => `bookings/${id}/consent-proof`} /> },
          { path: 'clients', element: <RolePathRedirect target="clients" /> },
          { path: 'clients/:id', element: <RolePathRedirect target={({ id }) => `clients/${id}`} /> },
          { path: 'clients/:id/edit', element: <RolePathRedirect target={({ id }) => `clients/${id}/edit`} /> },
          { path: 'call-logs', element: <RolePathRedirect target="call-logs" /> },
          { path: 'activity', element: <RolePathRedirect target="activity" /> },
          { path: 'team-monitor', element: <RolePathRedirect target="team-monitor" /> },
          { path: 'settings', element: <RolePathRedirect target="settings" /> },
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
              { path: 'dashboard', element: <LazyPage><AdminDashboard /></LazyPage> },
              { path: 'users', element: <LazyPage><UserList /></LazyPage> },
              { path: 'activity', element: <LazyPage><ActivityLogs /></LazyPage> },
              { path: 'team-monitor', element: <LazyPage><AgentMonitorPage /></LazyPage> },
              { path: 'system-audit', element: <LazyPage><AuditTrailPage /></LazyPage> },
              { path: 'settings', element: <LazyPage><SettingsPage /></LazyPage> },
              { path: 'charge-queue', element: <LazyPage><ChargeQueuePage /></LazyPage> },
              { path: 'masters', children: [{ index: true, element: <LazyPage><MasterList /></LazyPage> }] },
              ...sharedRoutes
            ]
          },
          {
            path: 'supervisor',
            element: <ProtectedRoute allowedRoles={['supervisor']} />,
            children: [
              { path: 'dashboard', element: <LazyPage><SupervisorDashboard /></LazyPage> },
              { path: 'activity', element: <LazyPage><ActivityLogs /></LazyPage> },
              { path: 'team-monitor', element: <LazyPage><AgentMonitorPage /></LazyPage> },
              { path: 'settings', element: <LazyPage><SettingsPage /></LazyPage> },
              { path: 'masters', children: [{ index: true, element: <LazyPage><MasterList /></LazyPage> }] },
              ...sharedRoutes
            ]
          },
          {
            path: 'agent',
            element: <ProtectedRoute allowedRoles={['agent']} />,
            children: [
              { path: 'dashboard', element: <LazyPage><AgentDashboard /></LazyPage> },
              { path: 'activity', element: <LazyPage><ActivityLogs /></LazyPage> },
              { path: 'settings', element: <LazyPage><SettingsPage /></LazyPage> },
              ...sharedRoutes
            ]
          }
        ]
      }
    ]
  }
]);

export default router;
