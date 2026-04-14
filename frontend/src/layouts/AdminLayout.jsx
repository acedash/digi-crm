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
  Contact
} from 'lucide-react';
import { useAuthStore } from '../features/auth/useAuthStore';
import authService from '../features/auth/authService';
import { useTheme } from '../context/ThemeContext';
import Button from '../components/ui/Button';
import SecureNotepad from '../components/ui/SecureNotepad';
import StatusToggle from '../features/users/StatusToggle';
import sensitiveAuditService from '../services/sensitiveAuditService';

const AdminLayout = () => {
  const { user, logout } = useAuthStore();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [shieldActive, setShieldActive] = useState(false);
  const lastShortcutLogRef = useRef(0);

  const handleLogout = async () => {
    try {
      await authService.logout();
    } catch {
      // Logout should still clear local auth state even if the API call fails.
    }
    logout();
    navigate('/login');
  };

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
    };

    const isBlockedShortcut = (event) => {
      const key = event.key.toLowerCase();
      const metaOrCtrl = event.ctrlKey || event.metaKey;

      if (event.key === 'F12') return true;
      if (metaOrCtrl && event.shiftKey && ['i', 'j', 'c'].includes(key)) return true;
      if (metaOrCtrl && key === 'u') return true;

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
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('contextmenu', blockContextMenu);
      window.removeEventListener('keydown', blockShortcuts);
      window.removeEventListener('beforeprint', handleBeforePrint);
      window.removeEventListener('afterprint', handleAfterPrint);
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
    <div className="admin-layout-container" style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      {/* Sidebar */}
      <MotionAside 
        className="no-print"
        initial={{ x: -240 }}
        animate={{ x: 0 }}
        style={{
          width: '240px',
          height: '100%',
          background: 'var(--bg-card)',
          backdropFilter: 'blur(10px)',
          borderRight: '1px solid var(--border-color)',
          display: 'flex',
          flexDirection: 'column',
          padding: '32px 20px',
          zIndex: 50
        }}
      >
        <div style={{ marginBottom: '48px', paddingLeft: '12px' }}>
          <h2 style={{ 
            fontSize: '22px', 
            fontWeight: 800, 
            display: 'flex', 
            alignItems: 'center', 
            gap: '12px',
          }}>
            <div style={{ 
              width: '32px', 
              height: '32px', 
              background: 'linear-gradient(135deg, #06B68A, #059669)', 
              borderRadius: '9999px' 
            }} />
            <span className="premium-gradient-text">Digi CRM</span>
          </h2>
        </div>

        <nav style={{ flex: 1 }}>
          <ul style={{ listStyle: 'none' }}>
            {navItems.filter(item => !item.roles || user?.roles.some(r => item.roles.includes(r.name || r))).map(item => {
              const isActive = location.pathname === item.path;
              const Icon = item.icon;
              return (
                <li key={item.path} style={{ marginBottom: '8px' }}>
                  <Link 
                    to={item.path} 
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
            e.target.style.background = '#ef4444';
            e.target.style.color = 'white';
          }}
          onMouseLeave={(e) => {
            e.target.style.background = 'rgba(239, 68, 68, 0.1)';
            e.target.style.color = '#f87171';
          }}
        >
          <LogOut size={18} />
          Sign Out
        </button>
      </MotionAside>

      {/* Main Content */}
      <div className="admin-content-wrapper" style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative', background: 'transparent' }}>
        <header className="no-print" style={{
          height: '72px',
          background: 'var(--bg-card)',
          backdropFilter: 'blur(8px)',
          borderBottom: '1px solid var(--border-color)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 40px',
          zIndex: 40
        }}>
          <div style={{ color: 'var(--text-main)', fontSize: '18px', fontWeight: 700 }}>
            {(() => {
              const activeItem = navItems.find(item => item.path === location.pathname);
              if (activeItem) return activeItem.label;
              if (location.pathname.includes('/clients/')) return 'Client Profile';
              return 'Profile';
            })()}
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={toggleTheme}
              icon={theme === 'dark' ? Sun : Moon}
              style={{ borderRadius: '100px' }}
            />
            <StatusToggle />
            <div style={{ textAlign: 'right' }}>
              <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-main)' }}>{user?.name}</p>
              <p style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>{activeRole}</p>
            </div>
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

        <main style={{ flex: 1, overflowY: 'auto', padding: '40px' }}>
          <div
            style={{
              maxWidth: '1200px',
              margin: '0 auto',
              position: 'relative',
              filter: shieldActive ? 'blur(10px)' : 'none',
              transition: 'filter 0.18s ease'
            }}
          >
            <div
              key={location.pathname}
            >
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
              backdropFilter: 'blur(8px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 70,
              pointerEvents: 'none'
            }}
          >
            <div
              style={{
                padding: '18px 22px',
                borderRadius: '16px',
                background: 'rgba(9, 14, 29, 0.78)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                color: 'white',
                textAlign: 'center',
                maxWidth: '320px',
                boxShadow: '0 24px 60px rgba(0, 0, 0, 0.35)'
              }}
            >
              <div style={{ fontSize: '15px', fontWeight: 700, marginBottom: '6px' }}>
                Protected CRM View
              </div>
              <div style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.82)', lineHeight: 1.5 }}>
                Sensitive dashboard content is temporarily obscured while the page is hidden, printing, or restricted shortcuts are used.
              </div>
            </div>
          </div>
        )}
        <SecureNotepad />
      </div>
    </div>
  );
};

export default AdminLayout;
