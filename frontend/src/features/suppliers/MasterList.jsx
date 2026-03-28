import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  Car, 
  Ship, 
  Plus, 
  Search, 
  MoreVertical,
  Edit2,
  Trash2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Button from '../../components/ui/Button';
import MasterForm from './MasterForm';
import masterService from './masterService';

const MasterList = () => {
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('hotels'); // hotels, cars, cruises
  const [data, setData] = useState([]); // Master data (hotels, cars, cruises)
  const [isMasterFormOpen, setIsMasterFormOpen] = useState(false);
  const [editingMaster, setEditingMaster] = useState(null);

  useEffect(() => {
    fetchMasterData();
  }, [activeTab]);

  const fetchMasterData = async () => {
    setLoading(true);
    try {
      let response;
      if (activeTab === 'hotels') response = await masterService.getHotels();
      else if (activeTab === 'cars') response = await masterService.getCars();
      else if (activeTab === 'cruises') response = await masterService.getCruises();
      
      setData(response.data.data);
    } catch (error) {
      console.error(`Failed to fetch ${activeTab}`, error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (item) => {
    setEditingMaster(item);
    setIsMasterFormOpen(true);
  };

  const filteredData = data.filter(item => {
    const name = item.name || item.company || item.cruise_name || '';
    return name.toLowerCase().includes(search.toLowerCase());
  });

  return (
    <div style={{ padding: '32px' }}>
      {/* Header Area */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'flex-end',
        marginBottom: '32px' 
      }}>
        <div>
          <h1 style={{ 
            fontSize: '32px', 
            fontWeight: 800, 
            color: 'var(--text-main)',
            marginBottom: '8px',
            letterSpacing: '-0.02em'
          }}>
            Service <span className="premium-gradient-text">Masters</span>
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '15px' }}>
            Directly manage your reusable hotels, cars, and cruise inventory.
          </p>
        </div>
        <Button 
          onClick={() => { 
            setEditingMaster(null);
            setIsMasterFormOpen(true);
          }} 
          icon={Plus}
        >
          Add {activeTab.slice(0, -1)}
        </Button>
      </div>

      {/* Tabs */}
      <div style={{ 
        display: 'flex', 
        gap: '8px', 
        marginBottom: '24px',
        padding: '4px',
        background: 'var(--bg-input)',
        borderRadius: '14px',
        width: 'fit-content'
      }}>
        {[
          { id: 'hotels', label: 'Hotels Master', icon: Building2 },
          { id: 'cars', label: 'Car Rentals', icon: Car },
          { id: 'cruises', label: 'Cruise Lines', icon: Ship },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 20px',
              borderRadius: '10px',
              border: 'none',
              background: activeTab === tab.id ? 'var(--bg-card)' : 'transparent',
              color: activeTab === tab.id ? 'hsl(var(--primary))' : 'var(--text-muted)',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'var(--transition-smooth)',
              boxShadow: activeTab === tab.id ? 'var(--shadow-sm)' : 'none'
            }}
          >
            <tab.icon size={16} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Main Content */}
      <div className="glass-panel" style={{ borderRadius: 'var(--radius)', overflow: 'hidden' }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-color)', display: 'flex', gap: '16px' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input 
              placeholder={`Search ${activeTab}...`}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: '100%',
                background: 'var(--bg-input)',
                border: '1px solid var(--border-color)',
                borderRadius: '12px',
                padding: '10px 12px 10px 40px',
                color: 'var(--text-main)',
                fontSize: '14px',
                outline: 'none'
              }}
            />
          </div>
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ background: 'var(--bg-input)', borderBottom: '1px solid var(--border-color)' }}>
              {activeTab === 'hotels' ? (
                <>
                  <th style={{ padding: '20px 24px', fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Hotel Name</th>
                  <th style={{ padding: '20px 24px', fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Location</th>
                  <th style={{ padding: '20px 24px', fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Rating</th>
                </>
              ) : activeTab === 'cars' ? (
                <>
                  <th style={{ padding: '20px 24px', fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Car/Company</th>
                  <th style={{ padding: '20px 24px', fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Type</th>
                  <th style={{ padding: '20px 24px', fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Capacity</th>
                </>
              ) : (
                <>
                  <th style={{ padding: '20px 24px', fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Cruise Name</th>
                  <th style={{ padding: '20px 24px', fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Operator</th>
                  <th style={{ padding: '20px 24px', fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Route</th>
                </>
              )}
              <th style={{ padding: '20px 24px', textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            <AnimatePresence>
              {filteredData.map((item, idx) => (
                <motion.tr 
                  key={item.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.03 }}
                  style={{ borderBottom: '1px solid var(--border-color)', transition: 'var(--transition-smooth)' }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-input)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  <td style={{ padding: '20px 24px' }}>
                    <p style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '14px' }}>{item.name || item.company || item.cruise_name}</p>
                    <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>ID: MST-{item.id.toString().padStart(4, '0')}</p>
                  </td>
                  <td style={{ padding: '20px 24px' }}>
                    {activeTab === 'hotels' ? (
                      <p style={{ fontSize: '13px', color: 'var(--text-main)' }}>{item.city}, {item.country}</p>
                    ) : activeTab === 'cars' ? (
                      <p style={{ fontSize: '13px', color: 'var(--text-main)' }}>{item.car_type}</p>
                    ) : (
                      <p style={{ fontSize: '13px', color: 'var(--text-main)' }}>{item.operator}</p>
                    )}
                  </td>
                  <td style={{ padding: '20px 24px' }}>
                    {activeTab === 'hotels' ? (
                      <div style={{ display: 'flex', gap: '2px' }}>
                        {[...Array(5)].map((_, i) => (
                          <div key={i} style={{ width: '8px', height: '8px', borderRadius: '50%', background: i < item.rating ? 'hsl(var(--primary))' : 'var(--border-color)' }} />
                        ))}
                      </div>
                    ) : activeTab === 'cars' ? (
                      <p style={{ fontSize: '13px', color: 'var(--text-main)' }}>{item.capacity} Persons</p>
                    ) : (
                      <p style={{ fontSize: '13px', color: 'var(--text-main)' }}>{item.departure_port || 'N/A'} → {item.destination || 'N/A'}</p>
                    )}
                  </td>
                  <td style={{ padding: '20px 24px', textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                      <button 
                        onClick={() => handleEdit(item)}
                        style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '6px' }}
                      >
                        <Edit2 size={16} />
                      </button>
                      <button 
                        style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#ef4444', padding: '6px' }}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </AnimatePresence>
          </tbody>
        </table>
      </div>

      <MasterForm 
        isOpen={isMasterFormOpen}
        onClose={() => setIsMasterFormOpen(false)}
        onSuccess={fetchMasterData}
        type={activeTab.slice(0, -1)}
        master={editingMaster}
      />
    </div>
  );
};

export default MasterList;
