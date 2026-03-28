import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Download, 
  Filter, 
  Search, 
  Calendar,
  TrendingUp,
  CreditCard,
  Users
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import Input from '../../components/ui/Input';
import api from '../../services/api';

const ReportsPage = () => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState([]);
  const [filters, setFilters] = useState({
    start_date: '',
    end_date: '',
    status: '',
    search: ''
  });

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    setLoading(true);
    try {
      // In a real app, we'd have a specific reports endpoint
      // For now, let's use the bookings index with expanded data
      const response = await api.get('/bookings');
      setData(response.data.data.data || response.data.data || []);
    } catch (err) {
      console.error('Failed to fetch reports', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredData = data.filter(item => {
    const matchesSearch = !filters.search || 
      item.booking_reference.toLowerCase().includes(filters.search.toLowerCase()) ||
      (item.client?.first_name + ' ' + item.client?.last_name).toLowerCase().includes(filters.search.toLowerCase());
    
    const matchesStatus = !filters.status || item.status === filters.status;
    
    // Simple date filter (could be more robust)
    const matchesDate = (!filters.start_date || new Date(item.created_at) >= new Date(filters.start_date)) &&
                      (!filters.end_date || new Date(item.created_at) <= new Date(filters.end_date));

    return matchesSearch && matchesStatus && matchesDate;
  });

  const exportToCSV = () => {
    const headers = ['Ref', 'Date', 'Client', 'Agent', 'Total', 'Status'];
    const rows = filteredData.map(item => [
      item.booking_reference,
      new Date(item.created_at).toLocaleDateString(),
      `${item.client?.first_name} ${item.client?.last_name}`,
      item.agent?.name || 'N/A',
      item.total_amount,
      item.status
    ]);

    let csvContent = "data:text/csv;charset=utf-8," 
      + headers.join(",") + "\n"
      + rows.map(e => e.join(",")).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `reports_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const totalRevenue = filteredData.reduce((sum, item) => sum + parseFloat(item.total_amount || 0), 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      {/* Header Area */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <h1 style={{ fontSize: '32px', fontWeight: 800, letterSpacing: '-1px', marginBottom: '8px' }}>
            Data <span className="premium-gradient-text">Reports</span>
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '15px' }}>
            Advanced analytics and record exportation for business intelligence.
          </p>
        </div>
        <Button variant="primary" icon={Download} onClick={exportToCSV} disabled={filteredData.length === 0}>
          Export to CSV
        </Button>
      </div>

      {/* Quick Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px' }}>
        <Card title="Reported Revenue" subtitle="Filtered total" icon={TrendingUp}>
          <p style={{ fontSize: '28px', fontWeight: 800, color: 'var(--text-main)' }}>${totalRevenue.toLocaleString()}</p>
        </Card>
        <Card title="Total Volume" subtitle="Number of entries" icon={FileText}>
          <p style={{ fontSize: '28px', fontWeight: 800, color: 'var(--text-main)' }}>{filteredData.length}</p>
        </Card>
        <Card title="Average Value" subtitle="Per transaction" icon={CreditCard}>
          <p style={{ fontSize: '28px', fontWeight: 800, color: 'var(--text-main)' }}>
            ${filteredData.length > 0 ? (totalRevenue / filteredData.length).toFixed(2) : '0.00'}
          </p>
        </Card>
      </div>

      {/* Filters Hub */}
      <div className="glass-panel" style={{ padding: '24px', borderRadius: '24px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
          <Input 
            label="Search Reference / Client" 
            placeholder="Search..." 
            icon={Search}
            value={filters.search}
            onChange={(e) => setFilters({...filters, search: e.target.value})}
          />
          <Input 
            label="Start Date" 
            type="date" 
            icon={Calendar}
            value={filters.start_date}
            onChange={(e) => setFilters({...filters, start_date: e.target.value})}
          />
          <Input 
            label="End Date" 
            type="date" 
            icon={Calendar}
            value={filters.end_date}
            onChange={(e) => setFilters({...filters, end_date: e.target.value})}
          />
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '8px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Status</label>
            <select 
              value={filters.status}
              onChange={(e) => setFilters({...filters, status: e.target.value})}
              style={{ width: '100%', padding: '12px', borderRadius: '12px', background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: 'var(--text-main)', outline: 'none', height: '46px' }}
            >
              <option value="">All Statuses</option>
              <option value="Confirmed">Confirmed</option>
              <option value="Pending">Pending</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>
        </div>
      </div>

      {/* Data Table */}
      <div className="glass-panel" style={{ borderRadius: '24px', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ background: 'var(--bg-input)', borderBottom: '1px solid var(--border-color)' }}>
              <th style={{ padding: '20px 24px', fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Reference</th>
              <th style={{ padding: '20px 24px', fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Date</th>
              <th style={{ padding: '20px 24px', fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Client</th>
              <th style={{ padding: '20px 24px', fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Agent</th>
              <th style={{ padding: '20px 24px', fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Amount</th>
              <th style={{ padding: '20px 24px', fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Status</th>
            </tr>
          </thead>
          <tbody>
            <AnimatePresence>
              {loading ? (
                <tr>
                  <td colSpan="6" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>Compiling report data...</td>
                </tr>
              ) : filteredData.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>No records match your criteria.</td>
                </tr>
              ) : filteredData.map((item, idx) => (
                <motion.tr 
                  key={item.id}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.02 }}
                  style={{ borderBottom: '1px solid var(--border-color)' }}
                >
                  <td style={{ padding: '20px 24px', fontWeight: 700, color: 'var(--text-main)' }}>{item.booking_reference}</td>
                  <td style={{ padding: '20px 24px', color: 'var(--text-muted)', fontSize: '13px' }}>{new Date(item.created_at).toLocaleDateString()}</td>
                  <td style={{ padding: '20px 24px', fontSize: '14px' }}>{item.client?.first_name} {item.client?.last_name}</td>
                  <td style={{ padding: '20px 24px', fontSize: '14px' }}>{item.agent?.name || '---'}</td>
                  <td style={{ padding: '20px 24px', fontWeight: 800, color: '#4ade80' }}>${item.total_amount}</td>
                  <td style={{ padding: '20px 24px' }}>
                    <span style={{ 
                      padding: '4px 10px', borderRadius: '100px', fontSize: '11px', fontWeight: 800,
                      background: item.status === 'Confirmed' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(250, 204, 21, 0.1)',
                      color: item.status === 'Confirmed' ? '#4ade80' : '#facc15'
                    }}>
                      {item.status}
                    </span>
                  </td>
                </motion.tr>
              ))}
            </AnimatePresence>
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ReportsPage;
