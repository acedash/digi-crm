import React from 'react';
import { Plane, Plus } from 'lucide-react';
import Card from '../../../components/ui/Card';
import Input from '../../../components/ui/Input';
import SectionHeader from './SectionHeader';

const FlightSection = ({ flight, setFlight, handleTicketUpload }) => {
  return (
    <Card style={{ padding: 0, opacity: flight.active ? 1 : 0.7 }}>
      <SectionHeader 
        icon={Plane} 
        title="3. Flight / PNR" 
        toggle={true} 
        isActive={flight.active} 
        setToggle={(v) => setFlight({...flight, active: v})} 
      />
      {flight.active && (
        <div style={{ padding: '24px' }}>
          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '12px', color: 'var(--text-muted)' }}>Ticket Screenshot / Picture</label>
            <div 
              onClick={() => document.getElementById('ticket-upload').click()}
              style={{ 
                border: '2px dashed var(--border-color)', borderRadius: '16px', padding: '32px', 
                textAlign: 'center', cursor: 'pointer', transition: '0.2s',
                background: flight.ticket_preview ? 'none' : 'rgba(255,255,255,0.02)'
              }}
              onMouseEnter={(e) => e.currentTarget.style.borderColor = 'hsl(var(--primary))'}
              onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border-color)'}
            >
              <input id="ticket-upload" type="file" accept="image/*" onChange={handleTicketUpload} style={{ display: 'none' }} />
              {flight.ticket_preview ? (
                <div style={{ position: 'relative' }}>
                  <img src={flight.ticket_preview} alt="Ticket Preview" style={{ maxWidth: '100%', maxHeight: '300px', borderRadius: '12px', boxShadow: 'var(--shadow-lg)' }} />
                  <div style={{ marginTop: '12px', fontSize: '13px', color: 'hsl(var(--primary))', fontWeight: 700 }}>Click to change image</div>
                </div>
              ) : (
                <>
                  <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'rgba(59, 130, 246, 0.1)', color: 'hsl(var(--primary))', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                    <Plus size={24} />
                  </div>
                  <p style={{ fontWeight: 700, marginBottom: '4px' }}>Upload Ticket Image</p>
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>JPG, PNG or Screenshot</p>
                </>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '16px' }}>
             <Input label="Net Cost" type="number" value={flight.cost} onChange={e => {
               const cost = parseFloat(e.target.value) || 0;
               const markup = parseFloat(flight.markup) || 0;
               setFlight({...flight, cost: e.target.value, sell: cost + markup});
             }} />
             <Input label="Markup" type="number" value={flight.markup} onChange={e => {
               const markup = parseFloat(e.target.value) || 0;
               const cost = parseFloat(flight.cost) || 0;
               setFlight({...flight, markup: e.target.value, sell: cost + markup});
             }} />
             <Input label="Sell Price" type="number" value={flight.sell} onChange={e => setFlight({...flight, sell: e.target.value})} />
          </div>
        </div>
      )}
    </Card>
  );
};

export default FlightSection;
