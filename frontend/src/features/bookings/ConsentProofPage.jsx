import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Download, ShieldCheck, Mail, Globe, Clock3, Fingerprint, RefreshCcw, CreditCard, FileText, Image as ImageIcon } from 'lucide-react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import paymentAuthService from './paymentAuthService';
import { BACKEND_BASE_URL } from '../../services/api';
import Button from '../../components/ui/Button';
import sensitiveAuditService from '../../services/sensitiveAuditService';

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

const SectionCard = ({ icon, title, children, iconColor = '#2563eb' }) => {
  const SectionIcon = icon;
  return (
  <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '20px', padding: '24px' }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px' }}>
      <SectionIcon size={20} color={iconColor} />
      <h2 style={{ fontSize: '18px', fontWeight: 800 }}>{title}</h2>
    </div>
    {children}
  </div>
  );
};

const ConsentProofPage = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  
  const resolveImagePath = (path) => {
    if (!path) return '';
    const pathStr = path.toString();
    if (pathStr.startsWith('data:image') || pathStr.startsWith('http://') || pathStr.startsWith('https://')) {
      return pathStr;
    }
    const cleanPath = pathStr.replace(/^\/+/g, '').replace(/^storage\//, '');
    return `${BACKEND_BASE_URL}/storage/app/public/${cleanPath}`;
  };

  const proofContentRef = useRef(null);
  const [loading, setLoading] = useState(true);
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
    }).catch(() => {});
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
  const statusTone = proof.status === 'Approved'
    ? { bg: 'rgba(16,185,129,0.12)', color: '#10b981', border: 'rgba(16,185,129,0.28)' }
    : proof.status === 'Rejected'
      ? { bg: 'rgba(239,68,68,0.12)', color: '#ef4444', border: 'rgba(239,68,68,0.28)' }
      : { bg: 'rgba(139,92,246,0.12)', color: '#8b5cf6', border: 'rgba(139,92,246,0.28)' };

  const exportPdf = () => {
    const content = proofContentRef.current;
    if (!content) return;

    sensitiveAuditService.logEvent({
      event_type: 'Sensitive Export',
      module: 'Consent Proof',
      description: 'Exported consent proof PDF',
      details: {
        booking_id: Number(id),
        authorization_id: proof.id,
      },
    }).catch(() => {});

    const printWindow = window.open('', '_blank', 'width=1100,height=900');
    if (!printWindow) return;

    const printableHtml = `
      <!doctype html>
      <html>
        <head>
          <title>Consent Proof - Booking ${bookingReference}</title>
          <meta charset="utf-8" />
          <style>
            body {
              font-family: Arial, sans-serif;
              background: #ffffff;
              color: #111827;
              margin: 0;
              padding: 32px;
            }
            .print-shell {
              max-width: 1080px;
              margin: 0 auto;
            }
            .print-header {
              margin-bottom: 24px;
            }
            .print-title {
              font-size: 30px;
              font-weight: 800;
              margin: 0 0 8px 0;
            }
            .print-subtitle {
              font-size: 14px;
              color: #4b5563;
              margin: 0;
            }
            .proof-grid {
              display: grid;
              gap: 24px;
            }
            .proof-card {
              background: #ffffff;
              border: 1px solid #d1d5db;
              border-radius: 18px;
              padding: 20px;
              page-break-inside: avoid;
            }
            img {
              max-width: 100%;
              border-radius: 12px;
            }
            button {
              display: none !important;
            }
            @media print {
              body { padding: 0; }
            }
          </style>
        </head>
        <body>
          <div class="print-shell">
            <div class="print-header">
              <h1 class="print-title">Consent Proof</h1>
              <p class="print-subtitle">Booking ${bookingReference} | Authorization ${proof.id}</p>
            </div>
            ${content.innerHTML}
          </div>
        </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(printableHtml);
    printWindow.document.close();
    printWindow.focus();
    printWindow.onload = () => {
      printWindow.print();
    };
  };
  
  const exportJpeg = async () => {
    const content = proofContentRef.current;
    if (!content) return;
    
    try {
      setLoading(true);
      const canvas = await html2canvas(content, {
        useCORS: true,
        scale: 2,
        backgroundColor: '#f8fafc',
        windowWidth: 1200
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
      }).catch(() => {});
    } catch (err) {
      console.error('JPEG Export failed:', err);
    } finally {
      setLoading(false);
    }
  };
  
  const exportDirectPdf = async () => {
    const content = proofContentRef.current;
    if (!content) return;
    
    try {
      setLoading(true);
      const canvas = await html2canvas(content, {
        useCORS: true,
        scale: 2,
        backgroundColor: '#f8fafc',
        windowWidth: 1200
      });
      
      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      
      pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`consent-proof-${bookingReference}.pdf`);
      
      sensitiveAuditService.logEvent({
        event_type: 'Sensitive Export',
        module: 'Consent Proof',
        description: 'Exported consent proof PDF (Direct)',
        details: { booking_id: Number(id), authorization_id: proof.id },
      }).catch(() => {});
    } catch (err) {
      console.error('PDF Export failed:', err);
    } finally {
      setLoading(false);
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
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <Button
            variant="outline"
            icon={FileText}
            onClick={exportDirectPdf}
            disabled={loading}
          >
            PDF Export
          </Button>
          <Button
            variant="outline"
            icon={ImageIcon}
            onClick={exportJpeg}
            disabled={loading}
          >
            JPEG Export
          </Button>
          <Button
            variant="ghost"
            icon={Download}
            onClick={() => {
              sensitiveAuditService.logEvent({
                event_type: 'Sensitive Export',
                module: 'Consent Proof',
                description: 'Exported consent proof JSON',
                details: {
                  booking_id: Number(id),
                  authorization_id: proof.id,
                },
              }).catch(() => {});
              downloadJson(proof, `consent-proof-booking-${id}.json`);
            }}
          >
            JSON
          </Button>
        </div>
      </div>

      <div ref={proofContentRef} style={{ display: 'grid', gap: '24px' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px',
            flexWrap: 'wrap',
            padding: '18px 20px',
            borderRadius: '18px',
            background: isChangeCharge ? 'rgba(245, 158, 11, 0.10)' : 'rgba(37, 99, 235, 0.10)',
            border: `1px solid ${isChangeCharge ? 'rgba(245, 158, 11, 0.24)' : 'rgba(37, 99, 235, 0.24)'}`,
          }}
        >
          <div>
            <div style={{ fontSize: '12px', fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
              Authorization Type
            </div>
            <div style={{ fontSize: '22px', fontWeight: 800, marginTop: '6px', color: 'var(--text-main)' }}>
              {isChangeCharge ? 'Change Charge Approval' : 'Initial Booking Approval'}
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
            {proof.status}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 0.9fr', gap: '24px' }}>
          <SectionCard icon={ShieldCheck} title="Approval Evidence" iconColor="#059669">
            <DetailRow label="Status" value={proof.status} />
            <DetailRow label="Approved At" value={proof.approved_at || 'Pending'} />
            <DetailRow label="Approved Email" value={proof.approved_email} />
            <DetailRow label="IP Address" value={proof.ip_address} />
            <DetailRow label="User Agent" value={proof.user_agent} />
            <DetailRow label="Masked Card" value={proof.masked_card} />
            <DetailRow label="Declaration Ver." value={proof.declaration_version} />
            <DetailRow label="Auth Type" value={isChangeCharge ? 'Change Charge Approval' : 'Initial Booking Approval'} />
            <DetailRow label="Token Ref" value={proof.token} />
          </SectionCard>

          <SectionCard icon={Clock3} title="Snapshot Summary" iconColor="#2563eb">
            <DetailRow label="Captured At" value={snapshot.captured_at} />
            <DetailRow label="Supplier" value={snapshot.supplier_label} />
            <DetailRow label="Currency" value={snapshot.currency} />
            <DetailRow label={isChangeCharge ? 'Change Amount' : 'Total Amount'} value={formatMoney(snapshot.total_amount, snapshot.currency)} />
            <DetailRow label="Contact Email" value={snapshot.contact?.email} />
            <DetailRow label="Contact Phone" value={snapshot.contact?.phone} />
          </SectionCard>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
          <SectionCard icon={Mail} title="Declaration Text" iconColor="#8b5cf6">
            <p style={{ fontSize: '14px', lineHeight: 1.8, color: 'var(--text-main)', whiteSpace: 'pre-wrap' }}>
              {proof.declaration_text || 'No declaration text recorded.'}
            </p>
          </SectionCard>

          <SectionCard icon={Fingerprint} title="Digital Signature" iconColor="#d97706">
            {proof.digital_signature ? (
              <img
                src={resolveImagePath(proof.digital_signature)}
                alt="Digital signature"
                style={{ width: '100%', borderRadius: '16px', border: '1px solid var(--border-color)', background: '#fff' }}
              />
            ) : (
              <p style={{ color: 'var(--text-muted)' }}>No signature recorded.</p>
            )}
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
          <SectionCard icon={Globe} title="Travellers" iconColor="#2563eb">
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

          <SectionCard icon={Clock3} title={isChangeCharge ? 'Change Charge Summary' : 'Fare Breakdown'} iconColor="#2563eb">
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

        <SectionCard icon={Globe} title="Ticket Images" iconColor="#2563eb">
          <div style={{ display: 'grid', gap: '16px' }}>
            {(snapshot.ticket_images || []).length ? snapshot.ticket_images.map((ticket, index) => (
              <div key={`${ticket.booking_reference}-${index}`} style={{ padding: '16px', borderRadius: '16px', border: '1px solid var(--border-color)', background: 'var(--bg-app)' }}>
                <div style={{ fontWeight: 700, marginBottom: '12px' }}>{ticket.booking_reference}</div>
                <img src={resolveImagePath(ticket.url || ticket.path)} alt={ticket.booking_reference} style={{ width: '100%', borderRadius: '14px', border: '1px solid var(--border-color)' }} />
              </div>
            )) : (
              <p style={{ color: 'var(--text-muted)' }}>No ticket images stored in this proof snapshot.</p>
            )}
          </div>
        </SectionCard>
      </div>
    </div>
  );
};

export default ConsentProofPage;
