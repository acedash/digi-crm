import React, { useEffect, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
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
  UserX,
  PhoneCall,
  ClipboardList,
  Download,
  FileText,
  FileSpreadsheet,
  FileJson,
  Trash2
} from 'lucide-react';
import ExportDropdown from '../../components/ui/ExportDropdown';
import userService from './userService';
import UserForm from './UserForm';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';

const AgentIcon = ({ size }) => <ClipboardList size={size} />;

const UserList = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteModal, setDeleteModal] = useState({ open: false, userId: null, userName: '' });

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

  const handleDeleteMember = async () => {
    if (!deleteModal.userId) return;
    try {
      await userService.deleteUser(deleteModal.userId);
      setDeleteModal({ open: false, userId: null, userName: '' });
      loadUsers();
    } catch (error) {
      console.error('Failed to delete user', error);
      alert('Failed to delete user.');
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
    (user.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (user.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.user_custom_id?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatLastLogin = (user) => {
    const login = user.latest_login?.created_at;
    if (!login) return 'Never';
    return new Date(login).toLocaleString('en-US', {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  };

  const getActivityStatus = (user) => {
    const today = new Date().toLocaleDateString('en-US', { weekday: 'long' });
    const weekOffStr = String(user.week_off || '');
    if (weekOffStr && weekOffStr.toLowerCase().includes(today.toLowerCase())) {
      return { label: 'week off', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.1)' };
    }
    if (user.status === 'Active') {
      return { label: 'online', color: '#10b981', bg: 'rgba(16, 185, 129, 0.1)' };
    }
    return { label: 'not logged in', color: 'var(--text-muted)', bg: 'rgba(255, 255, 255, 0.05)' };
  };

  const handleExportPDF = () => {
    try {
      const doc = new jsPDF();
      const tableColumn = ["Staff ID", "Name", "Email", "Role", "Status", "Last Login"];
      const tableRows = filteredUsers.map(u => [
        u.user_custom_id || 'N/A',
        u.name,
        u.email,
        u.roles?.[0]?.name || u.roles?.[0] || 'Staff',
        u.is_active ? 'Enabled' : 'Disabled',
        formatLastLogin(u)
      ]);
      
      autoTable(doc, { 
        head: [tableColumn], 
        body: tableRows, 
        startY: 20,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [30, 34, 53] }
      });
      doc.text("Team Members Export", 14, 15);
      doc.save(`Team_Export_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (err) {
      console.error("PDF generation failed:", err);
      alert("PDF Export failed.");
    }
  };

  const handleExportExcel = () => {
    const data = filteredUsers.map(u => ({
      'Staff ID': u.user_custom_id,
      'Name': u.name,
      'Email': u.email,
      'Role': u.roles?.[0]?.name || u.roles?.[0] || 'Staff',
      'Status': u.is_active ? 'Enabled' : 'Disabled',
      'Last Login': formatLastLogin(u),
      'Created At': new Date(u.created_at).toLocaleDateString()
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Team");
    XLSX.writeFile(wb, `Team_Export_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const handleExportJSON = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(filteredUsers, null, 2));
    const dt = document.createElement('a');
    dt.setAttribute("href", dataStr);
    dt.setAttribute("download", `Team_Export_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(dt);
    dt.click();
    document.body.removeChild(dt);
  };

  return (
    <div className="user-management-container" style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      <style>
        {`
          @media print {
            .glass-panel { border: none !important; background: white !important; box-shadow: none !important; }
            .premium-gradient-text { background: none !important; -webkit-text-fill-color: black !important; color: black !important; }
            table { width: 100% !important; border-collapse: collapse !important; }
            table th { background: #f8f9fa !important; color: black !important; border-bottom: 2px solid #ddd !important; border-top: 1px solid #ddd !important; }
            table td { border-bottom: 1px solid #eee !important; color: black !important; }
            .user-management-container { gap: 24px !important; }
            .table-row-hover:hover { background: transparent !important; }
          }
        `}
      </style>

      {/* Header */}
      <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: '20px', flexWrap: 'wrap' }}>
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
            Manage team roles, access, and performance in one place.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <ExportDropdown
            options={[
              { label: 'As PDF Report', icon: FileText, onClick: handleExportPDF },
              { label: 'As Excel Data', icon: FileSpreadsheet, onClick: handleExportExcel },
              { label: 'As Raw JSON', icon: FileJson, onClick: handleExportJSON },
            ]}
          />
          <Button variant="primary" icon={UserPlus} onClick={handleAddMember}>
            Add Team Member
          </Button>
        </div>
      </div>

      {/* Stats Quick Look */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
        <Card title="Total Staff Member" subtitle="All team members" icon={Users}>
          <p style={{ fontSize: '28px', fontWeight: 800, color: 'var(--text-main)' }}>{users.length}</p>
        </Card>
        <Card title="Admins" subtitle="Manage system access" icon={Shield}>
          <p style={{ fontSize: '28px', fontWeight: 800, color: '#f87171' }}>
            {users.filter(u => {
              const role = u.roles?.[0];
              const roleName = typeof role === 'object' ? role.name : role;
              return roleName === 'admin';
            }).length}
          </p>
        </Card>
        <Card title="Agents" subtitle="Handle bookings & calls" icon={AgentIcon}>
          <p style={{ fontSize: '28px', fontWeight: 800, color: '#06B68A' }}>
            {users.filter(u => {
              const role = u.roles?.[0];
              const roleName = typeof role === 'object' ? role.name : role;
              return roleName === 'agent';
            }).length}
          </p>
        </Card>
      </div>

      <div className="no-print" style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '16px', alignItems: 'center' }}>
        <Input 
          placeholder="Search by name, role, or staff ID..." 
          icon={Search}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onClear={() => setSearchTerm('')}
          style={{ marginBottom: 0 }}
        />
        <Button variant="glass" icon={RefreshCw} onClick={loadUsers} isLoading={loading} />
      </div>

      {/* Table Section */}
      <div className="glass-panel" style={{ borderRadius: 'var(--radius)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ background: 'var(--bg-input)', borderBottom: '1px solid var(--border-color)' }}>
              <th style={{ padding: '20px 24px', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Team Member</th>
              <th style={{ padding: '20px 24px', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Role</th>
              <th style={{ padding: '20px 24px', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Reports To</th>
              <th style={{ padding: '20px 24px', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Activity Status</th>
              <th style={{ padding: '20px 24px', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Last Login</th>
              <th style={{ padding: '20px 24px', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Account Status</th>
              <th style={{ padding: '20px 24px', textAlign: 'right', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Setting & Actions</th>
            </tr>
          </thead>
          <tbody>
            <AnimatePresence>
              {filteredUsers.map((user) => {
                const actStatus = getActivityStatus(user);
                return (
                <tr 
                  key={user.id}
                  style={{ borderBottom: '1px solid var(--border-color)', transition: 'var(--transition-smooth)' }}
                  className="table-row-hover"
                >
                  <td style={{ padding: '16px 24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ 
                        width: '32px', height: '32px', borderRadius: '8px', 
                        background: 'var(--bg-input)', display: 'flex', 
                        alignItems: 'center', justifyContent: 'center', fontWeight: 700, 
                        color: 'var(--text-main)', fontSize: '13px'
                      }}>
                        {user.name.charAt(0)}
                      </div>
                      <div>
                        <p style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '13px' }}>{user.name}</p>
                        <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{user.user_custom_id || 'ID-PND'}</p>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '16px 24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Shield size={12} style={{ color: 'var(--text-muted)', opacity: 0.5 }} />
                      <span style={{ 
                        fontSize: '12px', fontWeight: 600, color: 'var(--text-main)',
                        textTransform: 'capitalize'
                      }}>
                        {typeof user.roles?.[0] === 'object' ? user.roles[0].name : (user.roles?.[0] || 'Staff')}
                      </span>
                    </div>
                  </td>
                  <td style={{ padding: '16px 24px' }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                      {(user.supervisors?.length ? user.supervisors : []).map((supervisor) => (
                        <span
                          key={supervisor.id}
                          style={{
                            padding: '2px 8px',
                            borderRadius: '4px',
                            fontSize: '10px',
                            fontWeight: 700,
                            background: 'rgba(96, 165, 250, 0.1)',
                            color: '#06B68A',
                            border: '1px solid rgba(96, 165, 250, 0.1)'
                          }}
                        >
                          {supervisor.name}
                        </span>
                      ))}
                      {!user.supervisors?.length && (
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>None</span>
                      )}
                    </div>
                  </td>
                  <td style={{ padding: '16px 24px' }}>
                    <span style={{ 
                      padding: '4px 10px', borderRadius: '6px', fontSize: '10px', 
                      fontWeight: 700, textTransform: 'uppercase',
                      background: actStatus.bg,
                      color: actStatus.color,
                      border: `1px solid ${actStatus.color}22`
                    }}>
                      {actStatus.label}
                    </span>
                  </td>
                  <td style={{ padding: '16px 24px' }}>
                    <div style={{ fontSize: '12px', color: 'var(--text-main)', fontWeight: 600 }}>
                      {formatLastLogin(user)}
                    </div>
                  </td>
                  <td style={{ padding: '16px 24px' }}>
                    <span style={{ 
                      padding: '4px 10px', borderRadius: '6px', fontSize: '10px', fontWeight: 700,
                      textTransform: 'uppercase',
                      background: user.is_active ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                      color: user.is_active ? '#4ade80' : '#f87171',
                      border: `1px solid ${user.is_active ? '#4ade80' : '#f87171'}22`
                    }}>
                      {user.is_active ? 'Enabled' : 'Disabled'}
                    </span>
                  </td>
                  <td className="no-print" style={{ padding: '16px 24px', textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', gap: '8px', alignItems: 'center' }}>
                      <Button variant="ghost" size="sm" icon={Settings} onClick={() => handleEditMember(user)} />
                      <Button 
                        variant={user.is_active ? 'outline' : 'glass'} 
                        size="sm" 
                        icon={user.is_active ? UserX : UserCheck} 
                        onClick={() => handleToggleStatus(user.id)}
                        style={{ 
                          minWidth: '90px',
                          height: '32px',
                          fontSize: '11px',
                          borderColor: user.is_active ? 'rgba(239, 68, 68, 0.2)' : 'rgba(34, 197, 94, 0.2)',
                          color: user.is_active ? '#f87171' : '#4ade80',
                          background: user.is_active ? 'rgba(239, 68, 68, 0.05)' : 'rgba(34, 197, 94, 0.05)'
                        }}
                      >
                        {user.is_active ? 'Disable' : 'Enable'}
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        icon={Trash2} 
                        onClick={() => setDeleteModal({ open: true, userId: user.id, userName: user.name })}
                        style={{ color: '#ef4444' }}
                      />
                    </div>
                  </td>
                </tr>
              )})}
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

      {/* Delete Confirmation Modal */}
      {deleteModal.open && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(2, 6, 23, 0.8)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, padding: '24px'
        }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '400px', padding: '32px', borderRadius: '24px', textAlign: 'center' }}>
            <div style={{ 
              width: '64px', height: '64px', borderRadius: '20px', 
              background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 24px auto'
            }}>
              <Trash2 size={32} />
            </div>
            <h2 style={{ fontSize: '20px', fontWeight: 800, marginBottom: '12px' }}>Delete Team Member?</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '32px', lineHeight: 1.6 }}>
              Are you sure you want to delete <strong>{deleteModal.userName}</strong>? This action cannot be undone and will remove all their data from the system.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <Button variant="glass" onClick={() => setDeleteModal({ open: false, userId: null, userName: '' })}>
                Cancel
              </Button>
              <Button variant="primary" style={{ background: '#ef4444' }} onClick={handleDeleteMember}>
                Delete User
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserList;
