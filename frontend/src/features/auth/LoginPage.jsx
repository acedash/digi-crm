import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, LogIn, ShieldAlert } from 'lucide-react';
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

  return (
    <div style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center', 
      padding: '24px',
      position: 'relative',
      overflow: 'hidden',
      background: 'var(--bg-app)'
    }}>
      {/* Animated Background Orbs */}
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: -1 }}>
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.15, 0.25, 0.15],
          }}
          transition={{ duration: 10, repeat: Infinity }}
          style={{
            position: 'absolute',
            top: '-10%',
            left: '-10%',
            width: '50%',
            height: '50%',
            background: 'radial-gradient(circle, #a4ff7d 0%, transparent 70%)',
            filter: 'blur(100px)',
          }}
        />
        <motion.div
          animate={{
            scale: [1, 1.3, 1],
            opacity: [0.1, 0.2, 0.1],
          }}
          transition={{ duration: 15, repeat: Infinity, delay: 2 }}
          style={{
            position: 'absolute',
            bottom: '-10%',
            right: '-10%',
            width: '60%',
            height: '60%',
            background: 'radial-gradient(circle, #0a8b24 0%, transparent 70%)',
            filter: 'blur(100px)',
          }}
        />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        style={{ width: '100%', maxWidth: '440px' }}
      >
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <div style={{ 
            width: '120px', 
            height: '120px', 
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 12px',
            overflow: 'hidden',
          }}>
            <img src={logo} alt="Kreyton Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '18px', fontWeight: 600, letterSpacing: '-0.3px' }}>
            Smarter travel management starts here.
          </p>
        </div>

        <Card style={{ padding: '40px' }}>
          <AnimatePresence mode="wait">
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                style={{ 
                  background: 'rgba(239, 68, 68, 0.1)', 
                  border: '1px solid rgba(239, 68, 68, 0.2)',
                  borderRadius: '12px',
                  padding: '12px 16px',
                  marginBottom: '24px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  color: '#ef4444',
                  fontSize: '14px'
                }}
              >
                <ShieldAlert size={18} />
                {error}
              </motion.div>
            )}
          </AnimatePresence>

          <form onSubmit={handleSubmit}>
            <Input
              label="Email Address"
              placeholder="Enter your email"
              icon={Mail}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <Input
              label="Password"
              placeholder="••••••••"
              icon={Lock}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            
            <Button 
              type="submit" 
              variant="primary" 
              size="lg" 
              style={{ 
                width: '100%', 
                marginTop: '8px',
                background: 'linear-gradient(135deg, #a4ff7d, #0a8b24)',
                border: 'none',
                boxShadow: '0 10px 20px -5px rgba(10, 139, 36, 0.4)'
              }}
              isLoading={loading}
            >
              Secure Login
            </Button>
          </form>

          <div style={{ marginTop: '32px', textAlign: 'center' }}>
            <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
              Authorized personal only. <br/>
              © 2026 Kreyton Travel Management
            </p>
          </div>
        </Card>
      </motion.div>
    </div>
  );
};

export default LoginPage;
