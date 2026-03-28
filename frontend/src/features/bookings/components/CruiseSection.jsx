import React from 'react';
import { Ship } from 'lucide-react';
import Card from '../../../components/ui/Card';
import Input from '../../../components/ui/Input';
import SectionHeader from './SectionHeader';

const CruiseSection = ({ cruise, setCruise }) => {
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
                <Input label="Markup" type="number" value={cruise.markup || ''} onChange={e => {
                  const markup = parseFloat(e.target.value) || 0;
                  const cost = parseFloat(cruise.cost) || 0;
                  setCruise({...cruise, markup: e.target.value, sell: cost + markup});
                }} />
                <Input label="Sell Price" type="number" value={cruise.sell || ''} onChange={e => setCruise({...cruise, sell: e.target.value})} />
             </div>
         </div>
      )}
    </Card>
  );
};

export default CruiseSection;
