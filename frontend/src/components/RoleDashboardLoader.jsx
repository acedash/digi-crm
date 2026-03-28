import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../features/auth/useAuthStore';

const RoleDashboardLoader = () => {
    const { user } = useAuthStore();
    const role = user?.roles?.[0]?.name || user?.roles?.[0];

    switch (role) {
        case 'admin':
            return <Navigate to="/admin/dashboard" replace />;
        case 'supervisor':
            return <Navigate to="/supervisor/dashboard" replace />;
        case 'agent':
            return <Navigate to="/agent/dashboard" replace />;
        default:
            return <div style={{ padding: '20px', textAlign: 'center' }}>Loading your workspace...</div>;
    }
};

export default RoleDashboardLoader;
