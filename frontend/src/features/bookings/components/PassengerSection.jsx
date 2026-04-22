import { User, Trash2, Plus, Search } from 'lucide-react';
import Card from '../../../components/ui/Card';
import Input from '../../../components/ui/Input';
import Button from '../../../components/ui/Button';
import SectionHeader from './SectionHeader';

const PassengerSection = ({
  isEditMode = false,
  newClient,
  setNewClient,
  newPassengers,
  setNewPassengers,
  onAddContactAsTraveler,
  contactAlreadyAddedAsTraveler = false,
  selectedClientId,
  existingClientSearch,
  setExistingClientSearch,
  existingClientResults = [],
  existingClientsLoading = false,
  matchedClients = [],
  matchesLoading = false,
  onSelectMatchedClient,
  onClearMatchedClient,
  onRequestCardDetails,
}) => {
  const handlePhoneChange = (e, field) => {
    const value = e.target.value;
    // Allow digits, plus, spaces, dashes, and parentheses but strip everything else
    const filtered = value.replace(/[^0-9\+\-\s\(\)]/g, '');
    setNewClient({ ...newClient, [field]: filtered });
  };

  return (
    <Card style={{ padding: 0 }}>
      <SectionHeader icon={User} title="1. Card Holder & Travelers" isActive={true} />
      <div style={{ padding: '24px' }}>
        <div style={{ marginBottom: '18px' }}>
          <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-main)', marginBottom: '6px' }}>
            Card Holder Profile
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.6 }}>
            This person is the billing card holder in the CRM. They are not added as a traveler automatically.
          </div>
        </div>

        {!isEditMode ? (
          <div style={{ 
            marginBottom: '24px', 
            padding: '24px', 
            borderRadius: '20px', 
            border: '2px solid rgba(6, 182, 138, 0.45)', 
            background: 'linear-gradient(135deg, rgba(6, 182, 138, 0.14) 0%, rgba(5, 150, 105, 0.06) 100%)',
            boxShadow: '0 8px 30px rgba(6, 182, 138, 0.08)',
            position: 'relative',
            overflow: 'hidden'
          }}>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
              <div style={{ 
                width: '28px', 
                height: '28px', 
                borderRadius: '8px', 
                background: '#06B68A', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                color: 'white',
                boxShadow: '0 4px 10px rgba(6, 182, 138, 0.3)'
              }}>
                <Search size={16} />
              </div>
              <div style={{ fontSize: '15px', fontWeight: 900, color: 'var(--text-main)', letterSpacing: '-0.01em' }}>
                Use Existing Client
              </div>
            </div>
            
            <div style={{ fontSize: '13px', color: 'var(--text-main)', opacity: 0.8, lineHeight: 1.6, marginBottom: '20px', maxWidth: '85%', fontWeight: 500 }}>
              Search by client name, email, or phone to instantly populate booking details from an existing profile.
            </div>
            <Input
              label="Search Existing Client"
              placeholder="Search by name, email, or phone..."
              value={existingClientSearch}
              onChange={(e) => setExistingClientSearch(e.target.value)}
              onClear={() => setExistingClientSearch('')}
              style={{ marginBottom: 0 }}
            />

            {existingClientSearch.trim().length >= 2 ? (
              <div style={{ marginTop: '12px' }}>
                {existingClientsLoading ? (
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    Searching existing clients...
                  </div>
                ) : existingClientResults.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {existingClientResults.map((client) => (
                      <button
                        key={client.id}
                        type="button"
                        onClick={() => onSelectMatchedClient(client)}
                        style={{
                          width: '100%',
                          textAlign: 'left',
                          padding: '12px 14px',
                          borderRadius: '12px',
                          border: '1px solid var(--border-color)',
                          background: 'var(--bg-card)',
                          color: 'var(--text-main)',
                          cursor: 'pointer',
                          display: 'grid',
                          gap: '6px',
                        }}
                      >
                        <div style={{ fontSize: '14px', fontWeight: 700 }}>
                          {[client.first_name, client.middle_name, client.last_name].filter(Boolean).join(' ') || client.name || 'Unnamed Client'}
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                          {client.email || 'No email'} | {client.phone || 'No phone'}
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                          {client.bookings?.length || 0} booking(s) on profile
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    No existing client found for this search.
                  </div>
                )}
              </div>
            ) : null}
          </div>
        ) : null}

        {selectedClientId && !isEditMode ? (
          <div style={{ marginBottom: '18px', padding: '14px 16px', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
            <div>
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#10b981' }}>Existing client profile selected</div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                This booking will be attached to the existing client history.
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={onClearMatchedClient}>
              Create New Instead
            </Button>
          </div>
        ) : null}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
          <Input label="First Name" required value={newClient.first_name || ''} onChange={e => setNewClient({...newClient, first_name: e.target.value})} />
          <Input label="Middle Name" value={newClient.middle_name || ''} onChange={e => setNewClient({...newClient, middle_name: e.target.value})} />
          <Input label="Last Name" required value={newClient.last_name || ''} onChange={e => setNewClient({...newClient, last_name: e.target.value})} />
          <Input label="Email" required value={newClient.email || ''} onChange={e => setNewClient({...newClient, email: e.target.value})} />
          <Input label="Phone" required type="tel" inputMode="tel" value={newClient.phone || ''} onChange={e => handlePhoneChange(e, 'phone')} />
          <Input label="Date of Birth" required type="date" value={newClient.date_of_birth || ''} onChange={e => setNewClient({...newClient, date_of_birth: e.target.value})} />
          <Input label="Alternate Email" value={newClient.alternate_email || ''} onChange={e => setNewClient({...newClient, alternate_email: e.target.value})} />
          <Input label="Alternate Phone" type="tel" inputMode="tel" value={newClient.alternate_phone || ''} onChange={e => handlePhoneChange(e, 'alternate_phone')} />
          <div style={{ gridColumn: '1 / -1', display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px' }}>
            <Input label="Billing Address" value={newClient.address || ''} onChange={e => setNewClient({...newClient, address: e.target.value})} />
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px', color: 'var(--text-muted)' }}>
                Gender
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

        <div style={{ marginTop: '18px', padding: '14px 16px', borderRadius: '12px', background: 'var(--bg-app)', border: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-main)', marginBottom: '4px' }}>
              Card holder also traveling?
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.6 }}>
              Add the card holder as a traveler in one click.
            </div>
          </div>
          <Button
            variant={contactAlreadyAddedAsTraveler ? 'secondary' : 'outline'}
            size="sm"
            onClick={onAddContactAsTraveler}
            icon={contactAlreadyAddedAsTraveler ? undefined : Plus}
          >
            {contactAlreadyAddedAsTraveler ? 'Traveler Added' : 'Add as Traveler'}
          </Button>
        </div>

        {!selectedClientId && (matchedClients.length > 0 || matchesLoading) ? (
          <div style={{ marginTop: '20px', padding: '16px', borderRadius: '14px', border: '1px solid var(--border-color)', background: 'var(--bg-app)' }}>
            <div style={{ fontSize: '13px', fontWeight: 700, marginBottom: '10px', color: 'var(--text-main)' }}>
              Matching existing clients
            </div>
            {matchesLoading ? (
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Checking for existing client profiles...</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {matchedClients.map((client) => (
                  <button
                    key={client.id}
                    type="button"
                    onClick={() => onSelectMatchedClient(client)}
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      padding: '12px 14px',
                      borderRadius: '12px',
                      border: '1px solid var(--border-color)',
                      background: 'var(--bg-card)',
                      color: 'var(--text-main)',
                      cursor: 'pointer',
                      display: 'grid',
                      gap: '6px',
                    }}
                  >
                    <div style={{ fontSize: '14px', fontWeight: 700 }}>
                      {[client.first_name, client.middle_name, client.last_name].filter(Boolean).join(' ') || client.name || 'Unnamed Client'}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                      {client.email || 'No email'} | {client.phone || 'No phone'}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                      {client.bookings?.length || 0} booking(s) on profile
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : null}

        {/* Manually Add Extra Passengers */}
        {/* Manually Add Extra Passengers */}
        <div style={{ marginTop: '24px', borderTop: '1px solid var(--border-color)', paddingTop: '24px' }}>
          <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '16px' }}>Traveling Passengers</label>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '20px', lineHeight: 1.6 }}>
            Add the actual passengers traveling on this booking here.
          </p>

          {/* Header Row */}
          {newPassengers.length > 0 && (
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: '100px 1.5fr 1fr 1.5fr 160px 140px 40px', 
              gap: '12px', 
              marginBottom: '10px',
              padding: '0 4px',
              color: 'var(--text-muted)',
              fontSize: '12px',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.05em'
            }}>
              <div>Type <span style={{ color: '#ef4444' }}>*</span></div>
              <div>First Name <span style={{ color: '#ef4444' }}>*</span></div>
              <div>Middle Name</div>
              <div>Last Name <span style={{ color: '#ef4444' }}>*</span></div>
              <div>Date of Birth <span style={{ color: '#ef4444' }}>*</span></div>
              <div>Gender <span style={{ color: '#ef4444' }}>*</span></div>
              <div></div>
            </div>
          )}

          {newPassengers.map((np, index) => (
            <div key={index} style={{ display: 'grid', gridTemplateColumns: '100px 1.5fr 1fr 1.5fr 160px 140px 40px', gap: '12px', alignItems: 'center', marginBottom: '12px' }}>
              <div>
                <select 
                  style={{ width: '100%', padding: '12px', borderRadius: '10px', background: 'var(--bg-input)', border: '1px solid var(--border-color)', outline: 'none', color: 'var(--text-main)', fontSize: '14px' }}
                  value={np.type || 'Adult'} 
                  onChange={e => { const arr = [...newPassengers]; arr[index].type = e.target.value; setNewPassengers(arr); }}
                >
                  <option value="Adult">Adult</option>
                  <option value="Child">Child</option>
                  <option value="Infant">Infant</option>
                </select>
              </div>
              <Input 
                placeholder="First Name"
                value={np.first_name || ''} 
                onChange={e => { const arr = [...newPassengers]; arr[index].first_name = e.target.value; setNewPassengers(arr); }} 
                style={{ marginBottom: 0 }}
              />
              <Input 
                placeholder="Middle Name" 
                value={np.middle_name || ''} 
                onChange={e => { const arr = [...newPassengers]; arr[index].middle_name = e.target.value; setNewPassengers(arr); }} 
                style={{ marginBottom: 0 }}
              />
              <Input 
                placeholder="Last Name"
                value={np.last_name || ''} 
                onChange={e => { const arr = [...newPassengers]; arr[index].last_name = e.target.value; setNewPassengers(arr); }} 
                style={{ marginBottom: 0 }}
              />
              <Input 
                type="date"
                value={np.date_of_birth || ''} 
                onChange={e => { const arr = [...newPassengers]; arr[index].date_of_birth = e.target.value; setNewPassengers(arr); }} 
                style={{ marginBottom: 0 }}
              />
              <div>
                <select 
                  style={{ width: '100%', padding: '12px', borderRadius: '10px', background: 'var(--bg-input)', border: '1px solid var(--border-color)', outline: 'none', color: 'var(--text-main)', fontSize: '14px' }}
                  value={np.gender || ''} onChange={e => { const arr = [...newPassengers]; arr[index].gender = e.target.value; setNewPassengers(arr); }}
                >
                  <option value="">Gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <Button 
                variant="ghost" 
                icon={Trash2} 
                onClick={() => { const arr = [...newPassengers]; arr.splice(index, 1); setNewPassengers(arr); }}
                style={{ color: '#ef4444', height: '46px', width: '40px', minWidth: '40px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              />
            </div>
          ))}
          <Button 
            variant="outline" 
            size="sm" 
            style={{ marginTop: '8px' }}
            onClick={() => setNewPassengers([...newPassengers, {type: 'Adult', first_name: '', middle_name: '', last_name: '', date_of_birth: '', gender: ''}])}
            icon={Plus}
          >
            Add Passenger
          </Button>
        </div>
      </div>
    </Card>
  );
};

export default PassengerSection;
