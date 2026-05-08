import React from 'react';
import { Mail, X, Send, AlertCircle } from 'lucide-react';
import Button from '../../../components/ui/Button';

const EmailPreviewModal = ({ 
  open, 
  onClose, 
  onConfirm, 
  title = 'Email Preview', 
  previewData, 
  isLoading,
  confirmLabel = 'Send Email'
}) => {
  if (!open) return null;

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(2, 6, 23, 0.9)', backdropFilter: 'blur(12px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1300, padding: '24px'
    }}>
      <div
        style={{ 
          width: '100%', 
          maxWidth: '800px', 
          maxHeight: '90vh',
          background: 'var(--bg-card)', 
          borderRadius: '24px', 
          border: '1px solid var(--border-color)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
        }}
      >
        {/* Header */}
        <div style={{ 
          padding: '20px 24px', 
          borderBottom: '1px solid var(--border-color)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'rgba(255, 255, 255, 0.02)'
        }}>
          <h3 style={{ fontSize: '18px', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Mail size={20} color="var(--brand-primary)" /> {title}
          </h3>
          <button 
            onClick={onClose}
            style={{ 
              background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer',
              padding: '4px', borderRadius: '8px', transition: 'all 0.2s'
            }}
            onMouseOver={e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'}
            onMouseOut={e => e.currentTarget.style.background = 'none'}
          >
            <X size={20} />
          </button>
        </div>

        {/* Content Area */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
          {!previewData ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '300px', color: 'var(--text-muted)' }}>
              <div className="animate-spin" style={{ width: '32px', height: '32px', border: '3px solid rgba(255,255,255,0.1)', borderTopColor: 'var(--brand-primary)', borderRadius: '50%', marginBottom: '16px' }}></div>
              <p>Preparing preview...</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Metadata */}
              <div style={{ 
                background: 'var(--bg-app)', 
                borderRadius: '16px', 
                padding: '16px', 
                border: '1px solid var(--border-color)',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px'
              }}>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <span style={{ color: 'var(--text-muted)', fontSize: '13px', width: '60px', fontWeight: 600 }}>To:</span>
                  <span style={{ color: 'var(--text-main)', fontSize: '13px', fontWeight: 700 }}>{previewData.to || 'No recipient'}</span>
                </div>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <span style={{ color: 'var(--text-muted)', fontSize: '13px', width: '60px', fontWeight: 600 }}>Subject:</span>
                  <span style={{ color: 'var(--text-main)', fontSize: '13px', fontWeight: 700 }}>{previewData.subject || 'No Subject'}</span>
                </div>
              </div>

              {/* Email Body */}
              <div style={{ 
                background: '#ffffff', 
                borderRadius: '16px', 
                padding: '32px', 
                minHeight: '400px',
                color: '#1e293b'
              }}>
                {previewData.body ? (
                  <div 
                    dangerouslySetInnerHTML={{ __html: previewData.body }} 
                    style={{ fontSize: '14px', lineHeight: '1.6' }}
                    className="email-preview-content"
                  />
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#94a3b8', gap: '8px' }}>
                    <AlertCircle size={20} /> No content to display
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ 
          padding: '20px 24px', 
          borderTop: '1px solid var(--border-color)',
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '12px',
          background: 'rgba(255, 255, 255, 0.02)'
        }}>
          <Button variant="ghost" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button 
            onClick={onConfirm} 
            disabled={isLoading || !previewData}
            style={{ padding: '10px 24px' }}
          >
            {isLoading ? 'Sending...' : (
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Send size={16} /> {confirmLabel}
              </span>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default EmailPreviewModal;
