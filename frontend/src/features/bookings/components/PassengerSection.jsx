import React from 'react';
import { User, Trash2 } from 'lucide-react';
import Card from '../../../components/ui/Card';
import Input from '../../../components/ui/Input';
import Button from '../../../components/ui/Button';
import SectionHeader from './SectionHeader';

const PassengerSection = ({ newClient, setNewClient, newPassengers, setNewPassengers }) => {
  return (
    <Card style={{ padding: 0 }}>
      <SectionHeader icon={User} title="1. Passengers" isActive={true} />
      <div style={{ padding: '24px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
          <Input label={<span>First Name <span style={{ color: '#ef4444' }}>*</span></span>} value={newClient.first_name || ''} onChange={e => setNewClient({...newClient, first_name: e.target.value})} />
          <Input label="Middle Name" value={newClient.middle_name || ''} onChange={e => setNewClient({...newClient, middle_name: e.target.value})} />
          <Input label={<span>Last Name <span style={{ color: '#ef4444' }}>*</span></span>} value={newClient.last_name || ''} onChange={e => setNewClient({...newClient, last_name: e.target.value})} />
          <Input label={<span>Email <span style={{ color: '#ef4444' }}>*</span></span>} value={newClient.email || ''} onChange={e => setNewClient({...newClient, email: e.target.value})} />
          <Input label={<span>Phone <span style={{ color: '#ef4444' }}>*</span></span>} value={newClient.phone || ''} onChange={e => setNewClient({...newClient, phone: e.target.value})} />
          <Input label={<span>Date of Birth <span style={{ color: '#ef4444' }}>*</span></span>} type="date" value={newClient.date_of_birth || ''} onChange={e => setNewClient({...newClient, date_of_birth: e.target.value})} />
          <div style={{ gridColumn: '1 / -1', display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px' }}>
            <Input label="Address" value={newClient.address || ''} onChange={e => setNewClient({...newClient, address: e.target.value})} />
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px', color: 'var(--text-muted)' }}>
                Gender <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <select 
                style={{ width: '100%', padding: '12px', borderRadius: '8px', background: 'var(--bg-input)', border: '1px solid var(--border-color)', outline: 'none', color: 'var(--text-main)' }}
                value={newClient.gender || ''} onChange={e => setNewClient({...newClient, gender: e.target.value})}
              >
                <option value="">Select</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>
        </div>

        {/* Manually Add Extra Passengers */}
        <div style={{ marginTop: '24px', borderTop: '1px solid var(--border-color)', paddingTop: '24px' }}>
          <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '12px' }}>Manually Add Traveling Passengers</label>
          {newPassengers.map((np, index) => (
            <div key={index} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr auto', gap: '12px', alignItems: 'end', marginBottom: '16px' }}>
              <Input 
                label={<span>First Name <span style={{ color: '#ef4444' }}>*</span></span>}
                value={np.first_name || ''} 
                onChange={e => { const arr = [...newPassengers]; arr[index].first_name = e.target.value; setNewPassengers(arr); }} 
              />
              <Input 
                label="Middle Name" 
                value={np.middle_name || ''} 
                onChange={e => { const arr = [...newPassengers]; arr[index].middle_name = e.target.value; setNewPassengers(arr); }} 
              />
              <Input 
                label={<span>Last Name <span style={{ color: '#ef4444' }}>*</span></span>}
                value={np.last_name || ''} 
                onChange={e => { const arr = [...newPassengers]; arr[index].last_name = e.target.value; setNewPassengers(arr); }} 
              />
              <Input 
                label={<span>Date of Birth <span style={{ color: '#ef4444' }}>*</span></span>}
                type="date"
                value={np.date_of_birth || ''} 
                onChange={e => { const arr = [...newPassengers]; arr[index].date_of_birth = e.target.value; setNewPassengers(arr); }} 
              />
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '8px', color: 'var(--text-muted)' }}>
                  Gender <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <select 
                  style={{ width: '100%', padding: '12px', borderRadius: '8px', background: 'var(--bg-input)', border: '1px solid var(--border-color)', outline: 'none', color: 'var(--text-main)' }}
                  value={np.gender || ''} onChange={e => { const arr = [...newPassengers]; arr[index].gender = e.target.value; setNewPassengers(arr); }}
                >
                  <option value="">Select</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <Button 
                variant="ghost" 
                icon={Trash2} 
                onClick={() => { const arr = [...newPassengers]; arr.splice(index, 1); setNewPassengers(arr); }}
                style={{ color: '#ef4444', marginBottom: '24px' }}
              />
            </div>
          ))}
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setNewPassengers([...newPassengers, {first_name: '', middle_name: '', last_name: '', date_of_birth: '', gender: ''}])}
            icon={User}
          >
            + Add Another Passenger manually
          </Button>
        </div>
      </div>
    </Card>
  );
};

export default PassengerSection;
