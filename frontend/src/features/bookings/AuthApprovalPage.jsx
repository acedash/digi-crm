import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  CheckCircle2,
  Clock,
  XCircle,
  Plane,
  Package,
  Shield,
  PenLine,
  AlertCircle,
  Calendar
} from 'lucide-react';
import paymentAuthService from './paymentAuthService';

const AuthApprovalPage = () => {
  const { token } = useParams();
  const canvasRef = useRef(null);
  const [auth, setAuth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [approved, setApproved] = useState(false);
  const [approving, setApproving] = useState(false);
  const [error, setError] = useState(null);
  const [isDrawing, setIsDrawing] = useState(false);

  useEffect(() => {
    loadAuth();
  }, [token]);

  const loadAuth = async () => {
    try {
      const response = await paymentAuthService.getByToken(token);
      setAuth(response.data.data);
    } catch (err) {
      setError('This authorization link is invalid or has expired.');
    } finally {
      setLoading(false);
    }
  };

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

  const handleApprove = async () => {
    const canvas = canvasRef.current;
    const signatureData = canvas?.toDataURL('image/png');
    
    setApproving(true);
    try {
      await paymentAuthService.approve(token, { signature: signatureData });
      setApproved(true);
      setAuth(prev => ({ ...prev, status: 'Approved' }));
    } catch (err) {
      setError(err?.response?.data?.message || 'Approval failed. Please try again.');
    } finally {
      setApproving(false);
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

  return (
    <div style={{
      minHeight: '100vh',
      background: '#F2F2F7',
      fontFamily: "'Inter', sans-serif",
      color: '#1c1c1e',
      padding: '60px 20px'
    }}>
      <div style={{ maxWidth: 720, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
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
              Secure Authorization Portal
            </span>
          </div>
          <h1 style={{ fontSize: 42, fontWeight: 900, marginBottom: 12, letterSpacing: '-1.5px', color: '#016040' }}>
            Review &amp; Approve
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
            <div key={i} style={{
              display: 'flex',
              alignItems: 'center',
              gap: 20,
              padding: '24px',
              borderBottom: i < auth.bookings.length - 1 ? '1px solid #F2F2F7' : 'none'
            }}>
              <div style={{
                width: 56, height: 56, borderRadius: '18px',
                background: 'rgba(1, 96, 64, 0.05)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#016040', flexShrink: 0
              }}>
                {booking.type === 'Flight' ? <Plane size={24} /> : <Package size={24} />}
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontWeight: 800, fontSize: 16, marginBottom: 4 }}>
                  {booking.description || `${booking.type} Booking`}
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
              <div style={{ textAlign: 'right', fontWeight: 900, fontSize: 18, color: '#016040' }}>
                {new Intl.NumberFormat('en-US', {
                  style: 'currency',
                  currency: booking.currency || 'USD'
                }).format(booking.total_price)}
              </div>
            </div>
          ))}
        </div>

        {/* Total Summary Bar */}
        <div style={{
          background: '#016040',
          borderRadius: '24px',
          padding: '28px 32px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 40,
          boxShadow: '0 12px 24px rgba(1, 96, 64, 0.2)'
        }}>
          <span style={{ fontSize: 17, fontWeight: 600, color: 'rgba(255,255,255,0.8)' }}>
            Total Authorization Amount
          </span>
          <span style={{ fontSize: 36, fontWeight: 900, color: 'white', letterSpacing: '-1px' }}>
            {new Intl.NumberFormat('en-US', {
              style: 'currency',
              currency: auth?.currency || 'USD'
            }).format(auth?.total_amount)}
          </span>
        </div>

        {/* Consent Section */}
        {isAlreadyApproved ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
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
          </motion.div>
        ) : (
          <div style={{
            background: 'white',
            borderRadius: '40px',
            padding: 40,
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

            <div style={{ display: 'flex', gap: 16, padding: '20px', background: '#F2F2F7', borderRadius: '20px', marginBottom: 32 }}>
               <AlertCircle size={20} style={{ color: '#016040', flexShrink: 0 }} />
               <p style={{ fontSize: 13, color: '#636366', lineHeight: 1.5 }}>
                 By signing above and clicking authorize, you certify that you have reviewed all booking details and authorize the credit card on file to be charged.
               </p>
            </div>

            <button
              onClick={handleApprove}
              disabled={approving}
              className="pill-button"
              style={{
                width: '100%',
                padding: '20px',
                borderRadius: '9999px',
                background: '#016040',
                color: 'white',
                border: 'none',
                fontSize: 18,
                fontWeight: 800,
                cursor: approving ? 'not-allowed' : 'pointer',
                boxShadow: '0 10px 20px rgba(1, 96, 64, 0.2)',
                transition: 'all 0.3s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 12
              }}
            >
              {approving ? 'Securing Consent...' : 'Approve & Authorize Payment'}
            </button>
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
