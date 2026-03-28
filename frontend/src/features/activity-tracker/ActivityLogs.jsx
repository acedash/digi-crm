import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, Calendar, ChevronRight, X, User, Phone, Coffee, CheckCircle2, LogOut } from 'lucide-react';
import activityService from './activityService';

const ActivityLogs = () => {
  const [summaries, setSummaries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(null);
  const [details, setDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  useEffect(() => {
    fetchSummaries();
  }, []);

  const fetchSummaries = async () => {
    try {
      setLoading(true);
      const res = await activityService.getDailySummary();
      setSummaries(res.data.data);
    } catch (e) {
      console.error('Failed to fetch activity summaries', e);
    } finally {
      setLoading(false);
    }
  };

  const fetchDetails = async (date) => {
    try {
      setLoadingDetails(true);
      setSelectedDate(date);
      const res = await activityService.getDailyDetails(date);
      setDetails(res.data.data);
    } catch (e) {
      console.error('Failed to fetch daily details', e);
    } finally {
      setLoadingDetails(false);
    }
  };

  const closeDetails = () => {
    setSelectedDate(null);
    setDetails(null);
  };

  const formatHms = (totalSec) => {
    if (!totalSec) return '00:00:00';
    const h = Math.floor(totalSec / 3600).toString().padStart(2, '0');
    const m = Math.floor((totalSec % 3600) / 60).toString().padStart(2, '0');
    const s = Math.floor(totalSec % 60).toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
  };

  const formatTime = (isoString) => {
    if (!isoString) return '--:--';
    return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      
      {/* Header */}
      <div>
        <h1 style={{ fontSize: '32px', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-1px' }}>
          My Activity
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '15px', marginTop: '4px' }}>
          Historical record of your daily work sessions and time breakdown.
        </p>
      </div>

      {loading ? (
        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading activity logs...</div>
      ) : (
        <div className="glass-panel" style={{ borderRadius: '24px', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)', background: 'rgba(0,0,0,0.02)' }}>
                <th style={{ padding: '16px 24px', textAlign: 'left', fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Date</th>
                <th style={{ padding: '16px 24px', textAlign: 'left', fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>First Entry</th>
                <th style={{ padding: '16px 24px', textAlign: 'left', fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Last Exit</th>
                <th style={{ padding: '16px 24px', textAlign: 'right', fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Gross Hours</th>
                <th style={{ padding: '16px 24px', textAlign: 'right', fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Active Time</th>
                <th style={{ padding: '16px 24px' }}></th>
              </tr>
            </thead>
            <tbody>
              {summaries.map((day, idx) => (
                <tr 
                  key={idx} 
                  style={{ borderBottom: '1px solid var(--border-color)', transition: 'background 0.2s', cursor: 'pointer' }}
                  onClick={() => fetchDetails(day.date)}
                  className="hover-bg-fade"
                >
                  <td style={{ padding: '20px 24px', whiteSpace: 'nowrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(59, 130, 246, 0.1)', color: 'hsl(var(--primary))', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Calendar size={18} />
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>
                          {new Date(day.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                        </div>
                        {day.date === new Date().toISOString().split('T')[0] && (
                          <div style={{ fontSize: '11px', color: '#4ade80', fontWeight: 600, marginTop: '2px' }}>TODAY</div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '20px 24px', color: 'var(--text-main)', fontSize: '14px', fontFamily: 'monospace' }}>
                    {formatTime(day.first_activity)}
                  </td>
                  <td style={{ padding: '20px 24px', color: 'var(--text-main)', fontSize: '14px', fontFamily: 'monospace' }}>
                    {formatTime(day.last_activity)}
                  </td>
                  <td style={{ padding: '20px 24px', textAlign: 'right', color: 'var(--text-main)', fontWeight: 600, fontFamily: 'monospace' }}>
                    {formatHms(day.total_seconds)}
                  </td>
                  <td style={{ padding: '20px 24px', textAlign: 'right', color: '#4ade80', fontWeight: 700, fontFamily: 'monospace' }}>
                    {formatHms(day.breakdown.active)}
                  </td>
                  <td style={{ padding: '20px 24px', textAlign: 'right', color: 'var(--text-muted)' }}>
                    <ChevronRight size={18} />
                  </td>
                </tr>
              ))}
              {summaries.length === 0 && (
                <tr>
                  <td colSpan="6" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    No activity logs found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Details Side Panel / Modal */}
      <AnimatePresence>
        {selectedDate && (
          <>
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              onClick={closeDetails}
              style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000 }}
            />
            <motion.div 
              initial={{ x: '100%', boxShadow: '-20px 0 40px rgba(0,0,0,0)' }} 
              animate={{ x: 0, boxShadow: '-20px 0 40px rgba(0,0,0,0.1)' }} 
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: '100%', maxWidth: '600px', background: 'var(--bg-app)', zIndex: 1001, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
            >
              {/* Drawer Header */}
              <div style={{ padding: '32px 40px', background: 'var(--bg-card)', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                    <div style={{ padding: '6px 12px', borderRadius: '100px', background: 'rgba(59, 130, 246, 0.1)', color: 'hsl(var(--primary))', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Work Session
                    </div>
                  </div>
                  <h2 style={{ fontSize: '28px', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.5px' }}>
                    {new Date(selectedDate).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
                  </h2>
                  <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginTop: '6px' }}>Detailed breakdown of gross metrics and chronological trace</p>
                </div>
                <button 
                  onClick={closeDetails}
                  style={{ background: 'var(--bg-app)', border: '1px solid var(--border-color)', width: '44px', height: '44px', borderRadius: '50%', display: 'flex', justifyContent: 'center', alignItems: 'center', cursor: 'pointer', color: 'var(--text-muted)', transition: '0.2s' }}
                  onMouseEnter={e => e.currentTarget.style.color = 'var(--text-main)'}
                  onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
                >
                  <X size={20} />
                </button>
              </div>

              {/* Drawer Content */}
              <div style={{ padding: '32px', overflowY: 'auto', flex: 1, background: 'var(--bg-app)' }}>
                {loadingDetails || !details ? (
                  <div style={{ textAlign: 'center', color: 'var(--text-muted)', marginTop: '40px' }}>Loading timeline...</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>
                    
                    {/* Metrics Grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '16px' }}>
                      <div style={{ padding: '24px', borderRadius: '16px', background: 'var(--bg-card)', border: '1px solid var(--border-color)', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                          <Clock size={16} style={{ color: 'hsl(var(--primary))' }} />
                          <p style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Gross Time</p>
                        </div>
                        <h4 style={{ fontSize: '28px', fontWeight: 800, color: 'var(--text-main)', fontFamily: 'monospace', letterSpacing: '-0.5px' }}>
                          {formatHms(details.total_seconds)}
                        </h4>
                      </div>
                      
                      <div style={{ padding: '24px', borderRadius: '16px', background: 'var(--bg-card)', border: '1px solid var(--border-color)', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981' }} />
                          <p style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Active Time</p>
                        </div>
                        <h4 style={{ fontSize: '28px', fontWeight: 800, color: 'var(--text-main)', fontFamily: 'monospace', letterSpacing: '-0.5px' }}>
                          {formatHms(details.breakdown.active)}
                        </h4>
                      </div>
                      
                      <div style={{ padding: '24px', borderRadius: '16px', background: 'var(--bg-card)', border: '1px solid var(--border-color)', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#eab308' }} />
                          <p style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>On Call Time</p>
                        </div>
                        <h4 style={{ fontSize: '28px', fontWeight: 800, color: 'var(--text-main)', fontFamily: 'monospace', letterSpacing: '-0.5px' }}>
                          {formatHms(details.breakdown.on_call)}
                        </h4>
                      </div>
                      
                      <div style={{ padding: '24px', borderRadius: '16px', background: 'var(--bg-card)', border: '1px solid var(--border-color)', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ef4444' }} />
                          <p style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Break Time</p>
                        </div>
                        <h4 style={{ fontSize: '28px', fontWeight: 800, color: 'var(--text-main)', fontFamily: 'monospace', letterSpacing: '-0.5px' }}>
                          {formatHms(details.breakdown.break)}
                        </h4>
                      </div>

                      <div style={{ padding: '24px', borderRadius: '16px', background: 'var(--bg-card)', border: '1px solid var(--border-color)', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#9ca3af' }} />
                          <p style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Idle Time</p>
                        </div>
                        <h4 style={{ fontSize: '28px', fontWeight: 800, color: 'var(--text-main)', fontFamily: 'monospace', letterSpacing: '-0.5px' }}>
                          {formatHms(details.breakdown.idle || 0)}
                        </h4>
                      </div>
                    </div>

                    {/* Timeline Trace */}
                    <div>
                      <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-main)', marginBottom: '24px', paddingBottom: '16px', borderBottom: '2px solid var(--border-color)' }}>
                        Chronological Trace
                      </h3>
                      <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: '20px', paddingLeft: '24px' }}>
                        {/* Vertical line connecting timeline dots */}
                        <div style={{ position: 'absolute', top: '16px', bottom: '16px', left: '33px', width: '2px', background: 'var(--border-color)', zIndex: 0 }} />
                        
                        {details.timeline.map((event, i) => {
                          const type = event.activity_type;
                          let icon, color, label;
                          
                          if (type === 'login') { icon = <User size={16} />; color = 'hsl(var(--primary))'; label = 'Clocked In'; }
                          else if (type === 'logout') { icon = <LogOut size={16} />; color = '#6b7280'; label = 'Clocked Out'; }
                          else if (type === 'break_start') { icon = <Coffee size={16} />; color = '#ef4444'; label = 'Status: Break'; }
                          else if (type === 'break_end') { icon = <CheckCircle2 size={16} />; color = '#10b981'; label = 'Status: Active'; }
                          else if (type === 'on_call') { icon = <Phone size={16} />; color = '#eab308'; label = 'Status: On Call'; }
                          else if (type === 'idle') { icon = <Clock size={16} />; color = '#9ca3af'; label = 'Status: Idle'; }
                          else { icon = <Clock size={16} />; color = '#6b7280'; label = `Action: ${type}`; }

                          return (
                            <div key={i} style={{ display: 'flex', gap: '24px', position: 'relative', zIndex: 1, alignItems: 'center' }}>
                              <div style={{ 
                                width: '20px', height: '20px', borderRadius: '50%', background: 'var(--bg-app)', 
                                border: `2px solid ${color}`, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                boxShadow: '0 0 0 4px var(--bg-app)'
                              }}>
                                <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: color }} />
                              </div>
                              <div style={{ flex: 1, padding: '10px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                  <div style={{ color: color, display: 'flex', opacity: 0.9 }}>
                                    {icon}
                                  </div>
                                  <div style={{ fontWeight: 600, fontSize: '15px', color: 'var(--text-main)' }}>{label}</div>
                                </div>
                                <div style={{ color: 'var(--text-muted)', fontSize: '13px', fontWeight: 600, fontFamily: 'monospace', letterSpacing: '0.5px' }}>
                                  {formatTime(event.created_at)}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ActivityLogs;
