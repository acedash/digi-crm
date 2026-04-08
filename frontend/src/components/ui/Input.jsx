import React from 'react';
import { CalendarDays } from 'lucide-react';

const Input = ({ label, icon: Icon, error, style, className, ...props }) => {
  const isDateField = props.type === 'date' || props.type === 'datetime-local';

  return (
    <div className={className} style={{ marginBottom: '20px', ...style }}>
      {label && (
        <label style={{ 
          display: 'block', 
          fontSize: '13px', 
          fontWeight: 600, 
          marginBottom: '8px',
          color: 'var(--text-muted)'
        }}>
          {label}
        </label>
      )}
      <div style={{ position: 'relative' }}>
        {Icon && (
          <div style={{ 
            position: 'absolute', 
            left: '14px', 
            top: '50%', 
            transform: 'translateY(-50%)',
            color: 'var(--text-muted)',
            opacity: 0.5
          }}>
            <Icon size={18} />
          </div>
        )}
        {isDateField && !Icon && (
          <div
            style={{
              position: 'absolute',
              right: '14px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--text-muted)',
              opacity: 0.9,
              pointerEvents: 'none',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <CalendarDays size={18} />
          </div>
        )}
        <input
          className="crm-input"
          style={{
            width: '100%',
            background: 'var(--bg-input)',
            border: `1px solid ${error ? '#ef4444' : 'var(--border-color)'}`,
            borderRadius: '12px',
            padding: '12px 16px',
            paddingLeft: Icon ? '44px' : '16px',
            paddingRight: isDateField ? '44px' : '16px',
            color: 'var(--text-main)',
            fontSize: '14px',
            outline: 'none',
            transition: 'var(--transition-smooth)',
          }}
          onFocus={(e) => {
            e.target.style.borderColor = 'hsl(var(--primary))';
            e.target.style.boxShadow = '0 0 0 4px hsla(var(--primary), 0.1)';
          }}
          onBlur={(e) => {
            e.target.style.borderColor = error ? '#ef4444' : 'var(--border-color)';
            e.target.style.boxShadow = 'none';
          }}
          {...props}
          value={props.value ?? ''}
        />
      </div>
      {error && (
        <p style={{ color: '#ef4444', fontSize: '11px', marginTop: '6px', fontWeight: 500 }}>
          {error}
        </p>
      )}
    </div>
  );
};

export default Input;
