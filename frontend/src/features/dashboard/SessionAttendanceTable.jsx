import React, { useState, useEffect } from 'react';
import { Clock, Coffee, RefreshCw, UserCheck, LogOut, Calendar } from 'lucide-react';
import Card from '../../components/ui/Card';
import dashboardService from './dashboardService';
import { motion, AnimatePresence } from 'framer-motion';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import ExportDropdown from '../../components/ui/ExportDropdown';
import { FileText, FileSpreadsheet } from 'lucide-react';

const SessionAttendanceTable = ({ period, startDate, endDate }) => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const tableRef = React.useRef(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await dashboardService.getAgentMonitor(period, startDate, endDate);
      if (res.data?.success) {
        setData(res.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch attendance data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExportPDF = async () => {
    const content = tableRef.current;
    if (!content || data.length === 0) return;

    const originalCssText = content.style.cssText;

    try {
      setIsExporting(true);
      content.style.cssText += '; width: 1000px !important; max-width: none !important; background: #ffffff !important; padding: 20px !important;';

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

      const pdf = new jsPDF('p', 'mm', 'a4');
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

      pdf.save(`Attendance_Logs_${period}_${new Date().toISOString().split('T')[0]}.pdf`);

    } catch (err) {
      console.error('PDF Export failed:', err);
      content.style.cssText = originalCssText;
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportCSV = () => {
    const csvContent = "data:text/csv;charset=utf-8," 
      + "Agent,First Login,Last Logout,Total Break,Work Duration,Status\n"
      + data.map(a => `${a.agent_name},${a.login_time || '--'},${a.logout_time || '--'},${a.break_time || '0m'},${a.total_login_time || '0h'},${a.status}`).join("\n");
    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csvContent));
    link.setAttribute("download", `attendance_${period}_${new Date().getTime()}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  useEffect(() => {
    fetchData();
    if (period === 'live' || period === 'daily') {
      const interval = setInterval(fetchData, 60000);
      return () => clearInterval(interval);
    }
  }, [period, startDate, endDate]);

  return (
    <Card style={{ padding: '0', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
      <div ref={tableRef}>
      <div style={{ padding: '24px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h3 style={{ fontSize: '18px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-main)' }}>
            <Clock size={20} style={{ color: '#06B68A' }} />
            Session & Attendance Logs
          </h3>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>
            Detailed login, logout, and break durations for the selected period.
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }} className="hide-on-print">
          <ExportDropdown 
            isExporting={isExporting}
            options={[
              { label: 'Export as PDF', icon: FileText, onClick: handleExportPDF },
              { label: 'Export as CSV', icon: FileSpreadsheet, onClick: handleExportCSV }
            ]}
          />
          <button 
            onClick={fetchData}
            style={{ 
              background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: 'var(--text-main)', cursor: 'pointer',
              padding: '8px 12px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 700
            }}
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
          <thead>
            <tr style={{ background: 'var(--bg-card)', borderBottom: '1px solid var(--border-color)' }}>
              <th style={{ padding: '16px 24px', color: 'var(--text-muted)', fontWeight: 700, fontSize: '12px', textTransform: 'uppercase' }}>Agent</th>
              <th style={{ padding: '16px 24px', color: 'var(--text-muted)', fontWeight: 700, fontSize: '12px', textTransform: 'uppercase' }}>First Login</th>
              <th style={{ padding: '16px 24px', color: 'var(--text-muted)', fontWeight: 700, fontSize: '12px', textTransform: 'uppercase' }}>Last Logout</th>
              <th style={{ padding: '16px 24px', color: 'var(--text-muted)', fontWeight: 700, fontSize: '12px', textTransform: 'uppercase' }}>Total Break</th>
              <th style={{ padding: '16px 24px', color: 'var(--text-muted)', fontWeight: 700, fontSize: '12px', textTransform: 'uppercase' }}>Work Duration</th>
              <th style={{ padding: '16px 24px', color: 'var(--text-muted)', fontWeight: 700, fontSize: '12px', textTransform: 'uppercase' }}>Status</th>
            </tr>
          </thead>
          <tbody>
            <AnimatePresence>
              {data.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    {loading ? 'Fetching logs...' : 'No activity logs found.'}
                  </td>
                </tr>
              ) : (
                data.map((agent, idx) => (
                  <motion.tr 
                    key={agent.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    style={{ borderBottom: '1px solid var(--border-color)' }}
                  >
                    <td style={{ padding: '16px 24px', fontWeight: 700, color: 'var(--text-main)' }}>
                      {agent.agent_name}
                    </td>
                    <td style={{ padding: '16px 24px', fontFamily: 'monospace' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#10b981' }}>
                        <UserCheck size={14} />
                        {agent.login_time || '--'}
                      </div>
                    </td>
                    <td style={{ padding: '16px 24px', fontFamily: 'monospace' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#f87171' }}>
                        <LogOut size={14} />
                        {agent.logout_time || '--'}
                      </div>
                    </td>
                    <td style={{ padding: '16px 24px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#f59e0b' }}>
                        <Coffee size={14} />
                        {agent.break_time || '0m'}
                      </div>
                    </td>
                    <td style={{ padding: '16px 24px', fontWeight: 700 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-main)' }}>
                        <Calendar size={14} style={{ opacity: 0.5 }} />
                        {agent.total_login_time || '0h'}
                      </div>
                    </td>
                    <td style={{ padding: '16px 24px' }}>
                       <span style={{ 
                         padding: '4px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 800,
                         background: agent.status === 'offline' ? 'rgba(148, 163, 184, 0.1)' : 'rgba(34, 197, 94, 0.1)',
                         color: agent.status === 'offline' ? '#94a3b8' : '#22c55e',
                         textTransform: 'uppercase'
                       }}>
                         {agent.status}
                       </span>
                    </td>
                  </motion.tr>
                ))
              )}
            </AnimatePresence>
          </tbody>
        </table>
      </div>
      </div>
    </Card>
  );
};

export default SessionAttendanceTable;
