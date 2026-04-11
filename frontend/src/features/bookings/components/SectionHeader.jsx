import React from 'react';

const SectionHeader = ({ icon: Icon, title, toggle, isActive, setToggle }) => (
  <div 
    onClick={() => setToggle && setToggle(!isActive)}
    style={{ 
      display: 'flex', alignItems: 'center', gap: '12px', padding: '16px 24px', 
      background: isActive ? 'var(--bg-input)' : 'transparent',
      borderBottom: '1px solid var(--border-color)', cursor: setToggle ? 'pointer' : 'default',
      transition: '0.2s', borderTopLeftRadius: '12px', borderTopRightRadius: '12px'
    }}
  >
    <div style={{ 
      width: '32px', height: '32px', borderRadius: '8px', 
      background: isActive ? 'hsl(var(--primary))' : 'var(--bg-card)', 
      color: isActive ? 'white' : 'var(--text-muted)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      border: isActive ? 'none' : '1px solid var(--border-color)'
    }}>
      <Icon size={18} />
    </div>
    <h3 style={{ fontSize: '18px', fontWeight: 800, flex: 1, color: isActive ? 'var(--text-main)' : 'var(--text-muted)' }}>{title}</h3>
    {setToggle && (
      <div style={{ width: '40px', height: '24px', borderRadius: '12px', background: isActive ? '#06B68A' : 'var(--border-color)', position: 'relative', transition: '0.2s' }}>
        <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: 'white', position: 'absolute', top: '2px', left: isActive ? '18px' : '2px', transition: '0.2s' }} />
      </div>
    )}
  </div>
);

export default SectionHeader;
