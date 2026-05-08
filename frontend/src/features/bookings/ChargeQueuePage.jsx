import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, BadgeDollarSign, CreditCard, RefreshCw, ShieldCheck, Calendar as CalendarIcon } from 'lucide-react';
import paymentAuthService from './paymentAuthService';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Toast from '../../components/ui/Toast';
import sensitiveAuditService from '../../services/sensitiveAuditService';

const formatMoney = (amount, currency = 'USD') =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(Number(amount || 0));

const extractLast4 = (value) => {
  const clean = String(value || '').replace(/\D+/g, '');
  return clean ? clean.slice(-4) : '';
};

const normalizeExpiry = (card) => {
  if (card.exp) return card.exp;
  if (card.expiry_month && card.expiry_year) {
    return `${String(card.expiry_month).padStart(2, '0')}/${String(card.expiry_year).slice(-2)}`;
  }
  return '';
};

const resolveChargeCards = (record) => {
  const authType = record.consent_snapshot?.authorization_type || record.metadata?.authorization_type || 'initial';
  const bookingCards = record.bookings?.[0]?.details_json?.payment_cards || [];
  const clientCards = record.client?.cards || [];

  if (authType === 'initial') {
    return bookingCards
      .filter((card) => Number(card.amount || 0) > 0)
      .map((card) => ({
        holder_name: card.holder_name,
        number: card.number,
        exp: card.exp,
        cvv: card.cvv,
        amount: Number(card.amount || 0),
        remarks: card.remarks || '',
        source: 'booking',
      }));
  }

  const allocations = record.consent_snapshot?.card_allocations || record.metadata?.card_allocations || [];

  return allocations.map((allocation) => {
    const allocationLast4 = extractLast4(allocation.card_label);
    const bookingMatch = bookingCards.find((card) => {
      const bookingLast4 = extractLast4(card.number);
      return (
        (allocationLast4 && bookingLast4 === allocationLast4) ||
        (allocation.holder_name && card.holder_name && allocation.holder_name.toLowerCase() === card.holder_name.toLowerCase())
      );
    });

    const clientMatch = clientCards.find((card) => {
      const clientLast4 = extractLast4(card.last_4 || card.card_number);
      return (
        (allocationLast4 && clientLast4 === allocationLast4) ||
        (allocation.holder_name && card.card_holder_name && allocation.holder_name.toLowerCase() === card.card_holder_name.toLowerCase())
      );
    });

    const matched = bookingMatch
      ? {
          holder_name: bookingMatch.holder_name,
          number: bookingMatch.number,
          exp: bookingMatch.exp,
          cvv: bookingMatch.cvv,
          remarks: allocation.remarks || bookingMatch.remarks || '',
          source: 'booking',
        }
      : clientMatch
        ? {
            holder_name: clientMatch.card_holder_name,
            number: clientMatch.card_number,
            exp: normalizeExpiry(clientMatch),
            cvv: clientMatch.cvv,
            remarks: allocation.remarks || '',
            source: 'client',
          }
        : {
            holder_name: allocation.holder_name || 'Card on file',
            number: allocation.card_label || 'Unavailable',
            exp: '',
            cvv: '',
            remarks: allocation.remarks || '',
            source: 'allocation',
          };

    return {
      ...matched,
      amount: Number(allocation.amount || 0),
    };
  });
};

