import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  User, 
  Mail, 
  Phone, 
  Shield, 
  Calendar, 
  Clock, 
  Lock, 
  Save, 
  X,
  Info,
  ChevronDown,
  Briefcase
} from 'lucide-react';
import userService from './userService';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';

const UserForm = ({ user, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    roles: ['agent'],
    supervisor_id: '',
    phone: '',
    shift: '',
    week_off: '',
  });
  const [supervisors, setSupervisors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchSupervisors();
    if (user) {
      setFormData({
        name: user.name || '',
        email: user.email || '',
        password: '',
        roles: user.roles ? user.roles.map(r => r.name || r) : ['agent'],
        supervisor_id: user.supervisor_id || '',
        phone: user.phone || '',
        shift: user.shift || '',
        week_off: user.week_off || '',
      });
    }
  }, [user]);

  const fetchSupervisors = async () => {
    try {
      const response = await userService.getSupervisors();
      setSupervisors(response.data.data || response.data);
    } catch (err) {
      console.error('Failed to load supervisors');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const submissionData = { ...formData };
    if (!submissionData.roles.includes('agent')) {
      submissionData.supervisor_id = null;
    }
    if (user && !submissionData.password) {
      delete submissionData.password;
    }

    try {
      if (user) {
        await userService.updateUser(user.id, submissionData);
      } else {
        await userService.createUser(submissionData);
      }
      onSuccess();
      onClose();
    } catch (err) {
      if (err.response?.data?.errors) {
        const firstError = Object.values(err.response.data.errors)[0][0];
        setError(firstError);
      } else {
        setError(err.response?.data?.message || 'Failed to save user record');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(2, 6, 23, 0.8)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '24px'
    }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="glass-panel"
        style={{
          width: '100%',
          maxWidth: '600px',
          maxHeight: 'calc(100vh - 48px)',
          borderRadius: '24px',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          background: 'var(--bg-app)'
        }}
      >
        {/* Header */}
        <div style={{ 
          padding: '24px 32px', 
          borderBottom: '1px solid var(--border-color)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'var(--bg-card)'
        }}>
          <div>
            <h2 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-main)' }}>
              {user ? 'Edit Member' : 'Add Team Member'}
            </h2>
            <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
              Configure permissions and operational details.
            </p>
          </div>
          <Button variant="ghost" icon={X} onClick={onClose} />
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '32px' }}>
          {error && (
            <motion.div 
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              style={{ 
                background: 'rgba(239, 68, 68, 0.1)', 
                border: '1px solid rgba(239, 68, 68, 0.2)',
                color: '#f87171',
                padding: '16px',
                borderRadius: '12px',
                marginBottom: '32px',
                fontSize: '14px',
                display: 'flex', gap: '12px', alignItems: 'center'
              }}
            >
              <Info size={18} />
              {error}
            </motion.div>
          )}

          <form id="user-form" onSubmit={handleSubmit}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              
              <section>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                  <User size={18} style={{ color: 'hsl(var(--primary))' }} />
                  <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-main)' }}>Profile Identity</h3>
                </div>
                <Input 
                  label="Full Name" 
                  placeholder="e.g. John Doe"
                  value={formData.name} 
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  required 
                />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <Input 
                    label="Email Address" 
                    icon={Mail}
                    placeholder="john@example.com"
                    value={formData.email} 
                    onChange={e => setFormData({...formData, email: e.target.value})}
                    required 
                  />
                  <Input 
                    label="Phone" 
                    icon={Phone}
                    placeholder="+1..."
                    value={formData.phone} 
                    onChange={e => setFormData({...formData, phone: e.target.value})}
                  />
                </div>
              </section>

              <section>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                  <Shield size={18} style={{ color: 'hsl(var(--primary))' }} />
                  <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-main)' }}>Access & Security</h3>
                </div>
                
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '12px', color: 'var(--text-muted)' }}>Roles</label>
                  <div style={{ display: 'flex', gap: '12px' }}>
                    {['agent', 'supervisor', 'admin'].map(role => {
                      const isSelected = formData.roles.includes(role);
                      return (
                        <motion.div 
                          key={role}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => setFormData({...formData, roles: [role]})}
                          style={{
                            flex: 1,
                            padding: '12px',
                            borderRadius: '12px',
                            textAlign: 'center',
                            cursor: 'pointer',
                            fontSize: '13px',
                            fontWeight: 700,
                            textTransform: 'capitalize',
                            background: isSelected ? 'hsla(var(--primary), 0.1)' : 'var(--bg-input)',
                            color: isSelected ? 'hsl(var(--primary))' : 'var(--text-muted)',
                            border: `1px solid ${isSelected ? 'hsl(var(--primary))' : 'var(--border-color)'}`,
                            transition: 'var(--transition-smooth)'
                          }}
                        >
                          {role}
                        </motion.div>
                      );
                    })}
                  </div>
                </div>

                <Input 
                  label={user ? 'New Password (leave blank to keep current)' : 'Account Passcode'}
                  icon={Lock}
                  type="password"
                  placeholder="••••••••"
                  value={formData.password} 
                  onChange={e => setFormData({...formData, password: e.target.value})}
                  required={!user} 
                />
              </section>

              <section>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                  <Clock size={18} style={{ color: 'hsl(var(--primary))' }} />
                  <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-main)' }}>Operations</h3>
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '8px', color: 'var(--text-muted)' }}>Work Shift</label>
                    <div style={{ position: 'relative' }}>
                      <select 
                        style={{
                          width: '100%',
                          background: 'var(--bg-input)',
                          border: '1px solid var(--border-color)',
                          borderRadius: '12px',
                          padding: '12px',
                          color: 'var(--text-main)',
                          fontSize: '14px',
                          outline: 'none',
                          appearance: 'none'
                        }}
                        value={formData.shift}
                        onChange={e => setFormData({...formData, shift: e.target.value})}
                      >
                        <option value="">Select Shift</option>
                        <option value="Morning">Morning (9 AM - 6 PM)</option>
                        <option value="Afternoon">Afternoon (2 PM - 11 PM)</option>
                        <option value="Night">Night (10 PM - 7 AM)</option>
                      </select>
                      <ChevronDown size={16} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--text-muted)', opacity: 0.5 }} />
                    </div>
                  </div>

                  <div style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '8px', color: 'var(--text-muted)' }}>Weekly Off</label>
                    <div style={{ position: 'relative' }}>
                      <select 
                        style={{
                          width: '100%',
                          background: 'var(--bg-input)',
                          border: '1px solid var(--border-color)',
                          borderRadius: '12px',
                          padding: '12px',
                          color: 'var(--text-main)',
                          fontSize: '14px',
                          appearance: 'none',
                          outline: 'none'
                        }}
                        value={formData.week_off}
                        onChange={e => setFormData({...formData, week_off: e.target.value})}
                      >
                        <option value="" style={{ background: 'var(--bg-card)', color: 'var(--text-main)' }}>Select Day</option>
                        {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(day => (
                          <option key={day} value={day} style={{ background: 'var(--bg-card)', color: 'var(--text-main)' }}>{day}</option>
                        ))}
                      </select>
                      <ChevronDown size={16} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--text-muted)', opacity: 0.5 }} />
                    </div>
                  </div>
                </div>

                {formData.roles.includes('agent') && (
                  <div style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '8px', color: 'var(--text-muted)' }}>Direct Supervisor</label>
                    <div style={{ position: 'relative' }}>
                      <select 
                        style={{
                          width: '100%',
                          background: 'var(--bg-input)',
                          border: '1px solid var(--border-color)',
                          borderRadius: '12px',
                          padding: '12px',
                          color: 'var(--text-main)',
                          fontSize: '14px',
                          appearance: 'none',
                          outline: 'none'
                        }}
                        value={formData.supervisor_id}
                        onChange={e => setFormData({...formData, supervisor_id: e.target.value})}
                      >
                        <option value="" style={{ background: 'var(--bg-card)', color: 'var(--text-main)' }}>Select Supervisor</option>
                        {supervisors.map(sup => (
                          <option key={sup.id} value={sup.id} style={{ background: 'var(--bg-card)', color: 'var(--text-main)' }}>{sup.name}</option>
                        ))}
                      </select>
                      <ChevronDown size={16} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--text-muted)', opacity: 0.5 }} />
                    </div>
                  </div>
                )}
              </section>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div style={{ 
          padding: '24px 32px', 
          background: 'var(--bg-card)',
          borderTop: '1px solid var(--border-color)',
          display: 'flex', gap: '16px', justifyContent: 'flex-end'
        }}>
          <Button variant="ghost" onClick={onClose}>Discard</Button>
          <Button 
            variant="primary" 
            form="user-form"
            type="submit"
            isLoading={loading}
            icon={Save}
          >
            {user ? 'Sync Subscriptions' : 'Confirm Access'}
          </Button>
        </div>
      </motion.div>
    </div>
  );
};

export default UserForm;

