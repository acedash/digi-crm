import React from 'react';
import { motion } from 'framer-motion';

const Card = ({ children, className, title, subtitle, icon: Icon, delay = 0, style, id }) => {
  return (
    <motion.div
      id={id}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      className={`glass-panel ${className || ''}`}
      style={{
        borderRadius: 'var(--radius)',
        padding: '24px',
        position: 'relative',
        overflow: 'hidden',
        ...style
      }}
    >
      {(title || Icon) && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <div>
            {title && <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-main)' }}>{title}</h3>}
            {subtitle && <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{subtitle}</p>}
          </div>
          {Icon && (
            <div style={{ 
              background: 'hsla(var(--primary), 0.1)', 
              color: 'hsl(var(--primary))',
              padding: '10px',
              borderRadius: '12px'
            }}>
              <Icon size={20} />
            </div>
          )}
        </div>
      )}
      {children}
    </motion.div>
  );
};

export default Card;
