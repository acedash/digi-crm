import React from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  LayoutDashboard, 
  Users, 
  Briefcase, 
  Settings, 
  Mail,
  LogOut, 
  User, 
  Menu,
  ChevronRight,
  Plane,
  ClipboardList,
  PhoneCall,
  Sun,
  Moon,
  Truck,
  Clock,
  Activity,
  Shield
} from 'lucide-react';
import { useAuthStore } from '../features/auth/useAuthStore';
import authService from '../features/auth/authService';
import { useTheme } from '../context/ThemeContext';
import Button from '../components/ui/Button';
import SecureNotepad from '../components/ui/SecureNotepad';
import StatusToggle from '../features/users/StatusToggle';

const AdminLayout = () => {
  const { user, logout } = useAuthStore();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    try {
      await authService.logout();
    } catch (e) {}
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

  const navItems = [
    { label: 'Dashboard', path: `${basePath}/dashboard`, icon: LayoutDashboard, roles: ['admin', 'supervisor', 'agent'] },
    { label: 'Bookings', path: `${basePath}/bookings`, icon: ClipboardList, roles: ['admin', 'supervisor', 'agent'] },
    { label: 'Call Logs', path: `${basePath}/call-logs`, icon: PhoneCall, roles: ['admin', 'supervisor', 'agent'] },
    { label: 'Team Monitor', path: `${basePath}/team-monitor`, icon: Activity, roles: ['admin', 'supervisor'] },
    { label: activityLabel, path: `${basePath}/activity`, icon: Clock, roles: ['admin', 'supervisor', 'agent'] },
    { label: 'System Users', path: '/admin/users', icon: Settings, roles: ['admin'] },
    { label: 'System Audit', path: '/admin/system-audit', icon: Shield, roles: ['admin'] },
    { label: 'Settings', path: '/admin/settings', icon: Mail, roles: ['admin'] },
  ];
  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      {/* Sidebar */}
      <motion.aside 
        initial={{ x: -280 }}
        animate={{ x: 0 }}
        style={{
          width: '280px',
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
              background: 'linear-gradient(135deg, #016040, #028a5c)', 
              borderRadius: '9999px' 
            }} />
            <span className="premium-gradient-text">Travel CRM</span>
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
      </motion.aside>

      {/* Main Content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative', background: 'transparent' }}>
        <header style={{
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
            {navItems.find(item => item.path === location.pathname)?.label || 'Profile'}
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
          <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
            <AnimatePresence mode="wait">
              <motion.div
                key={location.pathname}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                <Outlet />
              </motion.div>
            </AnimatePresence>
          </div>
        </main>
        <SecureNotepad />
      </div>
    </div>
  );
};

export default AdminLayout;
