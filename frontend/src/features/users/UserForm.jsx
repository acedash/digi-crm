import React, { useState, useEffect } from 'react';
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
  Briefcase,
  CheckCircle2
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
    supervisor_ids: [],
    phone: '',
    shift: '',
    custom_shift: '',
    week_off: [], // Now an array for multi-select
  });
  const [supervisors, setSupervisors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const toggleSupervisor = (supervisorId) => {
    setFormData((prev) => {
      const exists = prev.supervisor_ids.includes(supervisorId);
      return {
        ...prev,
        supervisor_ids: exists
          ? prev.supervisor_ids.filter((id) => id !== supervisorId)
          : [...prev.supervisor_ids, supervisorId],
      };
    });
  };

  const toggleWeekOff = (day) => {
    setFormData((prev) => {
      const exists = prev.week_off.includes(day);
      return {
        ...prev,
        week_off: exists
          ? prev.week_off.filter((d) => d !== day)
          : [...prev.week_off, day],
      };
    });
  };

  useEffect(() => {
    fetchSupervisors();
    if (user) {
      // Check if shift is one of the predefined ones
      const standardShifts = ['Morning', 'Afternoon', 'Night'];
      const isCustomShift = user.shift && !standardShifts.includes(user.shift);
      
      setFormData({
        name: user.name || '',
        email: user.email || '',
        password: '',
        roles: user.roles ? user.roles.map(r => r.name || r) : ['agent'],
        supervisor_ids: user.supervisors?.map((supervisor) => String(supervisor.id)) || (user.supervisor_id ? [String(user.supervisor_id)] : []),
        phone: user.phone || '',
        shift: isCustomShift ? 'Custom' : (user.shift || ''),
        custom_shift: isCustomShift ? user.shift : '',
        week_off: user.week_off ? user.week_off.split(',').map(d => d.trim()) : [],
      });
    }
  }, [user]);

  const fetchSupervisors = async () => {
    try {
      const response = await userService.getSupervisors();
      setSupervisors(response.data.data || response.data);
    } catch {
      console.error('Failed to load supervisors');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const submissionData = { ...formData };
    
    // Process Shift
    if (submissionData.shift === 'Custom') {
      submissionData.shift = submissionData.custom_shift;
    }
    delete submissionData.custom_shift;

    // Process Week Off (to string)
    submissionData.week_off = submissionData.week_off.join(', ');

    if (!submissionData.roles.includes('agent')) {
      submissionData.supervisor_ids = [];
    }
    submissionData.supervisor_id = submissionData.supervisor_ids[0] || null;
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
      <div
        className="glass-panel"
        style={{
          width: '100%',
          maxWidth: '650px',
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
              {user ? 'Edit Member Details' : 'Add Team Member'}
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
            <div 
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
            </div>
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
                    label="Phone Number" 
                    icon={Phone}
                    placeholder="Enter full number"
                    value={formData.phone} 
                    onChange={e => setFormData({...formData, phone: e.target.value})}
                  />
                </div>
              </section>

              <section>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <Shield size={18} style={{ color: 'hsl(var(--primary))' }} />
                  <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-main)' }}>Access & Security</h3>
                </div>
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '12px', color: 'var(--text-muted)' }}>
                    Roles <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <div style={{ display: 'flex', gap: '12px' }}>
                    {['agent', 'supervisor', 'admin'].map(role => {
                      const isSelected = formData.roles.includes(role);
                      return (
                        <div 
                          key={role}
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
                        </div>
                      );
                    })}
                  </div>
                </div>

                <Input 
                  label="Account Password"
                  icon={Lock}
                  type="password"
                  placeholder=""
                  autoComplete="new-password"
                  value={formData.password} 
                  onChange={e => setFormData({...formData, password: e.target.value})}
                  required={!user} 
                />
                {user && (
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '-12px', marginBottom: '16px', fontStyle: 'italic' }}>
                    * Leave blank to keep the current password.
                  </p>
                )}
              </section>

              <section>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                  <Clock size={18} style={{ color: 'hsl(var(--primary))' }} />
                  <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-main)' }}>Operations</h3>
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '8px' }}>
                  <div style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '8px', color: 'var(--text-muted)' }}>Work Shift</label>
                    <select 
                      value={formData.shift}
                      onChange={e => setFormData({...formData, shift: e.target.value})}
                    >
                      <option value="">Select Shift</option>
                      <option value="Morning">Morning (9 AM - 6 PM)</option>
                      <option value="Afternoon">Afternoon (2 PM - 11 PM)</option>
                      <option value="Night">Night (10 PM - 7 AM)</option>
                      <option value="Custom">Other (Custom)</option>
                    </select>
                  </div>

                  {formData.shift === 'Custom' ? (
                    <Input 
                      label="Custom Shift Time"
                      placeholder="e.g. 11 AM - 8 PM"
                      value={formData.custom_shift}
                      onChange={e => setFormData({...formData, custom_shift: e.target.value})}
                      style={{ marginBottom: 0 }}
                    />
                  ) : (
                    <div />
                  )}
                </div>

                <div style={{ marginBottom: '24px' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '12px', color: 'var(--text-muted)' }}>Weekly Off (Multi-select)</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(day => {
                      const isSelected = formData.week_off.includes(day);
                      return (
                        <button
                          key={day}
                          type="button"
                          onClick={() => toggleWeekOff(day)}
                          style={{
                            padding: '8px 16px',
                            borderRadius: '100px',
                            fontSize: '12px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            background: isSelected ? 'hsl(var(--primary))' : 'var(--bg-input)',
                            color: isSelected ? 'white' : 'var(--text-muted)',
                            border: `1px solid ${isSelected ? 'hsl(var(--primary))' : 'var(--border-color)'}`,
                            transition: 'var(--transition-smooth)'
                          }}
                        >
                          {day}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {formData.roles.includes('agent') && (
                  <div style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '10px', color: 'var(--text-muted)' }}>
                      Assigned Supervisors <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <div
                      style={{
                        background: 'var(--bg-input)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '16px',
                        padding: '12px',
                        display: 'grid',
                        gap: '10px'
                      }}
                    >
                      {supervisors.length === 0 ? (
                        <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                          No supervisors available.
                        </div>
                      ) : (
                        supervisors.map((sup) => {
                          const isSelected = formData.supervisor_ids.includes(String(sup.id));

                          return (
                            <button
                              key={sup.id}
                              type="button"
                              onClick={() => toggleSupervisor(String(sup.id))}
                              style={{
                                width: '100%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: '12px',
                                padding: '12px 14px',
                                borderRadius: '12px',
                                border: isSelected ? '1px solid rgba(96, 165, 250, 0.45)' : '1px solid var(--border-color)',
                                background: isSelected ? 'rgba(96, 165, 250, 0.12)' : 'var(--bg-card)',
                                color: 'var(--text-main)',
                                cursor: 'pointer',
                                textAlign: 'left',
                              }}
                            >
                              <div>
                                <div style={{ fontSize: '14px', fontWeight: 700 }}>{sup.name}</div>
                                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                                  {sup.email}
                                </div>
                              </div>
                              <div
                                style={{
                                  minWidth: '20px',
                                  width: '20px',
                                  height: '20px',
                                  borderRadius: '6px',
                                  border: isSelected ? 'none' : '2px solid var(--border-color)',
                                  background: isSelected ? 'hsl(var(--primary))' : 'transparent',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  color: 'white',
                                  transition: '0.2s'
                                }}
                              >
                                {isSelected && <CheckCircle2 size={14} />}
                              </div>
                            </button>
                          );
                        })
                      )}
                    </div>
                    <input
                      type="hidden"
                      value={formData.supervisor_ids.join(',')}
                      required={formData.roles.includes('agent')}
                    />
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
            Save Details
          </Button>
        </div>
      </div>
    </div>
  );
};

export default UserForm;
