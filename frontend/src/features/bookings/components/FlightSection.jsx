import React from 'react';
import { Plane, Plus, Trash2 } from 'lucide-react';
import Card from '../../../components/ui/Card';
import Input from '../../../components/ui/Input';
import Button from '../../../components/ui/Button';
import SectionHeader from './SectionHeader';

const tripTypeOptions = [
  { value: 'one_way', label: 'One Way' },
  { value: 'round_trip', label: 'Round Trip' },
  { value: 'multi_city', label: 'Multi City' },
];

const FlightSection = ({
  flight,
  setFlight,
  handleTicketUpload,
  isEditMode = false,
  showChangeTracking = false,
  updateFlightSegmentsForTripType,
  updateFlightSegment,
  addFlightSegment,
  removeFlightSegment,
  removeTicketImage,
}) => {
  return (
    <Card style={{ padding: 0, opacity: flight.active ? 1 : 0.7 }}>
      <SectionHeader
        icon={Plane}
        title="3. Flight / PNR"
        toggle={true}
        isActive={flight.active}
        setToggle={(v) => setFlight({ ...flight, active: v })}
      />
      {flight.active && (
        <div style={{ padding: '24px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', alignItems: 'start' }}>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '8px', color: 'var(--text-muted)' }}>
                Trip Type
              </label>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', minHeight: '46px', alignItems: 'center' }}>
                {tripTypeOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => updateFlightSegmentsForTripType(option.value)}
                    style={{
                      minHeight: '46px',
                      padding: '10px 14px',
                      borderRadius: '999px',
                      border: '1px solid',
                      borderColor: flight.trip_type === option.value ? 'hsl(var(--primary))' : 'var(--border-color)',
                      background: flight.trip_type === option.value ? 'hsla(var(--primary), 0.12)' : 'var(--bg-input)',
                      color: flight.trip_type === option.value ? 'hsl(var(--primary))' : 'var(--text-main)',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
            <Input
              label="PNR"
              placeholder="e.g. ABC123"
              value={flight.pnr || ''}
              onChange={(e) => setFlight({ ...flight, pnr: e.target.value })}
            />
          </div>

          <div style={{ display: 'grid', gap: '16px' }}>
            {flight.segments?.map((segment, index) => (
              <div
                key={`segment-${index}`}
                style={{
                  padding: '18px',
                  borderRadius: '16px',
                  background: 'var(--bg-app)',
                  border: '1px solid var(--border-color)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                  <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text-main)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                    {flight.trip_type === 'round_trip' 
                      ? (index === 0 ? 'Departure Flight' : (index === 1 ? 'Return Flight' : `Flight Segment ${index + 1}`))
                      : `Flight Segment ${index + 1}`
                    }
                  </div>
                  {((flight.trip_type === 'one_way' && flight.segments.length > 1) || (flight.trip_type !== 'one_way' && flight.segments.length > 2)) && (
                    <button
                      type="button"
                      onClick={() => removeFlightSegment(index)}
                      style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <Input
                    label="Airline"
                    placeholder="e.g. Emirates"
                    value={segment.airline || ''}
                    onChange={(e) => updateFlightSegment(index, 'airline', e.target.value)}
                  />
                  <Input
                    label="Flight Number"
                    placeholder="e.g. EK203"
                    value={segment.flight_number || ''}
                    onChange={(e) => updateFlightSegment(index, 'flight_number', e.target.value)}
                  />
                  <Input
                    label="Origin"
                    placeholder="e.g. NYC"
                    value={segment.origin || ''}
                    onChange={(e) => updateFlightSegment(index, 'origin', e.target.value)}
                  />
                  <Input
                    label="Destination"
                    placeholder="e.g. LON"
                    value={segment.destination || ''}
                    onChange={(e) => updateFlightSegment(index, 'destination', e.target.value)}
                  />
                  <Input
                    label="Departure"
                    type="datetime-local"
                    value={segment.departure_at || ''}
                    onChange={(e) => updateFlightSegment(index, 'departure_at', e.target.value)}
                  />
                  <Input
                    label="Arrival"
                    type="datetime-local"
                    value={segment.arrival_at || ''}
                    onChange={(e) => updateFlightSegment(index, 'arrival_at', e.target.value)}
                  />
                </div>

                <div style={{ marginTop: '18px' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '10px', color: 'var(--text-muted)' }}>
                    Ticket Screenshot / Picture <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <div
                    onClick={() => document.getElementById(`ticket-upload-${index}`).click()}
                    style={{
                      border: '2px dashed var(--border-color)',
                      borderRadius: '16px',
                      padding: '24px',
                      textAlign: 'center',
                      cursor: 'pointer',
                      transition: '0.2s',
                      background: 'rgba(255,255,255,0.02)',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = 'hsl(var(--primary))';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = 'var(--border-color)';
                    }}
                  >
                    <input
                      id={`ticket-upload-${index}`}
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={(e) => handleTicketUpload(e, index)}
                      style={{ display: 'none' }}
                    />
                    <div
                      style={{
                        width: '44px',
                        height: '44px',
                        borderRadius: '50%',
                        background: 'rgba(59, 130, 246, 0.1)',
                        color: 'hsl(var(--primary))',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 14px',
                      }}
                    >
                      <Plus size={22} />
                    </div>
                    <p style={{ fontWeight: 700, marginBottom: '4px' }}>Upload Ticket Images</p>
                    <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>JPG, PNG or Screenshot (Select multiple if needed)</p>
                  </div>

                  {segment.ticket_previews?.length > 0 && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '14px', marginTop: '16px' }}>
                      {segment.ticket_previews.map((preview, imgIndex) => (
                        <div key={`${preview}-${imgIndex}`} style={{ position: 'relative', borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--border-color)', background: 'var(--bg-card)' }}>
                          <img
                            src={preview}
                            alt={`Segment ${index + 1} Ticket ${imgIndex + 1}`}
                            style={{ width: '100%', height: '110px', objectFit: 'cover', display: 'block' }}
                          />
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              removeTicketImage(index, imgIndex);
                            }}
                            style={{
                              position: 'absolute',
                              top: '8px',
                              right: '8px',
                              border: 'none',
                              borderRadius: '999px',
                              background: 'rgba(17,24,39,0.82)',
                              color: '#fff',
                              width: '28px',
                              height: '28px',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {(flight.trip_type === 'multi_city' || flight.trip_type === 'round_trip') && (
            <div style={{ marginTop: '16px' }}>
              <Button variant="outline" size="sm" icon={Plus} onClick={addFlightSegment}>
                Add Flight Segment
              </Button>
            </div>
          )}

          <div style={{ display: 'flex', gap: '16px', marginTop: '24px' }}>
            <Input
              label="Airline Cost"
              type="number"
              value={flight.cost}
              onChange={(e) => {
                const cost = parseFloat(e.target.value) || 0;
                const markup = parseFloat(flight.markup) || 0;
                setFlight({ ...flight, cost: e.target.value, sell: cost + markup });
              }}
            />
            <Input
              label="Taxes & Charges"
              type="number"
              value={flight.markup}
              onChange={(e) => {
                const markup = parseFloat(e.target.value) || 0;
                const cost = parseFloat(flight.cost) || 0;
                setFlight({ ...flight, markup: e.target.value, sell: cost + markup });
              }}
            />
            <Input label="Sell Price" type="number" value={flight.sell} onChange={(e) => setFlight({ ...flight, sell: e.target.value })} />
          </div>

          <div style={{ marginTop: '16px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '8px', color: 'var(--text-muted)' }}>
              Remarks
            </label>
            <textarea
              value={flight.remarks || ''}
              onChange={(e) => setFlight({ ...flight, remarks: e.target.value })}
              placeholder="Add any notes, airline remarks, fare notes, or handling instructions"
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
                Flight Change Tracking
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: '14px' }}>
                Record what changed on this flight and any extra amount charged before sending a flight change update.
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '8px', color: 'var(--text-muted)' }}>
                    Change Type
                  </label>
                  <select
                    value={flight.change_type || ''}
                    onChange={(e) => setFlight({ ...flight, change_type: e.target.value })}
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
                    <option value="Name Change">Name Change</option>
                    <option value="Reschedule">Reschedule</option>
                    <option value="Correction">Correction</option>
                    <option value="Reissue">Reissue</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <Input
                  label="Additional Charge"
                  type="number"
                  value={flight.additional_charge || ''}
                  placeholder="0.00"
                  onChange={(e) => setFlight({ ...flight, additional_charge: e.target.value })}
                />
              </div>

              <div style={{ marginTop: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '8px', color: 'var(--text-muted)' }}>
                  Change Summary
                </label>
                <textarea
                  value={flight.change_summary || ''}
                  onChange={(e) => setFlight({ ...flight, change_summary: e.target.value })}
                  placeholder="Example: Passenger surname corrected and outbound segment rescheduled to Apr 12. Extra airline reissue fee collected."
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

export default FlightSection;
