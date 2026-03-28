import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import clientService from './clientService';
import ClientForm from './ClientForm';
import { motion } from 'framer-motion';
import { ArrowLeft, RefreshCw } from 'lucide-react';

const ClientEditPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [client, setClient] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchClient = async () => {
            try {
                const res = await clientService.getClient(id);
                setClient(res.data.data);
            } catch (err) {
                console.error('Failed to load client', err);
                navigate('/clients');
            } finally {
                setLoading(false);
            }
        };
        fetchClient();
    }, [id]);

    const handleSuccess = () => {
        navigate(`/clients/${id}`);
    };

    if (loading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '100px' }}>
                <RefreshCw className="animate-spin" size={32} />
            </div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            style={{ padding: '24px', maxWidth: '1000px', margin: '0 auto' }}
        >
            <div style={{ marginBottom: '24px' }}>
                <button 
                    onClick={() => navigate(`/clients/${id}`)}
                    style={{ 
                        color: 'var(--text-muted)', 
                        background: 'none', border: 'none', 
                        cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px',
                        fontSize: '14px'
                    }}
                >
                    <ArrowLeft size={16} /> Back to Profile
                </button>
            </div>
            
            {/* We will update ClientForm to support isFullPage prop */}
            <ClientForm 
                client={client} 
                isFullPage={true}
                onClose={() => navigate(`/clients/${id}`)}
                onSuccess={handleSuccess}
            />
        </motion.div>
    );
};

export default ClientEditPage;