const ChargeQueuePage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [submittingId, setSubmittingId] = useState(null);
  const [queue, setQueue] = useState([]);
  const [viewFilter, setViewFilter] = useState('all');
  const [period, setPeriod] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [revealedCards, setRevealedCards] = useState({});
  const [collectionReference, setCollectionReference] = useState('');
  const [collectionNotes, setCollectionNotes] = useState('');
  const [chargeStatus, setChargeStatus] = useState('Charged/Captured');
  const [meta, setMeta] = useState({ total: 0, current_page: 1, last_page: 1 });
  const [stats, setStats] = useState({ initial: 0, modified: 0 }); 
  const [toast, setToast] = useState({ message: '', type: 'error' });

  const getFilterParams = useCallback(() => {
    const params = {};
    const today = new Date().toISOString().split('T')[0];

    if (period === 'daily') {
      params.startDate = today;
      params.endDate = today;
    } else if (period === 'yesterday') {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yStr = yesterday.toISOString().split('T')[0];
      params.startDate = yStr;
      params.endDate = yStr;
    } else if (period === 'weekly') {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      params.startDate = weekAgo.toISOString().split('T')[0];
      params.endDate = today;
    } else if (period === 'monthly') {
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      params.startDate = startOfMonth.toISOString().split('T')[0];
      params.endDate = today;
    } else if (period === 'custom') {
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
    }
    return params;
  }, [period, startDate, endDate]);

  const loadQueue = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params = { ...getFilterParams(), page };
      const response = await paymentAuthService.getChargeQueue(viewFilter, params);
      
      // Handle Laravel Pagination Structure
      const result = response.data.data;
      if (result && result.data) {
        setQueue(result.data);
        setMeta({
          total: result.total,
          current_page: result.current_page,
          last_page: result.last_page
        });

        // Update local stats for the visual cards
        const initialCount = result.data.filter(item => (item.consent_snapshot?.authorization_type || item.metadata?.authorization_type || 'initial') === 'initial').length;
        const modifiedCount = result.data.filter(item => (item.consent_snapshot?.authorization_type || item.metadata?.authorization_type) === 'change_charge').length;
        setStats({ initial: initialCount, modified: modifiedCount });
      } else {
        setQueue([]);
        setMeta({ total: 0, current_page: 1, last_page: 1 });
      }
    } catch (error) {
      setToast({ message: error?.response?.data?.message || 'Failed to load charge queue.', type: 'error' });
    } finally {
      setLoading(false);
    }
  }, [viewFilter, getFilterParams]);

  useEffect(() => {
    loadQueue();
  }, [loadQueue]);

  useEffect(() => {
    sensitiveAuditService.logEvent({
      event_type: 'Sensitive Page Viewed',
      module: 'Charge Queue',
      description: 'Opened admin charge queue',
      details: { view: viewFilter, period },
    }).catch(() => {});
  }, [viewFilter, period]);

  const openMarkCharged = (record) => {
    setSelectedRecord(record);
    setRevealedCards({});
    setCollectionReference(record.collection_reference || '');
    setCollectionNotes(record.collection_notes || '');
    setChargeStatus(record.charge_status || 'Charged/Captured');
  };

  const revealCard = (recordId, card, index) => {
    const key = `${recordId}-${index}`;
    setRevealedCards((prev) => ({ ...prev, [key]: true }));
    sensitiveAuditService.logEvent({
      event_type: 'Card Details Revealed',
      module: 'Charge Queue',
      description: 'Admin revealed charge card details',
      details: {
        authorization_id: recordId,
        holder_name: card.holder_name || 'Unknown',
        last_4: extractLast4(card.number || card.card_label),
      },
    }).catch(() => {});
  };

  const submitMarkCharged = async () => {
    if (!selectedRecord) return;

    try {
      setSubmittingId(selectedRecord.id);
      await paymentAuthService.markCharged(selectedRecord.id, {
        collection_reference: collectionReference,
        collection_notes: collectionNotes,
        charge_status: chargeStatus,
      });
      setToast({ message: 'Marked as charged successfully.', type: 'success' });
      setSelectedRecord(null);
      await loadQueue();
    } catch (error) {
      setToast({ message: error?.response?.data?.message || 'Failed to mark as charged.', type: 'error' });
    } finally {
      setSubmittingId(null);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: '20px', flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: '32px', fontWeight: 800, letterSpacing: '-1px', marginBottom: '8px' }}>
            Charge <span style={{ color: '#10b981' }}>Queue</span>
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '15px' }}>
            Manage approved payments pending charge or already collected.
          </p>
        </div>
        <Button variant="outline" icon={RefreshCw} size="sm" onClick={loadQueue}>
          Refresh
        </Button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
          {/* Main View Filters */}
          <div style={{ display: 'flex', gap: '8px', overflowX: 'auto' }}>
            {[
              { value: 'all', label: 'All Records' },
              { value: 'pending', label: 'Pending Charge' },
              { value: 'charged', label: 'Charged History' },
            ].map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setViewFilter(option.value)}
                style={{
                  padding: '6px 16px',
                  borderRadius: '100px',
                  background: viewFilter === option.value ? 'hsl(var(--primary))' : 'var(--bg-card)',
                  color: viewFilter === option.value ? 'white' : 'var(--text-muted)',
                  border: '1px solid var(--border-color)',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  whiteSpace: 'nowrap'
                }}
              >
                {option.label}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', gap: '4px', background: 'var(--bg-input)', padding: '4px', borderRadius: '12px', border: '1px solid var(--border-color)', width: 'fit-content' }}>
            {[
              { value: 'all', label: 'All Time' },
              { value: 'daily', label: 'Daily' },
              { value: 'yesterday', label: 'Yesterday' },
              { value: 'weekly', label: 'Weekly' },
              { value: 'monthly', label: 'Monthly' },
              { value: 'custom', label: 'Custom Date' },
            ].map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setPeriod(option.value)}
                style={{
                  padding: '6px 16px',
                  borderRadius: '10px',
                  border: 'none',
                  background: period === option.value ? 'var(--bg-card)' : 'transparent',
                  color: period === option.value ? 'var(--text-main)' : 'var(--text-muted)',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  boxShadow: period === option.value ? '0 2px 8px rgba(0,0,0,0.1)' : 'none'
                }}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {period === 'custom' && (
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', background: 'var(--bg-card)', padding: '6px', borderRadius: '16px', border: '1px solid var(--border-color)', width: 'fit-content', marginTop: '4px', alignSelf: 'flex-end' }}>
            <div style={{ width: '150px' }}>
              <Input 
                type="date" 
                icon={CalendarIcon}
                value={startDate} 
                onChange={(e) => setStartDate(e.target.value)} 
                style={{ marginBottom: 0 }}
                inputStyle={{ padding: '8px 12px', paddingLeft: '44px', fontSize: '13px', background: 'var(--bg-input)', borderRadius: '10px' }}
              />
            </div>
            <span style={{ color: 'var(--text-muted)', fontWeight: 600, padding: '0 4px', fontSize: '13px' }}>to</span>
            <div style={{ width: '150px' }}>
              <Input 
                type="date" 
                icon={CalendarIcon}
                value={endDate} 
                onChange={(e) => setEndDate(e.target.value)} 
                style={{ marginBottom: 0 }}
                inputStyle={{ padding: '8px 12px', paddingLeft: '44px', fontSize: '13px', background: 'var(--bg-input)', borderRadius: '10px' }}
              />
            </div>
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
        <Card title="Records" subtitle="Total in current queue" icon={BadgeDollarSign}>
          <div style={{ fontSize: '30px', fontWeight: 800, color: '#16a34a' }}>{meta.total}</div>
        </Card>
        <Card title="Initial Approval By Client" subtitle="Current page count" icon={ShieldCheck}>
          <div style={{ fontSize: '30px', fontWeight: 800, color: '#059669' }}>
            {stats.initial}
          </div>
        </Card>
        <Card title="Change Charge Approval" subtitle="Current page count" icon={CreditCard}>
          <div style={{ fontSize: '30px', fontWeight: 800, color: '#f59e0b' }}>
            {stats.modified}
          </div>
        </Card>
      </div>

      <div className="glass-panel" style={{ padding: '24px', borderRadius: '20px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {loading ? (
            <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading charge queue...</div>
          ) : queue.length === 0 ? (
            <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>
              {viewFilter === 'charged'
                ? 'No charged authorizations found yet.'
                : viewFilter === 'all'
                  ? 'No charge records found.'
                  : 'Nothing is waiting to be charged right now.'}
            </div>
          ) : (
            <>
              {/* Table Header */}
              <div 
                style={{ 
                  display: 'grid', 
                  gridTemplateColumns: '1.4fr 1.2fr 1.3fr 1fr 0.9fr 2fr', 
                  gap: '24px', 
                  padding: '12px 0', 
                  borderBottom: '2px solid var(--border-color)',
                  fontSize: '11px',
                  fontWeight: 800,
                  color: 'var(--text-muted)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em'
                }}
              >
                <div>Booking / Client</div>
                <div>Type</div>
                <div>{viewFilter === 'charged' ? 'Processed At' : 'Approved At'}</div>
                <div>Status</div>
                <div>Amount</div>
                <div style={{ textAlign: 'right' }}>Actions</div>
              </div>

              {queue.map((record) => {
              const authType = record.consent_snapshot?.authorization_type || record.metadata?.authorization_type || 'initial';
              const booking = record.bookings?.[0];
              const clientName =
                record.client?.name ||
                `${record.client?.first_name || ''} ${record.client?.last_name || ''}`.trim() ||
                'Unknown Client';
              const chargeCards = resolveChargeCards(record);

              return (
                <div
                  key={record.id}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1.4fr 1.2fr 1.3fr 1fr 0.9fr 2fr',
                    gap: '24px',
                    padding: '24px 0',
                    borderBottom: '1px solid var(--border-color)',
                    alignItems: 'center',
                  }}
                >
                  <div style={{ fontWeight: 800, color: 'var(--text-main)', fontSize: '14px' }}>
                    {booking?.booking_reference || `Authorization #${record.id}`}
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px', fontWeight: 500 }}>
                      {clientName}
                    </div>
                  </div>
                  <div style={{ fontWeight: 700, color: authType === 'change_charge' ? '#f59e0b' : '#059669', fontSize: '13px' }}>
                    {authType === 'change_charge' ? 'Change Charge Approval' : 'Initial Approval By Client'}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '13px' }}>
                      {record.collected_at
                        ? new Date(record.collected_at).toLocaleString()
                        : record.approved_at
                          ? new Date(record.approved_at).toLocaleString()
                          : 'Pending'}
                    </div>
                    {record.collected_by && record.collector?.name && (
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                        by {record.collector.name}
                      </div>
                    )}
                  </div>
                  <div style={{ fontSize: '12px' }}>
                    {record.charge_status ? (
                      <span style={{ 
                        padding: '4px 8px', 
                        borderRadius: '6px', 
                        background: record.charge_status === 'Charged/Captured' ? 'rgba(22, 163, 74, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                        color: record.charge_status === 'Charged/Captured' ? '#16a34a' : '#ef4444',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        fontSize: '10px',
                        letterSpacing: '0.05em'
                      }}>
                        {record.charge_status}
                      </span>
                    ) : (
                      <span style={{ color: 'var(--text-muted)', fontWeight: 500 }}>--</span>
                    )}
                  </div>
                  <div style={{ fontWeight: 800, color: '#16a34a', fontSize: '15px' }}>
                    {formatMoney(record.total_amount, record.currency)}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '16px', flexWrap: 'nowrap', alignItems: 'center' }}>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                      {chargeCards.length} card{chargeCards.length === 1 ? '' : 's'}
                    </div>
                    {booking?.id && (
                      <Button
                        variant="ghost"
                        size="sm"
                        icon={ArrowRight}
                        onClick={() => {
                          sensitiveAuditService.logEvent({
                            event_type: 'Sensitive Page Opened',
                            module: 'Consent Proof',
                            description: 'Opened booking consent proof from charge queue',
                            details: {
                              booking_id: booking.id,
                              authorization_id: record.id,
                            },
                          }).catch(() => {});
                          navigate(`/admin/bookings/${booking.id}/consent-proof`);
                        }}
                      >
                        Proof
                      </Button>
                    )}
                    {record.collected_at ? (
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <div style={{ alignSelf: 'center', fontSize: '11px', color: '#16a34a', fontWeight: 700, background: 'rgba(22, 163, 74, 0.1)', padding: '6px 12px', borderRadius: '8px', textTransform: 'uppercase' }}>
                          Processed
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openMarkCharged(record)}
                          style={{ padding: '4px 8px', fontSize: '11px', borderRadius: '8px' }}
                        >
                          Edit Status
                        </Button>
                      </div>
                    ) : (
                      <Button
                        variant="primary"
                        size="sm"
                        icon={BadgeDollarSign}
                        onClick={() => openMarkCharged(record)}
                      >
                        Mark Charged
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
            </>
          )}
        </div>

        {!loading && meta.last_page > 1 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '24px', padding: '16px', borderTop: '1px solid var(--border-color)' }}>
            <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
              Page <strong>{meta.current_page}</strong> of <strong>{meta.last_page}</strong> ({meta.total} total)
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <Button 
                variant="outline" 
                size="sm" 
                disabled={meta.current_page === 1}
                onClick={() => loadQueue(meta.current_page - 1)}
              >
                Previous
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                disabled={meta.current_page === meta.last_page}
                onClick={() => loadQueue(meta.current_page + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

      {selectedRecord && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(2, 6, 23, 0.82)',
            backdropFilter: 'blur(10px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1200,
            padding: '24px',
          }}
        >
          <div style={{ width: '100%', maxWidth: '520px', background: 'var(--bg-card)', borderRadius: '20px', padding: '24px', border: '1px solid var(--border-color)' }}>
            <h3 style={{ fontSize: '20px', fontWeight: 800, marginBottom: '10px' }}>
              {selectedRecord.collected_at ? 'Edit Charge Status' : 'Mark Authorization as Charged'}
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '20px' }}>
              Record the collection details for {selectedRecord.bookings?.[0]?.booking_reference || `authorization #${selectedRecord.id}`}.
            </p>

            <div
              style={{
                marginBottom: '20px',
                padding: '16px',
                borderRadius: '16px',
                background: 'var(--bg-app)',
                border: '1px solid var(--border-color)',
              }}
            >
              <div style={{ fontSize: '12px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '12px' }}>
                Cards To Charge
              </div>
              <div style={{ display: 'grid', gap: '12px' }}>
                {resolveChargeCards(selectedRecord).map((card, index) => {
                  const revealKey = `${selectedRecord.id}-${index}`;
                  const isRevealed = Boolean(revealedCards[revealKey]);

                  return (
                  <div
                    key={`${card.number}-${index}`}
                    style={{
                      padding: '14px 16px',
                      borderRadius: '14px',
                      background: 'var(--bg-card)',
                      border: '1px solid var(--border-color)',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                      <div style={{ display: 'grid', gap: '4px' }}>
                        <div style={{ fontWeight: 800, color: 'var(--text-main)' }}>{card.holder_name || 'Card Holder'}</div>
                        <div style={{ fontSize: '13px', color: 'var(--text-main)' }}>
                          Number: {isRevealed ? (card.number || 'Not available') : (extractLast4(card.number || card.card_label) ? `•••• •••• •••• ${extractLast4(card.number || card.card_label)}` : 'Hidden')}
                        </div>
                        <div style={{ fontSize: '13px', color: 'var(--text-main)' }}>
                          Expiry: {card.exp || 'Not available'}{isRevealed && card.cvv ? ` • CVV: ${card.cvv}` : !isRevealed && card.cvv ? ' • CVV: Hidden' : ''}
                        </div>
                        {card.remarks && (
                          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Remarks: {card.remarks}</div>
                        )}
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                          Source: {card.source === 'client' ? 'Saved Client Card' : card.source === 'booking' ? 'Booking Card' : 'Allocation Snapshot'}
                        </div>
                        {!isRevealed && (
                          <div style={{ marginTop: '8px' }}>
                            <Button variant="outline" size="sm" onClick={() => revealCard(selectedRecord.id, card, index)}>
                              Reveal Card
                            </Button>
                          </div>
                        )}
                      </div>
                      <div style={{ fontSize: '16px', fontWeight: 800, color: '#16a34a' }}>
                        {formatMoney(card.amount, selectedRecord.currency)}
                      </div>
                    </div>
                  </div>
                )})}
              </div>
            </div>

             <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '8px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                Charge Result Status
              </label>
              <select
                value={chargeStatus}
                onChange={(e) => setChargeStatus(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  borderRadius: '12px',
                  background: 'var(--bg-input)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-main)',
                  fontSize: '14px',
                  fontWeight: 600,
                  outline: 'none',
                  cursor: 'pointer'
                }}
              >
                <option value="Charged/Captured">Charged/Captured</option>
                <option value="Pending">Pending</option>
                <option value="Decline">Decline</option>
                <option value="Chargeback">Chargeback</option>
                <option value="Refunded">Refunded</option>
              </select>
            </div>

            <Input
              label="Collection Reference"
              placeholder="Optional bank reference or internal receipt id"
              value={collectionReference}
              onChange={(e) => setCollectionReference(e.target.value)}
            />

            <div style={{ marginTop: '16px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '8px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                Collection Notes
              </label>
              <textarea
                value={collectionNotes}
                onChange={(e) => setCollectionNotes(e.target.value)}
                placeholder="Optional notes about how the charge was processed"
                style={{
                  width: '100%',
                  minHeight: '120px',
                  padding: '14px 16px',
                  borderRadius: '16px',
                  background: 'var(--bg-input)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-main)',
                  outline: 'none',
                  resize: 'vertical',
                }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
              <Button variant="ghost" onClick={() => setSelectedRecord(null)}>Cancel</Button>
              <Button
                variant="primary"
                icon={BadgeDollarSign}
                onClick={submitMarkCharged}
                isLoading={submittingId === selectedRecord.id}
              >
                {selectedRecord.collected_at ? 'Update Status' : 'Confirm Charged'}
              </Button>
            </div>
          </div>
        </div>
      )}

      <Toast message={toast.message} type={toast.type} onClose={() => setToast({ message: '', type: 'error' })} />
    </div>
  );
};

export default ChargeQueuePage;
