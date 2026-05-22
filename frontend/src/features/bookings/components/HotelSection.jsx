import React from 'react';
import { Hotel, ImagePlus, Trash2 } from 'lucide-react';
import Card from '../../../components/ui/Card';
import Input from '../../../components/ui/Input';
import Button from '../../../components/ui/Button';
import SectionHeader from './SectionHeader';
import { HOTEL_OPTIONS } from '../../../utils/bookingConstants';

const HotelSection = ({ hotel, setHotel, isEditMode = false, showChangeTracking = false, onQuickAllocate }) => {
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
        setToggle={(v) => setHotel({ ...hotel, active: v })}
      />
      {hotel.active && (
        <div style={{ padding: '24px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
            <Input label="Hotel Name" required placeholder="e.g. Hilton Dubai" value={hotel.name || ''} onChange={e => setHotel({ ...hotel, name: e.target.value })} />
            <Input label="City" required placeholder="e.g. Dubai" value={hotel.city || ''} onChange={e => setHotel({ ...hotel, city: e.target.value })} />
          </div>
          <div style={{ marginBottom: '16px' }}>
            <Input label="Hotel Address" placeholder="Full hotel address" value={hotel.address || ''} onChange={e => setHotel({ ...hotel, address: e.target.value })} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '16px' }}>
            <Input
              label="Number of Rooms"
              type="number"
              placeholder="1"
              value={hotel.room_count || ''}
              onChange={e => {
                const count = parseInt(e.target.value) || 0;
                let types = [...(hotel.room_types || [])];
                if (types.length === 0 && hotel.room_type) types = [hotel.room_type];

                if (types.length < count) {
                  while (types.length < count) types.push(types[0] || '');
                } else if (types.length > count) {
                  types = types.slice(0, count);
                }
                setHotel({ ...hotel, room_count: e.target.value, room_types: types });
              }}
            />
            <Input label="Number of Adults" type="number" placeholder="1" value={hotel.adult_count || ''} onChange={e => setHotel({ ...hotel, adult_count: e.target.value })} />
            <Input label="Number of Children" type="number" placeholder="0" value={hotel.child_count || ''} onChange={e => setHotel({ ...hotel, child_count: e.target.value })} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: hotel.room_count > 1 ? '1fr' : '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
            {(!hotel.room_count || hotel.room_count <= 1) ? (
              <Input
                label="Room Type"
                placeholder="e.g. Deluxe Room, Suite"
                value={hotel.room_types?.[0] || hotel.room_type || ''}
                onChange={e => {
                  const newTypes = [e.target.value];
                  setHotel({ ...hotel, room_type: e.target.value, room_types: newTypes });
                }}
              />
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                {(hotel.room_types || []).map((type, idx) => (
                  <Input
                    key={idx}
                    label={`Room ${idx + 1} Type`}
                    placeholder="e.g. Deluxe Room"
                    value={type || ''}
                    onChange={e => {
                      const newTypes = [...(hotel.room_types || [])];
                      newTypes[idx] = e.target.value;
                      setHotel({ ...hotel, room_types: newTypes });
                    }}
                  />
                ))}
              </div>
            )}
            <Input label="Booking Confirmation" placeholder="e.g. ABC123XYZ" value={hotel.booking_confirmation || ''} onChange={e => setHotel({ ...hotel, booking_confirmation: e.target.value })} />
            <Input label="Confirmation Code" placeholder="e.g. XY9876Z" value={hotel.confirmation_code || ''} onChange={e => setHotel({ ...hotel, confirmation_code: e.target.value })} />
          </div>

          {hotel.child_count > 0 && (
            <div style={{ marginBottom: '16px' }}>
              <Input label="Children's Ages" placeholder="e.g. 5, 8 (Separate with commas)" value={hotel.children_ages || ''} onChange={e => setHotel({ ...hotel, children_ages: e.target.value })} />
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
            <Input label="Check-in Date & Time" type="datetime-local" value={hotel.checkin || ''} onChange={e => setHotel({ ...hotel, checkin: e.target.value })} />
            <Input label="Check-out Date & Time" type="datetime-local" value={hotel.checkout || ''} onChange={e => setHotel({ ...hotel, checkout: e.target.value })} />
          </div>
          <div style={{ display: 'flex', gap: '16px' }}>
            <Input label="Net Cost" type="number" value={hotel.cost || ''} onChange={e => {
              const cost = parseFloat(e.target.value) || 0;
              const markup = parseFloat(hotel.markup) || 0;
              setHotel({ ...hotel, cost: e.target.value, sell: cost + markup });
            }} />
            <Input label="Taxes & Charges" type="number" value={hotel.markup || ''} onChange={e => {
              const markup = parseFloat(e.target.value) || 0;
              const cost = parseFloat(hotel.cost) || 0;
              setHotel({ ...hotel, markup: e.target.value, sell: cost + markup });
            }} />
            <Input label="Sell Price" type="number" value={hotel.sell || ''} onChange={e => setHotel({ ...hotel, sell: e.target.value })} />
          </div>

          <div style={{ marginTop: '16px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '10px', color: 'var(--text-muted)' }}>
              Hotel Pictures
            </label>

            <div
              onClick={() => document.getElementById(hotelInputId).click()}
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
                id={hotelInputId}
                type="file"
                accept="image/*"
                multiple
                onChange={handleHotelImages}
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
              <p style={{ fontWeight: 700, marginBottom: '4px', fontSize: '15px' }}>Upload Hotel Photos</p>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>JPG, PNG or Screenshots (Multiple allowed)</p>
            </div>

            {hotel.image_previews?.length > 0 && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '16px', marginBottom: '24px' }}>
                {hotel.image_previews.map((image, index) => (
                  <div key={`${image}-${index}`} style={{ position: 'relative', borderRadius: '14px', overflow: 'hidden', border: '1px solid var(--border-color)', background: 'var(--bg-card)', boxShadow: 'var(--shadow-sm)' }}>
                    <img
                      src={image}
                      alt={`Hotel ${index + 1}`}
                      style={{ width: '100%', height: '120px', objectFit: 'cover', display: 'block' }}
                    />
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeHotelImage(index);
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
              value={hotel.remarks || ''}
              onChange={e => setHotel({ ...hotel, remarks: e.target.value })}
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
                <div style={{ position: 'relative' }}>
                  <Input
                    label="Additional Charge"
                    type="number"
                    value={hotel.additional_charge || ''}
                    placeholder="0.00"
                    onChange={(e) => setHotel({ ...hotel, additional_charge: e.target.value })}
                  />
                  {hotel.additional_charge > 0 && onQuickAllocate && (
                    <button
                      type="button"
                      onClick={() => onQuickAllocate(hotel.additional_charge)}
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
