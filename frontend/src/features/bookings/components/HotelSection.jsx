import React from 'react';
import { Hotel, ImagePlus, Trash2 } from 'lucide-react';
import Card from '../../../components/ui/Card';
import Input from '../../../components/ui/Input';
import Button from '../../../components/ui/Button';
import SectionHeader from './SectionHeader';

const HotelSection = ({ hotel, setHotel, isEditMode = false, showChangeTracking = false }) => {
  const hotelInputId = 'hotel-images-upload';
  const handleHotelImages = (event) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;

    files.forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setHotel((current) => ({
          ...current,
          images: [...(current.images || []), reader.result],
          image_previews: [...(current.image_previews || []), reader.result],
        }));
      };
      reader.readAsDataURL(file);
    });

    event.target.value = '';
  };

  const removeHotelImage = (index) => {
    setHotel((current) => ({
      ...current,
      images: (current.images || []).filter((_, imageIndex) => imageIndex !== index),
      image_previews: (current.image_previews || []).filter((_, imageIndex) => imageIndex !== index),
    }));
  };

  return (
    <Card style={{ padding: 0, opacity: hotel.active ? 1 : 0.7 }}>
      <SectionHeader 
        icon={Hotel} 
        title="4. Hotel" 
        toggle={true} 
        isActive={hotel.active} 
        setToggle={(v) => setHotel({...hotel, active: v})} 
      />
      {hotel.active && (
         <div style={{ padding: '24px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
              <Input label="Hotel Name" placeholder="e.g. Hilton Dubai" value={hotel.name || ''} onChange={e => setHotel({...hotel, name: e.target.value})} />
              <Input label="City" placeholder="e.g. Dubai" value={hotel.city || ''} onChange={e => setHotel({...hotel, city: e.target.value})} />
            </div>
            <div style={{ marginBottom: '16px' }}>
              <Input label="Hotel Address" placeholder="Full hotel address" value={hotel.address || ''} onChange={e => setHotel({...hotel, address: e.target.value})} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
              <Input label="Room Type" placeholder="e.g. Deluxe Room, Suite" value={hotel.room_type || ''} onChange={e => setHotel({...hotel, room_type: e.target.value})} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
              <Input label="Check-in Date" type="date" value={hotel.checkin || ''} onChange={e => setHotel({...hotel, checkin: e.target.value})} />
              <Input label="Check-out Date" type="date" value={hotel.checkout || ''} onChange={e => setHotel({...hotel, checkout: e.target.value})} />
            </div>
             <div style={{ display: 'flex', gap: '16px' }}>
                <Input label="Net Cost" type="number" value={hotel.cost || ''} onChange={e => {
                  const cost = parseFloat(e.target.value) || 0;
                  const markup = parseFloat(hotel.markup) || 0;
                  setHotel({...hotel, cost: e.target.value, sell: cost + markup});
                }} />
                <Input label="Taxes & Charges" type="number" value={hotel.markup || ''} onChange={e => {
                  const markup = parseFloat(e.target.value) || 0;
                  const cost = parseFloat(hotel.cost) || 0;
                  setHotel({...hotel, markup: e.target.value, sell: cost + markup});
                }} />
                <Input label="Sell Price" type="number" value={hotel.sell || ''} onChange={e => setHotel({...hotel, sell: e.target.value})} />
             </div>

             <div style={{ marginTop: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '8px', color: 'var(--text-muted)' }}>
                  Hotel Pictures
                </label>
                <div style={{ marginBottom: '14px', padding: '16px', borderRadius: '14px', background: 'var(--bg-app)', border: '1px dashed var(--border-color)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-main)', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <ImagePlus size={16} color="#60a5fa" />
                        Upload hotel photos
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.6 }}>
                        Add property images, room shots, or supplier images for this booking.
                      </div>
                    </div>
                    <input
                      id={hotelInputId}
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleHotelImages}
                      style={{ display: 'none' }}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      icon={ImagePlus}
                      onClick={() => document.getElementById(hotelInputId)?.click()}
                    >
                      Choose Images
                    </Button>
                  </div>
                  {hotel.image_previews?.length ? (
                    <div style={{ marginTop: '12px', fontSize: '12px', color: 'var(--text-muted)' }}>
                      {hotel.image_previews.length} image{hotel.image_previews.length > 1 ? 's' : ''} selected
                    </div>
                  ) : null}
                </div>
                {hotel.image_previews?.length ? (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '14px', marginBottom: '16px' }}>
                    {hotel.image_previews.map((image, index) => (
                      <div key={`${image}-${index}`} style={{ position: 'relative', borderRadius: '14px', overflow: 'hidden', border: '1px solid var(--border-color)', background: 'var(--bg-card)' }}>
                        <img
                          src={image}
                          alt={`Hotel ${index + 1}`}
                          style={{ width: '100%', height: '128px', objectFit: 'cover', display: 'block' }}
                        />
                        <div style={{ padding: '10px 12px', fontSize: '12px', color: 'var(--text-muted)', background: 'var(--bg-card)' }}>
                          Hotel image {index + 1}
                        </div>
                        <button
                          type="button"
                          onClick={() => removeHotelImage(index)}
                          style={{ position: 'absolute', top: '10px', right: '10px', border: 'none', borderRadius: '999px', background: 'rgba(17,24,39,0.82)', color: '#fff', width: '32px', height: '32px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                          aria-label={`Remove hotel image ${index + 1}`}
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
                  value={hotel.remarks || ''}
                  onChange={e => setHotel({...hotel, remarks: e.target.value})}
                  placeholder="Add hotel notes, room requests, supplier notes, or internal remarks"
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
                   Hotel Change Tracking
                 </div>
                 <div style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: '14px' }}>
                   Record what changed on this hotel booking and any extra amount charged.
                 </div>

                 <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                   <div>
                     <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '8px', color: 'var(--text-muted)' }}>
                       Change Type
                     </label>
                     <select
                       value={hotel.change_type || ''}
                       onChange={(e) => setHotel({ ...hotel, change_type: e.target.value })}
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
                       <option value="Name Change">Name Change</option>
                       <option value="Room Change">Room Change</option>
                       <option value="Supplier Update">Supplier Update</option>
                       <option value="Other">Other</option>
                     </select>
                   </div>
                   <Input
                     label="Additional Charge"
                     type="number"
                     value={hotel.additional_charge || ''}
                     placeholder="0.00"
                     onChange={(e) => setHotel({ ...hotel, additional_charge: e.target.value })}
                   />
                 </div>

                 <div style={{ marginTop: '16px' }}>
                   <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '8px', color: 'var(--text-muted)' }}>
                     Change Summary
                   </label>
                   <textarea
                     value={hotel.change_summary || ''}
                     onChange={(e) => setHotel({ ...hotel, change_summary: e.target.value })}
                     placeholder="Example: Hotel changed from deluxe room to suite and check-out was extended by one night."
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

export default HotelSection;
