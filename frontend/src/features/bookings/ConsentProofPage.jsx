import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Download, ShieldCheck, Mail, Globe, Clock3, Fingerprint } from 'lucide-react';
import paymentAuthService from './paymentAuthService';
import Button from '../../components/ui/Button';

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

const ConsentProofPage = () => {
  const navigate = useNavigate();
  const { id } = useParams();
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

  return (
    <div style={{ padding: '32px', maxWidth: '1080px', margin: '0 auto', display: 'grid', gap: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px' }}>
        <div>
          <Button variant="ghost" icon={ArrowLeft} onClick={() => navigate(-1)}>Back</Button>
          <h1 style={{ fontSize: '32px', fontWeight: 800, marginTop: '12px' }}>Consent Proof</h1>
          <p style={{ color: 'var(--text-muted)', marginTop: '6px' }}>
            This is the stored approval evidence for booking {bookings[0]?.booking_reference || `#${id}`}.
          </p>
        </div>
        <Button
          variant="outline"
          icon={Download}
          onClick={() => downloadJson(proof, `consent-proof-booking-${id}.json`)}
        >
          Export JSON
        </Button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 0.9fr', gap: '24px' }}>
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '20px', padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px' }}>
            <ShieldCheck size={20} color="#059669" />
            <h2 style={{ fontSize: '18px', fontWeight: 800 }}>Approval Evidence</h2>
          </div>
          <DetailRow label="Status" value={proof.status} />
          <DetailRow label="Approved At" value={proof.approved_at || 'Pending'} />
          <DetailRow label="Approved Email" value={proof.approved_email} />
          <DetailRow label="IP Address" value={proof.ip_address} />
          <DetailRow label="User Agent" value={proof.user_agent} />
          <DetailRow label="Masked Card" value={proof.masked_card} />
          <DetailRow label="Declaration Ver." value={proof.declaration_version} />
          <DetailRow label="Token Ref" value={proof.token} />
        </div>

        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '20px', padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px' }}>
            <Clock3 size={20} color="#2563eb" />
            <h2 style={{ fontSize: '18px', fontWeight: 800 }}>Snapshot Summary</h2>
          </div>
          <DetailRow label="Captured At" value={snapshot.captured_at} />
          <DetailRow label="Supplier" value={snapshot.supplier_label} />
          <DetailRow label="Currency" value={snapshot.currency} />
          <DetailRow label="Total Amount" value={formatMoney(snapshot.total_amount, snapshot.currency)} />
          <DetailRow label="Contact Email" value={snapshot.contact?.email} />
          <DetailRow label="Contact Phone" value={snapshot.contact?.phone} />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '20px', padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px' }}>
            <Mail size={20} color="#8b5cf6" />
            <h2 style={{ fontSize: '18px', fontWeight: 800 }}>Declaration Text</h2>
          </div>
          <p style={{ fontSize: '14px', lineHeight: 1.8, color: 'var(--text-main)', whiteSpace: 'pre-wrap' }}>
            {proof.declaration_text || 'No declaration text recorded.'}
          </p>
        </div>

        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '20px', padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px' }}>
            <Fingerprint size={20} color="#d97706" />
            <h2 style={{ fontSize: '18px', fontWeight: 800 }}>Digital Signature</h2>
          </div>
          {proof.digital_signature ? (
            <img
              src={proof.digital_signature}
              alt="Digital signature"
              style={{ width: '100%', borderRadius: '16px', border: '1px solid var(--border-color)', background: '#fff' }}
            />
          ) : (
            <p style={{ color: 'var(--text-muted)' }}>No signature recorded.</p>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '20px', padding: '24px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '18px' }}>Travellers</h2>
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
        </div>

        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '20px', padding: '24px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '18px' }}>Fare Breakdown</h2>
          <DetailRow label="Base Fare" value={formatMoney(fareBreakdown.base_fare, snapshot.currency)} />
          <DetailRow label="Taxes & Fees" value={formatMoney(fareBreakdown.taxes_and_fee, snapshot.currency)} />
          <DetailRow label="Grand Total" value={formatMoney(fareBreakdown.grand_total, snapshot.currency)} />
        </div>
      </div>

      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '20px', padding: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px' }}>
          <Globe size={20} color="#2563eb" />
          <h2 style={{ fontSize: '18px', fontWeight: 800 }}>Ticket Images</h2>
        </div>
        <div style={{ display: 'grid', gap: '16px' }}>
          {(snapshot.ticket_images || []).length ? snapshot.ticket_images.map((ticket, index) => (
            <div key={`${ticket.booking_reference}-${index}`} style={{ padding: '16px', borderRadius: '16px', border: '1px solid var(--border-color)', background: 'var(--bg-app)' }}>
              <div style={{ fontWeight: 700, marginBottom: '12px' }}>{ticket.booking_reference}</div>
              <img src={ticket.url} alt={ticket.booking_reference} style={{ width: '100%', borderRadius: '14px', border: '1px solid var(--border-color)' }} />
            </div>
          )) : (
            <p style={{ color: 'var(--text-muted)' }}>No ticket images stored in this proof snapshot.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default ConsentProofPage;
