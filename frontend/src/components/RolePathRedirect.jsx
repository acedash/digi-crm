import React from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { useAuthStore } from '../features/auth/useAuthStore';

const RolePathRedirect = ({ target = '' }) => {
  const { user } = useAuthStore();
  const params = useParams();
  const role = user?.roles?.[0]?.name || user?.roles?.[0];
  const resolvedTarget = typeof target === 'function' ? target(params) : target;
  const prefix = role === 'admin' ? '/admin' : role === 'supervisor' ? '/supervisor' : role === 'agent' ? '/agent' : '';

  if (!prefix) {
    return <div style={{ padding: '20px', textAlign: 'center' }}>Loading your workspace...</div>;
  }

  return <Navigate to={`${prefix}/${resolvedTarget}`} replace />;
};

export default RolePathRedirect;
