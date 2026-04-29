import React from 'react';
import { Ship, ImagePlus, Trash2 } from 'lucide-react';
import Card from '../../../components/ui/Card';
import Input from '../../../components/ui/Input';
import Button from '../../../components/ui/Button';
import SectionHeader from './SectionHeader';

const CruiseSection = ({ cruise, setCruise, isEditMode = false, showChangeTracking = false, onQuickAllocate }) => {
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
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '16px' }}>
              <Input label="Cruise Line" required placeholder="e.g. Royal Caribbean" value={cruise.line || ''} onChange={e => setCruise({...cruise, line: e.target.value})} />
              <Input label="Ship Name" required placeholder="e.g. Icon of the Seas" value={cruise.ship || ''} onChange={e => setCruise({...cruise, ship: e.target.value})} />
              <Input label="Departure Port" placeholder="e.g. Miami, Florida" value={cruise.departure_port || ''} onChange={e => setCruise({...cruise, departure_port: e.target.value})} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '16px' }}>
              <Input 
                label="Number of Rooms" 
                type="number" 
                placeholder="1" 
                value={cruise.room_count || ''} 
                onChange={e => {
                  const count = parseInt(e.target.value) || 0;
                  let types = [...(cruise.room_types || [])];
                  if (types.length === 0 && cruise.room_type) types = [cruise.room_type];
                  
                  if (types.length < count) {
                    while (types.length < count) types.push(types[0] || '');
                  } else if (types.length > count) {
                    types = types.slice(0, count);
                  }
                  setCruise({...cruise, room_count: e.target.value, room_types: types});
                }} 
              />
              <Input label="Number of Adults" type="number" placeholder="1" value={cruise.adult_count || ''} onChange={e => setCruise({...cruise, adult_count: e.target.value})} />
              <Input label="Number of Children" type="number" placeholder="0" value={cruise.child_count || ''} onChange={e => setCruise({...cruise, child_count: e.target.value})} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: cruise.room_count > 1 ? '1fr' : '1.5fr 1fr 1fr', gap: '16px', marginBottom: '16px' }}>
              {(!cruise.room_count || cruise.room_count <= 1) ? (
                <>
                  <Input 
                    label="Room Type" 
                    placeholder="e.g. Ocean View Balcony" 
                    value={cruise.room_types?.[0] || cruise.room_type || ''} 
                    onChange={e => {
                      const newTypes = [e.target.value];
                      setCruise({...cruise, room_type: e.target.value, room_types: newTypes});
                    }} 
                  />
                  <Input label="Deck Number" placeholder="e.g. Deck 12" value={cruise.deck_number || ''} onChange={e => setCruise({...cruise, deck_number: e.target.value})} />
                  <Input label="Room Number" placeholder="e.g. 1245" value={cruise.room_number || ''} onChange={e => setCruise({...cruise, room_number: e.target.value})} />
                </>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  {(cruise.room_types || []).map((type, idx) => (
                    <Input 
                      key={idx}
                      label={`Room ${idx + 1} Type`} 
                      placeholder="e.g. Balcony, Suite" 
                      value={type || ''} 
                      onChange={e => {
                        const newTypes = [...(cruise.room_types || [])];
                        newTypes[idx] = e.target.value;
                        setCruise({...cruise, room_types: newTypes});
                      }} 
                    />
                  ))}
                  <Input label="Deck Number" placeholder="e.g. Deck 12" value={cruise.deck_number || ''} onChange={e => setCruise({...cruise, deck_number: e.target.value})} />
                  <Input label="Room Number" placeholder="e.g. Multiple" value={cruise.room_number || ''} onChange={e => setCruise({...cruise, room_number: e.target.value})} />
                </div>
              )}
            </div>

            {cruise.child_count > 0 && (
              <div style={{ marginBottom: '16px' }}>
                <Input label="Children's DOB" placeholder="e.g. 12/05/2015, 08/11/2018 (Separate with commas)" value={cruise.children_dob || ''} onChange={e => setCruise({...cruise, children_dob: e.target.value})} />
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
              <Input label="Departure Date & Time" type="datetime-local" value={cruise.departure_date || ''} onChange={e => setCruise({...cruise, departure_date: e.target.value})} />
              <Input label="Arrival Date & Time" type="datetime-local" value={cruise.arrival_date || ''} onChange={e => setCruise({...cruise, arrival_date: e.target.value})} />
            </div>

            <div style={{ margin: '24px 0', height: '1px', background: 'var(--border-color)', opacity: 0.5 }}></div>

            <div style={{ marginBottom: '16px', fontSize: '14px', fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '4px', height: '14px', background: 'hsl(var(--primary))', borderRadius: '4px' }}></div>
              Payment &amp; Due Dates
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '24px' }}>
              <Input label="Deposit Amount" type="number" placeholder="0.00" value={cruise.deposit_amount || ''} onChange={e => setCruise({...cruise, deposit_amount: e.target.value})} />
              <Input label="Due Amount" type="number" placeholder="0.00" value={cruise.due_amount || ''} onChange={e => setCruise({...cruise, due_amount: e.target.value})} />
              <Input label="Due Date" type="date" value={cruise.due_date || ''} onChange={e => setCruise({...cruise, due_date: e.target.value})} />
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
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '10px', color: 'var(--text-muted)' }}>
                  Cruise Pictures
                </label>
                
                <div
                  onClick={() => document.getElementById(cruiseInputId).click()}
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
                    id={cruiseInputId}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleCruiseImages}
                    style={{ display: 'none' }}
                  />
                  <div
                    style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '50%',
                      background: 'rgba(6, 182, 138, 0.1)',
                      color: 'hsl(var(--primary))',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      margin: '0 auto 14px',
                    }}
                  >
                    <ImagePlus size={24} />
                  </div>
                  <p style={{ fontWeight: 700, marginBottom: '4px', fontSize: '15px' }}>Upload Cruise Photos</p>
                  <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>JPG, PNG or Screenshots (Multiple allowed)</p>
                </div>

                {cruise.image_previews?.length > 0 && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '16px', marginBottom: '24px' }}>
                    {cruise.image_previews.map((image, index) => (
                      <div key={`${image}-${index}`} style={{ position: 'relative', borderRadius: '14px', overflow: 'hidden', border: '1px solid var(--border-color)', background: 'var(--bg-card)', boxShadow: 'var(--shadow-sm)' }}>
                        <img
                          src={image}
                          alt={`Cruise ${index + 1}`}
                          style={{ width: '100%', height: '120px', objectFit: 'cover', display: 'block' }}
                        />
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeCruiseImage(index);
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
                   <div style={{ position: 'relative' }}>
                    <Input
                      label="Additional Charge"
                      type="number"
                      value={cruise.additional_charge || ''}
                      placeholder="0.00"
                      onChange={(e) => setCruise({ ...cruise, additional_charge: e.target.value })}
                    />
                    {cruise.additional_charge > 0 && onQuickAllocate && (
                      <button
                        type="button"
                        onClick={() => onQuickAllocate(cruise.additional_charge)}
                        style={{
                          position: 'absolute',
                          right: '0',
                          top: '0',
                          background: 'rgba(6,182,138,0.1)',
                          color: '#06B68A',
                          border: 'none',
                          borderRadius: '6px',
                          padding: '2px 8px',
                          fontSize: '11px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          transform: 'translateY(-4px)'
                        }}
                      >
                        Quick Allocate
                      </button>
                    )}
                  </div>
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
