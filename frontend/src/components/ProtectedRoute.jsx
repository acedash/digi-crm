import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../features/auth/useAuthStore';

const ProtectedRoute = ({ allowedRoles }) => {
  const { user, token } = useAuthStore();

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !user?.roles?.some(role => {
    const roleName = typeof role === 'object' ? role.name : role;
    return allowedRoles.includes(roleName);
  })) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;
