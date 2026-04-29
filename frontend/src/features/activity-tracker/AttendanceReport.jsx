import React, { useState, useEffect } from 'react';
import { Calendar, ChevronLeft, ChevronRight, FileSpreadsheet, Users, Clock, AlertCircle, Download } from 'lucide-react';
import Card from '../../components/ui/Card';
import dashboardService from '../dashboard/dashboardService';
import Button from '../../components/ui/Button';

const AttendanceReport = ({ onClose }) => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth() + 1);
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());

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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Calendar size={28} style={{ color: '#06B68A' }} />
            <h2 style={{ fontSize: '24px', fontWeight: 800, margin: 0 }}>
              <span className="premium-gradient-text">Monthly Attendance Report</span>
            </h2>
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px', fontWeight: 500, marginTop: '4px' }}>
            Tracking login hours and daily presence.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--bg-card)', padding: '4px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
            <button onClick={handlePrevMonth} style={{ background: 'transparent', border: 'none', color: 'var(--text-main)', cursor: 'pointer', padding: '6px' }}><ChevronLeft size={20}/></button>
            <span style={{ fontSize: '14px', fontWeight: 700, minWidth: '120px', textAlign: 'center', color: 'var(--text-main)' }}>
              {months[currentMonth-1]} {currentYear}
            </span>
            <button onClick={handleNextMonth} style={{ background: 'transparent', border: 'none', color: 'var(--text-main)', cursor: 'pointer', padding: '6px' }}><ChevronRight size={20}/></button>
          </div>
          
          <button 
            onClick={handleExportCSV}
            disabled={loading || !data}
            style={{
              background: 'transparent', 
              border: '1px solid var(--border-color)', 
              color: 'var(--text-muted)', 
              cursor: (loading || !data) ? 'not-allowed' : 'pointer',
              padding: '8px 12px', 
              borderRadius: '8px', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '6px', 
              fontSize: '12px', 
              fontWeight: 700,
              transition: 'all 0.2s', 
              opacity: (loading || !data) ? 0.5 : 1,
            }}
            className="hover-brighten"
          >
            <Download size={14} />
            Export CSV
          </button>
          
          <Button variant="ghost" onClick={onClose}>Close</Button>
        </div>
      </div>

      <Card style={{ padding: '0', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
        <div style={{ overflowX: 'auto', width: '100%' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ background: 'var(--bg-input)', borderBottom: '1px solid var(--border-color)' }}>
                <th style={{ padding: '16px 24px', color: 'var(--text-muted)', fontWeight: 700, textAlign: 'left', minWidth: '200px', position: 'sticky', left: 0, background: 'var(--bg-input)', zIndex: 10 }}>Employee</th>
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
              ) : data?.report.map((agent) => {
                let monthlyTotal = 0;
                return (
                  <tr key={agent.id} style={{ borderBottom: '1px solid var(--border-color)' }} className="hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                    <td style={{ padding: '12px 24px', fontWeight: 700, color: 'var(--text-main)', position: 'sticky', left: 0, background: 'var(--bg-card)', zIndex: 5 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'rgba(6, 182, 138, 0.1)', color: '#06B68A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px' }}>
                          {agent.name.charAt(0)}
                        </div>
                        {agent.name}
                      </div>
                    </td>
                    {Array.from({ length: data.days_in_month }, (_, i) => {
                      const day = agent.days[i+1];
                      const hours = day?.total_hours || 0;
                      monthlyTotal += hours;
                      
                      let cellColor = 'transparent';
                      let textColor = 'var(--text-muted)';
                      if (hours > 0) {
                        cellColor = hours > 7 ? 'rgba(34, 197, 94, 0.15)' : 'rgba(245, 158, 11, 0.15)';
                        textColor = hours > 7 ? '#10b981' : '#f59e0b';
                      }

                      return (
                        <td key={i+1} style={{ padding: '8px 4px', textAlign: 'center' }}>
                          <div 
                            title={hours > 0 ? `Login: ${day.first_login} | Logout: ${day.last_logout}` : 'No activity'}
                            style={{ 
                              background: cellColor, 
                              color: textColor, 
                              padding: '4px 0', 
                              borderRadius: '6px', 
                              fontWeight: 700,
                              fontSize: '11px'
                            }}
                          >
                            {hours > 0 ? hours.toFixed(1) : '-'}
                          </div>
                        </td>
                      );
                    })}
                    <td style={{ padding: '12px 24px', fontWeight: 800, color: '#06B68A', textAlign: 'right' }}>
                      {monthlyTotal.toFixed(1)}h
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        
        <div style={{ padding: '16px 24px', background: 'var(--bg-input)', borderTop: '1px solid var(--border-color)', display: 'flex', gap: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '12px', height: '12px', borderRadius: '3px', background: 'rgba(34, 197, 94, 0.15)' }} />
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Full Day (8h+)</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '12px', height: '12px', borderRadius: '3px', background: 'rgba(245, 158, 11, 0.15)' }} />
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Partial Activity</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: 'auto' }}>
            <AlertCircle size={14} style={{ color: 'var(--text-muted)' }} />
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Hover over hours to see shift timings</span>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default AttendanceReport;
