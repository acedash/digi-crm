import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, 
  UserPlus, 
  Shield, 
  Activity, 
  Mail, 
  Settings, 
  ArrowRight,
  RefreshCw,
  Search,
  UserCheck,
  UserX
} from 'lucide-react';
import userService from './userService';
import UserForm from './UserForm';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';

const UserList = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const response = await userService.getUsers();
      setUsers(response.data.data || response.data);
    } catch (error) {
      console.error('Failed to load users', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (id) => {
    try {
      await userService.toggleStatus(id);
      loadUsers();
    } catch (error) {
      console.error('Failed to update status', error);
    }
  };

  const handleAddMember = () => {
    setCurrentUser(null);
    setIsModalOpen(true);
  };

  const handleEditMember = (user) => {
    setCurrentUser(user);
    setIsModalOpen(true);
  };

  const filteredUsers = users.filter(user => 
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.user_custom_id?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <h1 style={{ 
            fontSize: '32px', 
            fontWeight: 800, 
            letterSpacing: '-1px',
            marginBottom: '8px'
          }}>
            Team <span className="premium-gradient-text">Management</span>
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '15px' }}>
            Control access, roles, and performance for your staff.
          </p>
        </div>
        <Button variant="primary" icon={UserPlus} onClick={handleAddMember}>
          Add Team Member
        </Button>
      </div>

      {/* Stats Quick Look */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
        <Card title="Total Staff" subtitle="Active in system" icon={Users}>
          <p style={{ fontSize: '28px', fontWeight: 800, color: 'var(--text-main)' }}>{users.length}</p>
        </Card>
        <Card title="Admins" subtitle="System Oversight" icon={Shield}>
          <p style={{ fontSize: '28px', fontWeight: 800, color: '#f87171' }}>
            {users.filter(u => {
              const role = u.roles?.[0];
              const roleName = typeof role === 'object' ? role.name : role;
              return roleName === 'admin';
            }).length}
          </p>
        </Card>
        <Card title="Agents" subtitle="Operations" icon={Activity}>
          <p style={{ fontSize: '28px', fontWeight: 800, color: '#60a5fa' }}>
            {users.filter(u => {
              const role = u.roles?.[0];
              const roleName = typeof role === 'object' ? role.name : role;
              return roleName === 'agent';
            }).length}
          </p>
        </Card>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '16px', alignItems: 'center' }}>
        <Input 
          placeholder="Search by name, role, or staff ID..." 
          icon={Search}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ marginBottom: 0 }}
        />
        <Button variant="glass" icon={RefreshCw} onClick={loadUsers} isLoading={loading} />
      </div>

      {/* Table Section */}
      <div className="glass-panel" style={{ borderRadius: 'var(--radius)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ background: 'var(--bg-input)', borderBottom: '1px solid var(--border-color)' }}>
              <th style={{ padding: '20px 24px', fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Identity</th>
              <th style={{ padding: '20px 24px', fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Role</th>
              <th style={{ padding: '20px 24px', fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Activity</th>
              <th style={{ padding: '20px 24px', fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Status</th>
              <th style={{ padding: '20px 24px', textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            <AnimatePresence>
              {filteredUsers.map((user, idx) => (
                <motion.tr 
                  key={user.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.03 }}
                  style={{ borderBottom: '1px solid var(--border-color)', transition: 'var(--transition-smooth)' }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-input)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  <td style={{ padding: '20px 24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ 
                        width: '36px', height: '36px', borderRadius: '10px', 
                        background: 'var(--bg-input)', display: 'flex', 
                        alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: 'var(--text-main)'
                      }}>
                        {user.name.charAt(0)}
                      </div>
                      <div>
                        <p style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '14px' }}>{user.name}</p>
                        <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{user.user_custom_id || 'ID-PENDING'}</p>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '20px 24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Shield size={14} style={{ color: 'var(--text-muted)', opacity: 0.5 }} />
                      <span style={{ 
                        fontSize: '12px', fontWeight: 600, color: 'var(--text-main)',
                        textTransform: 'capitalize'
                      }}>
                        {typeof user.roles?.[0] === 'object' ? user.roles[0].name : (user.roles?.[0] || 'Staff')}
                      </span>
                    </div>
                  </td>
                  <td style={{ padding: '20px 24px' }}>
                    <span style={{ 
                      padding: '4px 10px', borderRadius: '100px', fontSize: '11px', fontWeight: 700,
                      background: user.status === 'Active' ? 'rgba(34, 197, 94, 0.1)' : 
                                  user.status === 'On Call' ? 'rgba(250, 204, 21, 0.1)' :
                                  user.status === 'Break' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(255, 255, 255, 0.05)',
                      color: user.status === 'Active' ? '#4ade80' : 
                             user.status === 'On Call' ? '#facc15' :
                             user.status === 'Break' ? '#f87171' : 'var(--text-muted)',
                      border: `1px solid ${user.status === 'Active' ? 'rgba(34, 197, 94, 0.2)' : 
                                            user.status === 'On Call' ? 'rgba(250, 204, 21, 0.2)' :
                                            user.status === 'Break' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(255, 255, 255, 0.1)'}`
                    }}>
                      {user.status || 'Offline'}
                    </span>
                  </td>
                  <td style={{ padding: '20px 24px' }}>
                    <span style={{ 
                      padding: '4px 10px', borderRadius: '100px', fontSize: '11px', fontWeight: 700,
                      background: user.is_active ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                      color: user.is_active ? '#4ade80' : '#f87171',
                      border: `1px solid ${user.is_active ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`
                    }}>
                      {user.is_active ? 'Enabled' : 'Disabled'}
                    </span>
                  </td>
                  <td style={{ padding: '20px 24px', textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', gap: '12px', alignItems: 'center' }}>
                      <Button variant="ghost" size="sm" icon={Settings} onClick={() => handleEditMember(user)} />
                      <Button 
                        variant={user.is_active ? 'outline' : 'glass'} 
                        size="sm" 
                        icon={user.is_active ? UserX : UserCheck} 
                        onClick={() => handleToggleStatus(user.id)}
                        style={{ 
                          minWidth: '100px',
                          borderColor: user.is_active ? 'rgba(239, 68, 68, 0.2)' : 'rgba(34, 197, 94, 0.2)',
                          color: user.is_active ? '#f87171' : '#4ade80',
                          background: user.is_active ? 'rgba(239, 68, 68, 0.05)' : 'rgba(34, 197, 94, 0.05)'
                        }}
                      >
                        {user.is_active ? 'Disable' : 'Enable'}
                      </Button>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </AnimatePresence>
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <UserForm 
          user={currentUser} 
          onClose={() => setIsModalOpen(false)} 
          onSuccess={loadUsers} 
        />
      )}
    </div>
  );
};

export default UserList;

