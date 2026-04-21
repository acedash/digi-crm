import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, LogIn, ShieldAlert, Globe, Compass, Plane, Sparkles } from 'lucide-react';
import { useAuthStore } from './useAuthStore';
import authService from './authService';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import logo from '../../assets/logo.jpg';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const user = useAuthStore((state) => state.user);
  const setAuth = useAuthStore((state) => state.setAuth);
  const navigate = useNavigate();
  const cardRef = useRef(null);

  // 3D Tilt Values
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const mouseX = useSpring(x, { stiffness: 150, damping: 20 });
  const mouseY = useSpring(y, { stiffness: 150, damping: 20 });

  const rotateX = useTransform(mouseY, [-0.5, 0.5], [10, -10]);
  const rotateY = useTransform(mouseX, [-0.5, 0.5], [-10, 10]);

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      navigate('/dashboard', { replace: true });
    }
  }, [user, navigate]);

  const handleMouseMove = (e) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const mouseXPos = e.clientX - rect.left;
    const mouseYPos = e.clientY - rect.top;
    const xPct = (mouseXPos / width) - 0.5;
    const yPct = (mouseYPos / height) - 0.5;
    x.set(xPct);
    y.set(yPct);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await authService.login({ email, password });
      setAuth(data.user, data.token);
      localStorage.setItem('token', data.token);
      navigate('/dashboard');
    } catch (err) {
      setError('Identity authentication failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0, scale: 0.98 },
    visible: { 
      opacity: 1, 
      scale: 1,
      transition: { 
        duration: 0.8,
        ease: "easeOut",
        staggerChildren: 0.1,
        delayChildren: 0.3
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] }
    }
  };

  return (
    <div style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      background: '#020617',
      fontFamily: "'Inter', sans-serif",
      position: 'relative',
      overflow: 'hidden',
      padding: '20px'
    }}>
      
      {/* Aurora Ambient Background */}
      <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', zIndex: 0 }}>
        <motion.div
          animate={{ 
            scale: [1, 1.2, 1],
            x: [0, 100, 0],
            y: [0, 50, 0],
          }}
          transition={{ duration: 25, repeat: Infinity, ease: 'linear' }}
          style={{ 
            position: 'absolute', top: '-20%', left: '-10%', width: '600px', height: '600px',
            background: 'radial-gradient(circle, rgba(16, 185, 129, 0.15) 0%, transparent 70%)',
            filter: 'blur(100px)'
          }}
        />
        <motion.div
          animate={{ 
            scale: [1.2, 1, 1.2],
            x: [0, -100, 0],
            y: [0, -50, 0],
          }}
          transition={{ duration: 30, repeat: Infinity, ease: 'linear' }}
          style={{ 
            position: 'absolute', bottom: '-20%', right: '-10%', width: '600px', height: '600px',
            background: 'radial-gradient(circle, rgba(6, 78, 59, 0.2) 0%, transparent 70%)',
            filter: 'blur(100px)'
          }}
        />
        
        {/* Fine Grain / Noise Overlay */}
        <div style={{ 
          position: 'absolute', inset: 0, 
          backgroundImage: 'url("https://grainy-gradients.vercel.app/noise.svg")',
          opacity: 0.04, mixBlendMode: 'overlay', pointerEvents: 'none'
        }} />
      </div>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        ref={cardRef}
        style={{ 
          width: '100%', maxWidth: '390px', 
          position: 'relative', zIndex: 1,
          perspective: '1000px'
        }}
      >
        <motion.div
          style={{
            rotateX,
            rotateY,
            transformStyle: 'preserve-3d',
            background: 'rgba(15, 23, 42, 0.4)',
            backdropFilter: 'blur(32px) saturate(160%)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '32px',
            padding: '48px 32px',
            boxShadow: '0 40px 80px -20px rgba(0,0,0,0.6), inset 0 1px 0 0 rgba(255,255,255,0.05)',
            position: 'relative',
            overflow: 'hidden'
          }}
        >
          {/* Shimmer Sweep Effect */}
          <motion.div
            animate={{ x: ['-200%', '200%'] }}
            transition={{ duration: 7, repeat: Infinity, ease: 'linear', delay: 1 }}
            style={{
              position: 'absolute', top: 0, bottom: 0, width: '40%',
              background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.03), transparent)',
              transform: 'skewX(-20deg)',
              pointerEvents: 'none'
            }}
          />

          {/* Floating Brand Mark */}
          <motion.div variants={itemVariants} style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
            <div 
               style={{ 
                 width: '88px', height: '88px', 
                 borderRadius: '50%',
                 overflow: 'hidden',
                 border: '2.5px solid rgba(16, 185, 129, 0.3)',
                 boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
                 background: '#020617'
               }}
            >
              <img src={logo} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
          </motion.div>

          <header style={{ textAlign: 'center', marginBottom: '32px' }}>
            <motion.h1 variants={itemVariants} style={{ fontSize: '32px', fontWeight: 950, color: 'white', letterSpacing: '-1.5px', marginBottom: '4px' }}>
              Digi <span style={{ color: '#10b981' }}>Circle</span>
            </motion.h1>
            <motion.p variants={itemVariants} style={{ color: 'rgba(255,255,255,0.3)', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '2.5px' }}>
              Executive Access Control
            </motion.p>
          </header>

          <AnimatePresence mode="wait">
            {error && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                style={{ 
                  background: 'rgba(239, 68, 68, 0.1)', 
                  border: '1px solid rgba(239, 68, 68, 0.12)',
                  borderRadius: '12px',
                  padding: '12px 16px',
                  marginBottom: '24px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  color: '#f87171',
                  fontSize: '13px',
                  fontWeight: 600
                }}
              >
                <ShieldAlert size={18} />
                {error}
              </motion.div>
            )}
          </AnimatePresence>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <motion.div variants={itemVariants}>
              <Input
                label="AGENT IDENTITY"
                placeholder="agent@digicircle.com"
                icon={Mail}
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                variant="transparent"
                required
              />
            </motion.div>
            
            <motion.div variants={itemVariants}>
              <Input
                label="SECURITY KEY"
                placeholder="••••••••"
                icon={Lock}
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                variant="transparent"
                required
              />
            </motion.div>

            <motion.div variants={itemVariants} style={{ marginTop: '8px', position: 'relative' }}>
              <Button 
                type="submit" 
                variant="primary" 
                size="lg" 
                fullWidth
                isLoading={loading}
                style={{ 
                  height: '54px',
                  fontSize: '15px',
                  fontWeight: 850,
                  borderRadius: '16px',
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  boxShadow: '0 15px 30px -5px rgba(16, 185, 129, 0.3)',
                  textTransform: 'uppercase',
                  letterSpacing: '1.5px',
                  position: 'relative',
                  overflow: 'hidden'
                }}
              >
                {/* Button Light Sweep */}
                <motion.div
                  animate={{ x: ['-100%', '200%'] }}
                  transition={{ duration: 2.5, repeat: Infinity, ease: "easeOut", repeatDelay: 1 }}
                  style={{
                    position: 'absolute', top: 0, bottom: 0, width: '30%',
                    background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)',
                    transform: 'skewX(-30deg)',
                    pointerEvents: 'none'
                  }}
                />
                <LogIn size={20} style={{ marginRight: '12px', position: 'relative', zIndex: 1 }} />
                <span style={{ position: 'relative', zIndex: 1 }}>SignIn Securely</span>
              </Button>
            </motion.div>
          </form>

          <motion.footer variants={itemVariants} style={{ marginTop: '32px', textAlign: 'center' }}>
            <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.2)', fontWeight: 800, letterSpacing: '2px', textTransform: 'uppercase' }}>
              © 2026 Digi Circle • Executive Console
            </p>
          </motion.footer>
        </motion.div>
      </motion.div>

      {/* Atmospheric Accents */}
      <motion.div
        animate={{ 
          rotate: [0, 360],
          scale: [1, 1.2, 1]
        }}
        transition={{ duration: 40, repeat: Infinity, ease: 'linear' }}
        style={{ position: 'absolute', bottom: '10%', left: '10%', opacity: 0.04, color: 'white', pointerEvents: 'none' }}
      >
        <Sparkles size={160} />
      </motion.div>

      {/* Gliding Planes */}
      <motion.div
        animate={{ 
          x: ['-10vw', '110vw'],
          y: ['10vh', '15vh'],
          rotate: [15, 20, 15]
        }}
        transition={{ duration: 45, repeat: Infinity, ease: 'linear' }}
        style={{ position: 'absolute', top: '20%', left: 0, opacity: 0.03, color: 'white', pointerEvents: 'none' }}
      >
        <Plane size={100} style={{ transform: 'rotate(90deg)' }} />
      </motion.div>

      <motion.div
        animate={{ 
          x: ['110vw', '-10vw'],
          y: ['70vh', '65vh'],
          rotate: [-195, -200, -195]
        }}
        transition={{ duration: 60, repeat: Infinity, ease: 'linear' }}
        style={{ position: 'absolute', top: 0, left: 0, opacity: 0.02, color: 'white', pointerEvents: 'none' }}
      >
        <Plane size={140} style={{ transform: 'rotate(90deg)' }} />
      </motion.div>
    </div>
  );
};

export default LoginPage;
