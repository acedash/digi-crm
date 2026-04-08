import React from 'react';
import { Ship, ImagePlus, Trash2 } from 'lucide-react';
import Card from '../../../components/ui/Card';
import Input from '../../../components/ui/Input';
import Button from '../../../components/ui/Button';
import SectionHeader from './SectionHeader';

const CruiseSection = ({ cruise, setCruise, isEditMode = false, showChangeTracking = false }) => {
  const cruiseInputId = 'cruise-images-upload';
  const handleCruiseImages = (event) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;

    files.forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setCruise((current) => ({
          ...current,
          images: [...(current.images || []), reader.result],
          image_previews: [...(current.image_previews || []), reader.result],
        }));
      };
      reader.readAsDataURL(file);
    });

    event.target.value = '';
  };

  const removeCruiseImage = (index) => {
    setCruise((current) => ({
      ...current,
      images: (current.images || []).filter((_, imageIndex) => imageIndex !== index),
      image_previews: (current.image_previews || []).filter((_, imageIndex) => imageIndex !== index),
    }));
  };

  return (
    <Card style={{ padding: 0, opacity: cruise.active ? 1 : 0.7 }}>
      <SectionHeader 
        icon={Ship} 
        title="6. Cruise" 
        toggle={true} 
        isActive={cruise.active} 
        setToggle={(v) => setCruise({...cruise, active: v})} 
      />
      {cruise.active && (
         <div style={{ padding: '24px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
              <Input label="Cruise Line" placeholder="e.g. Royal Caribbean" value={cruise.line || ''} onChange={e => setCruise({...cruise, line: e.target.value})} />
              <Input label="Ship Name" placeholder="e.g. Icon of the Seas" value={cruise.ship || ''} onChange={e => setCruise({...cruise, ship: e.target.value})} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
              <Input label="Departure Date" type="date" value={cruise.departure_date || ''} onChange={e => setCruise({...cruise, departure_date: e.target.value})} />
              <Input label="Arrival Date" type="date" value={cruise.arrival_date || ''} onChange={e => setCruise({...cruise, arrival_date: e.target.value})} />
            </div>
             <div style={{ display: 'flex', gap: '16px' }}>
                <Input label="Net Cost" type="number" value={cruise.cost || ''} onChange={e => {
                  const cost = parseFloat(e.target.value) || 0;
                  const markup = parseFloat(cruise.markup) || 0;
                  setCruise({...cruise, cost: e.target.value, sell: cost + markup});
                }} />
                <Input label="Taxes & Charges" type="number" value={cruise.markup || ''} onChange={e => {
                  const markup = parseFloat(e.target.value) || 0;
                  const cost = parseFloat(cruise.cost) || 0;
                  setCruise({...cruise, markup: e.target.value, sell: cost + markup});
                }} />
                <Input label="Sell Price" type="number" value={cruise.sell || ''} onChange={e => setCruise({...cruise, sell: e.target.value})} />
             </div>

             <div style={{ marginTop: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '8px', color: 'var(--text-muted)' }}>
                  Cruise Pictures
                </label>
                <div style={{ marginBottom: '14px', padding: '16px', borderRadius: '14px', background: 'var(--bg-app)', border: '1px dashed var(--border-color)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-main)', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <ImagePlus size={16} color="#60a5fa" />
                        Upload cruise photos
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.6 }}>
                        Add ship images, cabin photos, itinerary screenshots, or supplier media for this booking.
                      </div>
                    </div>
                    <input id={cruiseInputId} type="file" accept="image/*" multiple onChange={handleCruiseImages} style={{ display: 'none' }} />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      icon={ImagePlus}
                      onClick={() => document.getElementById(cruiseInputId)?.click()}
                    >
                      Choose Images
                    </Button>
                  </div>
                  {cruise.image_previews?.length ? (
                    <div style={{ marginTop: '12px', fontSize: '12px', color: 'var(--text-muted)' }}>
                      {cruise.image_previews.length} image{cruise.image_previews.length > 1 ? 's' : ''} selected
                    </div>
                  ) : null}
                </div>
                {cruise.image_previews?.length ? (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '14px', marginBottom: '16px' }}>
                    {cruise.image_previews.map((image, index) => (
                      <div key={`${image}-${index}`} style={{ position: 'relative', borderRadius: '14px', overflow: 'hidden', border: '1px solid var(--border-color)', background: 'var(--bg-card)' }}>
                        <img src={image} alt={`Cruise ${index + 1}`} style={{ width: '100%', height: '128px', objectFit: 'cover', display: 'block' }} />
                        <div style={{ padding: '10px 12px', fontSize: '12px', color: 'var(--text-muted)', background: 'var(--bg-card)' }}>
                          Cruise image {index + 1}
                        </div>
                        <button
                          type="button"
                          onClick={() => removeCruiseImage(index)}
                          style={{ position: 'absolute', top: '10px', right: '10px', border: 'none', borderRadius: '999px', background: 'rgba(17,24,39,0.82)', color: '#fff', width: '32px', height: '32px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                          aria-label={`Remove cruise image ${index + 1}`}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : null}

                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '8px', color: 'var(--text-muted)' }}>
                  Remarks
                </label>
                <textarea
                  value={cruise.remarks || ''}
                  onChange={e => setCruise({...cruise, remarks: e.target.value})}
                  placeholder="Add cruise notes, cabin requests, supplier notes, or internal remarks"
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
                   Cruise Change Tracking
                 </div>
                 <div style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: '14px' }}>
                   Record what changed on this cruise booking and any extra amount charged.
                 </div>

                 <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                   <div>
                     <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '8px', color: 'var(--text-muted)' }}>
                       Change Type
                     </label>
                     <select
                       value={cruise.change_type || ''}
                       onChange={(e) => setCruise({ ...cruise, change_type: e.target.value })}
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
                       <option value="Cabin Change">Cabin Change</option>
                       <option value="Passenger Change">Passenger Change</option>
                       <option value="Itinerary Change">Itinerary Change</option>
                       <option value="Other">Other</option>
                     </select>
                   </div>
                   <Input
                     label="Additional Charge"
                     type="number"
                     value={cruise.additional_charge || ''}
                     placeholder="0.00"
                     onChange={(e) => setCruise({ ...cruise, additional_charge: e.target.value })}
                   />
                 </div>

                 <div style={{ marginTop: '16px' }}>
                   <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '8px', color: 'var(--text-muted)' }}>
                     Change Summary
                   </label>
                   <textarea
                     value={cruise.change_summary || ''}
                     onChange={(e) => setCruise({ ...cruise, change_summary: e.target.value })}
                     placeholder="Example: Sailing date moved and cabin category upgraded with cruise line amendment fee."
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

export default CruiseSection;
