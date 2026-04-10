import React from 'react';
import { motion } from 'framer-motion';

const Button = ({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  className, 
  icon: Icon,
  isLoading,
  fullWidth,
  style,
  ...props 
}) => {
  
  const getStyles = () => {
    let styles = {
      display: fullWidth ? 'flex' : 'inline-flex',
      width: fullWidth ? '100%' : 'auto',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 'var(--radius-pill)',
      fontWeight: '600',
      transition: 'var(--transition-smooth)',
      border: 'none',
      cursor: 'pointer',
      gap: size === 'sm' ? '6px' : '10px',
      fontSize: size === 'sm' ? '12px' : size === 'lg' ? '16px' : '14px',
      padding: size === 'sm' ? '6px 12px' : size === 'lg' ? '12px 24px' : '10px 20px',
      ...style
    };

    if (variant === 'primary') {
      styles.background = 'hsl(var(--primary))';
      styles.color = 'white';
      styles.boxShadow = '0 10px 15px -3px hsla(var(--primary), 0.3), 0 4px 6px -2px hsla(var(--primary), 0.1), 0 0 15px 1px hsla(var(--primary), 0.2)';
    } else if (variant === 'secondary') {
      styles.background = 'var(--text-muted)';
      styles.color = 'var(--bg-app)';
    } else if (variant === 'outline') {
      styles.background = 'transparent';
      styles.border = '2px solid var(--border-color)';
      styles.color = 'var(--text-main)';
    } else if (variant === 'glass') {
      styles.background = 'var(--bg-card)';
      styles.backdropFilter = 'blur(var(--glass-blur))';
      styles.border = '1px solid var(--border-color)';
      styles.color = 'var(--text-main)';
    } else if (variant === 'danger') {
      styles.background = '#ef4444';
      styles.color = 'white';
    } else if (variant === 'ghost') {
      styles.background = 'transparent';
      styles.color = 'var(--text-muted)';
    }

    return styles;
  };

  return (
    <motion.button
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.96 }}
      style={getStyles()}
      className={className}
      {...props}
    >
      {isLoading ? (
        <span className="animate-spin mr-2">◌</span>
      ) : Icon && <Icon size={size === 'sm' ? 14 : 18} />}
      {children}
    </motion.button>
  );
};

export default Button;
