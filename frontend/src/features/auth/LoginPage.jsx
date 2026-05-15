import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  Mail, 
  Lock, 
  LogIn, 
  ShieldCheck, 
  Eye, 
  EyeOff, 
  ArrowRight,
  User
} from 'lucide-react';
import { useAuthStore } from './useAuthStore';
import authService from './authService';
import Button from '../../components/ui/Button';

const LoginPage = () => {
  const [identity, setIdentity] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const user = useAuthStore((state) => state.user);
  const setAuth = useAuthStore((state) => state.setAuth);
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate('/dashboard', { replace: true });
    }
  }, [user, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await authService.login({ email: identity, password });
      setAuth(data.user, data.token);
      localStorage.setItem('token', data.token);
      navigate('/dashboard');
    } catch (err) {
      const message = err.response?.data?.message || 'Authentication failed. Please check your credentials.';
      setError(message);
    } finally {

      setLoading(false);
    }
  };

  return (
    <div className="light" style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      background: '#fff',
      fontFamily: "'Inter', sans-serif",
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Immersive Background Image (Full Screen) */}
      <div style={{ 
        position: 'absolute', 
        inset: 0, 
        backgroundImage: 'url("/login-bg.png")',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        zIndex: 0
      }} />
      
      {/* Global Overlay for readability */}
      <div style={{ 
        position: 'absolute', 
        inset: 0, 
        background: 'linear-gradient(rgba(0,0,0,0.4), rgba(0,0,0,0.2))',
        zIndex: 1
      }} />

      {/* Content Layer */}
      <div style={{ 
        position: 'relative', 
        zIndex: 2, 
        width: '100%', 
        display: 'flex',
        height: '100vh',
        overflow: 'hidden'
      }}>
        {/* Left Side: Branding */}
        <div style={{ 
          flex: '1', 
          display: 'flex',
          flexDirection: 'column',
          padding: '50px 80px'
        }}>

          {/* Branding */}
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '16px'
          }}>
            <div style={{ 
              width: '56px', 
              height: '56px', 
              borderRadius: '50%',
              overflow: 'hidden'
            }}>
              <img src="/digi-logo.jpeg" alt="DC" style={{ height: '100%', width: '100%', objectFit: 'cover' }} />
            </div>
            <div>
              <h2 style={{ 
                color: 'white', 
                fontSize: '20px', 
                fontWeight: 800, 
                margin: 0, 
                letterSpacing: '-0.5px'
              }}>DIGICIRCLE</h2>
              <p style={{ 
                color: 'rgba(255,255,255,0.9)', 
                fontSize: '13px', 
                margin: 0, 
                fontWeight: 500
              }}>Smarter travel management starts here</p>
            </div>
          </div>

          {/* Marketing Text */}
          <div style={{ marginTop: '160px' }}>
            <h1 style={{ 
              fontSize: '44px', 
              fontWeight: 800, 
              color: 'white', 
              lineHeight: 1.15, 
              letterSpacing: '-1px',
              maxWidth: '500px',
              textShadow: '0 2px 12px rgba(0,0,0,0.5)'
            }}>
              Simplify.<br />
              Connect.<br />
              <span style={{ color: '#5eead4', textShadow: '0 2px 12px rgba(0,0,0,0.5)' }}>Elevate Travel.</span>
            </h1>
          </div>
        </div>

        {/* Right Side: Login Form (Floating) */}
        <div style={{ 
          flex: '1', 
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}>
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            style={{ 
              width: '100%', 
              maxWidth: '480px',
              background: 'white',
              borderRadius: '24px',
              padding: '40px',
              boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
            }}
          >
            {/* Form Header */}
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <div style={{ 
                width: '80px', 
                height: '80px', 
                margin: '0 auto 16px',
                borderRadius: '50%',
                overflow: 'hidden'
              }}>
                <img src="/digi-logo.jpeg" alt="DC" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
              <h2 style={{ fontSize: '32px', fontWeight: 800, color: '#1e293b', marginBottom: '4px' }}>Welcome back</h2>
              <p style={{ color: '#64748b', fontSize: '15px', fontWeight: 500 }}>Use the credentials shared by your admin</p>
            </div>

            {/* Error Message */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                  animate={{ opacity: 1, height: 'auto', marginBottom: 20 }}
                  exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                  style={{ 
                    overflow: 'hidden',
                    background: '#fef2f2',
                    border: '1px solid #fee2e2',
                    borderRadius: '12px',
                    padding: '12px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    color: '#991b1b',
                    fontSize: '13px',
                    fontWeight: 600
                  }}
                >
                  <div style={{ flexShrink: 0, width: '6px', height: '6px', borderRadius: '50%', background: '#ef4444' }} />
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

              {/* Identity Field */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '14px', fontWeight: 700, color: '#334155' }}>Identity</label>
                <div style={{ position: 'relative' }}>
                  <User size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                  <input 
                    type="text"
                    placeholder="Enter your email or username"
                    value={identity}
                    onChange={(e) => setIdentity(e.target.value)}
                    required
                    style={{ 
                      width: '100%', 
                      padding: '14px 16px 14px 44px', 
                      borderRadius: '12px', 
                      border: '1px solid #e2e8f0',
                      fontSize: '15px',
                      background: '#fff',
                      outline: 'none',
                      color: '#1e293b'
                    }}
                  />
                </div>
              </div>

              {/* Password Field */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '14px', fontWeight: 700, color: '#334155' }}>Password</label>
                <div style={{ position: 'relative' }}>
                  <Lock size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                  <input 
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    style={{ 
                      width: '100%', 
                      padding: '14px 44px 14px 44px', 
                      borderRadius: '12px', 
                      border: '1px solid #e2e8f0',
                      fontSize: '15px',
                      background: '#fff',
                      outline: 'none',
                      color: '#1e293b'
                    }}
                  />
                  <button 
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '-4px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', color: '#475569', fontWeight: 500 }}>
                  <input 
                    type="checkbox" 
                    checked={rememberMe} 
                    onChange={(e) => setRememberMe(e.target.checked)}
                    style={{ width: '16px', height: '16px', accentColor: '#0d9488' }}
                  />
                  Remember this device
                </label>
                <div style={{ position: 'relative' }}>
                  <AnimatePresence>
                    {showTooltip && (
                      <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 5, scale: 0.95 }}
                        style={{
                          position: 'absolute',
                          bottom: '100%',
                          right: 0,
                          marginBottom: '12px',
                          background: '#1e293b',
                          color: 'white',
                          padding: '10px 14px',
                          borderRadius: '10px',
                          fontSize: '12px',
                          fontWeight: 500,
                          width: '180px',
                          textAlign: 'center',
                          boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
                          zIndex: 10,
                          pointerEvents: 'none'
                        }}
                      >
                        Please contact your administrator to reset your password.
                        {/* Tooltip Arrow */}
                        <div style={{
                          position: 'absolute',
                          top: '100%',
                          right: '20px',
                          width: '0',
                          height: '0',
                          borderLeft: '6px solid transparent',
                          borderRight: '6px solid transparent',
                          borderTop: '6px solid #1e293b'
                        }} />
                      </motion.div>
                    )}
                  </AnimatePresence>
                  <span 
                    onMouseEnter={() => setShowTooltip(true)}
                    onMouseLeave={() => setShowTooltip(false)}
                    style={{ fontSize: '13px', color: '#0d9488', fontWeight: 600, cursor: 'help' }}
                  >
                    Forgot password?
                  </span>
                </div>
              </div>

              {/* Submit Button */}
              <button 
                type="submit"
                disabled={loading}
                style={{ 
                  height: '56px', 
                  borderRadius: '12px', 
                  background: 'linear-gradient(to right, #0d9488, #0f766e)',
                  fontSize: '17px',
                  fontWeight: 700,
                  color: 'white',
                  border: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '12px',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  marginTop: '4px',
                  boxShadow: '0 4px 12px rgba(13, 148, 136, 0.2)'
                }}
              >
                {loading ? 'Signing in...' : <>Sign In <ArrowRight size={20} /></>}
              </button>
            </form>

            {/* Footer Info */}
            <div style={{ marginTop: '32px', textAlign: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', color: '#94a3b8', fontSize: '13px', marginBottom: '16px' }}>
                <ShieldCheck size={16} />
                Secure login
              </div>
              
              <p style={{ color: '#64748b', fontSize: '14px', fontWeight: 500, marginBottom: '20px' }}>
                Don't have access? Contact your administrator.
              </p>

              <p style={{ color: '#94a3b8', fontSize: '13px', fontWeight: 500 }}>
                © 2026 Kreyton Digicircle Private Limited
              </p>
            </div>
          </motion.div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        input:focus {
          border-color: #0d9488 !important;
          box-shadow: 0 0 0 4px rgba(13, 148, 136, 0.05) !important;
        }
      `}} />
    </div>
  );
};

export default LoginPage;
