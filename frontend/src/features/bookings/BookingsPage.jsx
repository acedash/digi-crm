import React, { useState, useEffect } from 'react';
import { useLocation, useParams, useNavigate } from 'react-router-dom';
import BookingList from './BookingList';
import BookingForm from './BookingForm';
import { motion, AnimatePresence } from 'framer-motion';

const BookingsPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { id: urlId } = useParams();
  const [view, setView] = useState('list'); // 'list', 'form'
  const [editingId, setEditingId] = useState(null);

  const basePath = '/' + location.pathname.split('/')[1];

  useEffect(() => {
    if (location.pathname.endsWith('/new')) {
      setView('form');
      setEditingId(null);
    } else if (urlId && location.pathname.endsWith('/edit')) {
      setView('form');
    } else {
      setView('list');
      setEditingId(null);
    }
  }, [location.pathname, urlId]);

  const handleCreate = () => {
    navigate(`${basePath}/bookings/new`);
  };

  const handleEdit = (id) => {
    navigate(`${basePath}/bookings/${id}/edit`);
  };

  const handleSuccess = () => {
    navigate(`${basePath}/bookings`);
  };

  return (
    <div style={{ position: 'relative', minHeight: '100vh' }}>
      <AnimatePresence mode="wait">
        {view === 'list' && (
          <motion.div
            key="list"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.3 }}
          >
            <BookingList 
              onCreate={handleCreate} 
              onEdit={handleEdit} 
            />
          </motion.div>
        )}

        {view === 'form' && (
          <motion.div
            key="form"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            transition={{ duration: 0.3 }}
          >
            <div style={{ padding: '24px' }}>
              <div style={{ marginBottom: '24px', maxWidth: '900px', margin: '0 auto 24px' }}>
                <button 
                  onClick={() => navigate(`${basePath}/bookings`)}
                  style={{ 
                    color: 'hsl(var(--muted-foreground))', 
                    fontSize: '14px', 
                    background: 'none', 
                    border: 'none', 
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  ← Back to Bookings
                </button>
              </div>
              <BookingForm 
                bookingId={editingId} 
                onSuccess={handleSuccess} 
                onCancel={() => navigate(`${basePath}/bookings`)} 
              />
            </div>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
};

export default BookingsPage;
