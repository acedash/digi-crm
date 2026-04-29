import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Download, ShieldCheck, Mail, Globe, Clock3, Fingerprint, RefreshCcw, CreditCard, FileText, Image as ImageIcon, ChevronDown, Shield, PenLine, Plane, Hotel, Car, Waves } from 'lucide-react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import paymentAuthService from './paymentAuthService';
import { getStatusLabel, getAuthorizationTypeLabel } from './bookingUtils';
import { BACKEND_BASE_URL } from '../../services/api';
import Button from '../../components/ui/Button';
import sensitiveAuditService from '../../services/sensitiveAuditService';
import ExportDropdown from '../../components/ui/ExportDropdown';

const formatMoney = (amount, currency = 'USD') =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(Number(amount || 0));

const downloadJson = (data, filename) => {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
};

const DetailRow = ({ label, value }) => (
  <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', gap: '12px', padding: '10px 0', borderBottom: '1px solid var(--border-color)' }}>
    <div style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)' }}>{label}</div>
    <div style={{ fontSize: '14px', color: 'var(--text-main)' }}>{value || 'Not recorded'}</div>
  </div>
);

const SectionCard = ({ icon, title, children, iconColor = '#059669' }) => {
  const SectionIcon = icon;
  return (
    <div className="pdf-section" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '20px', padding: '24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px' }}>
        <SectionIcon size={20} color={iconColor} />
        <h2 style={{ fontSize: '18px', fontWeight: 800, margin: 0 }}>{title}</h2>
      </div>
      {children}
    </div>
  );
};

const SectionHeader = ({ icon: Icon, title, iconColor = '#059669' }) => (
  <div className="pdf-section" style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px 24px', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '20px' }}>
    <Icon size={24} color={iconColor} />
    <h2 style={{ fontSize: '20px', fontWeight: 800, margin: 0 }}>{title}</h2>
  </div>
);

