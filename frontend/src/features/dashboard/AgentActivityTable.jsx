import React, { useState, useEffect } from 'react';
import { RefreshCw, Users, Clock, Phone, Coffee, CircleDollarSign } from 'lucide-react';
import Card from '../../components/ui/Card';
import dashboardService from './dashboardService';
import { motion, AnimatePresence } from 'framer-motion';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import ExportDropdown from '../../components/ui/ExportDropdown';
import { FileText, FileSpreadsheet } from 'lucide-react';

const AgentActivityTable = ({ onViewReport, period, startDate, endDate, onSummaryChange }) => {
  const MotionTr = motion.tr;
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const tableRef = React.useRef(null);

  const fetchActivity = async () => {
    try {
      setLoading(true);
      const res = await dashboardService.getAgentMonitor(period, startDate, endDate);
      if (res.data?.success) {
        const loadedAgents = res.data.data;
        setAgents(loadedAgents);
        
        if (onSummaryChange) {
          const active = loadedAgents.filter(a => ['active', 'on call', 'idle'].includes(a.status?.toLowerCase())).length;
          const onBreak = loadedAgents.filter(a => a.status?.toLowerCase() === 'break').length;
          onSummaryChange({
            supervisors: 0,
            supActive: 0,
            supBreak: 0,
            active,
            break: onBreak
          });
        }
      }
    } catch (error) {
      console.error('Failed to fetch agent activity:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActivity();
    if (period === 'live' || period === 'daily') {
      const interval = setInterval(fetchActivity, 60000); // refresh every minute for current day
      return () => clearInterval(interval);
    }
  }, [period, startDate, endDate]);

  const periods = [
    { id: 'daily', label: 'Daily' },
    { id: 'weekly', label: 'Weekly' },
    { id: 'monthly', label: 'Monthly' },
    { id: 'custom', label: 'Custom' }
  ];


  const handleExportPDF = async () => {
    const content = tableRef.current;
    if (!content || agents.length === 0) return;

    const originalCssText = content.style.cssText;

    try {
      setIsExporting(true);
      content.style.cssText += '; width: 1200px !important; max-width: none !important; background: #ffffff !important; padding: 20px !important;';

      await new Promise(r => setTimeout(r, 200));

      const sections = Array.from(content.querySelectorAll('tr'));
      const contentRect = content.getBoundingClientRect();

      const fullCanvas = await html2canvas(content, {
        useCORS: true,
        scale: 2,
        backgroundColor: '#ffffff',
        onclone: (clonedDoc) => {
          const style = clonedDoc.createElement('style');
          style.innerHTML = `
            :root {
              --bg-card: #ffffff !important;
              --bg-app: #ffffff !important;
              --text-main: #000000 !important;
              --text-muted: #262626 !important;
              --border-color: #cccccc !important;
            }
            * { color: #000000 !important; opacity: 1 !important; transition: none !important; }
            .hide-on-print { display: none !important; }
            ::-webkit-scrollbar { display: none !important; }
          `;
          clonedDoc.head.appendChild(style);
        }
      });

      const imgWidth = fullCanvas.width;
      const imgHeight = fullCanvas.height;
      const scaleFactor = imgHeight / content.offsetHeight;
      
      const breakPoints = sections.map(s => {
        const rect = s.getBoundingClientRect();
        return (rect.top - contentRect.top) * scaleFactor - 8;
      }).filter(bp => bp > 0);
      
      breakPoints.push(imgHeight);
      breakPoints.sort((a, b) => a - b);

      content.style.cssText = originalCssText;

      const pdf = new jsPDF('l', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const margin = 10;
      const contentWidth = pdfWidth - (margin * 2);

      const pxPerMm = imgWidth / contentWidth;
      const pageHeightPx = (pdfHeight - (margin * 2)) * pxPerMm;

      let currentY = 0;
      let pageNum = 1;

      while (currentY < imgHeight - 10) {
        if (pageNum > 1) pdf.addPage();
        
        let targetCutY = currentY + pageHeightPx;
        let actualCutY = targetCutY;
        
        const possibleBreaks = breakPoints.filter(bp => bp > currentY + 150 && bp <= targetCutY);
        if (possibleBreaks.length > 0) {
          actualCutY = possibleBreaks[possibleBreaks.length - 1];
        }
        
        if (imgHeight - currentY <= pageHeightPx) {
          actualCutY = imgHeight;
        }

        const sliceHeight = actualCutY - currentY;
        if (sliceHeight <= 0) break;

        const sliceCanvas = document.createElement('canvas');
        sliceCanvas.width = imgWidth;
        sliceCanvas.height = sliceHeight;
        const ctx = sliceCanvas.getContext('2d');
        ctx.drawImage(fullCanvas, 0, currentY, imgWidth, sliceHeight, 0, 0, imgWidth, sliceHeight);
        
        const pageImgData = sliceCanvas.toDataURL('image/jpeg', 0.95);
        const displayHeight = (sliceHeight * contentWidth) / imgWidth;
        
        pdf.addImage(pageImgData, 'JPEG', margin, margin, contentWidth, displayHeight);
        
        currentY = actualCutY;
        pageNum++;
      }

      pdf.save(`Agent_Activity_${period}.pdf`);

    } catch (err) {
      console.error('PDF Export failed:', err);
      content.style.cssText = originalCssText;
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportCSV = () => {
    const csvContent = "data:text/csv;charset=utf-8," 
      + "Agent,Calls Picked,Bookings Created,Revenue,Break Time,Total Hours\n"
      + agents.map(a => `${a.agent_name},${a.calls_picked},${a.bookings_created},${a.daily_revenue || 0},${a.break_time},${a.total_login_time}`).join("\n");
    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csvContent));
    link.setAttribute("download", `team_activity_${period}_${new Date().getTime()}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  return (
    <Card style={{ padding: '0', overflow: 'hidden', marginTop: '32px', border: '1px solid var(--border-color)' }}>
      <div ref={tableRef}>
        <div style={{ 
        padding: '24px', 
        borderBottom: '1px solid var(--border-color)', 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        flexWrap: 'wrap',
        gap: '20px'
      }}>
        <div style={{ minWidth: '220px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-main)' }}>
            Live Team Activity
          </h3>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>
            {period === 'live' ? 'Track agent status in real time.' : `Performance summary for the selected ${period} period.`}
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>

          <div style={{ color: 'var(--border-color)' }}>|</div>

          <div style={{ display: 'flex', gap: '8px' }} className="hide-on-print">
            <ExportDropdown 
              isExporting={isExporting}
              options={[
                { label: 'Export as PDF', icon: FileText, onClick: handleExportPDF },
                { label: 'Export as CSV', icon: FileSpreadsheet, onClick: handleExportCSV }
              ]}
            />
            <button 
              onClick={fetchActivity}
              style={{ 
                background: 'var(--bg-card)', border: '1px solid var(--border-color)', color: 'var(--text-main)', cursor: 'pointer',
                padding: '8px 12px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 700,
                transition: 'all 0.2s'
              }}
              className="hover:brightness-110"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
          <thead>
            <tr style={{ background: 'var(--bg-card)', borderBottom: '1px solid var(--border-color)' }}>
              <th style={{ padding: '16px 24px', color: 'var(--text-muted)', fontWeight: 700, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Agent</th>
              <th style={{ padding: '16px 24px', color: 'var(--text-muted)', fontWeight: 700, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Calls Picked</th>
              <th style={{ padding: '16px 24px', color: 'var(--text-muted)', fontWeight: 700, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Bookings Created</th>
              <th style={{ padding: '16px 24px', color: 'var(--text-muted)', fontWeight: 700, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                {period === 'live' || period === 'daily' ? 'Daily' : period === 'custom' ? 'Period' : period} Revenue
              </th>
              <th style={{ padding: '16px 24px', color: 'var(--text-muted)', fontWeight: 700, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Break Time</th>
              <th style={{ padding: '16px 24px', color: 'var(--text-muted)', fontWeight: 700, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Hours</th>
              <th style={{ padding: '16px 24px', color: 'var(--text-muted)', fontWeight: 700, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px', textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            <AnimatePresence>
              {agents.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    {loading ? 'Initializing telemetry...' : 'No agents assigned or active.'}
                  </td>
                </tr>
              ) : (
                agents.map((agent, idx) => {
                  return (
                    <MotionTr 
                      key={agent.id || `agent-${idx}`} 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      style={{ borderBottom: '1px solid var(--border-color)' }} 
                      className="hover-brighten"
                    >
                      <td style={{ padding: '16px 24px', fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--bg-card)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--border-color)', fontSize: '12px', fontWeight: 800, color: '#06B68A' }}>
                          {agent.agent_name.charAt(0)}
                        </div>
                        {agent.agent_name}
                      </td>
                      <td style={{ padding: '16px 24px', fontWeight: 600, color: 'var(--text-main)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{ background: 'rgba(255,255,255,0.05)', padding: '6px', borderRadius: '6px' }}>
                            <Phone size={14} style={{ color: '#4ade80' }} />
                          </div>
                          {agent.calls_picked}
                        </div>
                      </td>
                      <td style={{ padding: '16px 24px', fontWeight: 600, color: 'var(--text-main)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{ background: 'rgba(255,255,255,0.05)', padding: '6px', borderRadius: '6px' }}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#a855f7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/></svg>
                          </div>
                          {agent.bookings_created}
                        </div>
                      </td>
                      <td style={{ padding: '16px 24px', fontWeight: 700, color: '#22c55e' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{ background: 'rgba(34, 197, 94, 0.1)', padding: '6px', borderRadius: '6px' }}>
                            <CircleDollarSign size={14} style={{ color: '#22c55e' }} />
                          </div>
                          {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(Number(agent.daily_revenue) || 0)}
                        </div>
                      </td>
                      <td style={{ padding: '16px 24px', fontWeight: 600 }}>
                        {agent.break_time !== '--' ? (
                          <div style={{ 
                            display: 'inline-flex', alignItems: 'center', gap: '6px',
                            background: 'rgba(245, 158, 11, 0.08)', color: '#f59e0b',
                            padding: '4px 8px', borderRadius: '6px', fontSize: '12px', fontWeight: 700
                          }}>
                            <Coffee size={12} />
                            {agent.break_time}
                          </div>
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>--</span>
                        )}
                      </td>
                      <td style={{ padding: '16px 24px', fontWeight: 700, color: 'var(--text-main)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{ background: 'rgba(96, 165, 250, 0.1)', padding: '6px', borderRadius: '6px' }}>
                            <Clock size={14} style={{ color: '#60a5fa' }} />
                          </div>
                          {agent.total_login_time || '--'}
                        </div>
                      </td>
                      <td style={{ padding: '16px 24px', textAlign: 'right' }}>
                        <button
                          onClick={() => onViewReport && onViewReport(agent.id, period, startDate, endDate)}
                          style={{ 
                            background: 'rgba(96, 165, 250, 0.1)', 
                            border: '1px solid rgba(96, 165, 250, 0.2)', 
                            color: '#06B68A', 
                            padding: '6px 12px', 
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontSize: '11px',
                            fontWeight: 800,
                            textTransform: 'uppercase',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            transition: 'all 0.2s'
                          }}
                          className="hover:scale-105 hide-on-print"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
                          Report
                        </button>
                      </td>
                    </MotionTr>
                  );
                })
              )}
            </AnimatePresence>
          </tbody>
        </table>
      </div>
      </div>
    </Card>
  );
};

export default React.memo(AgentActivityTable);
