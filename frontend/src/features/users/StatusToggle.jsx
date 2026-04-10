import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Circle, Coffee, Phone, Power, Clock } from 'lucide-react';
import api from '../../services/api';
import { useAuthStore } from '../auth/useAuthStore';

import activityService from '../activity-tracker/activityService';

const StatusToggle = () => {
  const { user, setUser } = useAuthStore();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = React.useRef(null);

  React.useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const statuses = [
    { name: 'Active', color: '#4ade80', icon: Circle, activityType: 'break_end' },
    { name: 'On Call', color: '#facc15', icon: Phone, activityType: 'on_call' },
    { name: 'Break', color: '#f87171', icon: Coffee, activityType: 'break_start' },
    { name: 'Idle', color: '#94a3b8', icon: Clock, activityType: 'idle' },
  ];

  const handleStatusChange = async (statusObj) => {
    try {
      await activityService.logActivity({ activity_type: statusObj.activityType, description: `Status manually updated to ${statusObj.name}` });
      setUser({ ...user, status: statusObj.name });
      setIsOpen(false);
    } catch (e) {
      console.error('Failed to update status', e);
    }
  };

  const currentStatus = statuses.find(s => s.name === (user?.status || 'Active')) || statuses[0];
  const Icon = currentStatus.icon;

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '6px 12px',
          borderRadius: '100px',
          background: 'var(--bg-input)',
          border: '1px solid var(--border-color)',
          color: 'var(--text-main)',
          fontSize: '12px',
          fontWeight: 700,
          cursor: 'pointer',
          transition: 'var(--transition-smooth)'
        }}
      >
        <Icon size={12} style={{ color: currentStatus.color }} fill={currentStatus.color} />
        {currentStatus.name}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            style={{
              position: 'absolute',
              top: '120%',
              right: 0,
              width: '180px',
              background: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              borderRadius: '16px',
              boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.2)',
              padding: '8px',
              zIndex: 100
            }}
          >
            {statuses.map((s) => {
              const SIcon = s.icon;
              return (
                <button
                  key={s.name}
                  onClick={() => handleStatusChange(s)}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    background: user?.status === s.name ? 'rgba(255, 255, 255, 0.05)' : 'transparent',
                    border: 'none',
                    color: 'var(--text-main)',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    textAlign: 'left'
                  }}
                  onMouseEnter={(e) => e.target.style.background = 'rgba(255, 255, 255, 0.03)'}
                  onMouseLeave={(e) => e.target.style.background = user?.status === s.name ? 'rgba(255, 255, 255, 0.05)' : 'transparent'}
                >
                  <SIcon size={14} style={{ color: s.color }} fill={s.color} />
                  {s.name}
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default StatusToggle;
