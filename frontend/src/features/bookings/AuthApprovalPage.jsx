import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import {
  CheckCircle2,
  Clock,
  XCircle,
  Plane,
  Package,
  Shield,
  PenLine,
  AlertCircle,
  Calendar,
  Camera,
  Upload,
  X
} from 'lucide-react';
import paymentAuthService from './paymentAuthService';

const AuthApprovalPage = () => {
  const { token } = useParams();
  const canvasRef = useRef(null);
  const [auth, setAuth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [approved, setApproved] = useState(false);
  const [rejected, setRejected] = useState(false);
  const [approving, setApproving] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [error, setError] = useState(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [idProof, setIdProof] = useState(null);
  const [idProofPreview, setIdProofPreview] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    const loadAuth = async () => {
      try {
        const response = await paymentAuthService.getByToken(token);
        setAuth(response.data.data);
      } catch {
        setError('This authorization link is invalid or has expired.');
      } finally {
        setLoading(false);
      }
    };

    loadAuth();
  }, [token]);

  const startDrawing = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX || e.touches[0].clientX) - rect.left;
    const y = (e.clientY || e.touches[0].clientY) - rect.top;
    
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX || (e.touches && e.touches[0].clientX)) - rect.left;
    const y = (e.clientY || (e.touches && e.touches[0].clientY)) - rect.top;
    
    ctx.lineTo(x, y);
    ctx.strokeStyle = '#016040';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.stroke();
    // Prevent scrolling when drawing on touch devices
    if (e.touches) e.preventDefault();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };
  
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError('Image is too large. Please upload a file smaller than 5MB.');
        return;
      }
      setIdProof(file);
      const reader = new FileReader();
      reader.onloadend = () => setIdProofPreview(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const clearFile = (e) => {
    if (e) e.stopPropagation();
    setIdProof(null);
    setIdProofPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleApprove = async () => {
    const canvas = canvasRef.current;
    const signatureData = canvas?.toDataURL('image/png');
    
    setApproving(true);
    try {
      await paymentAuthService.approve(token, { 
        signature: signatureData,
        id_proof: idProof
      });
      setApproved(true);
      setAuth(prev => ({ ...prev, status: 'Approved' }));
    } catch (err) {
      setError(err?.response?.data?.message || 'Approval failed. Please try again.');
    } finally {
      setApproving(false);
    }
  };

  const handleReject = async () => {
    const canvas = canvasRef.current;
    const signatureData = canvas?.toDataURL('image/png');

    setRejecting(true);
    try {
      await paymentAuthService.reject(token, { 
        signature: signatureData,
        id_proof: idProof
      });
      setRejected(true);
      setAuth(prev => ({ ...prev, status: 'Rejected' }));
    } catch (err) {
      setError(err?.response?.data?.message || 'Rejection failed. Please try again.');
    } finally {
      setRejecting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#F2F2F7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 40, height: 40, borderRadius: '50%', border: '4px solid #01604022', borderTopColor: '#016040', margin: '0 auto 16px', animation: 'spin 1s linear infinite' }} />
          <p style={{ color: '#016040', fontWeight: 600 }}>Syncing security credentials...</p>
        </div>
        <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ minHeight: '100vh', background: '#F2F2F7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', maxWidth: 400, padding: 32 }}>
          <XCircle size={64} style={{ color: '#ef4444', margin: '0 auto 24px' }} />
          <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 12, color: '#1c1c1e' }}>Link Expired</h2>
          <p style={{ color: '#636366', lineHeight: 1.6 }}>{error}</p>
        </div>
      </div>
    );
  }

  const isAlreadyApproved = auth?.status === 'Approved' || approved;
  const isAlreadyRejected = auth?.status === 'Rejected' || rejected;
  const authorizationType = auth?.consent_snapshot?.authorization_type || auth?.metadata?.authorization_type || 'initial';
  const cardAllocations = auth?.consent_snapshot?.card_allocations || auth?.metadata?.card_allocations || [];
  const changeEntries = auth?.consent_snapshot?.change_entries || auth?.metadata?.change_entries || [];

  return (
    <div className="auth-container" style={{
      minHeight: '100vh',
      background: '#F2F2F7',
      fontFamily: "'Inter', sans-serif",
      color: '#1c1c1e'
    }}>
      <style>{`
        .auth-container { padding: 60px 20px; }
        .header-box { margin-bottom: 48px; }
        .title { font-size: 42px; }
        .booking-row { display: flex; align-items: center; gap: 20px; padding: 24px; }
        .booking-amount { text-align: right; }
        .total-bar { display: flex; justify-content: space-between; align-items: center; padding: 28px 32px; }
        .card-allocation-row { display: flex; justify-content: space-between; gap: 16px; }
        .action-buttons { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
        .consent-box { padding: 40px; }
        
        @media (max-width: 600px) {
          .auth-container { padding: 24px 16px; }
          .header-box { margin-bottom: 32px; }
          .title { font-size: 28px !important; line-height: 1.2; }
          .booking-row { flex-direction: column; align-items: flex-start; gap: 12px; padding: 20px; }
          .booking-amount { text-align: left !important; }
          .total-bar { flex-direction: column; align-items: flex-start; gap: 12px; padding: 20px !important; }
          .card-allocation-row { flex-direction: column; align-items: flex-start; gap: 8px; }
          .action-buttons { grid-template-columns: 1fr; }
          .consent-box { padding: 24px !important; }
          .approve-btn, .reject-btn { padding: 16px !important; font-size: 16px !important; }
        }
      `}</style>
      <div style={{ maxWidth: 720, margin: '0 auto' }}>

        {/* Header */}
        <div className="header-box" style={{ textAlign: 'center' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 12,
            padding: '8px 24px',
            borderRadius: 100,
            background: 'white',
            boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
            marginBottom: 24,
            border: '1px solid rgba(0,0,0,0.05)'
          }}>
            <Shield size={16} style={{ color: '#016040' }} />
            <span style={{ fontSize: 13, fontWeight: 700, color: '#016040', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              {authorizationType === 'change_charge' ? 'Secure Change Charge Portal' : 'Secure Authorization Portal'}
            </span>
          </div>
          <h1 className="title" style={{ fontWeight: 900, marginBottom: 12, letterSpacing: '-1.5px', color: '#016040' }}>
            {authorizationType === 'change_charge' ? 'Review Update & Approve' : 'Review & Approve'}
          </h1>
          <p style={{ color: '#636366', fontSize: 16 }}>
            Prepared for <strong style={{ color: '#1c1c1e' }}>{auth?.client?.name}</strong>
          </p>
        </div>

        {/* Booking Details Card */}
        <div style={{
          background: 'white',
          borderRadius: '32px',
          padding: '12px',
          boxShadow: '0 20px 40px rgba(0,0,0,0.04)',
          marginBottom: 32,
          border: '1px solid rgba(0,0,0,0.05)'
        }}>
          {auth?.bookings?.map((booking, i) => (
            <div key={i} className="booking-row" style={{
              borderBottom: i < auth.bookings.length - 1 ? '1px solid #F2F2F7' : 'none'
            }}>
              <div style={{
                width: 56, height: 56, borderRadius: '18px',
                background: 'linear-gradient(135deg, #06B68A 0%, #059669 100%)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#ffffff', flexShrink: 0
              }}>
                {(booking.services?.some(service => service.serviceable_type?.includes('Flight'))) ? <Plane size={24} /> : <Package size={24} />}
              </div>
              <div style={{ flex: 1, minWidth: 0, width: '100%' }}>
                <p style={{ fontWeight: 800, fontSize: 16, marginBottom: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {booking.booking_reference || 'Booking Authorization'}
                </p>
                <div style={{ display: 'flex', gap: 16 }}>
                  <span style={{ fontSize: 13, color: '#8e8e93', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <AlertCircle size={14} /> Ref: {booking.booking_reference}
                  </span>
                  {booking.travel_date && (
                    <span style={{ fontSize: 13, color: '#8e8e93', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Calendar size={14} /> {new Date(booking.travel_date).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>
              <div className="booking-amount" style={{ fontWeight: 900, fontSize: 18, color: '#06B68A' }}>
                {new Intl.NumberFormat('en-US', {
                  style: 'currency',
                  currency: booking.currency || 'USD'
                }).format(booking.total_amount || 0)}
              </div>
            </div>
          ))}
        </div>

        {/* Total Summary Bar */}
        <div className="total-bar" style={{
          background: '#06B68A',
          borderRadius: '24px',
          marginBottom: 40,
          boxShadow: '0 12px 24px rgba(6, 182, 138, 0.2)'
        }}>
          <span style={{ fontSize: 17, fontWeight: 600, color: 'rgba(255,255,255,0.8)' }}>
            {authorizationType === 'change_charge' ? 'Total Additional Charge' : 'Total Authorization Amount'}
          </span>
          <span style={{ fontSize: 36, fontWeight: 900, color: 'white', letterSpacing: '-1px' }}>
            {new Intl.NumberFormat('en-US', {
              style: 'currency',
              currency: auth?.currency || 'USD'
            }).format(auth?.total_amount)}
          </span>
        </div>

        {changeEntries.length ? (
          <div style={{
            background: 'white',
            borderRadius: '28px',
            padding: '28px 32px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.04)',
            marginBottom: 32,
            border: '1px solid rgba(0,0,0,0.05)'
          }}>
            <h3 style={{ fontSize: 20, fontWeight: 800, marginBottom: 16 }}>Updated Booking Changes</h3>
            <div style={{ display: 'grid', gap: 12 }}>
              {changeEntries.map((change, index) => (
                <div key={index} style={{ padding: '16px', borderRadius: '18px', background: '#F9FAFB', border: '1px solid #E5E7EB' }}>
                  <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 6 }}>
                    {change.service_type || 'Service'} · {change.change_type || 'Update'}
                  </div>
                  {change.change_summary ? (
                    <div style={{ fontSize: 14, color: '#636366', lineHeight: 1.6, marginBottom: 6 }}>
                      {change.change_summary}
                    </div>
                  ) : null}
                  {Number(change.additional_charge || 0) > 0 ? (
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#06B68A' }}>
                      Additional Charge: {new Intl.NumberFormat('en-US', {
                        style: 'currency',
                        currency: auth?.currency || 'USD'
                      }).format(Number(change.additional_charge) || 0)}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {cardAllocations.length ? (
          <div style={{
            background: 'white',
            borderRadius: '28px',
            padding: '28px 32px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.04)',
            marginBottom: 32,
            border: '1px solid rgba(0,0,0,0.05)'
          }}>
            <h3 style={{ fontSize: 20, fontWeight: 800, marginBottom: 16 }}>Card Allocation For This Charge</h3>
            <div style={{ display: 'grid', gap: 12 }}>
              {cardAllocations.map((allocation, index) => (
                <div key={index} className="card-allocation-row" style={{ padding: '16px', borderRadius: '18px', background: '#F9FAFB', border: '1px solid #E5E7EB' }}>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 800 }}>{allocation.holder_name || 'Card Holder'}</div>
                    <div style={{ fontSize: 13, color: '#8e8e93', marginTop: 4 }}>{allocation.card_label || 'Card on file'}</div>
                    {allocation.remarks ? (
                      <div style={{ fontSize: 13, color: '#636366', lineHeight: 1.6, marginTop: 6 }}>
                        {allocation.remarks}
                      </div>
                    ) : null}
                  </div>
                  <div style={{ fontSize: 18, fontWeight: 900, color: '#06B68A' }}>
                    {new Intl.NumberFormat('en-US', {
                      style: 'currency',
                      currency: auth?.currency || 'USD'
                    }).format(Number(allocation.amount) || 0)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {/* Consent Section */}
        {isAlreadyApproved ? (
          <div
            style={{
              textAlign: 'center',
              padding: 60,
              background: 'white',
              borderRadius: '40px',
              boxShadow: '0 20px 40px rgba(0,0,0,0.05)',
              border: '2px solid #4ade80'
            }}
          >
            <div style={{
                width: 80, height: 80, borderRadius: '50%', background: '#4ade8022',
                display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px'
            }}>
                <CheckCircle2 size={48} style={{ color: '#4ade80' }} />
            </div>
            <h3 style={{ fontSize: 28, fontWeight: 900, marginBottom: 12, color: '#1c1c1e' }}>
              Confirmed &amp; Secured
            </h3>
            <p style={{ color: '#636366', fontSize: 16, maxWidth: 400, margin: '0 auto' }}>
              Your digital consent has been securely recorded. You may close this window.
            </p>
          </div>
        ) : isAlreadyRejected ? (
          <div
            style={{
              textAlign: 'center',
              padding: 60,
              background: 'white',
              borderRadius: '40px',
              boxShadow: '0 20px 40px rgba(0,0,0,0.05)',
              border: '2px solid #ef4444'
            }}
          >
            <div style={{
                width: 80, height: 80, borderRadius: '50%', background: '#ef444422',
                display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px'
            }}>
                <XCircle size={48} style={{ color: '#ef4444' }} />
            </div>
            <h3 style={{ fontSize: 28, fontWeight: 900, marginBottom: 12, color: '#1c1c1e' }}>
              Authorization Rejected
            </h3>
            <p style={{ color: '#636366', fontSize: 16, maxWidth: 420, margin: '0 auto' }}>
              Your response has been securely recorded. The booking has been marked as rejected in the CRM.
            </p>
          </div>
        ) : (
          <div className="consent-box" style={{
            background: 'white',
            borderRadius: '40px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.05)',
            border: '1px solid rgba(0,0,0,0.05)'
          }}>
            <div style={{ marginBottom: 32 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 16 }}>
                <div>
                  <h3 style={{ fontSize: 18, fontWeight: 800, color: '#1c1c1e', marginBottom: 4 }}>Digital Signature</h3>
                  <p style={{ fontSize: 14, color: '#8e8e93' }}>Please sign inside the box below</p>
                </div>
                <button 
                  onClick={clearSignature}
                  style={{ background: 'transparent', border: 'none', color: '#ef4444', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
                >
                  Clear Signature
                </button>
              </div>
              
              <div style={{ 
                border: '2px dashed #D1D1D6', 
                borderRadius: '20px', 
                overflow: 'hidden', 
                background: '#F9F9F9',
                cursor: 'crosshair',
                touchAction: 'none'
              }}>
                <canvas
                  ref={canvasRef}
                  width={640}
                  height={200}
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseOut={stopDrawing}
                  onTouchStart={startDrawing}
                  onTouchMove={draw}
                  onTouchEnd={stopDrawing}
                  style={{ width: '100%', display: 'block' }}
                />
              </div>
            </div>

            {/* ID Proof Upload Section */}
            <div style={{ marginBottom: 32 }}>
              <h3 style={{ fontSize: 18, fontWeight: 800, color: '#1c1c1e', marginBottom: 12 }}>
                Identity Verification (Optional)
              </h3>
              <p style={{ fontSize: 13, color: '#8e8e93', marginBottom: 16 }}>
                You may upload a photo of your ID or travel document for extra security.
              </p>

              <div 
                onClick={() => fileInputRef.current?.click()}
                style={{
                  border: idProofPreview ? 'none' : '2px dashed #01604033',
                  borderRadius: '24px',
                  background: idProofPreview ? 'none' : 'white',
                  padding: idProofPreview ? 0 : '32px',
                  textAlign: 'center',
                  cursor: 'pointer',
                  position: 'relative',
                  overflow: 'hidden',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                }}
                onMouseEnter={(e) => { if(!idProofPreview) e.currentTarget.style.borderColor = '#01604077' }}
                onMouseLeave={(e) => { if(!idProofPreview) e.currentTarget.style.borderColor = '#01604033' }}
              >
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileChange} 
                  accept="image/*" 
                  style={{ display: 'none' }} 
                />
                
                {idProofPreview ? (
                  <div style={{ position: 'relative', borderRadius: '24px', overflow: 'hidden', boxShadow: '0 8px 24px rgba(0,0,0,0.08)' }}>
                    <img src={idProofPreview} alt="ID preview" style={{ width: '100%', height: '240px', objectFit: 'cover' }} />
                    <div style={{ 
                      position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, 
                      background: 'rgba(0,0,0,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      opacity: 0, transition: 'opacity 0.2s'
                    }}
                    onMouseEnter={e => e.currentTarget.style.opacity = 1}
                    onMouseLeave={e => e.currentTarget.style.opacity = 0}
                    >
                      <button 
                        onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                        style={{ background: 'white', border: 'none', padding: '12px 20px', borderRadius: '100px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}
                      >
                        <Camera size={18} /> Change Photo
                      </button>
                    </div>
                    <button 
                      onClick={clearFile}
                      style={{ position: 'absolute', top: 12, right: 12, width: 32, height: 32, borderRadius: '50%', background: 'rgba(255,255,255,0.9)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#ef4444', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}
                    >
                      <X size={18} />
                    </button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 48, height: 48, borderRadius: '16px', background: '#01604011', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#016040' }}>
                      <Upload size={24} />
                    </div>
                    <div>
                      <p style={{ fontWeight: 700, fontSize: 15, color: '#1c1c1e' }}>Click to upload or take a photo</p>
                      <p style={{ fontSize: 12, color: '#8e8e93', marginTop: 4 }}>PNG, JPG or JPEG (Max 5MB)</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 16, padding: '20px', background: '#F2F2F7', borderRadius: '20px', marginBottom: 32 }}>
               <AlertCircle size={20} style={{ color: '#016040', flexShrink: 0 }} />
               <p style={{ fontSize: 13, color: '#636366', lineHeight: 1.5 }}>
                 By signing above and clicking authorize, you certify that you have reviewed all booking details and authorize the credit card on file to be charged.
               </p>
            </div>

            <div className="action-buttons">
              <button
                className="reject-btn"
                onClick={handleReject}
                disabled={approving || rejecting}
                style={{
                  width: '100%',
                  padding: '20px',
                  borderRadius: '9999px',
                  background: 'white',
                  color: '#ef4444',
                  border: '2px solid #ef4444',
                  fontSize: 18,
                  fontWeight: 800,
                  cursor: approving || rejecting ? 'not-allowed' : 'pointer',
                  opacity: approving || rejecting ? 0.7 : 1
                }}
              >
                {rejecting ? 'Rejecting...' : 'Reject'}
              </button>
              <button
                onClick={handleApprove}
                disabled={approving || rejecting}
                className="pill-button approve-btn"
                style={{
                  width: '100%',
                  padding: '20px',
                  borderRadius: '9999px',
                  background: '#016040',
                  color: 'white',
                  border: 'none',
                  fontSize: 18,
                  fontWeight: 800,
                  cursor: approving || rejecting ? 'not-allowed' : 'pointer',
                  boxShadow: '0 10px 20px rgba(1, 96, 64, 0.2)',
                  transition: 'all 0.3s ease',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 12,
                  opacity: approving || rejecting ? 0.7 : 1
                }}
              >
                {approving ? 'Approving...' : 'Approve & Authorize Payment'}
              </button>
            </div>
          </div>
        )}

        {/* Compliance Footer */}
        <div style={{ textAlign: 'center', marginTop: 40 }}>
          <p style={{ fontSize: 12, color: '#8e8e93', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <Shield size={12} /> Compliance ID: {token.substring(0, 8).toUpperCase()} · SSL Secure · 256-bit Encryption
          </p>
        </div>
      </div>
    </div>
  );
};

export default AuthApprovalPage;
