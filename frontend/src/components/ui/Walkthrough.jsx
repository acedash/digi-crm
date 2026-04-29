import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useWalkthroughStore } from '../../store/walkthroughStore';
import { X, ChevronRight, ChevronLeft } from 'lucide-react';
import Button from './Button';

const Walkthrough = () => {
  const { isActive, currentStepIndex, steps, nextStep, prevStep, endTour } = useWalkthroughStore();
  const [targetRect, setTargetRect] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ top: 0, left: 0 });
  const step = steps[currentStepIndex];
  const tooltipRef = useRef(null);

  useEffect(() => {
    if (!isActive || !step) return;

    const updatePosition = () => {
      const element = document.querySelector(step.target);
      if (element) {
        const rect = element.getBoundingClientRect();
        setTargetRect(rect);
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else {
        setTargetRect(null);
      }
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition);

    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition);
    };
  }, [isActive, step]);

  useEffect(() => {
    if (!targetRect || !tooltipRef.current) return;

    const tWidth = tooltipRef.current.offsetWidth;
    const tHeight = tooltipRef.current.offsetHeight;
    const padding = 20;
    const pos = step.position || 'bottom';

    let top = 0;
    let left = 0;

    switch (pos) {
      case 'top':
        top = targetRect.top - tHeight - padding;
        left = targetRect.left + (targetRect.width / 2) - (tWidth / 2);
        break;
      case 'bottom':
        top = targetRect.bottom + padding;
        left = targetRect.left + (targetRect.width / 2) - (tWidth / 2);
        break;
      case 'left':
        top = targetRect.top + (targetRect.height / 2) - (tHeight / 2);
        left = targetRect.left - tWidth - padding;
        break;
      case 'right':
        top = targetRect.top + (targetRect.height / 2) - (tHeight / 2);
        left = targetRect.right + padding;
        break;
      default:
        top = targetRect.bottom + padding;
        left = targetRect.left;
    }

    // Boundary checks
    left = Math.max(20, Math.min(left, window.innerWidth - tWidth - 20));
    top = Math.max(20, Math.min(top, window.innerHeight - tHeight - 20));

    setTooltipPos({ top, left });
  }, [targetRect, step?.position, currentStepIndex]);

  if (!isActive || !step) return null;

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, pointerEvents: 'none' }}>
      {/* Backdrop with Spotlight */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(2, 6, 23, 0.7)',
          backdropFilter: 'blur(2px)',
          pointerEvents: 'auto',
          maskImage: targetRect ? `radial-gradient(circle at ${targetRect.left + targetRect.width / 2}px ${targetRect.top + targetRect.height / 2}px, transparent ${Math.max(targetRect.width, targetRect.height) / 1.5}px, black ${Math.max(targetRect.width, targetRect.height) / 1.2}px)` : 'none',
          WebkitMaskImage: targetRect ? `radial-gradient(circle at ${targetRect.left + targetRect.width / 2}px ${targetRect.top + targetRect.height / 2}px, transparent ${Math.max(targetRect.width, targetRect.height) / 1.5}px, black ${Math.max(targetRect.width, targetRect.height) / 1.2}px)` : 'none',
        }}
        onClick={endTour}
      />

      {/* Tooltip */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentStepIndex}
          ref={tooltipRef}
          initial={{ opacity: 0, scale: 0.9, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0, x: tooltipPos.left, y: tooltipPos.top }}
          exit={{ opacity: 0, scale: 0.9, y: 10 }}
          transition={{ type: 'spring', damping: 20, stiffness: 300 }}
          style={{
            position: 'absolute',
            width: '320px',
            background: 'hsl(var(--primary))',
            color: 'white',
            borderRadius: '20px',
            padding: '24px',
            boxShadow: '0 20px 50px rgba(0,0,0,0.3)',
            pointerEvents: 'auto',
            zIndex: 10000,
          }}
        >
          <button
            onClick={endTour}
            style={{
              position: 'absolute',
              top: '16px',
              right: '16px',
              background: 'rgba(255,255,255,0.1)',
              border: 'none',
              borderRadius: '50%',
              width: '28px',
              height: '28px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            <X size={16} />
          </button>

          <h4 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '8px', paddingRight: '24px' }}>
            {step.title}
          </h4>
          <p style={{ fontSize: '14px', lineHeight: 1.6, opacity: 0.9, marginBottom: '24px' }}>
            {step.content}
          </p>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: '4px' }}>
              {steps.map((_, i) => (
                <div
                  key={i}
                  style={{
                    width: i === currentStepIndex ? '20px' : '6px',
                    height: '6px',
                    borderRadius: '3px',
                    background: i === currentStepIndex ? 'white' : 'rgba(255,255,255,0.3)',
                    transition: 'all 0.3s',
                  }}
                />
              ))}
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              {currentStepIndex > 0 && (
                <button
                  onClick={prevStep}
                  style={{
                    background: 'rgba(255,255,255,0.1)',
                    border: 'none',
                    borderRadius: '10px',
                    padding: '8px 12px',
                    color: 'white',
                    fontSize: '13px',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  <ChevronLeft size={16} />
                </button>
              )}
              <button
                onClick={currentStepIndex === steps.length - 1 ? endTour : nextStep}
                style={{
                  background: 'white',
                  border: 'none',
                  borderRadius: '10px',
                  padding: '8px 20px',
                  color: 'hsl(var(--primary))',
                  fontSize: '13px',
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                }}
              >
                {currentStepIndex === steps.length - 1 ? 'Got it!' : 'Next'}
                {currentStepIndex < steps.length - 1 && <ChevronRight size={16} />}
              </button>
            </div>
          </div>

          {/* Arrow */}
          <div
            style={{
              position: 'absolute',
              width: '16px',
              height: '16px',
              background: 'hsl(var(--primary))',
              transform: 'rotate(45deg)',
              zIndex: -1,
              ...(step.position === 'top' ? { bottom: '-8px', left: 'calc(50% - 8px)' } :
                 step.position === 'left' ? { right: '-8px', top: 'calc(50% - 8px)' } :
                 step.position === 'right' ? { left: '-8px', top: 'calc(50% - 8px)' } :
                 { top: '-8px', left: 'calc(50% - 8px)' })
            }}
          />
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default Walkthrough;
