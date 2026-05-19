import React from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, CheckCircle2, X } from 'lucide-react';

const Toast = ({ message, type = 'error', onClose }) => {
  if (!message) return null;

  const bg = type === 'error' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(34, 197, 94, 0.1)';
  const color = type === 'error' ? '#f87171' : '#4ade80';
  const Icon = type === 'error' ? AlertCircle : CheckCircle2;

  return createPortal(
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 50, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        style={{
          position: 'fixed',
          bottom: '100px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 99999,
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '12px 20px',
          background: 'rgba(15, 23, 42, 0.95)',
          backdropFilter: 'blur(12px)',
          borderRadius: '16px',
          border: `1px solid ${color}40`,
          boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
          minWidth: '300px',
          maxWidth: '500px',
          pointerEvents: 'auto'
        }}
      >
        <div style={{ 
          width: '32px', height: '32px', borderRadius: '8px', 
          background: bg, color: color,
          display: 'flex', alignItems: 'center', justifyContent: 'center' 
        }}>
          <Icon size={18} />
        </div>
        <p style={{ flex: 1, fontSize: '14px', fontWeight: 600, color: 'white' }}>{message}</p>
        <button 
          onClick={onClose}
          style={{ 
            background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', 
            cursor: 'pointer', padding: '4px', display: 'flex' 
          }}
        >
          <X size={16} />
        </button>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
};

export default Toast;

