import React, { useEffect, useState } from 'react';
import { Clock, Calendar, ChevronRight, X, User, Phone, Coffee, CheckCircle2, LogOut } from 'lucide-react';
import activityService from './activityService';
import { useAuthStore } from '../auth/useAuthStore';

const TODAY = new Date().toISOString().split('T')[0];

const ActivityLogs = () => {
  const { user } = useAuthStore();
  const activeRole = typeof user?.roles?.[0] === 'object' ? user.roles[0].name : user?.roles?.[0];
  const isAdmin = activeRole === 'admin';
  const isSupervisor = activeRole === 'supervisor';
  const isManagerView = isAdmin || isSupervisor;
  const managerTitle = isAdmin ? 'Activity Center' : 'Team Activity';
  const managerSubtitle = isAdmin
    ? 'User-wise activity for the selected date.'
    : 'Your activity and your team activity for the selected date.';

  const [summaries, setSummaries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(TODAY);
  const [details, setDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [selectedUserActivity, setSelectedUserActivity] = useState(null);

  useEffect(() => {
    if (isManagerView) {
      fetchAdminDetails(TODAY);
      return;
    }

    fetchSummaries();
  }, [isManagerView]);

  const fetchSummaries = async () => {
    try {
      setLoading(true);
      const res = await activityService.getDailySummary();
      setSummaries(res.data.data);
    } catch (error) {
      console.error('Failed to fetch activity summaries', error);
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
    } catch (error) {
      console.error('Failed to fetch daily details', error);
    } finally {
      setLoadingDetails(false);
    }
  };

  const fetchAdminDetails = async (date) => {
    try {
      setLoading(true);
      setSelectedDate(date);
      setSelectedUserActivity(null);
      const res = await activityService.getDailyDetails(date);
      setDetails(res.data.data);
    } catch (error) {
      console.error('Failed to fetch admin activity details', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAdminUserDetails = async (userId) => {
    try {
      setLoadingDetails(true);
      const res = await activityService.getDailyDetails(selectedDate, { user_id: userId });
      setSelectedUserActivity(res.data.data);
    } catch (error) {
      console.error('Failed to fetch selected user activity details', error);
    } finally {
      setLoadingDetails(false);
    }
  };

  const closeDetails = () => {
    setDetails(null);
  };

  const closeAdminUserDetails = () => {
    setSelectedUserActivity(null);
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

  const formatDateLabel = (date) => {
    return new Date(date).toLocaleDateString(undefined, {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getEventMeta = (type) => {
    if (type === 'login') return { icon: <User size={14} />, color: 'hsl(var(--primary))', label: 'Clocked In' };
    if (type === 'logout') return { icon: <LogOut size={14} />, color: '#6b7280', label: 'Clocked Out' };
    if (type === 'break_start') return { icon: <Coffee size={14} />, color: '#ef4444', label: 'Break Started' };
    if (type === 'break_end') return { icon: <CheckCircle2 size={14} />, color: '#10b981', label: 'Returned Active' };
    if (type === 'on_call') return { icon: <Phone size={14} />, color: '#eab308', label: 'On Call' };
    if (type === 'idle') return { icon: <Clock size={14} />, color: '#9ca3af', label: 'Idle' };
    return { icon: <Clock size={14} />, color: '#6b7280', label: type };
  };

  if (isManagerView) {
    const userDetails = details?.users || [];

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: '20px', flexWrap: 'wrap' }}>
          <div>
            <h1 style={{ fontSize: '30px', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.8px' }}>
              {managerTitle}
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginTop: '4px' }}>
              {managerSubtitle}
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <label style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Date</label>
            <input
              type="date"
              className="crm-input"
              value={selectedDate}
              onChange={(event) => fetchAdminDetails(event.target.value)}
              style={{
                padding: '9px 12px',
                borderRadius: '12px',
                border: '1px solid var(--border-color)',
                background: 'var(--bg-card)',
                color: 'var(--text-main)',
              }}
            />
          </div>
        </div>

        <div className="glass-panel" style={{ borderRadius: '20px', padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', marginBottom: '16px', paddingBottom: '14px', borderBottom: '1px solid var(--border-color)' }}>
            <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>{formatDateLabel(selectedDate)}</div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{selectedDate === TODAY ? 'Today' : 'Selected date'}</div>
          </div>

          {loading ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading activity logs...</div>
          ) : userDetails.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>No activity found for this date.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {userDetails.map((item) => (
                <div
                  key={item.user?.id}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1.2fr repeat(3, 0.6fr) auto',
                    gap: '16px',
                    alignItems: 'center',
                    padding: '16px 4px',
                    borderBottom: '1px solid var(--border-color)',
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: '17px', fontWeight: 700, color: 'var(--text-main)' }}>{item.user?.name || 'Unknown User'}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '3px' }}>{item.user?.email || 'No email'}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>First</div>
                    <div style={{ fontWeight: 600, color: 'var(--text-main)', marginTop: '4px' }}>{formatTime(item.first_activity)}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Last</div>
                    <div style={{ fontWeight: 600, color: 'var(--text-main)', marginTop: '4px' }}>{formatTime(item.last_activity)}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Active</div>
                    <div style={{ fontWeight: 700, color: '#10b981', marginTop: '4px' }}>{formatHms(item.breakdown?.active)}</div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <button
                      onClick={() => fetchAdminUserDetails(item.user?.id)}
                      style={{
                        padding: '8px 12px',
                        borderRadius: '10px',
                        border: '1px solid var(--border-color)',
                        background: 'transparent',
                        color: 'var(--text-main)',
                        cursor: 'pointer',
                        fontWeight: 600,
                        fontSize: '13px',
                      }}
                    >
                      View
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {selectedUserActivity && (
          <>
            <div
              onClick={closeAdminUserDetails}
              style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 1000 }}
            />
            <div
              style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: '100%', maxWidth: '520px', background: 'var(--bg-app)', zIndex: 1001, display: 'flex', flexDirection: 'column', overflow: 'hidden', borderLeft: '1px solid var(--border-color)' }}
            >
              <div style={{ padding: '24px 28px', background: 'var(--bg-card)', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <h2 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.4px' }}>
                    {selectedUserActivity.user?.name || 'User Activity'}
                  </h2>
                  <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '6px' }}>
                    {formatDateLabel(selectedDate)}
                  </p>
                </div>
                <button
                  onClick={closeAdminUserDetails}
                  style={{ background: 'transparent', border: '1px solid var(--border-color)', width: '40px', height: '40px', borderRadius: '50%', display: 'flex', justifyContent: 'center', alignItems: 'center', cursor: 'pointer', color: 'var(--text-muted)' }}
                >
                  <X size={18} />
                </button>
              </div>

              <div style={{ padding: '24px 28px', overflowY: 'auto', flex: 1, background: 'var(--bg-app)' }}>
                {loadingDetails ? (
                  <div style={{ textAlign: 'center', color: 'var(--text-muted)', marginTop: '40px' }}>Loading timeline...</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(120px, 1fr))', gap: '10px' }}>
                      <div style={{ padding: '12px 14px', borderRadius: '12px', background: 'var(--bg-card)' }}>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Active</div>
                        <div style={{ fontSize: '18px', fontWeight: 800, color: '#10b981', marginTop: '6px' }}>{formatHms(selectedUserActivity.breakdown?.active)}</div>
                      </div>
                      <div style={{ padding: '12px 14px', borderRadius: '12px', background: 'var(--bg-card)' }}>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>On Call</div>
                        <div style={{ fontSize: '18px', fontWeight: 800, color: '#eab308', marginTop: '6px' }}>{formatHms(selectedUserActivity.breakdown?.on_call)}</div>
                      </div>
                      <div style={{ padding: '12px 14px', borderRadius: '12px', background: 'var(--bg-card)' }}>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Break</div>
                        <div style={{ fontSize: '18px', fontWeight: 800, color: '#ef4444', marginTop: '6px' }}>{formatHms(selectedUserActivity.breakdown?.break)}</div>
                      </div>
                      <div style={{ padding: '12px 14px', borderRadius: '12px', background: 'var(--bg-card)' }}>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Idle</div>
                        <div style={{ fontSize: '18px', fontWeight: 800, color: '#9ca3af', marginTop: '6px' }}>{formatHms(selectedUserActivity.breakdown?.idle)}</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {selectedUserActivity.timeline?.map((event) => {
                        const meta = getEventMeta(event.activity_type);
                        return (
                          <div
                            key={event.id}
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                            gap: '12px',
                            padding: '12px 14px',
                            borderRadius: '14px',
                            background: 'var(--bg-card)',
                            border: '1px solid var(--border-color)',
                          }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: meta.color }}>
                              {meta.icon}
                              <span style={{ color: 'var(--text-main)', fontWeight: 600 }}>{meta.label}</span>
                            </div>
                            <div style={{ fontSize: '13px', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                              {formatTime(event.created_at)}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
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
              {summaries.map((day, index) => (
                <tr
                  key={index}
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
                        {day.date === TODAY && (
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

      {details && !isManagerView && (
        <>
          <div
            onClick={closeDetails}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000 }}
          />
          <div
            style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: '100%', maxWidth: '600px', background: 'var(--bg-app)', zIndex: 1001, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
          >
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
                style={{ background: 'var(--bg-app)', border: '1px solid var(--border-color)', width: '44px', height: '44px', borderRadius: '50%', display: 'flex', justifyContent: 'center', alignItems: 'center', cursor: 'pointer', color: 'var(--text-muted)' }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ padding: '32px', overflowY: 'auto', flex: 1, background: 'var(--bg-app)' }}>
              {loadingDetails ? (
                <div style={{ textAlign: 'center', color: 'var(--text-muted)', marginTop: '40px' }}>Loading timeline...</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '16px' }}>
                    <div style={{ padding: '24px', borderRadius: '16px', background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
                      <p style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Gross Time</p>
                      <h4 style={{ fontSize: '28px', fontWeight: 800, color: 'var(--text-main)', fontFamily: 'monospace', letterSpacing: '-0.5px', marginTop: '12px' }}>
                        {formatHms(details.total_seconds)}
                      </h4>
                    </div>
                    <div style={{ padding: '24px', borderRadius: '16px', background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
                      <p style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Active Time</p>
                      <h4 style={{ fontSize: '28px', fontWeight: 800, color: 'var(--text-main)', fontFamily: 'monospace', letterSpacing: '-0.5px', marginTop: '12px' }}>
                        {formatHms(details.breakdown.active)}
                      </h4>
                    </div>
                    <div style={{ padding: '24px', borderRadius: '16px', background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
                      <p style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>On Call Time</p>
                      <h4 style={{ fontSize: '28px', fontWeight: 800, color: 'var(--text-main)', fontFamily: 'monospace', letterSpacing: '-0.5px', marginTop: '12px' }}>
                        {formatHms(details.breakdown.on_call)}
                      </h4>
                    </div>
                    <div style={{ padding: '24px', borderRadius: '16px', background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
                      <p style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Break Time</p>
                      <h4 style={{ fontSize: '28px', fontWeight: 800, color: 'var(--text-main)', fontFamily: 'monospace', letterSpacing: '-0.5px', marginTop: '12px' }}>
                        {formatHms(details.breakdown.break)}
                      </h4>
                    </div>
                  </div>

                  <div>
                    <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-main)', marginBottom: '24px', paddingBottom: '16px', borderBottom: '2px solid var(--border-color)' }}>
                      Chronological Trace
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {details.timeline.map((event) => {
                        const meta = getEventMeta(event.activity_type);
                        return (
                          <div key={event.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', padding: '12px 14px', borderRadius: '14px', background: 'var(--bg-card)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: meta.color }}>
                              {meta.icon}
                              <span style={{ color: 'var(--text-main)', fontWeight: 600 }}>{meta.label}</span>
                            </div>
                            <div style={{ color: 'var(--text-muted)', fontSize: '13px', fontWeight: 600, fontFamily: 'monospace' }}>
                              {formatTime(event.created_at)}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ActivityLogs;
