import React, { useState, useEffect } from 'react';
import { X, Building2, Car, Ship, Star, MapPin, User, Anchor, Plus } from 'lucide-react';
import { motion } from 'framer-motion';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import masterService from './masterService';

const MasterForm = ({ isOpen, onClose, onSuccess, type = 'hotel', master = null }) => {
  const [formData, setFormData] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (master) {
      setFormData({ ...master });
    } else {
      if (type === 'hotel') {
        setFormData({ name: '', city: '', country: '', rating: 5 });
      } else if (type === 'car') {
        setFormData({ car_type: 'Sedan', company: '', capacity: 4, price_per_day: '' });
      } else if (type === 'cruise') {
        setFormData({ cruise_name: '', operator: '', departure_port: '', destination: '', duration: '' });
      }
    }
  }, [type, isOpen, master]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (formData.id) {
        await masterService.updateMaster(type, formData.id, formData);
      } else {
        await masterService.createMaster(type, formData);
      }
      onSuccess();
      onClose();
    } catch (error) {
      console.error(`Failed to save ${type}`, error);
      alert(`Error saving ${type}. Please check fields.`);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 1000,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      background: 'rgba(2, 6, 23, 0.8)',
      backdropFilter: 'blur(8px)'
    }}>
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="glass-panel"
        style={{
          width: '100%',
          maxWidth: '500px',
          borderRadius: '24px',
          overflow: 'hidden',
          background: 'var(--bg-app)'
        }}
      >
        <div style={{ 
          padding: '24px 32px', 
          borderBottom: '1px solid var(--border-color)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'var(--bg-card)'
        }}>
          <div>
            <h2 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-main)', textTransform: 'capitalize' }}>
              {master ? 'Edit' : 'Add'} {type} Master
            </h2>
            <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
              Configure a reusable {type} entry for bookings.
            </p>
          </div>
          <button onClick={onClose} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '32px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            {type === 'hotel' && (
              <>
                <Input 
                  label="Hotel Name" 
                  placeholder="e.g. Atlantis The Palm"
                  value={formData.name || ''}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  required
                />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <Input label="City" value={formData.city || ''} onChange={e => setFormData({...formData, city: e.target.value})} required />
                  <Input label="Country" value={formData.country || ''} onChange={e => setFormData({...formData, country: e.target.value})} required />
                </div>
                <div style={{ marginBottom: '8px' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '8px', color: 'var(--text-muted)' }}>Star Rating</label>
                  <div style={{ display: 'flex', gap: '12px' }}>
                    {[1, 2, 3, 4, 5].map(star => (
                      <button 
                        key={star}
                        type="button"
                        onClick={() => setFormData({...formData, rating: star})}
                        style={{
                          border: 'none',
                          background: 'none',
                          cursor: 'pointer',
                          color: star <= (formData.rating || 0) ? 'hsl(var(--primary))' : 'var(--text-muted)',
                          transition: 'var(--transition-smooth)'
                        }}
                      >
                        <Star size={24} fill={star <= (formData.rating || 0) ? 'hsl(var(--primary))' : 'none'} />
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}

            {type === 'car' && (
              <>
                <Input 
                  label="Company / Model" 
                  placeholder="e.g. Toyota Camry"
                  value={formData.company || ''}
                  onChange={e => setFormData({...formData, company: e.target.value})}
                  required
                />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div style={{ marginBottom: '8px' }}>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '8px', color: 'var(--text-muted)' }}>Car Type</label>
                    <select 
                      style={{
                        width: '100%',
                        background: 'var(--bg-input, #fff)',
                        border: '1px solid var(--border-color, #ccc)',
                        borderRadius: '12px',
                        padding: '12px',
                        color: 'var(--text-main, inherit)',
                        fontSize: '14px',
                        outline: 'none',
                        appearance: 'auto'
                      }}
                      value={formData.car_type || 'Sedan'}
                      onChange={e => setFormData({...formData, car_type: e.target.value})}
                    >
                      <option value="Sedan">Sedan</option>
                      <option value="SUV">SUV</option>
                      <option value="Luxury">Luxury</option>
                      <option value="Van">Van</option>
                      <option value="Bus">Bus</option>
                    </select>
                  </div>
                  <Input 
                    label="Capacity" 
                    type="number" 
                    value={formData.capacity || 4} 
                    onChange={e => setFormData({...formData, capacity: e.target.value})} 
                  />
                </div>
                <Input 
                  label="Price per Day (Estimated)" 
                  type="number"
                  placeholder="0.00"
                  value={formData.price_per_day || ''}
                  onChange={e => setFormData({...formData, price_per_day: e.target.value})}
                />
              </>
            )}

            {type === 'cruise' && (
              <>
                <Input 
                  label="Cruise Ship Name" 
                  placeholder="e.g. Wonder of the Seas"
                  value={formData.cruise_name || ''}
                  onChange={e => setFormData({...formData, cruise_name: e.target.value})}
                  required
                />
                <Input 
                  label="Operator" 
                  placeholder="e.g. Royal Caribbean"
                  value={formData.operator || ''}
                  onChange={e => setFormData({...formData, operator: e.target.value})}
                  required
                />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <Input label="Departure Port" value={formData.departure_port || ''} onChange={e => setFormData({...formData, departure_port: e.target.value})} />
                  <Input label="Destination" value={formData.destination || ''} onChange={e => setFormData({...formData, destination: e.target.value})} />
                </div>
              </>
            )}

          </div>

          <div style={{ 
            marginTop: '32px',
            display: 'flex', 
            gap: '16px', 
            justifyContent: 'flex-end'
          }}>
            <Button variant="ghost" onClick={onClose} type="button">Cancel</Button>
            <Button type="submit" loading={loading} icon={Plus}>
              Save {type}
            </Button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

export default MasterForm;
