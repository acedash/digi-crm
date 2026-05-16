import React, { useState, useEffect, useRef } from 'react';
import { StickyNote, Trash2, ShieldCheck, X, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Button from './Button';
import notepadService from '../../services/notepadService';

const SecureNotepad = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const saveTimeoutRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      fetchNote();
    }
  }, [isOpen]);

  const fetchNote = async () => {
    try {
      setLoading(true);
      const res = await notepadService.getNote();
      if (res.data?.success) {
        setNote(res.data.data.note || '');
      }
    } catch (error) {
      console.error('Failed to fetch note', error);
    } finally {
      setLoading(false);
    }
  };

  const handleNoteChange = (e) => {
    const newValue = e.target.value;
    setNote(newValue);

    // Debounced save
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    
    setSaving(true);
    saveTimeoutRef.current = setTimeout(async () => {
      try {
        await notepadService.updateNote(newValue);
      } catch (error) {
        console.error('Failed to save note', error);
      } finally {
        setSaving(false);
      }
    }, 1000);
  };

  const handleClear = async () => {
    if (!window.confirm('Are you sure you want to clear all notes?')) return;
    try {
      setLoading(true);
      await notepadService.clearNote();
      setNote('');
    } catch (error) {
      console.error('Failed to clear note', error);
    } finally {
      setLoading(false);
    }
  };

  // Prevent copy and right-click
  const handlePrevent = (e) => {
    e.preventDefault();
  };

  return (
    <div style={{ position: 'fixed', bottom: '24px', right: '24px', zIndex: 100, display: 'flex', flexDirection: 'column', alignItems: 'center' }} className="no-print">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            style={{
              width: '320px',
              height: '420px',
              background: 'var(--bg-card)',
              backdropFilter: 'blur(16px)',
              border: '1px solid var(--border-color)',
              borderRadius: '24px',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
              marginBottom: '-28px',
              paddingBottom: '20px',
              overflow: 'hidden',
              position: 'relative',
              zIndex: 1
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
                <span style={{ fontWeight: 700, fontSize: '13px', color: 'var(--text-main)', letterSpacing: '0.5px' }}>Secure Notepad</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                {saving && <RefreshCw size={12} className="animate-spin" style={{ color: 'var(--text-muted)' }} />}
                <button 
                  onClick={() => setIsOpen(false)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            <div style={{ flex: 1, position: 'relative', display: 'flex', flexDirection: 'column' }}>
              {loading && (
                <div style={{ position: 'absolute', inset: 0, background: 'var(--bg-card)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 5 }}>
                  <RefreshCw size={24} className="animate-spin" style={{ color: 'var(--text-muted)' }} />
                </div>
              )}
              <textarea
                value={note}
                onChange={handleNoteChange}
                onCopy={handlePrevent}
                onCut={handlePrevent}
                onContextMenu={handlePrevent}
                placeholder="Capture important details while on a call."
                style={{
                  flex: 1,
                  padding: '20px',
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: 'none',
                  resize: 'none',
                  color: 'var(--text-main)',
                  fontSize: '14px',
                  lineHeight: '1.6',
                  outline: 'none',
                  fontFamily: 'inherit'
                }}
              />
            </div>

            <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border-color)', display: 'flex', gap: '8px', background: 'var(--bg-input)' }}>
              <Button 
                variant="ghost" 
                size="sm" 
                fullWidth 
                icon={Trash2}
                onClick={handleClear}
                style={{ color: '#f87171', fontSize: '12px' }}
              >
                Clear All
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        id="secure-notepad-toggle"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          background: isOpen ? 'white' : 'hsl(var(--primary))',
          color: isOpen ? '#0f172a' : 'white',
          border: isOpen ? '1px solid var(--border-color)' : 'none',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.3)',
          transition: 'all 0.3s ease',
          zIndex: 10,
          position: 'relative'
        }}
      >
        <StickyNote size={24} />
      </motion.button>
    </div>
  );
};

export default SecureNotepad;
