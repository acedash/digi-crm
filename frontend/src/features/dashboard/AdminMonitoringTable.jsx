import React, { useState, useEffect } from 'react';
import { RefreshCw, ShieldCheck, Users, Activity, Coffee, Clock } from 'lucide-react';
import Card from '../../components/ui/Card';
import dashboardService from './dashboardService';
import { motion, AnimatePresence } from 'framer-motion';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import ExportDropdown from '../../components/ui/ExportDropdown';
import { FileText, FileSpreadsheet } from 'lucide-react';

const AdminMonitoringTable = ({ onSummaryChange, period, startDate, endDate }) => {
  const [supervisors, setSupervisors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const tableRef = React.useRef(null);

  const fetchActivity = async () => {
    try {
      setLoading(true);
      const res = await dashboardService.getAdminMonitor(period, startDate, endDate);
      if (res.data?.success) {
        const data = res.data.data;
        setSupervisors(data);
        if (onSummaryChange) {
          onSummaryChange({
            supervisors: data.length,
            active: data.reduce((acc, sup) => acc + (sup.active_agents || 0), 0),
            break: data.reduce((acc, sup) => acc + (sup.on_break || 0), 0)
          });
        }
      }
    } catch (error) {
      console.error('Failed to fetch admin monitor:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActivity();
    if (period === 'live' || period === 'daily') {
      const interval = setInterval(fetchActivity, 300000); // Every 5 minutes for current day
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
    if (!content || supervisors.length === 0) return;

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

      pdf.save(`Admin_Monitoring_${period}.pdf`);

    } catch (err) {
      console.error('PDF Export failed:', err);
      content.style.cssText = originalCssText;
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportCSV = () => {
    const csvContent = "data:text/csv;charset=utf-8," 
      + "Supervisor,Login Time,Total Agents,Active,On Break\n"
      + supervisors.map(s => `${s.supervisor_name},${s.login_time},${s.total_agents},${s.active_agents},${s.on_break}`).join("\n");
    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csvContent));
    link.setAttribute("download", `monitoring_${period}_${new Date().getTime()}.csv`);
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
        <div style={{ minWidth: '200px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-main)' }}>
            <ShieldCheck size={20} style={{ color: '#8b5cf6' }} />
            Admin Monitoring
          </h3>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>
            {period === 'live' ? 'Real-time overview of current activity.' : `Summary of activity for the selected ${period} period.`}
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
              <th style={{ padding: '16px 24px', color: 'var(--text-muted)', fontWeight: 700, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Supervisor</th>
              <th style={{ padding: '16px 24px', color: 'var(--text-muted)', fontWeight: 700, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Login Time</th>
              <th style={{ padding: '16px 24px', color: 'var(--text-muted)', fontWeight: 700, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Agents</th>
              <th style={{ padding: '16px 24px', color: 'var(--text-muted)', fontWeight: 700, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Active</th>
              <th style={{ padding: '16px 24px', color: 'var(--text-muted)', fontWeight: 700, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>On Break</th>
            </tr>
          </thead>
          <tbody>
            <AnimatePresence>
              {supervisors.length === 0 ? (
                <tr>
                  <td colSpan="5" style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    {loading ? 'Compiling hierarchy...' : 'No supervisors found.'}
                  </td>
                </tr>
              ) : (
                supervisors.map((sup, idx) => (
                  <motion.tr 
                    key={sup.id} 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    style={{ borderBottom: '1px solid var(--border-color)' }} 
                    className="hover-brighten"
                  >
                    <td style={{ padding: '16px 24px', fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(139, 92, 246, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(139, 92, 246, 0.2)', fontSize: '12px', fontWeight: 800, color: '#8b5cf6' }}>
                        {sup.supervisor_name.charAt(0)}
                      </div>
                      {sup.supervisor_name}
                    </td>
                    <td style={{ padding: '16px 24px', fontFamily: 'monospace', fontWeight: 600, color: 'var(--text-muted)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Clock size={14} style={{ color: 'var(--text-muted)', opacity: 0.7 }} /> 
                        {sup.login_time || '--'}
                      </div>
                    </td>
                    <td style={{ padding: '16px 24px', fontWeight: 600 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ background: 'rgba(255,255,255,0.05)', padding: '6px', borderRadius: '6px' }}>
                          <Users size={14} style={{ color: 'var(--text-main)' }} />
                        </div>
                        {sup.total_agents}
                      </div>
                    </td>
                    <td style={{ padding: '16px 24px', fontWeight: 600, color: '#10b981' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '6px', borderRadius: '6px' }}>
                          <Activity size={14} style={{ color: '#10b981' }} />
                        </div>
                        {sup.active_agents}
                      </div>
                    </td>
                    <td style={{ padding: '16px 24px', fontWeight: 600, color: '#f59e0b' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ background: 'rgba(245, 158, 11, 0.1)', padding: '6px', borderRadius: '6px' }}>
                          <Coffee size={14} style={{ color: '#f59e0b' }} />
                        </div>
                        {sup.on_break}
                      </div>
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

export default React.memo(AdminMonitoringTable);
