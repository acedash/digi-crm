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
    background: 'transparent', 
    border: '1px solid var(--border-color)', 
    color: 'var(--text-muted)', 
    cursor: isExporting ? 'not-allowed' : 'pointer',
    padding: '8px 12px', 
    borderRadius: '8px', 
    display: 'flex', 
    alignItems: 'center', 
    gap: '6px', 
    fontSize: '12px', 
    fontWeight: 700,
    transition: 'all 0.2s', 
    opacity: isExporting ? 0.5 : 1,
    ...buttonStyle
  };

  return (
    <div style={{ position: 'relative' }} ref={dropdownRef} className="hide-on-print">
      <button 
        onClick={() => !isExporting && setShowOptions(!showOptions)}
        disabled={isExporting}
        style={defaultStyle}
        className="hover-brighten"
      >
        <Download size={14} />
        {isExporting ? 'Exporting...' : label}
      </button>

      {showOptions && (
        <div style={{ 
          position: 'absolute', 
          top: 'calc(100% + 8px)', 
          right: 0, 
          backgroundColor: '#1e2235', 
          border: '1px solid var(--border-color)', 
          borderRadius: '12px', 
          padding: '4px', 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '2px', 
          boxShadow: '0 10px 40px -10px rgba(0,0,0,0.8)', 
          minWidth: '200px',
          zIndex: 1000
        }}>
          <div style={{ padding: '8px 12px 4px', fontSize: '10px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>
            Export Format
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
                gap: '10px', 
                padding: '10px 12px', 
                background: 'transparent', 
                border: 'none', 
                color: '#f8fafc', 
                width: '100%', 
                textAlign: 'left', 
                borderRadius: '8px', 
                cursor: 'pointer', 
                fontSize: '13px', 
                fontWeight: 500 
              }} 
              onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'} 
              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            >
              {opt.icon && <opt.icon size={16} />} 
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default ExportDropdown;
