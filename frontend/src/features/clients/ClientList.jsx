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
  FileText,
  FileSpreadsheet,
  FileJson,
  Calendar as CalendarIcon,
  Download,
  HelpCircle,
  Plane,
  Hotel,
  Car,
  Ship,
  Package
} from 'lucide-react';
import { useWalkthroughStore } from '../../store/walkthroughStore';
import ExportDropdown from '../../components/ui/ExportDropdown';
import Toast from '../../components/ui/Toast';
import clientService from './clientService';
import api from '../../services/api';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { getStatusStyle } from '../../utils/statusStyles';

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
  const [filters, setFilters] = useState({
    pnr: '',
    booking_id: '',
    card_last_4: '',
    phone: '',
    email: ''
  });
  const [globalPeriod, setGlobalPeriod] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [stats, setStats] = useState({ total: 0, today: 0, yesterday: 0 });
  const [toast, setToast] = useState({ message: '', type: 'success' });

  const isFetchingRef = React.useRef(false);



  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setDebouncedSearch(search.trim());
    }, 350);

    return () => window.clearTimeout(timeout);
  }, [search]);

  const fetchClients = useCallback(async (searchTerm = debouncedSearch, advancedFilters = filters, bypassCache = false) => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;

    const params = {
      per_page: 25,
      client_name: searchTerm,
      start_date: startDate,
      end_date: endDate,
      ...Object.fromEntries(Object.entries(advancedFilters).filter(([, v]) => v !== ''))
    };

    const isCached = api.hasCached?.('/admin/clients', { params });
    if (!isCached || bypassCache) {
      setLoading(true);
    }

    try {
      const response = await clientService.getClients(params, { bypassCache });
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
  }, [filters, debouncedSearch, startDate, endDate]);

  useEffect(() => {
    fetchClients();
  }, [fetchClients, startDate, endDate]);

  const handleQuickFilter = (type) => {
    setGlobalPeriod(type);
    const today = new Date().toISOString().split('T')[0];

    const yesterdayDate = new Date();
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    const yesterday = yesterdayDate.toISOString().split('T')[0];

    const weeklyDate = new Date();
    weeklyDate.setDate(weeklyDate.getDate() - 7);
    const lastWeek = weeklyDate.toISOString().split('T')[0];

    const monthlyDate = new Date();
    monthlyDate.setMonth(monthlyDate.getMonth() - 1);
    const lastMonth = monthlyDate.toISOString().split('T')[0];

    if (type === 'daily') {
      setStartDate(today);
      setEndDate(today);
    } else if (type === 'yesterday') {
      setStartDate(yesterday);
      setEndDate(yesterday);
    } else if (type === 'weekly') {
      setStartDate(lastWeek);
      setEndDate(today);
    } else if (type === 'monthly') {
      setStartDate(lastMonth);
      setEndDate(today);
    } else if (type === 'all') {
      setStartDate('');
      setEndDate('');
    }
  };

  const startClientsTour = () => {
    const { startTour } = useWalkthroughStore.getState();
    startTour([
      {
        target: '#clients-title-area',
        title: 'Clients Management 👥',
        content: 'View and manage all your clients, their contact info, and lifetime spend.',
        position: 'bottom'
      },
      {
        target: '#clients-search-container',
        title: 'Search & Filters',
        content: 'Search for clients by name, email, or use advanced filters to find specific records.',
        position: 'bottom',
        offset: 20
      },
      {
        target: '#client-details-btn-0',
        title: 'Client Details',
        content: 'Click here to view full profile, booking history, and active cards for this client.',
        position: 'left'
      }
    ]);
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
      setToast({ message: error?.response?.data?.message || 'Failed to delete client.', type: 'error' });
    }
  };

  const handleExportPDF = () => {
    try {
      const doc = new jsPDF('l', 'mm', 'a4'); // Use landscape for more columns
      const tableColumn = ["ID", "Name", "Email", "Phone", "Address", "Latest Booking", "Date", "Spend", "Created By"];
      const tableRows = clients.map(client => {
        const booking = client.latestBooking || client.latest_booking;
        const bookingStr = booking ? `${(booking.services || []).map(s => {
          const type = s.serviceable_type?.split('\\').pop() || 'Service';
          const name = s.serviceable?.name || s.serviceable?.airline_code || type;
          const detailsJson = typeof s.details_json === 'string' ? JSON.parse(s.details_json) : (s.details_json || {});
          const code = detailsJson.confirmation_code || s.serviceable?.confirmation_code || s.serviceable?.pnr || s.serviceable?.booking_confirmation || '';
          return `${type}: ${name}${code ? ' (REF: ' + code + ')' : ''}`;
        }).join(', ')}` : 'No Bookings';

        const dateStr = booking
          ? new Date(booking.created_at).toLocaleDateString()
          : new Date(client.created_at).toLocaleDateString();

        return [
          `C-${String(client.id).padStart(4, '0')}`,
          `${client.first_name || ''} ${client.last_name || ''}`.trim(),
          client.email || '--',
          client.phone || '--',
          client.address || '--',
          bookingStr,
          dateStr,
          `$${Number(client.bookings_sum_total_amount || 0).toLocaleString()}`,
          client.creator?.name || 'Admin'
        ];
      });

      autoTable(doc, {
        head: [tableColumn],
        body: tableRows,
        startY: 20,
        styles: { fontSize: 7, cellPadding: 2 },
        columnStyles: {
          5: { cellWidth: 50 }, // Booking Details
          4: { cellWidth: 40 }  // Address
        }
      });
      doc.text("Clients Data Export", 14, 15);
      doc.save("Clients_Export.pdf");
    } catch (err) {
      console.error("PDF generation failed:", err);
      setToast({ message: "PDF Export failed. Check browser console.", type: 'error' });
    }
  };



  const handleExportExcel = () => {
    const data = clients.map(client => {
      const booking = client.latestBooking || client.latest_booking;
      return {
        'ID': `C-${String(client.id).padStart(4, '0')}`,
        'Name': `${client.first_name || ''} ${client.last_name || ''}`.trim(),
        'Email': client.email || '--',
        'Phone': client.phone || '--',
        'Type': client.type || 'Standard',
        'Latest Booking ID': booking?.booking_reference || 'N/A',
        'Booking Details': booking ? (booking.services || []).map(s => {
          const type = s.serviceable_type?.split('\\').pop() || 'Service';
          const name = s.serviceable?.name || s.serviceable?.airline_code || type;
          const detailsJson = typeof s.details_json === 'string' ? JSON.parse(s.details_json) : (s.details_json || {});
          const code = detailsJson.confirmation_code || s.serviceable?.confirmation_code || s.serviceable?.pnr || s.serviceable?.booking_confirmation || '';
          return `${type}: ${name}${code ? ' (REF: ' + code + ')' : ''}`;
        }).join(' | ') : 'No Bookings',
        'Travelers': client.passengers_count || 0,
        'Lifetime Spend': `$${Number(client.bookings_sum_total_amount || 0).toLocaleString()}`,
        'Address': client.address || 'N/A',
        'Created By': client.creator?.name || 'Admin',
        'Registration Date': new Date(client.created_at).toLocaleDateString()
      };
    });
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Clients");
    XLSX.writeFile(wb, "Clients_Export.xlsx");
  };

  const handleExportJSON = () => {
    const data = clients.map(client => ({
      ...client,
      booking_details: client.latestBooking || client.latest_booking
    }));
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(data, null, 2));
    const dt = document.createElement('a');
    dt.setAttribute("href", dataStr);
    dt.setAttribute("download", "Clients_Export.json");
    document.body.appendChild(dt);
    dt.click();
    document.body.removeChild(dt);
  };


  const getChargeStatusStyle = (status) => {
    const s = String(status || '').toLowerCase();
    if (s.includes('capture') || (s.includes('charge') && !s.includes('back'))) {
      return {
        label: 'Captured',
        color: '#06B68A',
        bg: 'rgba(6, 182, 138, 0.04)',
        border: 'rgba(6, 182, 138, 0.15)'
      };
    } else if (s.includes('pending')) {
      return {
        label: 'Pending',
        color: '#f59e0b',
        bg: 'rgba(245, 158, 11, 0.04)',
        border: 'rgba(245, 158, 11, 0.15)'
      };
    } else if (s.includes('decline')) {
      return {
        label: 'Declined',
        color: '#ef4444',
        bg: 'rgba(239, 68, 68, 0.04)',
        border: 'rgba(239, 68, 68, 0.15)'
      };
    } else if (s.includes('chargeback')) {
      return {
        label: 'Chargeback',
        color: '#ec4899',
        bg: 'rgba(236, 72, 153, 0.04)',
        border: 'rgba(236, 72, 153, 0.15)'
      };
    } else if (s.includes('refund')) {
      return {
        label: 'Refunded',
        color: '#3b82f6',
        bg: 'rgba(59, 130, 246, 0.04)',
        border: 'rgba(59, 130, 246, 0.15)'
      };
    } else {
      return {
        label: status,
        color: '#94a3b8',
        bg: 'rgba(148, 163, 184, 0.04)',
        border: 'rgba(148, 163, 184, 0.15)'
      };
    }
  };

  const renderCategoryDetails = (client) => {
    const booking = client.latestBooking || client.latest_booking;
    if (!booking) return <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>No bookings</span>;
    const services = Array.isArray(booking.services) ? booking.services : [];
    const bookingRef = booking.booking_reference || `BK-${booking.id}`;

    const getServicePalette = (serviceType) => {
      switch (serviceType) {
        case 'Flight':
          return {
            icon: Plane,
            color: '#8b5cf6',
            bg: 'rgba(139, 92, 246, 0.04)',
            border: 'rgba(139, 92, 246, 0.15)'
          };
        case 'Hotel':
          return {
            icon: Hotel,
            color: '#3b82f6',
            bg: 'rgba(59, 130, 246, 0.04)',
            border: 'rgba(59, 130, 246, 0.15)'
          };
        case 'Car':
        case 'CarRental':
        case 'Car Rental':
          return {
            icon: Car,
            color: '#d97706',
            bg: 'rgba(217, 119, 6, 0.04)',
            border: 'rgba(217, 119, 6, 0.15)'
          };
        case 'Cruise':
          return {
            icon: Ship,
            color: '#ec4899',
            bg: 'rgba(236, 72, 153, 0.04)',
            border: 'rgba(236, 72, 153, 0.15)'
          };
        default:
          return {
            icon: Package,
            color: '#10b981',
            bg: 'rgba(16, 185, 129, 0.04)',
            border: 'rgba(16, 185, 129, 0.15)'
          };
      }
    };

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {booking && booking.booking_reference && (
          <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', fontFamily: 'monospace', letterSpacing: '0.5px' }}>
            ID: <span style={{ color: 'var(--text-main)' }}>{booking.booking_reference}</span>
          </div>
        )}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' }}>
          {services.length === 0 ? (
            <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>Empty Booking</span>
          ) : services.map((srv, idx) => {
            const typeRaw = srv.serviceable_type || '';
            const type = typeRaw.split('\\').pop() || 'Service';
            const data = srv.serviceable || {};
            const palette = getServicePalette(type);
            const Icon = palette.icon;

            // Smart description extraction
            let name = 'Service';

            if (type === 'Flight') {
              name = data.airline_code || 'Flight';
            } else if (type === 'Hotel') {
              name = data.name || 'Hotel';
            } else if (type === 'Car' || type === 'CarRental' || type === 'Car Rental') {
              name = data.company || 'Car Rental';
            } else if (type === 'Cruise') {
              name = data.cruise_name || 'Cruise';
            } else {
              name = data.name || 'Service';
            }

            const detailsJson = typeof srv.details_json === 'string' ? JSON.parse(srv.details_json) : (srv.details_json || {});
            const code = detailsJson.confirmation_code || data.confirmation_code || data.pnr || data.booking_confirmation || '';

            return (
              <div key={idx} style={{
                display: 'flex',
                borderRadius: '6px',
                overflow: 'hidden',
                border: `1px solid ${palette.border}`,
                background: 'rgba(255,255,255,0.02)',
                alignItems: 'stretch'
              }}>
                <div style={{
                  padding: '4px 6px',
                  background: palette.bg,
                  borderRight: `1px solid ${palette.border}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Icon size={12} style={{ color: palette.color, flexShrink: 0 }} />
                </div>
                <div style={{
                  padding: '4px 8px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  whiteSpace: 'nowrap'
                }}>
                  <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-main)' }}>
                    {name}
                  </span>
                  {code && (
                    <span style={{
                      fontSize: '10px',
                      color: '#06B68A',
                      fontFamily: 'monospace',
                      fontWeight: 800,
                      padding: '2px 6px',
                      background: 'rgba(6, 182, 138, 0.1)',
                      borderRadius: '4px',
                      letterSpacing: '0.5px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}>
                      <span style={{ opacity: 0.7, fontSize: '9px', fontWeight: 600 }}>CONF:</span>
                      {code}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };



  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px', padding: isEmbedded ? '0' : '0' }}>
      {!isEmbedded && (
        <div id="clients-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div id="clients-title-area">
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
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <Button
              variant="ghost"
              size="sm"
              onClick={startClientsTour}
              icon={HelpCircle}
              style={{ borderRadius: '100px', fontWeight: 700, color: 'hsl(var(--primary))' }}
            >
              Show Guide
            </Button>
            <ExportDropdown
              options={[
                { label: 'As PDF Report', icon: FileText, onClick: handleExportPDF },
                { label: 'As Excel Data', icon: FileSpreadsheet, onClick: handleExportExcel },
                { label: 'As Raw JSON', icon: FileJson, onClick: handleExportJSON },
              ]}
            />
          </div>
        </div>
      )}

      {/* Stats Quick View */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px' }}>
        {[
          { label: 'Total Clients', value: stats?.total || 0, icon: Users, color: '#06B68A', bg: 'rgba(6, 182, 138, 0.1)' },
          { label: 'Registered Today', value: stats?.today || 0, icon: UserIcon, color: '#06B68A', bg: 'rgba(6, 182, 138, 0.1)' },
          { label: 'Registered Yesterday', value: stats?.yesterday || 0, icon: UserIcon, color: '#06B68A', bg: 'rgba(6, 182, 138, 0.1)' },
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
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div id="clients-search-container" style={{ flex: '1 1 300px', maxWidth: '400px' }}>
            <Input
              placeholder="Search by name, email, phone, or ID..."
              icon={Search}
              value={search}
              onChange={handleSearch}
              onClear={() => setSearch('')}
              style={{ marginBottom: 0 }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: '0 1 auto' }}>
            <div style={{ display: 'flex', gap: '6px', background: 'var(--bg-input)', padding: '4px', borderRadius: '12px', border: '1px solid var(--border-color)', flexWrap: 'wrap' }}>
              {[
                { id: 'all', label: 'All Time' },
                { id: 'daily', label: 'Daily' },
                { id: 'yesterday', label: 'Yesterday' },
                { id: 'weekly', label: 'Weekly' },
                { id: 'monthly', label: 'Monthly' },
                { id: 'custom', label: 'Custom Date' },
              ].map((p) => (
                <button
                  key={p.id}
                  onClick={() => handleQuickFilter(p.id)}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '8px',
                    border: 'none',
                    background: globalPeriod === p.id ? 'var(--bg-card)' : 'transparent',
                    color: globalPeriod === p.id ? 'var(--text-main)' : 'var(--text-muted)',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    boxShadow: globalPeriod === p.id ? '0 2px 8px rgba(0,0,0,0.1)' : 'none'
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {globalPeriod === 'custom' && (
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', background: 'var(--bg-card)', padding: '6px', borderRadius: '16px', border: '1px solid var(--border-color)' }}>
                <div style={{ width: '150px' }}>
                  <Input
                    type="date"
                    icon={CalendarIcon}
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    style={{ marginBottom: 0 }}
                    inputStyle={{ padding: '8px 12px', paddingLeft: '44px', fontSize: '13px', background: 'var(--bg-input)', borderRadius: '10px' }}
                  />
                </div>
                <span style={{ color: 'var(--text-muted)', fontWeight: 600, padding: '0 4px' }}>to</span>
                <div style={{ width: '150px' }}>
                  <Input
                    type="date"
                    icon={CalendarIcon}
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    style={{ marginBottom: 0 }}
                    inputStyle={{ padding: '8px 12px', paddingLeft: '44px', fontSize: '13px', background: 'var(--bg-input)', borderRadius: '10px' }}
                  />
                </div>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: '6px', background: 'var(--bg-input)', padding: '4px', borderRadius: '12px', border: '1px solid var(--border-color)', flexWrap: 'wrap', flex: '0 1 auto' }}>
            {[
              { id: '', label: 'All Payments' },
              { id: 'Charged/Captured', label: 'Captured' },
              { id: 'Refunded', label: 'Refunded' },
              { id: 'Chargeback', label: 'Chargeback' },
            ].map((p) => (
              <button
                key={p.id}
                onClick={() => {
                  const newFilters = { ...filters, charge_status: p.id };
                  setFilters(newFilters);
                  fetchClients(search, newFilters);
                }}
                style={{
                  padding: '6px 14px',
                  borderRadius: '8px',
                  border: 'none',
                  background: (filters.charge_status || '') === p.id ? 'var(--bg-card)' : 'transparent',
                  color: (filters.charge_status || '') === p.id ? 'hsl(var(--primary))' : 'var(--text-muted)',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  boxShadow: (filters.charge_status || '') === p.id ? '0 2px 8px rgba(0,0,0,0.1)' : 'none'
                }}
              >
                {p.label}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', gap: '8px', marginLeft: 'auto' }}>
            <Button variant={showFilters ? 'primary' : 'glass'} icon={Filter} size="md" onClick={() => setShowFilters(!showFilters)}>
              {showFilters ? 'Hide Filters' : 'Filters'}
            </Button>
            <Button
              variant="glass"
              icon={RefreshCw}
              size="md"
              onClick={() => fetchClients(debouncedSearch, filters, true)}
              isLoading={loading}
            />
          </div>
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
                  <Input label="PNR Code" placeholder="e.g. ABCDEF" value={filters.pnr} onChange={(e) => setFilters({ ...filters, pnr: e.target.value })} />
                  <Input label="Booking ID / Client ID" placeholder="e.g. BK-1001" value={filters.booking_id} onChange={(e) => setFilters({ ...filters, booking_id: e.target.value })} />
                  <Input label="Card Last 4" placeholder="e.g. 1234" maxLength={4} value={filters.card_last_4} onChange={(e) => setFilters({ ...filters, card_last_4: e.target.value })} />
                  <Input label="Phone Search" placeholder="e.g. +1..." value={filters.phone} onChange={(e) => setFilters({ ...filters, phone: e.target.value })} />
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
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', tableLayout: 'fixed' }}>
                <thead style={{ position: 'sticky', top: 0, zIndex: 10, background: 'var(--bg-input)' }}>
                  <tr style={{ background: 'var(--bg-input)', borderBottom: '1px solid var(--border-color)' }}>
                    <th style={{ padding: '16px 16px', fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', width: '16%' }}>Client Details</th>
                    <th style={{ padding: '16px 16px', fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', width: '18%' }}>Contact & Billing</th>
                    <th style={{ padding: '16px 16px', fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', width: '26%' }}>Booking Details</th>
                    <th style={{ padding: '16px 16px', fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', width: '9%' }}>Date</th>
                    <th style={{ padding: '16px 16px', fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', width: '12%' }}>Total Spend</th>
                    <th style={{ padding: '16px 16px', fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', width: '7%' }}>Travelers</th>
                    <th style={{ padding: '16px 24px 16px 16px', textAlign: 'right', width: '12%' }}></th>
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
                      <td style={{ padding: '16px 16px', verticalAlign: 'middle' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{
                            width: '32px', height: '32px', borderRadius: '10px', background: 'rgba(255, 255, 255, 0.05)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'hsl(var(--primary))', flexShrink: 0
                          }}>
                            <UserIcon size={16} />
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                            <p style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '13px', lineHeight: '1.4' }}>
                              {client.first_name} {client.last_name}
                            </p>
                            <p style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                              ID: C-{String(client.id).padStart(4, '0')}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '16px 16px', verticalAlign: 'middle' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            <Phone size={12} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                            {client.phone || '--'}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            <Mail size={12} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                            {client.email}
                          </div>
                          {client.address && (
                            <div style={{ display: 'flex', gap: '6px', fontSize: '10px', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                              <FileText size={12} style={{ flexShrink: 0, marginTop: '2px' }} />
                              <span style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                {client.address}
                              </span>
                            </div>
                          )}
                        </div>
                      </td>
                      <td style={{ padding: '16px 16px', verticalAlign: 'middle' }}>
                        {renderCategoryDetails(client)}
                      </td>
                      <td style={{ padding: '16px 16px', fontSize: '12px', color: 'var(--text-muted)', verticalAlign: 'middle' }}>
                        {(client.latestBooking || client.latest_booking)
                          ? new Date((client.latestBooking || client.latest_booking).created_at).toLocaleDateString()
                          : new Date(client.created_at).toLocaleDateString()}
                      </td>

                      <td style={{ padding: '16px 16px', verticalAlign: 'middle' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <div style={{ fontWeight: 800, color: '#06B68A', fontSize: '15px', letterSpacing: '-0.5px' }}>
                            ${Number(client.bookings_sum_total_amount || 0).toLocaleString()}
                          </div>

                          {(() => {
                            const latestBooking = client.latestBooking || client.latest_booking;
                            const auths = latestBooking?.paymentAuthorizations || latestBooking?.payment_authorizations || [];
                            const latestAuth = [...auths].sort((a, b) => b.id - a.id).find(a => a.charge_status);
                            if (latestAuth && latestAuth.charge_status) {
                              const badge = getChargeStatusStyle(latestAuth.charge_status);
                              return (
                                <div style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  width: 'fit-content',
                                  gap: '4px',
                                  padding: '2px 8px',
                                  borderRadius: '100px',
                                  fontSize: '10px',
                                  fontWeight: 800,
                                  textTransform: 'uppercase',
                                  color: badge.color,
                                  background: badge.bg,
                                  border: `1px solid ${badge.border}`
                                }}>
                                  {badge.label}
                                </div>
                              );
                            }
                            return null;
                          })()}

                          <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px', fontWeight: 600 }}>
                            By: {client.creator?.name || 'Admin'}
                          </div>
                        </div>
                      </td>

                      <td style={{ padding: '16px 16px', verticalAlign: 'middle' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Users size={12} style={{ color: 'var(--text-muted)' }} />
                          <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-main)' }}>{client.passengers_count || 0}</span>
                        </div>
                      </td>
                      <td style={{ padding: '16px 24px 16px 16px', textAlign: 'right', verticalAlign: 'middle' }}>
                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                          <Button variant="glass" size="sm" icon={Edit} onClick={() => handleEditClient(client)} style={{ padding: '6px' }} />
                          <Button variant="ghost" size="sm" icon={Trash2} onClick={() => handleDeleteClient(client)} style={{ color: '#f87171', padding: '6px' }} />
                          <Button
                            variant="ghost"
                            size="sm"
                            id={idx === 0 ? 'client-details-btn-0' : undefined}
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
      {toast.message && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast({ message: '', type: 'success' })}
        />
      )}
    </div>
  );
};

export default ClientList;
