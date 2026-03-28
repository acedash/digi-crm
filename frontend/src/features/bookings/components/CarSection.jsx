import React from 'react';
import { Car } from 'lucide-react';
import Card from '../../../components/ui/Card';
import Input from '../../../components/ui/Input';
import SectionHeader from './SectionHeader';

const CarSection = ({ vehicle, setVehicle }) => {
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
              <Input label="Rental Company" placeholder="e.g. Hertz" value={vehicle.company || ''} onChange={e => setVehicle({...vehicle, company: e.target.value})} />
              <Input label="Car Model" placeholder="e.g. Toyota Camry" value={vehicle.model || ''} onChange={e => setVehicle({...vehicle, model: e.target.value})} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', gap: '16px', marginBottom: '24px' }}>
              <Input label="Pickup Location" value={vehicle.pickup_loc || ''} onChange={e => setVehicle({...vehicle, pickup_loc: e.target.value})} />
              <Input label="Pickup Date" type="date" value={vehicle.pickup_date || ''} onChange={e => setVehicle({...vehicle, pickup_date: e.target.value})} />
              <Input label="Dropoff Date" type="date" value={vehicle.dropoff_date || ''} onChange={e => setVehicle({...vehicle, dropoff_date: e.target.value})} />
            </div>
             <div style={{ display: 'flex', gap: '16px' }}>
                <Input label="Net Cost" type="number" value={vehicle.cost || ''} onChange={e => {
                  const cost = parseFloat(e.target.value) || 0;
                  const markup = parseFloat(vehicle.markup) || 0;
                  setVehicle({...vehicle, cost: e.target.value, sell: cost + markup});
                }} />
                <Input label="Markup" type="number" value={vehicle.markup || ''} onChange={e => {
                  const markup = parseFloat(e.target.value) || 0;
                  const cost = parseFloat(vehicle.cost) || 0;
                  setVehicle({...vehicle, markup: e.target.value, sell: cost + markup});
                }} />
                <Input label="Sell Price" type="number" value={vehicle.sell || ''} onChange={e => setVehicle({...vehicle, sell: e.target.value})} />
             </div>
         </div>
      )}
    </Card>
  );
};

export default CarSection;
