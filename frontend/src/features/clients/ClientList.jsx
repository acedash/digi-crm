import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, 
  Search, 
  Phone, 
  Mail, 
  ArrowRight,
  Filter,
  RefreshCw,
  Edit,
  User as UserIcon,
  Trash2
} from 'lucide-react';
import clientService from './clientService';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';

const ClientList = ({ isEmbedded = false }) => {
  const MotionDiv = motion.div;
  const MotionTr = motion.tr;
  const navigate = useNavigate();
  const location = useLocation();
  const basePath = '/' + location.pathname.split('/')[1];
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    pnr: '',
    booking_id: '',
    card_last_4: '',
    phone: '',
    email: ''
  });
  const isFetchingRef = React.useRef(false);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setDebouncedSearch(search.trim());
    }, 350);

    return () => window.clearTimeout(timeout);
  }, [search]);

  const fetchClients = useCallback(async (searchTerm = debouncedSearch, advancedFilters = filters) => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    setLoading(true);
    try {
      const params = { 
        per_page: 15,
        client_name: searchTerm,
        ...Object.fromEntries(Object.entries(advancedFilters).filter(([, v]) => v !== ''))
      };
      const response = await clientService.getClients(params);
      setClients(response.data.data.data || response.data.data || []);
    } catch (error) {
      console.error('Failed to fetch clients', error);
      setClients([]);
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
    }
  }, [filters, debouncedSearch]);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  const handleSearch = (e) => {
    setSearch(e.target.value);
  };

  const handleEditClient = (client) => {
    navigate(`${basePath}/clients/${client.id}/edit`);
  };

  const handleViewClient = (client) => {
    navigate(`${basePath}/clients/${client.id}`);
  };

  const handleDeleteClient = async (client) => {
    const confirmed = window.confirm(
      `Delete client ${client.first_name || ''} ${client.last_name || ''}? This will remove the client profile.`
    );

    if (!confirmed) return;

    try {
      await clientService.deleteClient(client.id);
      fetchClients();
    } catch (error) {
      console.error('Failed to delete client', error);
      alert(error?.response?.data?.message || 'Failed to delete client.');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px', padding: isEmbedded ? '0' : '0' }}>
      {/* Header Section */}
      {!isEmbedded && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div>
            <h1 style={{ 
              fontSize: '32px', 
              fontWeight: 800, 
              letterSpacing: '-1px',
              marginBottom: '8px'
            }}>
              Client <span className="premium-gradient-text">Hub</span>
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '15px' }}>
              Centralized management for travelers and corporate accounts.
            </p>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: '16px', alignItems: 'center' }}>
          <Input 
            placeholder="Search by name, email, phone, or ID..." 
            icon={Search}
            value={search}
            onChange={handleSearch}
            onClear={() => setSearch('')}
            style={{ marginBottom: 0 }}
          />
          <Button variant={showFilters ? 'primary' : 'glass'} icon={Filter} size="md" onClick={() => setShowFilters(!showFilters)}>
            {showFilters ? 'Hide Filters' : 'Advanced Filters'}
          </Button>
          <Button 
            variant="glass" 
            icon={RefreshCw} 
            size="md" 
            onClick={() => fetchClients()}
            isLoading={loading}
          />
        </div>

        <AnimatePresence>
          {showFilters && (
            <MotionDiv
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              style={{ overflow: 'hidden' }}
            >
              <Card style={{ padding: '24px', background: 'var(--bg-input)' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                  <Input 
                    label="PNR Code" 
                    placeholder="e.g. ABCDEF" 
                    value={filters.pnr} 
                    onChange={(e) => setFilters({...filters, pnr: e.target.value})}
                  />
                  <Input 
                    label="Booking ID / Ref" 
                    placeholder="e.g. BK-1001" 
                    value={filters.booking_id} 
                    onChange={(e) => setFilters({...filters, booking_id: e.target.value})}
                  />
                  <Input 
                    label="Card Last 4" 
                    placeholder="e.g. 1234" 
                    maxLength={4}
                    value={filters.card_last_4} 
                    onChange={(e) => setFilters({...filters, card_last_4: e.target.value})}
                  />
                  <Input 
                    label="Phone Search" 
                    placeholder="e.g. +1..." 
                    value={filters.phone} 
                    onChange={(e) => setFilters({...filters, phone: e.target.value})}
                  />
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px', gap: '12px' }}>
                  <Button variant="ghost" size="sm" onClick={() => {
                    const resetFilters = { pnr: '', booking_id: '', card_last_4: '', phone: '', email: '' };
                    setFilters(resetFilters);
                    fetchClients(search, resetFilters);
                  }}>Reset</Button>
                  <Button variant="primary" size="sm" onClick={() => fetchClients()}>Apply Filters</Button>
                </div>
              </Card>
            </MotionDiv>
          )}
        </AnimatePresence>
      </div>

      {/* Main Table Content */}
      <div style={{ position: 'relative' }}>
        <AnimatePresence mode="wait">
          {loading ? (
            <MotionDiv
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{ textAlign: 'center', padding: '100px 0', color: 'var(--text-muted)' }}
            >
              <RefreshCw className="animate-spin" size={32} style={{ marginBottom: '16px' }} />
              <p>Syncing Client Databases...</p>
            </MotionDiv>
          ) : (
            <MotionDiv
              initial={{ opacity: 0, scale: 0.99 }}
              animate={{ opacity: 1, scale: 1 }}
              className="glass-panel"
              style={{ borderRadius: 'var(--radius)', overflow: 'hidden' }}
            >
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: 'var(--bg-input)', borderBottom: '1px solid var(--border-color)' }}>
                    <th style={{ padding: '20px 24px', fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>Client Info</th>
                    <th style={{ padding: '20px 24px', fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>Contact Channels</th>
                    <th style={{ padding: '20px 24px', fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>Category</th>
                    <th style={{ padding: '20px 24px', fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>Travelers</th>
                    <th style={{ padding: '20px 24px', fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>Created By</th>
                    <th style={{ padding: '20px 24px', textAlign: 'right' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {clients.length > 0 ? clients.map((client, idx) => (
                    <MotionTr 
                      key={client.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      style={{ 
                        borderBottom: '1px solid var(--border-color)',
                        transition: 'var(--transition-smooth)',
                        cursor: 'default'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'var(--bg-input)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'transparent';
                      }}
                    >
                      <td style={{ padding: '20px 24px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                          <div style={{ 
                            width: '40px', 
                            height: '40px', 
                            borderRadius: '12px', 
                            background: 'rgba(255, 255, 255, 0.05)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'hsl(var(--primary))'
                          }}>
                            <UserIcon size={20} />
                          </div>
                          <div>
                            <p style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '15px' }}>
                              {client.first_name} {client.last_name}
                            </p>
                            <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                              ID: C-{String(client.id).padStart(4, '0')} • {client.bookings_count || 0} booking(s)
                            </p>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '20px 24px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--text-main)' }}>
                            <Phone size={14} style={{ color: 'var(--text-muted)' }} />
                            {client.phone || '--'}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--text-main)' }}>
                            <Mail size={14} style={{ color: 'var(--text-muted)' }} />
                            {client.email}
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '20px 24px' }}>
                        <span style={{ 
                          padding: '4px 10px', 
                          borderRadius: '100px', 
                          fontSize: '11px', 
                          fontWeight: 700, 
                          textTransform: 'uppercase',
                          background: client.type === 'Corporate' ? 'rgba(245, 158, 11, 0.1)' : 'rgba(59, 130, 246, 0.1)',
                          color: client.type === 'Corporate' ? '#f59e0b' : '#3b82f6',
                          border: `1px solid ${client.type === 'Corporate' ? 'rgba(245, 158, 11, 0.2)' : 'rgba(59, 130, 246, 0.2)'}`
                        }}>
                          {client.type}
                        </span>
                      </td>
                      <td style={{ padding: '20px 24px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-main)' }}>{client.passengers_count || 0}</span>
                          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Persons</span>
                        </div>
                      </td>
                      <td style={{ padding: '20px 24px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--text-main)', fontWeight: 600 }}>
                          {client.creator?.name || '---'}
                        </div>
                      </td>
                      <td style={{ padding: '20px 24px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <Button 
                            variant="glass" 
                            size="sm" 
                            icon={Edit}
                            onClick={() => handleEditClient(client)}
                            style={{ padding: '8px' }}
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            icon={Trash2}
                            onClick={() => handleDeleteClient(client)}
                            style={{ color: '#f87171', padding: '8px' }}
                          />
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            icon={ArrowRight}
                            onClick={() => handleViewClient(client)}
                          >
                            Details
                          </Button>
                        </div>
                      </td>
                    </MotionTr>
                  )) : (
                    <tr>
                      <td colSpan="5" style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
                        <p style={{ fontSize: '15px' }}>No clients matching your search.</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </MotionDiv>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default ClientList;
