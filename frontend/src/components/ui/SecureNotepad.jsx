import React, { useState, useEffect } from 'react';
import { StickyNote, Trash2, ShieldCheck, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Button from './Button';

const SecureNotepad = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [note, setNote] = useState('');

  // Prevent copy and right-click
  const handlePrevent = (e) => {
    e.preventDefault();
  };

  return (
    <div style={{ position: 'fixed', bottom: '24px', right: '24px', zIndex: 100 }}>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            style={{
              width: '320px',
              height: '400px',
              background: 'var(--bg-card)',
              backdropFilter: 'blur(12px)',
              border: '1px solid var(--border-color)',
              borderRadius: '24px',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              marginBottom: '16px',
              overflow: 'hidden'
            }}
          >
            <div style={{ 
              padding: '16px 20px', 
              borderBottom: '1px solid var(--border-color)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'hsla(var(--primary), 0.05)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ShieldCheck size={18} style={{ color: 'hsl(var(--primary))' }} />
                <span style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text-main)' }}>Secure Notepad</span>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
              >
                <X size={18} />
              </button>
            </div>

            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              onCopy={handlePrevent}
              onCut={handlePrevent}
              onContextMenu={handlePrevent}
              placeholder="Temporary notes during call... (Auto-deleted after session)"
              style={{
                flex: 1,
                padding: '20px',
                background: 'transparent',
                border: 'none',
                resize: 'none',
                color: 'var(--text-main)',
                fontSize: '14px',
                lineHeight: '1.6',
                outline: 'none',
                userSelect: 'none'
              }}
            />

            <div style={{ padding: '16px', borderTop: '1px solid var(--border-color)', display: 'flex', gap: '8px' }}>
              <Button 
                variant="ghost" 
                size="sm" 
                fullWidth 
                icon={Trash2}
                onClick={() => setNote('')}
              >
                Clear
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          background: isOpen ? 'var(--text-main)' : 'hsl(var(--primary))',
          color: 'white',
          border: 'none',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
          transition: 'background 0.3s ease'
        }}
      >
        <StickyNote size={24} />
      </motion.button>
    </div>
  );
};

export default SecureNotepad;
