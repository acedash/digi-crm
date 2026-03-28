import React from 'react';
import { Hotel } from 'lucide-react';
import Card from '../../../components/ui/Card';
import Input from '../../../components/ui/Input';
import SectionHeader from './SectionHeader';

const HotelSection = ({ hotel, setHotel }) => {
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
                <Input label="Markup" type="number" value={hotel.markup || ''} onChange={e => {
                  const markup = parseFloat(e.target.value) || 0;
                  const cost = parseFloat(hotel.cost) || 0;
                  setHotel({...hotel, markup: e.target.value, sell: cost + markup});
                }} />
                <Input label="Sell Price" type="number" value={hotel.sell || ''} onChange={e => setHotel({...hotel, sell: e.target.value})} />
             </div>
         </div>
      )}
    </Card>
  );
};

export default HotelSection;
