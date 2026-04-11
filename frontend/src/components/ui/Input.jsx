import React, { useState } from 'react';
import { CalendarDays, X, Eye, EyeOff } from 'lucide-react';

const Input = ({ label, icon: Icon, error, style, className, onClear, required, ...props }) => {
  const [showPassword, setShowPassword] = useState(false);
  const isDateField = props.type === 'date' || props.type === 'datetime-local';
  const isPasswordField = props.type === 'password';
  const showClear = onClear && props.value && props.value.toString().length > 0;

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const inputType = isPasswordField ? (showPassword ? 'text' : 'password') : props.type;

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
          {required && <span style={{ color: '#ef4444', marginLeft: '4px' }}>*</span>}
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
        {showClear && !isPasswordField && (
          <button
            type="button"
            onClick={onClear}
            style={{
              position: 'absolute',
              right: isDateField ? '44px' : '14px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--text-muted)',
              background: 'none',
              border: 'none',
              padding: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              zIndex: 10,
              opacity: 0.6
            }}
            onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
            onMouseLeave={(e) => e.currentTarget.style.opacity = '0.6'}
          >
            <X size={16} />
          </button>
        )}
        {isPasswordField && (
          <button
            type="button"
            onClick={togglePasswordVisibility}
            style={{
              position: 'absolute',
              right: '14px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--text-muted)',
              background: 'none',
              border: 'none',
              padding: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              zIndex: 10,
              opacity: 0.85,
              transition: 'opacity 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
            onMouseLeave={(e) => e.currentTarget.style.opacity = '0.85'}
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        )}
        <input
          className="crm-input"
          {...props}
          type={inputType}
          style={{
            width: '100%',
            background: 'var(--bg-input)',
            border: `1px solid ${error ? '#ef4444' : 'var(--border-color)'}`,
            borderRadius: '12px',
            padding: '12px 16px',
            paddingLeft: Icon ? '44px' : '16px',
            paddingRight: (isDateField || showClear || isPasswordField) ? '44px' : '16px',
            color: 'var(--text-main)',
            fontSize: '14px',
            outline: 'none',
            transition: 'var(--transition-smooth)',
            ...props.style
          }}
          onFocus={(e) => {
            e.target.style.borderColor = 'hsl(var(--primary))';
            e.target.style.boxShadow = '0 0 0 4px hsla(var(--primary), 0.1)';
            if (props.onFocus) props.onFocus(e);
          }}
          onBlur={(e) => {
            e.target.style.borderColor = error ? '#ef4444' : 'var(--border-color)';
            e.target.style.boxShadow = 'none';
            if (props.onBlur) props.onBlur(e);
          }}
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