const ConsentProofPage = () => {
  const navigate = useNavigate();
  const { id } = useParams();

  const resolveImagePath = (path) => {
    if (!path) return '';
    let pathStr = path.toString();

    // Fix for legacy snapshots that might have been generated with an incorrect base URL (missing port 8001)
    if (pathStr.includes('localhost/api/email-assets/')) {
      pathStr = pathStr.replace(/https?:\/\/localhost\//, `${BACKEND_BASE_URL}/`);
    }

    if (pathStr.startsWith('data:image') || pathStr.startsWith('http://') || pathStr.startsWith('https://')) {
      return pathStr;
    }
    const cleanPath = pathStr.replace(/^\/+/g, '').replace(/^(storage\/app\/public|uploads)\//, '');
    const urlBase = import.meta.env.DEV ? `${BACKEND_BASE_URL}/uploads` : `${BACKEND_BASE_URL}/core/uploads`;
    return `${urlBase}/${cleanPath}`;
  };

  const proofContentRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [proof, setProof] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadProof = async () => {
      try {
        const response = await paymentAuthService.getProofByBooking(id);
        setProof(response.data.data);
      } catch (err) {
        setError(err?.response?.data?.message || 'Failed to load consent proof.');
      } finally {
        setLoading(false);
      }
    };

    loadProof();
  }, [id]);



  useEffect(() => {
    sensitiveAuditService.logEvent({
      event_type: 'Sensitive Page Viewed',
      module: 'Consent Proof',
      description: 'Opened booking consent proof',
      details: {
        booking_id: Number(id),
      },
    }).catch(() => { });
  }, [id]);

  if (loading) {
    return <div style={{ padding: '32px' }}>Loading consent proof...</div>;
  }

  if (error || !proof) {
    return (
      <div style={{ padding: '32px' }}>
        <Button variant="ghost" icon={ArrowLeft} onClick={() => navigate(-1)}>Back</Button>
        <p style={{ marginTop: '20px', color: '#ef4444' }}>{error || 'Consent proof not available.'}</p>
      </div>
    );
  }

  const snapshot = proof.consent_snapshot || {};
  const travellers = snapshot.travellers || [];
  const fareBreakdown = snapshot.fare_breakdown || {};
  const bookings = proof.bookings || [];
  const authorizationType = snapshot.authorization_type || proof.metadata?.authorization_type || 'initial';
  const isChangeCharge = authorizationType === 'change_charge';
  const cardAllocations = snapshot.card_allocations || proof.metadata?.card_allocations || [];
  const changeEntries = snapshot.change_entries || proof.metadata?.change_entries || [];
  const bookingReference = bookings[0]?.booking_reference || `#${id}`;

  // Deduplicate images by path (safety net for legacy snapshots that may have duplicates)
  const dedupByPath = (arr) => [...new Map((arr || []).filter(Boolean).map(item => [item.path || item.url, item])).values()];
  const ticketImages = dedupByPath(snapshot.ticket_images);
  const hotelImages = dedupByPath(snapshot.hotel_images);
  const carImages = dedupByPath(snapshot.car_images);
  const cruiseImages = dedupByPath(snapshot.cruise_images);
  const statusTone = proof.status === 'Approved'
    ? { bg: 'rgba(16,185,129,0.12)', color: '#10b981', border: 'rgba(16,185,129,0.28)' }
    : proof.status === 'Rejected'
      ? { bg: 'rgba(239,68,68,0.12)', color: '#ef4444', border: 'rgba(239,68,68,0.28)' }
      : { bg: 'rgba(139,92,246,0.12)', color: '#8b5cf6', border: 'rgba(139,92,246,0.28)' };

  const handleRefreshSnapshot = async () => {
    if (!window.confirm('This will update the proof with the latest booking data (passengers, tickets/images). This is useful if the snapshot was incomplete. Proceed?')) return;
    try {
      setLoading(true);
      await paymentAuthService.refreshProofSnapshot(proof.token);
      const response = await paymentAuthService.getProofByBooking(id);
      setProof(response.data.data);
      alert('Proof snapshot refreshed successfully.');
    } catch (err) {
      alert('Failed to refresh snapshot: ' + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };


  const exportJpeg = async () => {
    const content = proofContentRef.current;
    if (!content) return;

    try {
      setIsExporting(true);
      const canvas = await html2canvas(content, {
        useCORS: true,
        scale: 2,
        backgroundColor: '#ffffff',
        windowWidth: 1200,
        onclone: (clonedDoc) => {
          const area = clonedDoc.getElementById('proof-capture-area');
          if (area) {
            area.style.padding = '80px 100px';
            area.style.background = '#ffffff';
            area.style.width = '1200px';
          }

          // Inject high-contrast styles into the clone
          const style = clonedDoc.createElement('style');
          style.innerHTML = `
            * { transition: none !important; }
            :root {
              --bg-card: #ffffff !important;
              --bg-app: #ffffff !important;
              --text-main: #000000 !important;
              --text-muted: #262626 !important;
              --border-color: #cccccc !important;
            }
            [style*="color: var(--text-muted)"] { color: #262626 !important; }
            [style*="color: var(--text-main)"] { color: #000000 !important; }
            div { border-color: #cccccc !important; }
            strong { color: #000000 !important; font-weight: 800 !important; }
            p { color: #000000 !important; }
            span { color: #000000 !important; opacity: 1 !important; }
          `;
          clonedDoc.head.appendChild(style);

          clonedDoc.querySelectorAll('*').forEach(el => {
            if (el.tagName === 'BUTTON') el.style.display = 'none';
            // Force reset any opacity that might make text look "dull"
            if (window.getComputedStyle(el).opacity !== '1') {
              el.style.opacity = '1';
            }
          });
        }
      });

      const link = document.createElement('a');
      link.download = `consent-proof-${bookingReference}.jpg`;
      link.href = canvas.toDataURL('image/jpeg', 0.9);
      link.click();

      sensitiveAuditService.logEvent({
        event_type: 'Sensitive Export',
        module: 'Consent Proof',
        description: 'Exported consent proof JPEG',
        details: { booking_id: Number(id), authorization_id: proof.id },
      }).catch(() => { });
    } catch (err) {
      console.error('JPEG Export failed:', err);
    } finally {
      setIsExporting(false);
    }
  };

  const exportDirectPdf = async () => {
    const content = proofContentRef.current;
    if (!content) return;

    // Save original styles to guarantee we revert back to normal view
    const originalCssText = content.style.cssText;

    try {
      setIsExporting(true);

      // 1. Synchronize Layouts: 
      // Temporarily enforce the target PDF layout on the REAL DOM.
      // This guarantees our bounding rect coordinates perfectly match the canvas capture.
      content.style.cssText += '; padding: 40px !important; width: 1200px !important; background: #ffffff !important; margin: 0 auto !important;';

      // Give browser time to reflow the layout completely
      await new Promise(r => setTimeout(r, 150));

      const contentRect = content.getBoundingClientRect();
      const sections = Array.from(content.querySelectorAll('.pdf-section'));

      // 2. Capture Canvas
      const fullCanvas = await html2canvas(content, {
        useCORS: true,
        scale: 2,
        backgroundColor: '#ffffff',
        onclone: (clonedDoc) => {
          // Do NOT apply width/padding here anymore, the layout is already synchronized.
          // Only apply high-contrast colors and hide buttons.
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
            button { display: none !important; }
          `;
          clonedDoc.head.appendChild(style);
        }
      });

      const imgWidth = fullCanvas.width;
      const imgHeight = fullCanvas.height;
      
      // Calculate scale factor explicitly based on the synchronized dimensions
      const scaleFactor = imgHeight / content.offsetHeight;
      
      // 3. Extract accurate breakpoints
      const breakPoints = sections.map(s => {
        const rect = s.getBoundingClientRect();
        // Calculate offset from top of the container, scaled to canvas pixels
        return (rect.top - contentRect.top) * scaleFactor - 8; // 8px safety margin above the section
      }).filter(bp => bp > 0);
      
      breakPoints.push(imgHeight);
      breakPoints.sort((a, b) => a - b);

      // 4. Revert Layout instantly
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

      // 5. Smart Slice Engine
      while (currentY < imgHeight - 10) {
        if (pageNum > 1) pdf.addPage();
        
        let targetCutY = currentY + pageHeightPx;
        let actualCutY = targetCutY;
        
        // Find a breakpoint that is safely below the start of the page but before the target cut
        const possibleBreaks = breakPoints.filter(bp => bp > currentY + 150 && bp <= targetCutY);
        
        if (possibleBreaks.length > 0) {
          actualCutY = possibleBreaks[possibleBreaks.length - 1];
        }
        
        // If remaining content fits, don't cut early
        if (imgHeight - currentY <= pageHeightPx) {
          actualCutY = imgHeight;
        }

        const sliceHeight = actualCutY - currentY;
        
        // Failsafe against infinite loops
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

      pdf.save(`consent-proof-${bookingReference}.pdf`);

      sensitiveAuditService.logEvent({
        event_type: 'Sensitive Export',
        module: 'Consent Proof',
        description: 'Exported consent proof PDF (Synchronized Smart Split)',
        details: { booking_id: Number(id), authorization_id: proof.id },
      }).catch(() => { });
    } catch (err) {
      console.error('PDF Export failed:', err);
      // Failsafe revert
      content.style.cssText = originalCssText;
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div style={{ padding: '32px', maxWidth: '1080px', margin: '0 auto', display: 'grid', gap: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
          <Button
            variant="ghost"
            icon={ArrowLeft}
            onClick={() => navigate(-1)}
            style={{ marginTop: '8px' }}
          >
            Back
          </Button>
          <div>
            <h1 style={{ fontSize: '32px', fontWeight: 800 }}>Consent Proof</h1>
            <p style={{ color: 'var(--text-muted)', marginTop: '4px' }}>
              Approval evidence for booking {bookingReference}.
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <Button
            variant="outline"
            icon={RefreshCcw}
            onClick={handleRefreshSnapshot}
            disabled={loading}
            title="Update snapshot with current booking data"
          >
            Refresh Snapshot
          </Button>

          <ExportDropdown
            isExporting={isExporting}
            label="Export Evidence"
            buttonStyle={{ background: 'hsl(var(--primary))', color: 'white' }}
            options={[
              { label: 'Export as PDF Report', icon: FileText, onClick: exportDirectPdf },
              { label: 'Export as JPEG Image', icon: ImageIcon, onClick: exportJpeg },
              { 
                label: 'Export Raw JSON', 
                icon: RefreshCcw, 
                onClick: () => {
                  sensitiveAuditService.logEvent({
                    event_type: 'Sensitive Export',
                    module: 'Consent Proof',
                    description: 'Exported consent proof JSON',
                    details: { booking_id: Number(id), authorization_id: proof.id },
                  }).catch(() => { });
                  downloadJson(proof, `consent-proof-booking-${id}.json`);
                }
              },
            ]}
          />
        </div>
      </div>


      <div id="proof-capture-area" ref={proofContentRef} style={{ display: 'grid', gap: '24px' }}>
        <div
          className="pdf-section"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px',
            flexWrap: 'wrap',
            padding: '18px 20px',
            borderRadius: '18px',
            background: isChangeCharge ? 'rgba(245, 158, 11, 0.10)' : 'rgba(5, 150, 105, 0.10)',
            border: `1px solid ${isChangeCharge ? 'rgba(245, 158, 11, 0.24)' : 'rgba(5, 150, 105, 0.24)'}`,
          }}
        >
          <div>
            <div style={{ fontSize: '12px', fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
              Authorization Type
            </div>
            <div style={{ fontSize: '22px', fontWeight: 800, marginTop: '6px', color: isChangeCharge ? '#f59e0b' : '#059669' }}>
              {getAuthorizationTypeLabel(isChangeCharge ? 'change_charge' : 'initial')}
            </div>
            <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '6px' }}>
              {isChangeCharge
                ? 'This proof covers a post-approval booking change and the extra amount requested from the client.'
                : 'This proof covers the first payment authorization for the booking.'}
            </div>
          </div>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 14px',
              borderRadius: '999px',
              background: statusTone.bg,
              color: statusTone.color,
              border: `1px solid ${statusTone.border}`,
              fontSize: '12px',
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
            }}
          >
            {getStatusLabel(proof.status)}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 0.9fr', gap: '24px' }}>
          <SectionCard icon={ShieldCheck} title="Approval Evidence" iconColor="#059669">
            <DetailRow label="Status" value={getStatusLabel(proof.status)} />
            <DetailRow label="Approved At" value={proof.approved_at || 'Pending'} />
            <DetailRow label="Approved Email" value={proof.approved_email} />
            <DetailRow label="IP Address" value={proof.ip_address} />
            <DetailRow label="User Agent" value={proof.user_agent} />
            <DetailRow label="Masked Card" value={proof.masked_card} />
            <DetailRow label="Declaration Ver." value={proof.declaration_version} />
            <DetailRow label="Auth Type" value={getAuthorizationTypeLabel(isChangeCharge ? 'change_charge' : 'initial')} />
            <DetailRow label="Token Ref" value={proof.token} />
          </SectionCard>

          <div style={{ display: 'grid', gap: '24px' }}>
            <SectionCard icon={Clock3} title="Snapshot Summary" iconColor="#059669">
              <DetailRow label="Captured At" value={snapshot.captured_at} />
              <DetailRow label="Supplier" value={snapshot.supplier_label} />
              <DetailRow label="Currency" value={snapshot.currency} />
              <DetailRow label={isChangeCharge ? 'Change Amount' : 'Total Amount'} value={formatMoney(snapshot.total_amount, snapshot.currency)} />
              <DetailRow label="Contact Email" value={snapshot.contact?.email} />
              <DetailRow label="Contact Phone" value={snapshot.contact?.phone} />
            </SectionCard>

            <div className="pdf-section" style={{ padding: '20px', borderRadius: '18px', background: 'rgba(6, 182, 212, 0.05)', border: '1px solid rgba(6, 182, 212, 0.15)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#0891b2', marginBottom: '8px' }}>
                <Shield size={18} />
                <span style={{ fontSize: '14px', fontWeight: 800, textTransform: 'uppercase' }}>Security Verification</span>
              </div>
              <p style={{ fontSize: '12px', color: '#636366', lineHeight: 1.6, margin: 0 }}>
                This record constitutes digital evidence of payment authorization. All images and signatures are cryptographically linked to this record.
              </p>
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
          <SectionCard icon={Fingerprint} title="Verification Assets" iconColor="#d97706">
            <div style={{ display: 'grid', gap: '20px' }}>
              <div>
                <div style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <PenLine size={12} /> Digital Signature
                </div>
                {proof.digital_signature ? (
                  <div style={{ borderRadius: '16px', overflow: 'hidden', border: '1px solid var(--border-color)', background: '#fff', padding: '10px' }}>
                    <img
                      src={resolveImagePath(proof.digital_signature)}
                      crossOrigin="anonymous"
                      alt="Digital signature"
                      style={{ width: '100%', display: 'block' }}
                    />
                  </div>
                ) : (
                  <div style={{ padding: '20px', borderRadius: '16px', background: 'rgba(255,255,255,0.02)', border: '1px dashed var(--border-color)', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                    No signature recorded
                  </div>
                )}
              </div>

              {proof.id_proof_path && (
                <div>
                  <div style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <ImageIcon size={12} /> Client Uploaded Photo / ID
                  </div>
                  <div style={{ borderRadius: '16px', overflow: 'hidden', border: '1px solid var(--border-color)', background: '#fff' }}>
                    <img
                      src={proof.id_proof_url || resolveImagePath(proof.id_proof_path)}
                      crossOrigin="anonymous"
                      alt="ID Proof"
                      style={{ width: '100%', maxHeight: '400px', objectFit: 'contain', display: 'block' }}
                    />
                  </div>
                  <div style={{ marginTop: '8px', fontSize: '11px', color: '#059669', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <ShieldCheck size={12} /> Verified identity document provided
                  </div>
                </div>
              )}
            </div>
          </SectionCard>

          <SectionCard icon={Mail} title="Declaration & Legal" iconColor="#8b5cf6">
            <div style={{
              padding: '20px',
              borderRadius: '16px',
              background: 'rgba(139, 92, 246, 0.03)',
              border: '1px solid rgba(139, 92, 246, 0.1)',
              height: '100%'
            }}>
              <div style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', color: '#8b5cf6', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Shield size={12} /> Binding Acceptance
              </div>
              <p style={{ fontSize: '14px', lineHeight: 1.8, color: 'var(--text-main)', whiteSpace: 'pre-wrap', margin: 0 }}>
                {proof.declaration_text || 'No declaration text recorded.'}
              </p>
              <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px dashed rgba(139, 92, 246, 0.2)', fontSize: '12px', color: 'var(--text-muted)' }}>
                Accepted IP: {proof.ip_address}<br />
                Timestamp: {proof.approved_at}
              </div>
            </div>
          </SectionCard>
        </div>

        {isChangeCharge && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
            <SectionCard icon={RefreshCcw} title="Tracked Booking Changes" iconColor="#f59e0b">
              <div style={{ display: 'grid', gap: '12px' }}>
                {changeEntries.length ? changeEntries.map((entry, index) => (
                  <div
                    key={`${entry.service_type || 'service'}-${index}`}
                    style={{ padding: '14px 16px', borderRadius: '14px', background: 'var(--bg-app)', border: '1px solid var(--border-color)' }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center', marginBottom: '6px' }}>
                      <div style={{ fontWeight: 800, color: 'var(--text-main)' }}>
                        {entry.service_type || 'Service Change'}
                      </div>
                      <div style={{ fontSize: '12px', fontWeight: 800, color: '#f59e0b' }}>
                        {formatMoney(entry.additional_charge, snapshot.currency)}
                      </div>
                    </div>
                    <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '6px' }}>
                      {entry.change_type || 'Change type not recorded'}
                    </div>
                    <div style={{ fontSize: '13px', color: 'var(--text-main)' }}>
                      {entry.change_summary || 'No summary recorded.'}
                    </div>
                  </div>
                )) : (
                  <p style={{ color: 'var(--text-muted)' }}>No tracked change entries recorded.</p>
                )}
              </div>
            </SectionCard>

            <SectionCard icon={CreditCard} title="Change Charge Allocation" iconColor="#059669">
              <div style={{ display: 'grid', gap: '12px' }}>
                {cardAllocations.length ? cardAllocations.map((allocation, index) => (
                  <div
                    key={`${allocation.card_label || allocation.holder_name || 'card'}-${index}`}
                    style={{ padding: '14px 16px', borderRadius: '14px', background: 'var(--bg-app)', border: '1px solid var(--border-color)' }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontWeight: 800, color: 'var(--text-main)' }}>
                          {allocation.card_label || allocation.holder_name || 'Card'}
                        </div>
                        {allocation.remarks && (
                          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                            {allocation.remarks}
                          </div>
                        )}
                      </div>
                      <div style={{ fontSize: '14px', fontWeight: 800, color: '#059669' }}>
                        {formatMoney(allocation.amount, snapshot.currency)}
                      </div>
                    </div>
                  </div>
                )) : (
                  <p style={{ color: 'var(--text-muted)' }}>No card allocation stored.</p>
                )}
              </div>
            </SectionCard>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
          <SectionCard icon={Globe} title="Travellers" iconColor="#059669">
            <div style={{ display: 'grid', gap: '12px' }}>
              {travellers.length ? travellers.map((traveller, index) => (
                <div key={`${traveller.name}-${index}`} style={{ padding: '14px 16px', borderRadius: '14px', background: 'var(--bg-app)', border: '1px solid var(--border-color)' }}>
                  <div style={{ fontWeight: 700 }}>{traveller.name}</div>
                  <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>
                    {traveller.display_date_of_birth || traveller.date_of_birth || 'DOB not recorded'}
                  </div>
                </div>
              )) : (
                <p style={{ color: 'var(--text-muted)' }}>No travellers recorded.</p>
              )}
            </div>
          </SectionCard>

          <SectionCard icon={Clock3} title={isChangeCharge ? 'Change Charge Summary' : 'Fare Breakdown'} iconColor="#059669">
            {isChangeCharge ? (
              <>
                <DetailRow label="Additional Charge" value={formatMoney(fareBreakdown.change_charge || snapshot.total_amount, snapshot.currency)} />
                <DetailRow label="Grand Total" value={formatMoney(fareBreakdown.grand_total || snapshot.total_amount, snapshot.currency)} />
              </>
            ) : (
              <>
                <DetailRow label="Base Fare" value={formatMoney(fareBreakdown.base_fare, snapshot.currency)} />
                <DetailRow label="Taxes & Fees" value={formatMoney(fareBreakdown.taxes_and_fee, snapshot.currency)} />
                <DetailRow label="Grand Total" value={formatMoney(fareBreakdown.grand_total, snapshot.currency)} />
              </>
            )}
          </SectionCard>
        </div>

        {ticketImages.length > 0 && (
          <div style={{ display: 'grid', gap: '16px' }}>
            <SectionHeader icon={Plane} title="Flight Ticket Images" iconColor="#059669" />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>
              {ticketImages.map((ticket, index) => (
                <div key={`ticket-${index}`} className="pdf-section" style={{ borderRadius: '16px', overflow: 'hidden', border: '1px solid var(--border-color)', background: 'var(--bg-card)' }}>
                  <div style={{ padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)' }}>
                    <span style={{ fontWeight: 800, fontSize: '14px' }}>{ticket.booking_reference}</span>
                    <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)' }}>{ticket.segment_label || 'Ticket'}</span>
                  </div>
                  <img
                    src={resolveImagePath(ticket.url || ticket.path)}
                    crossOrigin="anonymous"
                    alt={ticket.booking_reference}
                    style={{ width: '100%', height: 'auto', display: 'block' }}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {hotelImages.length > 0 && (
          <div style={{ display: 'grid', gap: '16px' }}>
            <SectionHeader icon={Hotel} title="Hotel & Accommodation" iconColor="#059669" />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
              {hotelImages.map((img, idx) => (
                <div key={`hotel-img-${idx}`} className="pdf-section" style={{ borderRadius: '14px', overflow: 'hidden', border: '1px solid var(--border-color)', background: 'var(--bg-card)' }}>
                  <img
                    src={resolveImagePath(img.url || img.path)}
                    crossOrigin="anonymous"
                    alt="Hotel"
                    style={{ width: '100%', height: '160px', objectFit: 'cover', display: 'block' }}
                  />
                  {(img.booking_reference || img.label) && (
                    <div style={{ padding: '10px 12px', fontSize: '13px', fontWeight: 600, color: 'var(--text-main)', borderTop: '1px solid var(--border-color)' }}>
                      {img.booking_reference}{img.label ? ` - ${img.label}` : ''}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {carImages.length > 0 && (
          <div style={{ display: 'grid', gap: '16px' }}>
            <SectionHeader icon={Car} title="Car Rental & Transfers" iconColor="#f59e0b" />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
              {carImages.map((img, idx) => (
                <div key={`car-img-${idx}`} className="pdf-section" style={{ borderRadius: '14px', overflow: 'hidden', border: '1px solid var(--border-color)', background: 'var(--bg-card)' }}>
                  <img
                    src={resolveImagePath(img.url || img.path)}
                    crossOrigin="anonymous"
                    alt="Car"
                    style={{ width: '100%', height: '160px', objectFit: 'cover', display: 'block' }}
                  />
                  {(img.booking_reference || img.label) && (
                    <div style={{ padding: '10px 12px', fontSize: '13px', fontWeight: 600, color: 'var(--text-main)', borderTop: '1px solid var(--border-color)' }}>
                      {img.booking_reference}{img.label ? ` - ${img.label}` : ''}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {cruiseImages.length > 0 && (
          <div style={{ display: 'grid', gap: '16px' }}>
            <SectionHeader icon={Waves} title="Cruise Assets" iconColor="#06b6d4" />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
              {cruiseImages.map((img, idx) => (
                <div key={`cruise-img-${idx}`} className="pdf-section" style={{ borderRadius: '14px', overflow: 'hidden', border: '1px solid var(--border-color)', background: 'var(--bg-card)' }}>
                  <img
                    src={resolveImagePath(img.url || img.path)}
                    crossOrigin="anonymous"
                    alt="Cruise"
                    style={{ width: '100%', height: '160px', objectFit: 'cover', display: 'block' }}
                  />
                  {(img.booking_reference || img.label) && (
                    <div style={{ padding: '10px 12px', fontSize: '13px', fontWeight: 600, color: 'var(--text-main)', borderTop: '1px solid var(--border-color)' }}>
                      {img.booking_reference}{img.label ? ` - ${img.label}` : ''}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ConsentProofPage;
