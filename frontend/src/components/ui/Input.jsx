import React, { useState } from 'react';
import { CalendarDays, X, Eye, EyeOff } from 'lucide-react';

const Input = ({ label, icon: Icon, error, style, className, onClear, required, variant, inputStyle, ...props }) => {
  const [showPassword, setShowPassword] = useState(false);
  const isDateField = props.type === 'date' || props.type === 'datetime-local';
  const isPasswordField = props.type === 'password';
  const showClear = onClear && props.value && props.value.toString().length > 0;

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const inputType = isPasswordField ? (showPassword ? 'text' : 'password') : props.type;

  const isTransparent = variant === 'transparent';

  return (
    <div className={className} style={{ marginBottom: '20px', ...style }}>
      {label && (
        <label style={{ 
          display: 'block', 
          fontSize: '12px', 
          fontWeight: 800, 
          marginBottom: '10px',
          color: 'var(--text-muted)',
          textTransform: 'uppercase',
          letterSpacing: '1.5px'
        }}>
          {label}
          {required && <span style={{ color: '#ef4444', marginLeft: '4px' }}>*</span>}
        </label>
      )}
      <div style={{ position: 'relative' }}>
        {Icon && (
          <div style={{ 
            position: 'absolute', 
            left: '16px', 
            top: '50%', 
            transform: 'translateY(-50%)',
            color: 'var(--text-muted)',
            zIndex: 10,
            pointerEvents: 'none'
          }}>
            <Icon size={18} />
          </div>
        )}
        {isDateField && !Icon && (
          <div
            style={{
              position: 'absolute',
              left: '16px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--text-muted)',
              pointerEvents: 'none',
              display: 'flex',
              alignItems: 'center',
              zIndex: 10
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
              right: isDateField ? '48px' : '16px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--text-muted)',
              background: 'none',
              border: 'none',
              padding: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              zIndex: 10,
              opacity: 0.6,
              transition: 'all 0.2s'
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
              right: '16px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--text-muted)',
              background: 'none',
              border: 'none',
              padding: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              zIndex: 10,
              opacity: 0.8,
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
            onMouseLeave={(e) => e.currentTarget.style.opacity = '0.8'}
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        )}
        <input
          className="crm-input"
          {...props}
          type={inputType}
          onClick={(e) => {
            if (isDateField && e.target.showPicker) {
              try { e.target.showPicker(); } catch (err) {}
            }
            if (props.onClick) props.onClick(e);
          }}
          style={{
            width: '100%',
            background: isTransparent ? 'rgba(255,255,255,0.02)' : 'var(--bg-input)',
            border: `1px solid ${error ? '#ef4444' : (isTransparent ? 'rgba(255,255,255,0.08)' : 'var(--border-color)')}`,
            borderRadius: '14px',
            padding: '14px 18px',
            paddingLeft: (Icon || isDateField) ? '48px' : '18px',
            paddingRight: (showClear || isPasswordField) ? '48px' : '18px',
            color: 'var(--text-main)',
            fontSize: '14px',
            fontWeight: 500,
            outline: 'none',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            ...inputStyle
          }}
          onFocus={(e) => {
            e.target.style.borderColor = '#10b981';
            e.target.style.background = 'rgba(16, 185, 129, 0.05)';
            e.target.style.boxShadow = '0 0 0 4px rgba(16, 185, 129, 0.1), 0 0 20px rgba(16, 185, 129, 0.05)';
            if (props.onFocus) props.onFocus(e);
          }}
          onBlur={(e) => {
            e.target.style.borderColor = error ? '#ef4444' : (isTransparent ? 'rgba(255,255,255,0.08)' : 'var(--border-color)');
            e.target.style.background = isTransparent ? 'rgba(255,255,255,0.02)' : 'var(--bg-input)';
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
