import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, LogIn, ShieldAlert, Globe, Compass, ShieldCheck, Plane } from 'lucide-react';
import { useAuthStore } from './useAuthStore';
import authService from './authService';
import Card from '../../components/ui/Card';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import logo from '../../assets/logo.jpg';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const setAuth = useAuthStore((state) => state.setAuth);
  const navigate = useNavigate();

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
      setError('Invalid email or password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Styled components logic for shimmer
  const shimmerStyle = {
    position: 'absolute',
    top: 0,
    left: '-100%',
    width: '50%',
    height: '100%',
    background: 'linear-gradient(to right, transparent, rgba(255,255,255,0.3), transparent)',
    transform: 'skewX(-25deg)',
  };

  return (
    <div style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      flexDirection: window.innerWidth < 768 ? 'column' : 'row',
      background: 'var(--bg-app)',
      overflow: 'hidden'
    }}>
      {/* Left Panel: Brand & Welcome */}
      <div style={{ 
        flex: 1.2, 
        background: 'linear-gradient(135deg, #06B68A 0%, #059669 100%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px',
        color: 'white',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Geometric Texture Overlay */}
        <div style={{ 
            position: 'absolute', 
            inset: 0, 
            opacity: 0.05, 
            backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`,
            backgroundSize: '32px 32px',
            zIndex: 0
        }} />

        {/* Floating Travel Icons */}
        <motion.div
            animate={{ 
                y: [0, -20, 0],
                rotate: [0, 5, 0]
            }}
            transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
            style={{ position: 'absolute', top: '15%', left: '15%', opacity: 0.15, zIndex: 0 }}
        >
            <Plane size={48} />
        </motion.div>

        <motion.div
            animate={{ 
                y: [0, 25, 0],
                rotate: [0, -8, 0]
            }}
            transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
            style={{ position: 'absolute', bottom: '20%', left: '25%', opacity: 0.15, zIndex: 0 }}
        >
            <Compass size={40} />
        </motion.div>

        <motion.div
            animate={{ 
                y: [0, -15, 0],
                x: [0, 10, 0]
            }}
            transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
            style={{ position: 'absolute', top: '25%', right: '20%', opacity: 0.2, zIndex: 0 }}
        >
            <Globe size={54} />
        </motion.div>

        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8 }}
            style={{ textAlign: 'center', zIndex: 1 }}
        >
            <motion.div 
                whileHover={{ scale: 1.05 }}
                style={{ 
                    width: '140px', 
                    height: '140px', 
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 24px',
                }}
            >
                <img src={logo} alt="Digi CRM" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
            </motion.div>
            <h1 style={{ fontSize: '56px', fontWeight: 900, letterSpacing: '-3px', marginBottom: '16px', lineHeight: 1 }}>
                Digi <span style={{ opacity: 0.6 }}>Circle</span>
            </h1>
            <p style={{ fontSize: '22px', fontWeight: 500, opacity: 0.9, maxWidth: '420px', margin: '0 auto', lineHeight: 1.5, letterSpacing: '-0.5px' }}>
                Your destination for <span style={{ borderBottom: '2px solid rgba(255,255,255,0.3)' }}>smarter</span> travel business.
            </p>
        </motion.div>
      </div>

      {/* Right Panel: Login Form */}
      <div style={{ 
        flex: 1, 
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '60px',
        background: 'var(--bg-app)'
      }}>
        <div style={{ width: '100%', maxWidth: '400px' }}>
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                style={{ marginBottom: '48px' }}
            >
                <h2 style={{ fontSize: '32px', fontWeight: 850, color: 'var(--text-main)', marginBottom: '8px', letterSpacing: '-1px' }}>
                    Welcome <span className="premium-gradient-text">Back</span>
                </h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '16px', fontWeight: 500 }}>
                    Access your travel console securely.
                </p>
            </motion.div>

            <AnimatePresence mode="wait">
                {error && (
                <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0 }}
                    style={{ 
                        background: 'rgba(239, 68, 68, 0.05)', 
                        border: '1px solid rgba(239, 68, 68, 0.15)',
                        borderRadius: '16px',
                        padding: '14px 20px',
                        marginBottom: '32px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        color: '#ef4444',
                        fontSize: '14px',
                        fontWeight: 600
                    }}
                >
                    <ShieldAlert size={20} />
                    {error}
                </motion.div>
                )}
            </AnimatePresence>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                >
                    <Input
                        label="Email Address"
                        placeholder="agent@digicircle.com"
                        icon={Mail}
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                    />
                </motion.div>
                
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                >
                    <Input
                        label="Security Key"
                        placeholder="••••••••"
                        icon={Lock}
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                    />
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                >
                    <Button 
                        type="submit" 
                        variant="primary" 
                        size="lg" 
                        style={{ 
                            width: '100%', 
                            height: '56px',
                            fontSize: '17px',
                            fontWeight: 800,
                            letterSpacing: '0.5px',
                            position: 'relative',
                            overflow: 'hidden',
                            boxShadow: '0 15px 30px -10px rgba(6, 182, 138, 0.4)'
                        }}
                        isLoading={loading}
                    >
                        <motion.div
                            animate={{ left: '150%' }}
                            transition={{ duration: 2, repeat: Infinity, repeatDelay: 3, ease: 'easeInOut' }}
                            style={shimmerStyle}
                        />
                        <LogIn size={20} style={{ marginRight: '10px' }} />
                        Access Console
                    </Button>
                </motion.div>
            </form>

            <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                style={{ marginTop: '56px', textAlign: 'center' }}
            >
                <p style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: 600 }}>
                    © 2026 Kreyton Digicircle Private Limited
                </p>
            </motion.div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
