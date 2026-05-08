import React, { useEffect, useRef, useState } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  LayoutDashboard, 
  Settings, 
  Mail,
  LogOut, 
  ChevronRight,
  ClipboardList,
  PhoneCall,
  Sun,
  Moon,
  Clock,
  Activity,
  Shield,
  Contact,
  Menu,
  X
} from 'lucide-react';
import { useAuthStore } from '../features/auth/useAuthStore';
import authService from '../features/auth/authService';
import { useTheme } from '../context/ThemeContext';
import Button from '../components/ui/Button';
import SecureNotepad from '../components/ui/SecureNotepad';
import StatusToggle from '../features/users/StatusToggle';
import sensitiveAuditService from '../services/sensitiveAuditService';
import Walkthrough from '../components/ui/Walkthrough';
import { useWalkthroughStore } from '../store/walkthroughStore';

const AdminLayout = () => {
  const { user, logout } = useAuthStore();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [shieldActive, setShieldActive] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const lastShortcutLogRef = useRef(0);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth <= 768;
      setIsMobile(mobile);
      if (!mobile) setMobileMenuOpen(false);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleLogout = async () => {
    try {
      await authService.logout();
    } catch {
      // Logout should still clear local auth state even if the API call fails.
    }
    logout();
    navigate('/login');
  };

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  const getBasePath = () => {
    if (location.pathname.startsWith('/admin')) return '/admin';
    if (location.pathname.startsWith('/supervisor')) return '/supervisor';
    if (location.pathname.startsWith('/agent')) return '/agent';
    
    // Fallback based on roles if they are on a naked route
    if (user?.roles?.includes('admin') || user?.roles?.[0]?.name === 'admin') return '/admin';
    if (user?.roles?.includes('supervisor') || user?.roles?.[0]?.name === 'supervisor') return '/supervisor';
    return '/agent';
  };
  
  const basePath = getBasePath();
  const activeRole = typeof user?.roles[0] === 'object' ? user?.roles[0].name : user?.roles[0];
  const isAdmin = activeRole === 'admin';
  const activityLabel = isAdmin ? 'Activity Center' : activeRole === 'supervisor' ? 'Team Activity' : 'My Activity';
  const MotionAside = motion.aside;
  const MotionPage = motion.div;
  useEffect(() => {
    const blockContextMenu = (event) => {
      event.preventDefault();
      setShieldActive(true);
      window.setTimeout(() => setShieldActive(false), 2000);
    };

    const isBlockedShortcut = (event) => {
      const key = event.key.toLowerCase();
      const metaOrCtrl = event.ctrlKey || event.metaKey;

      if (event.key === 'F12') return true;
      if (metaOrCtrl && event.shiftKey && ['i', 'j', 'c'].includes(key)) return true;
      if (metaOrCtrl && key === 'u') return true;
      
      // Screenshot detection (Heuristic)
      if (key === 'printscreen' || key === 'snapshot') return true;
      // Mac specific screenshot shortcuts (Cmd + Shift + 3/4/5)
      if (metaOrCtrl && event.shiftKey && ['3', '4', '5'].includes(key)) return true;
      // Windows Snipping tool (Win + Shift + S) - event.metaKey is Win key on Windows
      if (event.metaKey && event.shiftKey && key === 's') return true;

      return false;
    };

    const blockShortcuts = (event) => {
      if (!isBlockedShortcut(event)) return;
      event.preventDefault();
      setShieldActive(true);
      const now = Date.now();
      if (now - lastShortcutLogRef.current > 30000) {
        lastShortcutLogRef.current = now;
        sensitiveAuditService.logEvent({
          event_type: 'Blocked Shortcut Attempt',
          module: 'Protected Dashboard',
          description: 'Restricted browser shortcut attempted',
          details: {
            shortcut: event.key === 'F12'
              ? 'F12'
              : `${event.metaKey ? 'Cmd' : 'Ctrl'}${event.shiftKey ? '+Shift' : ''}+${event.key.toUpperCase()}`,
            path: location.pathname,
          },
        }).catch(() => {});
      }
      window.setTimeout(() => setShieldActive(false), 1800);
    };

    const handleVisibilityChange = () => {
      setShieldActive(document.hidden);
    };

    const handleWindowBlur = () => {
      // For agents, we blank the screen immediately on loss of focus to prevent snipping
      if (!isAdmin) {
        setShieldActive(true);
      }
    };

    const handleWindowFocus = () => {
      if (!isAdmin) {
        setShieldActive(false);
      }
    };

    const handleBeforePrint = () => {
      // Do not shield if we are on User List page to allow intentional data export
      if (location.pathname === '/admin/users') return;
      setShieldActive(true);
    };

    const handleAfterPrint = () => {
      setShieldActive(false);
    };

    window.addEventListener('contextmenu', blockContextMenu);
    window.addEventListener('keydown', blockShortcuts);
    window.addEventListener('beforeprint', handleBeforePrint);
    window.addEventListener('afterprint', handleAfterPrint);
    window.addEventListener('blur', handleWindowBlur);
    window.addEventListener('focus', handleWindowFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('contextmenu', blockContextMenu);
      window.removeEventListener('keydown', blockShortcuts);
      window.removeEventListener('beforeprint', handleBeforePrint);
      window.removeEventListener('afterprint', handleAfterPrint);
      window.removeEventListener('blur', handleWindowBlur);
      window.removeEventListener('focus', handleWindowFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [location.pathname]);

  const navItems = [
    { label: 'Dashboard', path: `${basePath}/dashboard`, icon: LayoutDashboard, roles: ['admin', 'supervisor', 'agent'] },
    { label: 'Clients', path: `${basePath}/clients`, icon: Contact, roles: ['admin', 'supervisor', 'agent'] },
    { label: 'Bookings', path: `${basePath}/bookings`, icon: ClipboardList, roles: ['admin', 'supervisor', 'agent'] },
    { label: 'Call Logs', path: `${basePath}/call-logs`, icon: PhoneCall, roles: ['admin', 'supervisor', 'agent'] },
    { label: 'Team Monitor', path: `${basePath}/team-monitor`, icon: Activity, roles: ['admin', 'supervisor'] },
    { label: activityLabel, path: `${basePath}/activity`, icon: Clock, roles: ['admin', 'supervisor', 'agent'] },
    { label: 'Charge Queue', path: '/admin/charge-queue', icon: ClipboardList, roles: ['admin'] },
    { label: 'System Users', path: '/admin/users', icon: Settings, roles: ['admin'] },
    { label: 'System Audit', path: '/admin/system-audit', icon: Shield, roles: ['admin'] },
    { label: 'Settings', path: `${basePath}/settings`, icon: Mail, roles: ['admin', 'supervisor', 'agent'] },
  ];
  return (
    <div className="admin-layout-container" style={{ display: 'flex', height: '100vh', overflow: 'hidden', position: 'relative' }}>
      
      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isMobile && mobileMenuOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setMobileMenuOpen(false)}
            style={{
              position: 'absolute',
              inset: 0,
              background: 'rgba(0,0,0,0.5)',
              backdropFilter: 'blur(4px)',
              zIndex: 45
            }}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <MotionAside 
        className="no-print sidebar-nav"
        initial={false}
        animate={{ 
          x: (isMobile && !mobileMenuOpen) ? -240 : 0,
          width: 240
        }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        style={{
          position: isMobile ? 'absolute' : 'relative',
          height: '100%',
          background: 'var(--bg-card)',
          backdropFilter: 'blur(10px)',
          borderRight: '1px solid var(--border-color)',
          display: 'flex',
          flexDirection: 'column',
          padding: '32px 20px',
          zIndex: 50,
        }}
      >
        <div style={{ 
          marginBottom: '40px', 
          display: 'flex', 
          alignItems: 'center', 
          gap: '12px',
          padding: '0 4px',
          position: 'relative'
        }}>
          <div style={{ 
            width: '48px', 
            height: '48px', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            borderRadius: '12px',
            overflow: 'hidden',
            flexShrink: 0
          }}>
            <img 
              src="/digi-logo.jpeg" 
              alt="DC" 
              style={{ 
                height: '100%', 
                width: '100%',
                objectFit: 'cover'
              }} 
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
            <span style={{ 
              fontSize: '18px', 
              fontWeight: 800, 
              color: 'var(--text-main)', 
              letterSpacing: '-0.5px',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }}>
              Digi <span style={{ color: 'hsl(var(--primary))' }}>CRM</span>
            </span>
            <span style={{ 
              fontSize: '10px', 
              fontWeight: 600, 
              color: 'var(--text-muted)', 
              textTransform: 'uppercase', 
              letterSpacing: '0.5px',
              whiteSpace: 'nowrap'
            }}>
              Travel Solution
            </span>
          </div>
          {isMobile && (
            <button 
              onClick={() => setMobileMenuOpen(false)}
              style={{ 
                position: 'absolute', 
                right: '-10px', 
                top: '-10px', 
                background: 'var(--bg-app)', 
                border: 'none', 
                borderRadius: '50%', 
                width: '32px', 
                height: '32px', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                color: 'var(--text-main)'
              }}
            >
              <X size={18} />
            </button>
          )}
        </div>

        <nav style={{ flex: 1, overflowY: 'auto' }}>
          <ul style={{ listStyle: 'none' }}>
            {navItems.filter(item => !item.roles || user?.roles.some(r => item.roles.includes(r.name || r))).map(item => {
              const isActive = location.pathname === item.path;
              const Icon = item.icon;
              return (
                <li key={item.path} style={{ marginBottom: '8px' }}>
                  <Link 
                    to={item.path} 
                    id={item.label === 'Clients' ? 'sidebar-clients' : item.label === 'Bookings' ? 'sidebar-bookings' : undefined}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px 16px',
                      borderRadius: 'var(--radius-pill)',
                      color: isActive ? 'white' : 'var(--text-main)',
                      background: isActive ? 'hsl(var(--primary))' : 'transparent',
                      fontWeight: isActive ? 600 : 500,
                      fontSize: '14px',
                      transition: 'var(--transition-smooth)',
                      textDecoration: 'none',
                      boxShadow: isActive ? '0 10px 15px -3px hsla(var(--primary), 0.2)' : 'none'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <Icon size={18} strokeWidth={isActive ? 2.5 : 2} />
                      {item.label}
                    </div>
                    {isActive && <ChevronRight size={14} />}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <button 
          onClick={handleLogout}
          style={{
            marginTop: 'auto',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '12px 16px',
            borderRadius: '12px',
            background: 'rgba(239, 68, 68, 0.1)',
            color: '#f87171',
            border: 'none',
            fontSize: '14px',
            fontWeight: 600,
            cursor: 'pointer',
            zIndex: 10,
            opacity: 0.8,
            transition: 'var(--transition-smooth)'
          }}
          onMouseEnter={(e) => {
            if (window.innerWidth > 768) {
              e.currentTarget.style.background = '#ef4444';
              e.currentTarget.style.color = 'white';
            }
          }}
          onMouseLeave={(e) => {
            if (window.innerWidth > 768) {
              e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)';
              e.currentTarget.style.color = '#f87171';
            }
          }}
        >
          <LogOut size={18} />
          Sign Out
        </button>
      </MotionAside>

      {/* Main Content */}
      <div className="admin-content-wrapper" style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative', background: 'transparent', width: '100%', overflow: 'hidden' }}>
        <header className="no-print" style={{
          height: '72px',
          background: 'var(--bg-card)',
          backdropFilter: 'blur(8px)',
          borderBottom: '1px solid var(--border-color)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: isMobile ? '0 20px' : '0 40px',
          zIndex: 40,
          width: '100%'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            {isMobile && (
              <button 
                onClick={() => setMobileMenuOpen(true)}
                style={{ background: 'none', border: 'none', color: 'var(--text-main)', cursor: 'pointer', padding: '4px' }}
              >
                <Menu size={24} />
              </button>
            )}
            <div style={{ color: 'var(--text-main)', fontSize: isMobile ? '16px' : '18px', fontWeight: 700 }}>
              {(() => {
                const activeItem = navItems.find(item => item.path === location.pathname);
                if (activeItem) return activeItem.label;
                if (location.pathname.includes('/clients/') || location.pathname.includes('/bookings/')) return 'Client Profile';
                return 'Profile';
              })()}
            </div>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '12px' : '20px' }}>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={toggleTheme}
              icon={theme === 'dark' ? Sun : Moon}
              style={{ borderRadius: '100px', width: '36px', height: '36px', padding: 0 }}
            />
            {!isMobile && (
              <>
                <StatusToggle />
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-main)' }}>{user?.name}</p>
                  <p style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>{activeRole}</p>
                </div>
              </>
            )}
            <div style={{ 
              width: '36px', 
              height: '36px', 
              borderRadius: '50%', 
              background: 'linear-gradient(45deg, #016040, #028a5c)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontWeight: 700
            }}>
              {user?.name?.charAt(0)}
            </div>
          </div>
        </header>

        <main style={{ flex: 1, overflowY: 'auto', padding: isMobile ? '24px 20px' : '40px' }}>
          <div
            style={{
              maxWidth: (location.pathname.includes('/clients') || location.pathname.includes('/bookings')) ? '100%' : '1400px',
              margin: '0 auto',
              position: 'relative',
              filter: shieldActive ? 'blur(25px) grayscale(100%)' : 'none',
              transition: 'filter 0.2s ease',
              pointerEvents: shieldActive ? 'none' : 'auto'
            }}
          >
            <div key={location.pathname}>
              <Outlet />
            </div>
          </div>
        </main>
        {shieldActive && (
          <div
            className="no-print"
            style={{
              position: 'absolute',
              inset: 0,
              background: 'rgba(8, 12, 24, 0.45)',
              backdropFilter: 'blur(20px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 70,
              pointerEvents: 'none'
            }}
          >
            <div
              style={{
                padding: '24px 32px',
                borderRadius: '24px',
                background: 'rgba(15, 23, 42, 0.8)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                color: 'white',
                textAlign: 'center',
                maxWidth: '400px',
                boxShadow: '0 40px 80px rgba(0, 0, 0, 0.5)',
                transform: 'scale(1.05)'
              }}
            >
              <div style={{ fontSize: '18px', fontWeight: 800, marginBottom: '8px', color: 'white' }}>
                Protected CRM View
              </div>
              <div style={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.82)', lineHeight: 1.6 }}>
                Sensitive dashboard content is temporarily obscured while the page is hidden, printing, or restricted actions are used.
              </div>
            </div>
          </div>
        )}
        <SecureNotepad />
        <Walkthrough />
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @media (max-width: 768px) {
          .sidebar-nav {
            box-shadow: 20px 0 50px rgba(0,0,0,0.3);
          }
        }
      `}} />
    </div>
  );
};

export default AdminLayout;
