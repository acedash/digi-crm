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
  Trash2,
  Download,
  FileText,
  FileSpreadsheet,
  FileJson
} from 'lucide-react';
import clientService from './clientService';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

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
  const [showExportOptions, setShowExportOptions] = useState(false);
  const exportDropdownRef = React.useRef(null);
  const [filters, setFilters] = useState({
    pnr: '',
    booking_id: '',
    card_last_4: '',
    phone: '',
    email: ''
  });
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [stats, setStats] = useState({ total: 0, today: 0, yesterday: 0 });
  const isFetchingRef = React.useRef(false);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (exportDropdownRef.current && !exportDropdownRef.current.contains(event.target)) {
        setShowExportOptions(false);
      }
    };
    if (showExportOptions) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showExportOptions]);

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
        per_page: 25,
        client_name: searchTerm,
        start_date: startDate,
        end_date: endDate,
        ...Object.fromEntries(Object.entries(advancedFilters).filter(([, v]) => v !== ''))
      };
      const response = await clientService.getClients(params);
      const result = response.data.data;
      if (result && result.data) {
        setClients(result.data.data || []);
        if (result.stats) setStats(result.stats);
      } else {
        setClients([]);
      }
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
  }, [fetchClients, startDate, endDate]);

  const handleQuickFilter = (type) => {
    setFilterType(type);
    const today = new Date().toISOString().split('T')[0];
    const yesterdayDate = new Date();
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    const yesterday = yesterdayDate.toISOString().split('T')[0];

    if (type === 'today') {
      setStartDate(today);
      setEndDate(today);
    } else if (type === 'yesterday') {
      setStartDate(yesterday);
      setEndDate(yesterday);
    } else {
      setStartDate('');
      setEndDate('');
    }
  };

  const handleSearch = (e) => setSearch(e.target.value);

  const handleEditClient = (client) => navigate(`${basePath}/clients/${client.id}/edit`);
  const handleViewClient = (client) => navigate(`${basePath}/clients/${client.id}`);

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

  const handleExportPDF = () => {
    try {
      const doc = new jsPDF();
      const tableColumn = ["ID", "Name", "Email", "Phone", "Travelers", "Spend", "Created By"];
      const tableRows = clients.map(client => [
        `C-${String(client.id).padStart(4, '0')}`,
        `${client.first_name || ''} ${client.last_name || ''}`.trim(),
        client.email || '--',
        client.phone || '--',
        client.passengers_count || 0,
        `$${Number(client.bookings_sum_total_amount || 0).toLocaleString()}`,
        client.creator?.name || 'Unknown'
      ]);
      
      autoTable(doc, { head: [tableColumn], body: tableRows, startY: 20 });
      doc.text("Clients Data Export", 14, 15);
      doc.save("Clients_Export.pdf");
      setShowExportOptions(false);
    } catch (err) {
      console.error("PDF generation failed:", err);
      alert("PDF Export failed. Check browser console.");
    }
  };

  const handleExportExcel = () => {
    const data = clients.map(client => ({
      'ID': `C-${String(client.id).padStart(4, '0')}`,
      'First Name': client.first_name,
      'Last Name': client.last_name,
      'Email': client.email,
      'Phone': client.phone || '',
      'Type': client.type || '',
      'Travelers': client.passengers_count || 0,
      'Lifetime Spend': Number(client.bookings_sum_total_amount || 0),
      'Created By': client.creator?.name || 'Unknown',
      'Created At': new Date(client.created_at).toLocaleDateString()
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Clients");
    XLSX.writeFile(wb, "Clients_Export.xlsx");
    setShowExportOptions(false);
  };

  const handleExportJSON = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(clients, null, 2));
    const dt = document.createElement('a');
    dt.setAttribute("href", dataStr);
    dt.setAttribute("download", "Clients_Export.json");
    document.body.appendChild(dt);
    dt.click();
    document.body.removeChild(dt);
    setShowExportOptions(false);
  };

  const renderCategoryDetails = (client) => {
    if (!client.latestBooking) return <span style={{ color: 'var(--text-muted)' }}>No bookings</span>;
    const services = Array.isArray(client.latestBooking.services) ? client.latestBooking.services : [];
    if (services.length === 0) return <span style={{ color: 'var(--text-muted)' }}>Empty Booking</span>;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {services.slice(0, 2).map((srv, idx) => {
             // Derive type from serviceable_type string — no need to load full model
             const typeRaw = srv.serviceable_type || '';
             const type = typeRaw.split('\\').pop() || 'Service';
             return (
               <div key={idx} style={{ fontSize: '11px', background: 'rgba(255,255,255,0.05)', padding: '2px 8px', borderRadius: '4px', border: '1px solid var(--border-color)', display: 'inline-block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '160px' }}>
                 <span style={{ opacity: 0.8, fontWeight: 600 }}>{type}</span>
               </div>
             );
          })}
          {services.length > 2 && <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>+{services.length - 2} more services</span>}
        </div>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px', padding: isEmbedded ? '0' : '0' }}>
      {!isEmbedded && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div>
            <h1 style={{ 
              fontSize: '32px', 
              fontWeight: 800, 
              letterSpacing: '-1px',
              marginBottom: '8px'
            }}>
              All <span style={{ 
                background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)', 
                WebkitBackgroundClip: 'text', 
                WebkitTextFillColor: 'transparent',
                display: 'inline-block'
              }}>Clients</span>
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '15px' }}>
              Centralized management for travelers and corporate accounts.
            </p>
          </div>
          <div style={{ position: 'relative', zIndex: 9999 }} ref={exportDropdownRef}>
            <Button variant="primary" icon={Download} onClick={() => setShowExportOptions(!showExportOptions)}>
              Export Format
            </Button>
            {showExportOptions && (
              <div style={{ position: 'absolute', top: 'calc(100% + 8px)', right: 0, backgroundColor: '#1e2235', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '12px', padding: '4px', display: 'flex', flexDirection: 'column', gap: '2px', boxShadow: '0 10px 40px -10px rgba(0,0,0,0.8)', minWidth: '180px' }}>
                <button onClick={handleExportPDF} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', background: 'transparent', border: 'none', color: '#f8fafc', width: '100%', textAlign: 'left', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 500 }} onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'} onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                  <FileText size={16} /> As PDF Report
                </button>
                <button onClick={handleExportExcel} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', background: 'transparent', border: 'none', color: '#06B68A', width: '100%', textAlign: 'left', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 500 }} onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'} onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                  <FileSpreadsheet size={16} /> As Excel Data
                </button>
                <button onClick={handleExportJSON} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', background: 'transparent', border: 'none', color: '#f59e0b', width: '100%', textAlign: 'left', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 500 }} onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'} onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                  <FileJson size={16} /> As Raw JSON
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Stats Quick View */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px' }}>
        {[
          { label: 'Total Clients', value: stats?.total || 0, icon: Users, color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.1)' },
          { label: 'Registered Today', value: stats?.today || 0, icon: UserIcon, color: '#06B68A', bg: 'rgba(6, 182, 138, 0.1)' },
          { label: 'Registered Yesterday', value: stats?.yesterday || 0, icon: UserIcon, color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.1)' },
        ].map((stat, i) => (
          <Card key={i} style={{ padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ 
                padding: '12px', 
                borderRadius: '12px', 
                background: stat.bg,
                color: stat.color 
              }}>
                <stat.icon size={24} />
              </div>
              <div>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: 600 }}>{stat.label}</p>
                <p style={{ fontSize: '28px', fontWeight: 800, color: 'var(--text-main)' }}>{stat.value}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto auto', gap: '16px', alignItems: 'center' }}>
          <Input 
            placeholder="Search by name, email, phone, or ID..." 
            icon={Search}
            value={search}
            onChange={handleSearch}
            onClear={() => setSearch('')}
            style={{ marginBottom: 0 }}
          />

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <div style={{ width: '180px' }}>
              <Input 
                type="date"
                icon={RefreshCw} // Placeholder icon matching input.jsx logic
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                style={{ marginBottom: 0 }}
              />
            </div>
            <div style={{ color: 'var(--text-muted)', fontSize: '13px', fontWeight: 700 }}>to</div>
            <div style={{ width: '180px' }}>
              <Input 
                type="date"
                icon={RefreshCw}
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                style={{ marginBottom: 0 }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
             <Button variant={showFilters ? 'primary' : 'glass'} icon={Filter} size="md" onClick={() => setShowFilters(!showFilters)}>
              {showFilters ? 'Hide Filters' : 'Filters'}
            </Button>
            <Button 
              variant="glass" 
              icon={RefreshCw} 
              size="md" 
              onClick={() => fetchClients()}
              isLoading={loading}
            />
          </div>
        </div>

        {/* Quick Filter Chips */}
        <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
          {[
            { id: 'all', label: 'All Clients' },
            { id: 'today', label: 'Registered Today' },
            { id: 'yesterday', label: 'Registered Yesterday' }
          ].map(type => (
            <button 
              key={type.id}
              onClick={() => handleQuickFilter(type.id)}
              style={{ 
                padding: '6px 16px', 
                borderRadius: '100px', 
                background: filterType === type.id ? 'hsl(var(--primary))' : 'var(--bg-card)', 
                color: filterType === type.id ? 'white' : 'var(--text-muted)',
                border: '1px solid var(--border-color)',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.2s',
                whiteSpace: 'nowrap'
              }}
            >
              {type.label}
            </button>
          ))}
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
                  <Input label="PNR Code" placeholder="e.g. ABCDEF" value={filters.pnr} onChange={(e) => setFilters({...filters, pnr: e.target.value})} />
                  <Input label="Booking ID / Client ID" placeholder="e.g. BK-1001" value={filters.booking_id} onChange={(e) => setFilters({...filters, booking_id: e.target.value})} />
                  <Input label="Card Last 4" placeholder="e.g. 1234" maxLength={4} value={filters.card_last_4} onChange={(e) => setFilters({...filters, card_last_4: e.target.value})} />
                  <Input label="Phone Search" placeholder="e.g. +1..." value={filters.phone} onChange={(e) => setFilters({...filters, phone: e.target.value})} />
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
              style={{ borderRadius: 'var(--radius)', overflow: 'hidden', overflowX: 'auto' }}
            >
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '1000px' }}>
                <thead>
                  <tr style={{ background: 'var(--bg-input)', borderBottom: '1px solid var(--border-color)' }}>
                    <th style={{ padding: '20px 24px', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>Client Details</th>
                    <th style={{ padding: '20px 24px', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>Contact</th>
                    <th style={{ padding: '20px 24px', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>Category</th>
                    <th style={{ padding: '20px 24px', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>Date</th>
                    <th style={{ padding: '20px 24px', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>Amount</th>
                    <th style={{ padding: '20px 24px', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>Travelers</th>
                    <th style={{ padding: '20px 24px', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>Created By</th>
                    <th style={{ padding: '20px 24px', textAlign: 'right' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {clients?.length > 0 ? clients.map((client, idx) => (
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
                      onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-input)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      <td style={{ padding: '20px 24px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                          <div style={{ 
                            width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(255, 255, 255, 0.05)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'hsl(var(--primary))'
                          }}>
                            <UserIcon size={20} />
                          </div>
                          <div>
                            <p style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '14px' }}>
                              {client.first_name} {client.last_name}
                            </p>
                            <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                              ID: C-{String(client.id).padStart(4, '0')}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '20px 24px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--text-main)' }}>
                            <Phone size={13} style={{ color: 'var(--text-muted)' }} />
                            {client.phone || '--'}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--text-main)' }}>
                            <Mail size={13} style={{ color: 'var(--text-muted)' }} />
                            {client.email}
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '20px 24px' }}>
                        {renderCategoryDetails(client)}
                      </td>
                      <td style={{ padding: '20px 24px', fontSize: '13px', color: 'var(--text-muted)' }}>
                        {client.latestBooking ? new Date(client.latestBooking.created_at).toLocaleDateString() : 'N/A'}
                      </td>
                      <td style={{ padding: '20px 24px' }}>
                        <div style={{ fontWeight: 700, color: '#06B68A', fontSize: '14px' }}>
                          ${Number(client.bookings_sum_total_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                      </td>
                      <td style={{ padding: '20px 24px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Users size={14} style={{ color: 'var(--text-muted)' }}/>
                          <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-main)' }}>{client.passengers_count || 0}</span>
                        </div>
                      </td>
                      <td style={{ padding: '20px 24px' }}>
                        <div style={{ fontSize: '13px', color: 'var(--text-main)', fontWeight: 600 }}>
                          {client.creator?.name || '---'}
                        </div>
                      </td>
                      <td style={{ padding: '20px 24px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                          <Button variant="glass" size="sm" icon={Edit} onClick={() => handleEditClient(client)} style={{ padding: '6px' }} />
                          <Button variant="ghost" size="sm" icon={Trash2} onClick={() => handleDeleteClient(client)} style={{ color: '#f87171', padding: '6px' }} />
                          <Button variant="ghost" size="sm" icon={ArrowRight} onClick={() => handleViewClient(client)}>Details</Button>
                        </div>
                      </td>
                    </MotionTr>
                  )) : (
                    <tr>
                      <td colSpan="8" style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
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
