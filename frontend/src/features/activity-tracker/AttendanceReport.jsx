import React, { useState, useEffect } from 'react';
import { Calendar, ChevronLeft, ChevronRight, FileSpreadsheet, Users, Clock, AlertCircle, Download } from 'lucide-react';
import Card from '../../components/ui/Card';
import dashboardService from '../dashboard/dashboardService';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';

const AttendanceReport = ({ onClose }) => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth() + 1);
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [searchTerm, setSearchTerm] = useState('');

  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const fetchReport = async () => {
    setLoading(true);
    try {
      const res = await dashboardService.getAttendanceReport(currentMonth, currentYear);
      if (res.data?.success) {
        setData(res.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch attendance report', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [currentMonth, currentYear]);

  const handlePrevMonth = () => {
    if (currentMonth === 1) {
      setCurrentMonth(12);
      setCurrentYear(prev => prev - 1);
    } else {
      setCurrentMonth(prev => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 12) {
      setCurrentMonth(1);
      setCurrentYear(prev => prev + 1);
    } else {
      setCurrentMonth(prev => prev + 1);
    }
  };

  const handleExportCSV = () => {
    if (!data) return;
    
    let csv = "Employee,";
    for (let i = 1; i <= data.days_in_month; i++) {
      csv += `${i},`;
    }
    csv += "Total Hours\n";

    data.report.forEach(agent => {
      csv += `"${agent.name}",`;
      let total = 0;
      for (let i = 1; i <= data.days_in_month; i++) {
        const day = agent.days[i];
        csv += `${day?.total_hours || 0},`;
        total += day?.total_hours || 0;
      }
      csv += `${total.toFixed(2)}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `Attendance_${months[currentMonth-1]}_${currentYear}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '20px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Calendar size={28} style={{ color: '#06B68A' }} />
            <h2 style={{ fontSize: '26px', fontWeight: 800, margin: 0, letterSpacing: '-0.5px' }}>
              <span className="premium-gradient-text">Monthly Attendance Report</span>
            </h2>
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px', fontWeight: 500, marginTop: '4px' }}>
            Tracking login hours and daily presence.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', width: '200px' }}>
            <Input 
              placeholder="Search employee..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ marginBottom: 0 }}
              inputStyle={{ padding: '8px 12px', paddingLeft: '12px', background: 'var(--bg-input)', fontSize: '13px', borderRadius: '10px' }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'var(--bg-card)', padding: '4px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
            <button onClick={handlePrevMonth} style={{ background: 'transparent', border: 'none', color: 'var(--text-main)', cursor: 'pointer', padding: '6px', borderRadius: '8px' }} className="hover-bg-fade"><ChevronLeft size={18}/></button>
            <span style={{ fontSize: '13px', fontWeight: 700, minWidth: '110px', textAlign: 'center', color: 'var(--text-main)' }}>
              {months[currentMonth-1]} {currentYear}
            </span>
            <button onClick={handleNextMonth} style={{ background: 'transparent', border: 'none', color: 'var(--text-main)', cursor: 'pointer', padding: '6px', borderRadius: '8px' }} className="hover-bg-fade"><ChevronRight size={18}/></button>
          </div>
          
          <button 
            onClick={handleExportCSV}
            disabled={loading || !data}
            style={{
              background: 'var(--bg-card)', 
              border: '1px solid var(--border-color)', 
              color: 'var(--text-main)', 
              cursor: (loading || !data) ? 'not-allowed' : 'pointer',
              padding: '8px 16px', 
              borderRadius: '10px', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px', 
              fontSize: '13px', 
              fontWeight: 700,
              transition: 'all 0.2s', 
              opacity: (loading || !data) ? 0.5 : 1,
            }}
            className="hover-brighten"
          >
            <Download size={14} />
            Export CSV
          </button>
          
          <Button variant="ghost" onClick={onClose} style={{ borderRadius: '10px' }}>Close</Button>
        </div>
      </div>

      {data && !loading && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
          <div style={{ background: 'var(--bg-card)', padding: '16px', borderRadius: '16px', border: '1px solid var(--border-color)' }}>
            <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Team Hours</div>
            <div style={{ fontSize: '24px', fontWeight: 800, color: '#06B68A', marginTop: '4px' }}>
              {data.report.reduce((sum, agent) => sum + Object.values(agent.days).reduce((s, d) => s + (d.total_hours || 0), 0), 0).toFixed(1)}h
            </div>
          </div>
          <div style={{ background: 'var(--bg-card)', padding: '16px', borderRadius: '16px', border: '1px solid var(--border-color)' }}>
            <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Avg. Daily Active</div>
            <div style={{ fontSize: '24px', fontWeight: 800, color: '#8b5cf6', marginTop: '4px' }}>
              {(data.report.reduce((sum, agent) => sum + Object.values(agent.days).filter(d => d.total_hours > 0).length, 0) / data.days_in_month).toFixed(1)}
            </div>
          </div>
          <div style={{ background: 'var(--bg-card)', padding: '16px', borderRadius: '16px', border: '1px solid var(--border-color)' }}>
            <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Most Active</div>
            <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-main)', marginTop: '8px' }}>
              {data.report.reduce((prev, curr) => {
                const prevH = Object.values(prev.days).reduce((s, d) => s + (d.total_hours || 0), 0);
                const currH = Object.values(curr.days).reduce((s, d) => s + (d.total_hours || 0), 0);
                return prevH > currH ? prev : curr;
              }, data.report[0])?.name || 'N/A'}
            </div>
          </div>
        </div>
      )}

      <Card style={{ padding: '0', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
        <div style={{ overflowX: 'auto', width: '100%' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ background: 'var(--bg-input)', borderBottom: '1px solid var(--border-color)' }}>
                <th style={{ padding: '16px 24px', color: 'var(--text-muted)', fontWeight: 700, textAlign: 'left', minWidth: '250px', position: 'sticky', left: 0, background: 'var(--bg-input)', zIndex: 10, borderRight: '1px solid var(--border-color)' }}>Employee</th>
                {data && Array.from({ length: data.days_in_month }, (_, i) => (
                  <th key={i+1} style={{ padding: '12px 8px', color: 'var(--text-muted)', fontWeight: 700, textAlign: 'center', minWidth: '45px' }}>
                    {i+1}
                  </th>
                ))}
                <th style={{ padding: '16px 24px', color: 'var(--text-muted)', fontWeight: 700, textAlign: 'right', minWidth: '100px' }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={data ? data.days_in_month + 2 : 32} style={{ padding: '80px', textAlign: 'center' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
                      <Clock size={40} className="animate-spin" style={{ color: 'var(--text-muted)', opacity: 0.5 }} />
                      <p style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Analyzing activity logs...</p>
                    </div>
                  </td>
                </tr>
              ) : data?.report
                  .filter(agent => agent.name.toLowerCase().includes(searchTerm.toLowerCase()))
                  .map((agent) => {
                let monthlyTotal = 0;
                return (
                  <tr key={agent.id} style={{ borderBottom: '1px solid var(--border-color)' }} className="hover-bg-fade">
                    <td style={{ padding: '12px 24px', fontWeight: 700, color: 'var(--text-main)', position: 'sticky', left: 0, background: 'var(--bg-card)', zIndex: 5, minWidth: '250px', borderRight: '1px solid var(--border-color)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', whiteSpace: 'nowrap' }}>
                        <div style={{ flexShrink: 0, width: '32px', height: '32px', borderRadius: '10px', background: 'rgba(6, 182, 138, 0.12)', color: '#06B68A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 800 }}>
                          {agent.name.charAt(0)}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          <span style={{ fontSize: '14px' }}>{agent.name}</span>
                          <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 500 }}>ID: #{agent.id}</span>
                        </div>
                      </div>
                    </td>
                    {Array.from({ length: data.days_in_month }, (_, i) => {
                      const day = agent.days[i+1];
                      const hours = day?.total_hours || 0;
                      monthlyTotal += hours;
                      
                      let cellColor = 'transparent';
                      let textColor = 'var(--text-muted)';
                      if (hours > 0) {
                        if (hours >= 10) {
                           cellColor = 'rgba(139, 92, 246, 0.15)'; // Overtime
                           textColor = '#8b5cf6';
                        } else if (hours >= 8) {
                          cellColor = 'rgba(34, 197, 94, 0.15)'; // Full day
                          textColor = '#10b981';
                        } else {
                          cellColor = 'rgba(245, 158, 11, 0.15)'; // Partial
                          textColor = '#f59e0b';
                        }
                      }

                      return (
                        <td key={i+1} style={{ padding: '8px 4px', textAlign: 'center' }}>
                          <div 
                            title={hours > 0 ? `Login: ${day.first_login} | Logout: ${day.last_logout}` : 'No activity'}
                            style={{ 
                              background: cellColor, 
                              color: textColor, 
                              padding: '6px 0', 
                              borderRadius: '8px', 
                              fontWeight: 800,
                              fontSize: '11px',
                              transition: 'all 0.2s',
                              cursor: hours > 0 ? 'help' : 'default'
                            }}
                            className={hours > 0 ? "hover-scale-sm" : ""}
                          >
                            {hours > 0 ? hours.toFixed(1) : '-'}
                          </div>
                        </td>
                      );
                    })}
                    <td style={{ padding: '12px 24px', fontWeight: 900, color: '#06B68A', textAlign: 'right', fontSize: '15px' }}>
                      {monthlyTotal.toFixed(1)}<span style={{ fontSize: '11px', marginLeft: '2px', fontWeight: 600 }}>H</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        
        <div style={{ padding: '16px 24px', background: 'var(--bg-input)', borderTop: '1px solid var(--border-color)', display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '12px', height: '12px', borderRadius: '4px', background: 'rgba(139, 92, 246, 0.15)' }} />
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Overtime (10h+)</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '12px', height: '12px', borderRadius: '4px', background: 'rgba(34, 197, 94, 0.15)' }} />
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Full Day (8h+)</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '12px', height: '12px', borderRadius: '4px', background: 'rgba(245, 158, 11, 0.15)' }} />
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Partial Activity</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: 'auto' }}>
            <AlertCircle size={14} style={{ color: 'var(--text-muted)' }} />
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Values represent logged work hours</span>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default AttendanceReport;
