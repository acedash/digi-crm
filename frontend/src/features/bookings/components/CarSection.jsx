import React from 'react';
import { Car, ImagePlus, Trash2 } from 'lucide-react';
import Card from '../../../components/ui/Card';
import Input from '../../../components/ui/Input';
import Button from '../../../components/ui/Button';
import SectionHeader from './SectionHeader';

const CarSection = ({ vehicle, setVehicle, isEditMode = false, showChangeTracking = false }) => {
  const vehicleInputId = 'vehicle-images-upload';
  const handleVehicleImages = (event) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;

    files.forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setVehicle((current) => ({
          ...current,
          images: [...(current.images || []), reader.result],
          image_previews: [...(current.image_previews || []), reader.result],
        }));
      };
      reader.readAsDataURL(file);
    });

    event.target.value = '';
  };

  const removeVehicleImage = (index) => {
    setVehicle((current) => ({
      ...current,
      images: (current.images || []).filter((_, imageIndex) => imageIndex !== index),
      image_previews: (current.image_previews || []).filter((_, imageIndex) => imageIndex !== index),
    }));
  };

  return (
    <Card style={{ padding: 0, opacity: vehicle.active ? 1 : 0.7 }}>
      <SectionHeader 
        icon={Car} 
        title="5. Rental Car" 
        toggle={true} 
        isActive={vehicle.active} 
        setToggle={(v) => setVehicle({...vehicle, active: v})} 
      />
      {vehicle.active && (
         <div style={{ padding: '24px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
              <Input label="Rental Company" required placeholder="e.g. Hertz" value={vehicle.company || ''} onChange={e => setVehicle({...vehicle, company: e.target.value})} />
              <Input label="Car Model" required placeholder="e.g. Toyota Camry" value={vehicle.model || ''} onChange={e => setVehicle({...vehicle, model: e.target.value})} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.2fr 1fr 1fr', gap: '16px', marginBottom: '24px' }}>
              <Input label="Pickup Location" value={vehicle.pickup_loc || ''} onChange={e => setVehicle({...vehicle, pickup_loc: e.target.value})} />
              <Input label="Drop Location" value={vehicle.drop_loc || ''} onChange={e => setVehicle({...vehicle, drop_loc: e.target.value})} />
              <Input label="Pickup Date" type="date" value={vehicle.pickup_date || ''} onChange={e => setVehicle({...vehicle, pickup_date: e.target.value})} />
              <Input label="Dropoff Date" type="date" value={vehicle.dropoff_date || ''} onChange={e => setVehicle({...vehicle, dropoff_date: e.target.value})} />
            </div>
             <div style={{ display: 'flex', gap: '16px' }}>
                <Input label="Net Cost" type="number" value={vehicle.cost || ''} onChange={e => {
                  const cost = parseFloat(e.target.value) || 0;
                  const markup = parseFloat(vehicle.markup) || 0;
                  setVehicle({...vehicle, cost: e.target.value, sell: cost + markup});
                }} />
                <Input label="Taxes & Charges" type="number" value={vehicle.markup || ''} onChange={e => {
                  const markup = parseFloat(e.target.value) || 0;
                  const cost = parseFloat(vehicle.cost) || 0;
                  setVehicle({...vehicle, markup: e.target.value, sell: cost + markup});
                }} />
                <Input label="Sell Price" type="number" value={vehicle.sell || ''} onChange={e => setVehicle({...vehicle, sell: e.target.value})} />
             </div>

              <div style={{ marginTop: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '10px', color: 'var(--text-muted)' }}>
                  Rental Car Pictures
                </label>
                
                <div
                  onClick={() => document.getElementById(vehicleInputId).click()}
                  style={{
                    border: '2px dashed var(--border-color)',
                    borderRadius: '16px',
                    padding: '28px',
                    textAlign: 'center',
                    cursor: 'pointer',
                    transition: '0.2s',
                    background: 'rgba(255,255,255,0.02)',
                    marginBottom: '20px'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'hsl(var(--primary))';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'var(--border-color)';
                  }}
                >
                  <input
                    id={vehicleInputId}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleVehicleImages}
                    style={{ display: 'none' }}
                  />
                  <div
                    style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '50%',
                      background: 'rgba(59, 130, 246, 0.1)',
                      color: 'hsl(var(--primary))',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      margin: '0 auto 14px',
                    }}
                  >
                    <ImagePlus size={24} />
                  </div>
                  <p style={{ fontWeight: 700, marginBottom: '4px', fontSize: '15px' }}>Upload Car Photos</p>
                  <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>JPG, PNG or Screenshots (Multiple allowed)</p>
                </div>

                {vehicle.image_previews?.length > 0 && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '16px', marginBottom: '24px' }}>
                    {vehicle.image_previews.map((image, index) => (
                      <div key={`${image}-${index}`} style={{ position: 'relative', borderRadius: '14px', overflow: 'hidden', border: '1px solid var(--border-color)', background: 'var(--bg-card)', boxShadow: 'var(--shadow-sm)' }}>
                        <img
                          src={image}
                          alt={`Vehicle ${index + 1}`}
                          style={{ width: '100%', height: '120px', objectFit: 'cover', display: 'block' }}
                        />
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeVehicleImage(index);
                          }}
                          style={{
                            position: 'absolute',
                            top: '8px',
                            right: '8px',
                            border: 'none',
                            borderRadius: '999px',
                            background: 'rgba(17,24,39,0.85)',
                            color: '#fff',
                            width: '30px',
                            height: '30px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: '0.2s'
                          }}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '8px', color: 'var(--text-muted)' }}>
                  Remarks
                </label>
                <textarea
                  value={vehicle.remarks || ''}
                  onChange={e => setVehicle({...vehicle, remarks: e.target.value})}
                  placeholder="Add car rental notes, pickup instructions, vendor notes, or internal remarks"
                  style={{
                    width: '100%',
                    minHeight: '92px',
                    padding: '12px',
                    borderRadius: '10px',
                    background: 'var(--bg-input)',
                    border: '1px solid var(--border-color)',
                    outline: 'none',
                    color: 'var(--text-main)',
                    resize: 'vertical',
                  }}
                />
             </div>

             {isEditMode && showChangeTracking ? (
               <div style={{ marginTop: '20px', padding: '18px', borderRadius: '14px', background: 'var(--bg-app)', border: '1px solid var(--border-color)' }}>
                 <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-main)', marginBottom: '6px' }}>
                   Rental Car Change Tracking
                 </div>
                 <div style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: '14px' }}>
                   Record what changed on this car rental and any extra amount charged.
                 </div>

                 <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                   <div>
                     <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '8px', color: 'var(--text-muted)' }}>
                       Change Type
                     </label>
                     <select
                       value={vehicle.change_type || ''}
                       onChange={(e) => setVehicle({ ...vehicle, change_type: e.target.value })}
                       style={{
                         width: '100%',
                         padding: '12px',
                         borderRadius: '10px',
                         background: 'var(--bg-input)',
                         border: '1px solid var(--border-color)',
                         outline: 'none',
                         color: 'var(--text-main)',
                       }}
                     >
                       <option value="">Select change type</option>
                       <option value="Date Change">Date Change</option>
                       <option value="Pickup/Drop Change">Pickup/Drop Change</option>
                       <option value="Vehicle Change">Vehicle Change</option>
                       <option value="Name Change">Name Change</option>
                       <option value="Other">Other</option>
                     </select>
                   </div>
                   <Input
                     label="Additional Charge"
                     type="number"
                     value={vehicle.additional_charge || ''}
                     placeholder="0.00"
                     onChange={(e) => setVehicle({ ...vehicle, additional_charge: e.target.value })}
                   />
                 </div>

                 <div style={{ marginTop: '16px' }}>
                   <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '8px', color: 'var(--text-muted)' }}>
                     Change Summary
                   </label>
                   <textarea
                     value={vehicle.change_summary || ''}
                     onChange={(e) => setVehicle({ ...vehicle, change_summary: e.target.value })}
                     placeholder="Example: Pickup moved to airport counter and vehicle upgraded to SUV with extra supplier fee."
                     style={{
                       width: '100%',
                       minHeight: '92px',
                       padding: '12px',
                       borderRadius: '10px',
                       background: 'var(--bg-input)',
                       border: '1px solid var(--border-color)',
                       outline: 'none',
                       color: 'var(--text-main)',
                       resize: 'vertical',
                     }}
                   />
                 </div>
               </div>
             ) : null}
         </div>
      )}
    </Card>
  );
};

export default CarSection;
