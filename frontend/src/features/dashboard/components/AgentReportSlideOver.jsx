import React, { useEffect, useState, useRef } from 'react';
import { 
  X, 
  TrendingUp, 
  CircleDollarSign, 
  ClipboardList, 
  PhoneCall, 
  Clock, 
  ChevronRight,
  TrendingDown,
  Info,
  RefreshCw,
  Download,
  FileText,
  FileSpreadsheet,
  FileJson,
  Calendar as CalendarIcon
} from 'lucide-react';
import ExportDropdown from '../../../components/ui/ExportDropdown';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import Card from '../../../components/ui/Card';
import Input from '../../../components/ui/Input';
import dashboardService from '../dashboardService';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

const COLORS = ['#06B68A', '#06B68A', '#f59e0b', '#8b5cf6', '#ef4444', '#94a3b8'];

const AgentReportSlideOver = ({ isOpen, onClose, agentId, initialPeriod = 'daily', initialStart = null, initialEnd = null }) => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [reportPeriod, setReportPeriod] = useState(initialPeriod);
  const [reportStart, setReportStart] = useState(initialStart);
  const [reportEnd, setReportEnd] = useState(initialEnd);
  
  const [isExporting, setIsExporting] = useState(false);
  const reportContentRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setReportPeriod(initialPeriod);
      setReportStart(initialStart);
      setReportEnd(initialEnd);
    }
  }, [isOpen, initialPeriod, initialStart, initialEnd]);

  useEffect(() => {
    if (isOpen && agentId) {
      fetchReport();
    }
  }, [isOpen, agentId, reportPeriod, reportStart, reportEnd]);

  const fetchReport = async () => {
    setLoading(true);
    try {
      const res = await dashboardService.getAgentReport(agentId, reportPeriod, reportStart, reportEnd);
      if (res.data?.success) {
        setData(res.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch agent report:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = () => {
    if (!data) return;

    const headers = ["Metric", "Value"];
    const statsRows = [
      ["Agent Name", data.agent?.name],
      ["Period", reportPeriod],
      ["Total Revenue", data.stats.total_revenue],
      ["Total Bookings", data.stats.total_bookings],
      ["Daily Revenue", data.stats.daily_revenue],
      ["Total Calls", data.stats.total_calls],
      ["", ""], // Spacer
      ["Recent Call Logs", ""],
      ["Client", "Outcome", "Date", "Inquiry"]
    ];

    const callRows = data.recent_calls.map(call => [
      call.client?.name || 'Unknown',
      call.customer_outcome || 'N/A',
      new Date(call.created_at).toLocaleString(),
      call.airline_inquiry || 'N/A'
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + statsRows.map(e => e.join(",")).join("\n") 
      + "\n" 
      + callRows.map(e => e.join(",")).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `report_${data.agent?.name}_${reportPeriod}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const handleExportJSON = () => {
    if (!data) return;
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(data, null, 2));
    const dt = document.createElement('a');
    dt.setAttribute("href", dataStr);
    dt.setAttribute("download", `report_${data.agent?.name}_${reportPeriod}.json`);
    document.body.appendChild(dt);
    dt.click();
    document.body.removeChild(dt);
  };

  const handleExportPDF = async () => {
    const content = reportContentRef.current;
    if (!content) return;

    const originalCssText = content.style.cssText;

    try {
      setIsExporting(true);

      // 1. Synchronize Layouts & Break out of modal scroll
      content.style.cssText += '; position: absolute !important; top: 0 !important; left: 0 !important; width: 1200px !important; height: auto !important; overflow: visible !important; background: #ffffff !important; padding: 40px !important; z-index: 9999 !important;';

      // Give browser time to reflow layout and Recharts ResizeObserver to fire
      await new Promise(r => setTimeout(r, 200));

      const contentRect = content.getBoundingClientRect();
      const sections = Array.from(content.querySelectorAll('.glass-panel, .print-card, h3, .page-break-avoid'));

      // 2. Capture Canvas
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
            button, .hide-on-print { display: none !important; }
            .show-only-on-print { display: block !important; }
            .recharts-text { fill: #000000 !important; }
            .recharts-cartesian-grid-horizontal line, .recharts-cartesian-grid-vertical line { stroke: #cccccc !important; }
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

      pdf.save(`Agent_Report_${data?.agent?.name?.replace(/ /g, '_')}_${reportPeriod}.pdf`);

    } catch (err) {
      console.error('PDF Export failed:', err);
      content.style.cssText = originalCssText;
    } finally {
      setIsExporting(false);
    }
  };

  const periods = [
    { id: 'all', label: 'All Time' },
    { id: 'daily', label: 'Daily' },
    { id: 'yesterday', label: 'Yesterday' },
    { id: 'weekly', label: 'Weekly' },
    { id: 'monthly', label: 'Monthly' },
    { id: 'custom', label: 'Custom Date' }
  ];

  if (!isOpen) return null;

  const handlePeriodChange = (pId) => {
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

    let start = '';
    let end = '';

    if (pId === 'daily') { start = today; end = today; }
    else if (pId === 'yesterday') { start = yesterday; end = yesterday; }
    else if (pId === 'weekly') { start = lastWeek; end = today; }
    else if (pId === 'monthly') { start = lastMonth; end = today; }
    else if (pId === 'all') { start = ''; end = ''; }
    else if (pId === 'custom') { start = today; end = today; }

    setReportPeriod(pId);
    setReportStart(start);
    setReportEnd(end);
  };

  return (
    <AnimatePresence>
      <div style={{ position: 'fixed', inset: 0, zIndex: 2000, display: 'flex', justifyContent: 'flex-end' }}>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          style={{ position: 'absolute', inset: 0, background: 'rgba(2, 6, 23, 0.6)', backdropFilter: 'blur(4px)' }}
        />
        
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          style={{ 
            position: 'relative', 
            width: '100%', 
            maxWidth: '650px', 
            height: '100%', 
            background: 'var(--bg-app)', 
            borderLeft: '1px solid var(--border-color)',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '-10px 0 30px rgba(0,0,0,0.5)'
          }}
        >
           {/* Header */}
          <div style={{ padding: '24px', borderBottom: '1px solid var(--border-color)', background: 'var(--bg-card)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <span style={{ 
                    background: 'rgba(6, 182, 138, 0.1)', 
                    color: '#06B68A', 
                    padding: '2px 8px', 
                    borderRadius: '6px', 
                    fontSize: '10px', 
                    fontWeight: 800, 
                    textTransform: 'uppercase' 
                  }}>Agent Analytics</span>
                </div>
                <h2 style={{ fontSize: '28px', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-1px' }}>
                  {loading ? 'Crunching numbers...' : data?.agent?.name}
                </h2>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                {!loading && data && (
                  <ExportDropdown 
                    isExporting={isExporting}
                    options={[
                      { label: 'Export as PDF Report', icon: FileText, onClick: handleExportPDF },
                      { label: 'Export as Excel Data', icon: FileSpreadsheet, onClick: handleExportCSV },
                      { label: 'Export Raw JSON', icon: FileJson, onClick: handleExportJSON },
                    ]}
                  />
                )}
                <button 
                  onClick={onClose}
                  className="hide-on-print"
                  style={{ padding: '8px', borderRadius: '10px', background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: 'var(--text-muted)', cursor: 'pointer' }}
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Premium Filter Bar */}
            <div className="hide-on-print" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ 
                display: 'flex', 
                gap: '4px',
                background: 'var(--bg-input)', 
                padding: '4px', 
                borderRadius: '12px', 
                border: '1px solid var(--border-color)',
                width: 'fit-content'
              }}>
                {periods.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => handlePeriodChange(p.id)}
                    style={{
                      padding: '6px 14px',
                      borderRadius: '8px',
                      border: 'none',
                      background: reportPeriod === p.id ? 'var(--bg-card)' : 'transparent',
                      color: reportPeriod === p.id ? 'var(--text-main)' : 'var(--text-muted)',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      boxShadow: reportPeriod === p.id ? '0 2px 8px rgba(0,0,0,0.1)' : 'none'
                    }}
                  >
                    {p.label}
                  </button>
                ))}
              </div>

              {reportPeriod === 'custom' && (
                <div style={{ 
                  display: 'flex', 
                  gap: '8px', 
                  alignItems: 'center', 
                  background: 'var(--bg-card)', 
                  padding: '6px', 
                  borderRadius: '16px', 
                  border: '1px solid var(--border-color)', 
                  width: 'fit-content',
                  animation: 'fadeIn 0.3s ease' 
                }}>
                  <div style={{ width: '150px' }}>
                    <Input 
                      type="date" 
                      icon={CalendarIcon}
                      value={reportStart || ''} 
                      onChange={(e) => setReportStart(e.target.value)}
                      style={{ marginBottom: 0 }}
                      inputStyle={{ padding: '8px 12px', paddingLeft: '44px', fontSize: '13px', background: 'var(--bg-input)', borderRadius: '10px' }}
                    />
                  </div>
                  <span style={{ color: 'var(--text-muted)', fontWeight: 600, padding: '0 4px', fontSize: '13px' }}>to</span>
                  <div style={{ width: '150px' }}>
                    <Input 
                      type="date" 
                      icon={CalendarIcon}
                      value={reportEnd || ''} 
                      onChange={(e) => setReportEnd(e.target.value)}
                      style={{ marginBottom: 0 }}
                      inputStyle={{ padding: '8px 12px', paddingLeft: '44px', fontSize: '13px', background: 'var(--bg-input)', borderRadius: '10px' }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {loading ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', gap: '16px' }}>
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
              >
                <RefreshCw size={40} />
              </motion.div>
              <p style={{ fontWeight: 600 }}>Building performance profile...</p>
            </div>
          ) : (
            <div ref={reportContentRef} className="report-content-scroll" style={{ flex: 1, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
              
              {/* PRINT ONLY HEADER */}
              <div className="show-only-on-print" style={{ display: 'none', marginBottom: '30px', borderBottom: '2px solid #06B68A', paddingBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                  <div>
                    <h1 style={{ fontSize: '28px', fontWeight: 900, color: '#0f172a', margin: 0 }}>Agent Performance Report</h1>
                    <p style={{ color: '#64748b', fontSize: '14px', margin: '4px 0 0 0' }}>Generated on {new Date().toLocaleDateString()} for {reportPeriod.toUpperCase()} period</p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '18px', fontWeight: 800, color: '#06B68A' }}>{data?.agent?.name || agent?.name || 'Agent'}</div>
                    <div style={{ fontSize: '12px', color: '#64748b' }}>Digi CRM Intelligence</div>
                  </div>
                </div>
              </div>
              
              {/* Quick Metrics */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
                <div className="print-card" style={{ background: 'var(--bg-card)', padding: '16px', borderRadius: '16px', border: '1px solid var(--border-color)' }}>
                  <div style={{ color: 'var(--text-muted)', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', marginBottom: '8px' }}>Total Revenue</div>
                  <div style={{ fontSize: '20px', fontWeight: 800, color: '#10b981' }}>
                    {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(data.stats.total_revenue)}
                  </div>
                </div>
                <div className="print-card" style={{ background: 'var(--bg-card)', padding: '16px', borderRadius: '16px', border: '1px solid var(--border-color)' }}>
                  <div style={{ color: 'var(--text-muted)', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', marginBottom: '8px' }}>Bookings</div>
                  <div style={{ fontSize: '20px', fontWeight: 800, color: '#06B68A' }}>{data.stats.total_bookings}</div>
                </div>
                <div className="print-card" style={{ background: 'var(--bg-card)', padding: '16px', borderRadius: '16px', border: '1px solid var(--border-color)' }}>
                  <div style={{ color: 'var(--text-muted)', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', marginBottom: '8px' }}>Daily Rev</div>
                  <div style={{ fontSize: '20px', fontWeight: 800, color: '#f59e0b' }}>
                    {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(data.stats.daily_revenue)}
                  </div>
                </div>
              </div>

              {/* Revenue Trend */}
              <div className="glass-panel hide-on-print" style={{ padding: '20px', borderRadius: '20px', border: '1px solid var(--border-color)' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 800, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <CircleDollarSign size={18} style={{ color: '#10b981' }} /> Yearly Revenue Trend
                </h3>
                <div style={{ height: '220px', width: '100%' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data.revenue_trends}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" opacity={0.3} />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'var(--text-muted)' }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'var(--text-muted)' }} tickFormatter={(val) => `$${val >= 1000 ? val/1000 + 'k' : val}`} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', padding: '8px' }}
                        itemStyle={{ fontSize: '12px', fontWeight: 800, color: '#10b981' }}
                        labelStyle={{ fontSize: '10px', color: 'rgba(255,255,255,0.6)' }}
                      />
                      <Line type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={3} dot={{ r: 3, fill: '#10b981' }} filter="drop-shadow(0px 4px 4px rgba(16, 185, 129, 0.2))" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Status Distribution */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div className="glass-panel hide-on-print" style={{ padding: '20px', borderRadius: '20px', border: '1px solid var(--border-color)' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: 800, marginBottom: '16px' }}>Status Split</h3>
                  <div style={{ height: '180px' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={data.status_distribution}
                          innerRadius={45}
                          outerRadius={60}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {data.status_distribution.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '8px' }}>
                    {data.status_distribution.slice(0, 4).map((status, idx) => (
                      <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '10px', fontWeight: 600, color: 'var(--text-muted)' }}>
                        <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: COLORS[idx % COLORS.length] }} />
                        {status.name} ({status.value})
                      </div>
                    ))}
                  </div>
                </div>

                <div className="glass-panel hide-on-print" style={{ padding: '20px', borderRadius: '20px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '16px', gridColumn: 'span 2' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: 800 }}>Summary</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Success Rate</span>
                      <span style={{ fontSize: '14px', fontWeight: 800, color: 'var(--text-main)' }}>
                        {data.stats.total_bookings > 0 ? ((data.status_distribution.find(s => s.name === 'Confirmed')?.value || 0) / data.stats.total_bookings * 100).toFixed(1) : 0}%
                      </span>
                    </div>
                    <div style={{ height: '4px', background: 'var(--bg-input)', borderRadius: '2px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', background: '#10b981', width: `${data.stats.total_bookings > 0 ? ((data.status_distribution.find(s => s.name === 'Confirmed')?.value || 0) / data.stats.total_bookings * 100) : 0}%` }} />
                    </div>
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
                      <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Total Call Logs</span>
                      <span style={{ fontSize: '14px', fontWeight: 800, color: 'var(--text-main)' }}>{data.stats.total_calls}</span>
                    </div>
                  </div>
                  <div className="hide-on-print" style={{ marginTop: 'auto', padding: '12px', background: 'rgba(96, 165, 250, 0.05)', borderRadius: '12px', border: '1px solid rgba(96, 165, 250, 0.1)', display: 'flex', gap: '10px' }}>
                    <Info size={16} style={{ color: '#06B68A', flexShrink: 0 }} />
                    <p style={{ fontSize: '11px', color: 'rgba(96, 165, 250, 0.8)', lineHeight: '1.4' }}>Metrics are based on real-time activity and all-time booking history for this agent.</p>
                  </div>
                </div>
              </div>

              {/* PRINT ONLY SUMMARY (Replacement for hidden items) */}
              <div className="show-only-on-print" style={{ display: 'none', background: '#f8fafc', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                <h3 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '15px', color: '#0f172a' }}>Efficiency Summary</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px' }}>
                   <div>
                      <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>Success Rate</div>
                      <div style={{ fontSize: '24px', fontWeight: 900, color: '#06B68A' }}>
                         {data.stats.total_bookings > 0 ? ((data.status_distribution.find(s => s.name === 'Confirmed')?.value || 0) / data.stats.total_bookings * 100).toFixed(1) : 0}%
                      </div>
                   </div>
                   <div>
                      <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>Total Interaction Logs</div>
                      <div style={{ fontSize: '24px', fontWeight: 900, color: '#0f172a' }}>{data.stats.total_calls}</div>
                   </div>
                </div>
              </div>

              {/* Recent Activity */}
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 800, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <ClipboardList size={18} style={{ color: '#8b5cf6' }} /> Recent Call Activity
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {data.recent_calls.length === 0 ? (
                    <div style={{ padding: '24px', textAlign: 'center', background: 'var(--bg-card)', borderRadius: '16px', color: 'var(--text-muted)', fontSize: '13px' }}>
                      No recent activity logs found.
                    </div>
                  ) : (
                    data.recent_calls.map((call, idx) => (
                      <div key={idx} className="page-break-avoid" style={{ 
                        background: 'var(--bg-card)', 
                        padding: '16px', 
                        borderRadius: '16px', 
                        border: '1px solid var(--border-color)',
                        display: 'flex',
                        gap: '16px'
                      }}>
                        <div className="hide-on-print" style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'var(--bg-input)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8b5cf6', flexShrink: 0 }}>
                          <PhoneCall size={18} />
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div style={{ fontWeight: 800, color: 'var(--text-main)', fontSize: '14px' }}>
                              {call.client?.name || 'Unknown Client'}
                            </div>
                            <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 700 }}>
                              {new Date(call.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                            </div>
                          </div>
                          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                            {call.customer_outcome || 'No outcome recorded'} • <span style={{ color: '#06B68A' }}>{call.airline_inquiry}</span>
                          </div>
                          {call.notes && (
                            <div style={{ marginTop: '8px', padding: '8px 12px', background: 'var(--bg-input)', borderRadius: '8px', fontSize: '11px', color: 'var(--text-main)', fontStyle: 'italic' }}>
                              "{call.notes.length > 80 ? call.notes.substring(0, 80) + '...' : call.notes}"
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default AgentReportSlideOver;
