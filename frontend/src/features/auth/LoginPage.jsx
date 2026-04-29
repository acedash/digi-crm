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
      setError('Identity authentication failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ 
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
        background: 'linear-gradient(135deg, rgba(0,0,0,0.4) 0%, rgba(0,0,0,0.1) 40%, rgba(0,0,0,0.2) 100%)',
        zIndex: 1
      }} />

      {/* Content Layer */}
      <div style={{ 
        position: 'relative', 
        zIndex: 2, 
        width: '100%', 
        display: 'flex',
        minHeight: '100vh'
      }}>
        {/* Left Side: Branding */}
        <div style={{ 
          flex: '1.2', 
          display: 'flex',
          flexDirection: 'column',
          padding: '60px'
        }}>
          {/* Branding */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ 
              width: '48px', 
              height: '48px', 
              background: 'rgba(255,255,255,0.1)', 
              backdropFilter: 'blur(8px)',
              borderRadius: '12px', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              border: '1px solid rgba(255,255,255,0.2)'
            }}>
              <img src="/digi-logo-sidebar.png" alt="DC" style={{ height: '32px', width: 'auto' }} />
            </div>
            <div>
              <h2 style={{ color: 'white', fontSize: '24px', fontWeight: 800, margin: 0, letterSpacing: '-0.5px', textShadow: '0 2px 4px rgba(0,0,0,0.2)' }}>DIGICIRCLE</h2>
              <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '13px', margin: 0, fontWeight: 500 }}>Smarter travel management starts here</p>
            </div>
          </div>

          {/* Marketing Text */}
          <div style={{ marginTop: 'auto', marginBottom: '120px' }}>
            <h1 style={{ 
              fontSize: '72px', 
              fontWeight: 800, 
              color: 'white', 
              lineHeight: 1.1, 
              letterSpacing: '-2px',
              maxWidth: '600px',
              textShadow: '0 4px 12px rgba(0,0,0,0.15)'
            }}>
              Simplify.<br />
              Connect.<br />
              <span style={{ color: '#06B68A' }}>Elevate Travel.</span>
            </h1>
          </div>
        </div>

        {/* Right Side: Login Form (Floating) */}
        <div style={{ 
          flex: '0.8', 
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '40px'
        }}>
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            style={{ 
              width: '100%', 
              maxWidth: '480px',
              background: 'white',
              borderRadius: '40px',
              padding: '56px',
              boxShadow: '0 30px 60px -12px rgba(0,0,0,0.25), 0 18px 36px -18px rgba(0,0,0,0.3)',
              border: '1px solid rgba(255,255,255,0.1)'
            }}
          >
            {/* Form Header */}
            <div style={{ textAlign: 'center', marginBottom: '48px' }}>
              <div style={{ 
                width: '80px', 
                height: '80px', 
                background: '#020617', 
                borderRadius: '24px', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                margin: '0 auto 24px',
                boxShadow: '0 12px 24px rgba(0,0,0,0.2)'
              }}>
                <img src="/digi-logo-sidebar.png" alt="DC" style={{ height: '48px', width: 'auto' }} />
              </div>
              <h2 style={{ fontSize: '32px', fontWeight: 800, color: '#0f172a', marginBottom: '12px' }}>Welcome back</h2>
              <p style={{ color: '#64748b', fontSize: '15px', fontWeight: 500 }}>Use the credentials shared by your admin</p>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
              {/* Error Message */}
              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    style={{ 
                      background: '#fef2f2', 
                      color: '#dc2626', 
                      padding: '12px 16px', 
                      borderRadius: '12px',
                      fontSize: '14px',
                      fontWeight: 600,
                      border: '1px solid #fee2e2'
                    }}
                  >
                    {error}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Identity Field */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontSize: '13px', fontWeight: 700, color: '#475569', paddingLeft: '4px' }}>Identity</label>
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
                      padding: '16px 16px 16px 48px', 
                      borderRadius: '16px', 
                      border: '1.5px solid #e2e8f0',
                      fontSize: '15px',
                      background: '#f8fafc',
                      outline: 'none',
                      transition: 'all 0.2s',
                      color: '#0f172a'
                    }}
                    className="login-input"
                  />
                </div>
              </div>

              {/* Password Field */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontSize: '13px', fontWeight: 700, color: '#475569', paddingLeft: '4px' }}>Password</label>
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
                      padding: '16px 48px 16px 48px', 
                      borderRadius: '16px', 
                      border: '1.5px solid #e2e8f0',
                      fontSize: '15px',
                      background: '#f8fafc',
                      outline: 'none',
                      transition: 'all 0.2s',
                      color: '#0f172a'
                    }}
                    className="login-input"
                  />
                  <button 
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{ 
                      position: 'absolute', 
                      right: '16px', 
                      top: '50%', 
                      transform: 'translateY(-50%)', 
                      background: 'none', 
                      border: 'none', 
                      padding: 0, 
                      cursor: 'pointer', 
                      color: '#94a3b8' 
                    }}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>


              {/* Submit Button */}
              <Button 
                type="submit"
                disabled={loading}
                style={{ 
                  height: '60px', 
                  borderRadius: '18px', 
                  background: 'linear-gradient(135deg, #06B68A 0%, #059669 100%)',
                  fontSize: '16px',
                  fontWeight: 800,
                  color: 'white',
                  border: 'none',
                  boxShadow: '0 12px 24px rgba(6, 182, 138, 0.25)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '12px',
                  cursor: loading ? 'not-allowed' : 'pointer'
                }}
              >
                {loading ? (
                  <div style={{ width: '20px', height: '20px', border: '3px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                ) : (
                  <>
                    Sign In <ArrowRight size={20} />
                  </>
                )}
              </Button>
            </form>

            {/* Footer Info */}
            <div style={{ marginTop: '48px', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', color: '#94a3b8', fontSize: '13px', fontWeight: 600 }}>
                <ShieldCheck size={16} />
                Secure login
              </div>
              
              <p style={{ color: '#64748b', fontSize: '14px', fontWeight: 500 }}>
                Don't have access? <span style={{ color: '#0f172a', fontWeight: 700, cursor: 'pointer' }}>Contact your administrator.</span>
              </p>

              <p style={{ color: '#94a3b8', fontSize: '12px', fontWeight: 500, marginTop: '12px' }}>
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
        .login-input:focus {
          border-color: #06B68A !important;
          background: #fff !important;
          box-shadow: 0 0 0 4px rgba(6, 182, 138, 0.05);
        }
      `}} />
    </div>
  );
};

export default LoginPage;
