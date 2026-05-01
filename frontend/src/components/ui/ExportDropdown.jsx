import React, { useState, useRef, useEffect } from 'react';
import { Download } from 'lucide-react';

const ExportDropdown = ({ 
  options = [],
  isExporting = false, 
  buttonStyle = {},
  label = 'Export Format'
}) => {
  const [showOptions, setShowOptions] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowOptions(false);
      }
    };

    if (showOptions) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showOptions]);

  const defaultStyle = {
    background: 'var(--bg-input)', 
    border: '1px solid var(--border-color)', 
    color: 'var(--text-main)', 
    cursor: isExporting ? 'not-allowed' : 'pointer',
    padding: '8px 16px', 
    borderRadius: '12px', 
    display: 'flex', 
    alignItems: 'center', 
    gap: '8px', 
    fontSize: '13px', 
    fontWeight: 700,
    transition: 'all 0.2s', 
    opacity: isExporting ? 0.5 : 1,
    boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
    ...buttonStyle
  };

  return (
    <div style={{ position: 'relative' }} ref={dropdownRef} className="hide-on-print">
      <button 
        onClick={() => !isExporting && setShowOptions(!showOptions)}
        disabled={isExporting}
        style={defaultStyle}
        className="hover-glow"
      >
        <Download size={15} style={{ color: 'hsl(var(--primary))' }} />
        {isExporting ? 'Exporting...' : label}
      </button>

      {showOptions && (
        <div style={{ 
          position: 'absolute', 
          top: 'calc(100% + 8px)', 
          right: 0, 
          backgroundColor: 'var(--bg-card)', 
          backdropFilter: 'blur(10px)',
          border: '1px solid var(--border-color)', 
          borderRadius: '16px', 
          padding: '6px', 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '2px', 
          boxShadow: '0 10px 40px -10px rgba(0,0,0,0.3)', 
          minWidth: '220px',
          zIndex: 1000
        }}>
          <div style={{ padding: '10px 12px 6px', fontSize: '10px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>
            Choose Format
          </div>
          {options.map((opt, idx) => (
            <button 
              key={idx}
              onClick={() => {
                opt.onClick();
                setShowOptions(false);
              }}
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '12px', 
                padding: '12px', 
                background: 'transparent', 
                border: 'none', 
                color: 'var(--text-main)', 
                width: '100%', 
                textAlign: 'left', 
                borderRadius: '10px', 
                cursor: 'pointer', 
                fontSize: '13px', 
                fontWeight: 600 
              }} 
              onMouseEnter={(e) => e.currentTarget.style.background = 'hsla(var(--primary), 0.1)'} 
              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            >
              {opt.icon && <opt.icon size={18} style={{ color: 'var(--text-muted)' }} />} 
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default ExportDropdown;
