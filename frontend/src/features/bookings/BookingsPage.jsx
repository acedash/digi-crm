import React from 'react';
import { useLocation, useParams, useNavigate } from 'react-router-dom';
import BookingList from './BookingList';
import BookingForm from './BookingForm';
import { AnimatePresence } from 'framer-motion';

const BookingsPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { id: urlId } = useParams();
  const basePath = '/' + location.pathname.split('/')[1];
  const isCreateRoute = location.pathname.endsWith('/new');
  const isEditRoute = Boolean(urlId && location.pathname.endsWith('/edit'));
  const view = isCreateRoute || isEditRoute ? 'form' : 'list';
  const editingId = isEditRoute ? urlId : null;

  const handleCreate = () => {
    navigate(`${basePath}/bookings/new`);
  };

  const handleEdit = (id) => {
    navigate(`${basePath}/bookings/${id}/edit`);
  };

  const handleSuccess = (flash) => {
    navigate(location.state?.returnTo || `${basePath}/bookings`, { state: { flash }, replace: true });
  };



  return (
    <div style={{ position: 'relative', minHeight: '100vh' }}>
      <AnimatePresence mode="wait">
        {view === 'list' && (
          <div key="list">
            <BookingList 
              onCreate={handleCreate} 
              onEdit={handleEdit} 
            />
          </div>
        )}

        {view === 'form' && (
          <div key="form">
            <div style={{ padding: '24px' }}>
              <BookingForm 
                key={editingId || 'new'}
                bookingId={editingId} 
                onSuccess={handleSuccess} 
                onCancel={() => navigate(location.state?.returnTo || `${basePath}/bookings`, { replace: true })} 
              />
            </div>
          </div>
        )}

      </AnimatePresence>
    </div>
  );
};

export default BookingsPage;
