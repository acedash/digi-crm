import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, X, Check } from 'lucide-react';
import Button from './Button';

const ConfirmModal = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title, 
  message, 
  confirmLabel = 'Confirm', 
  cancelLabel = 'Cancel',
  tone = 'primary', // 'primary', 'danger', 'warning'
  isLoading = false
}) => {
  if (!isOpen) return null;

  const toneColors = {
    primary: {
      bg: 'rgba(59, 130, 246, 0.1)',
      icon: '#3b82f6',
      btn: 'primary'
    },
    danger: {
      bg: 'rgba(239, 68, 68, 0.1)',
      icon: '#ef4444',
      btn: 'danger'
    },
    warning: {
      bg: 'rgba(234, 179, 8, 0.1)',
      icon: '#eab308',
      btn: 'warning'
    }
  };

  const style = toneColors[tone] || toneColors.primary;

  return (
    <AnimatePresence>
      {isOpen && (
        <div 
          style={{
            position: 'fixed',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2000,
            padding: '20px'
          }}
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            style={{
              position: 'absolute',
              inset: 0,
              background: 'rgba(2, 6, 23, 0.85)',
              backdropFilter: 'blur(12px)'
            }}
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            style={{
              width: '100%',
              maxWidth: '440px',
              background: 'var(--bg-card)',
              borderRadius: '24px',
              border: '1px solid var(--border-color)',
              position: 'relative',
              overflow: 'hidden',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
            }}
          >
            {/* Header / Icon */}
            <div style={{ padding: '32px 32px 16px', textAlign: 'center' }}>
              <div style={{
                width: '64px',
                height: '64px',
                borderRadius: '20px',
                background: style.bg,
                color: style.icon,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 20px'
              }}>
                <AlertTriangle size={32} />
              </div>
              
              <h3 style={{ 
                fontSize: '20px', 
                fontWeight: 800, 
                color: 'var(--text-main)',
                marginBottom: '12px',
                letterSpacing: '-0.5px'
              }}>
                {title}
              </h3>
              
              <p style={{ 
                fontSize: '15px', 
                color: 'var(--text-muted)', 
                lineHeight: 1.6 
              }}>
                {message}
              </p>
            </div>

            {/* Actions */}
            <div style={{ 
              padding: '16px 32px 32px', 
              display: 'flex', 
              gap: '12px',
              justifyContent: 'center',
              background: 'linear-gradient(to bottom, transparent, rgba(255,255,255,0.02))'
            }}>
              <Button 
                variant="ghost" 
                onClick={onClose} 
                style={{ flex: 1 }}
                disabled={isLoading}
              >
                {cancelLabel}
              </Button>
              <Button 
                variant={style.btn} 
                onClick={onConfirm} 
                style={{ flex: 1 }}
                isLoading={isLoading}
                icon={Check}
              >
                {confirmLabel}
              </Button>
            </div>

            {/* Close Button */}
            <button
              onClick={onClose}
              style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                border: 'none',
                background: 'transparent',
                color: 'var(--text-muted)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.target.style.background = 'rgba(255,255,255,0.05)';
                e.target.style.color = 'var(--text-main)';
              }}
              onMouseLeave={(e) => {
                e.target.style.background = 'transparent';
                e.target.style.color = 'var(--text-muted)';
              }}
            >
              <X size={18} />
            </button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default ConfirmModal;
