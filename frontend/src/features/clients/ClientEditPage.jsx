import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import clientService from './clientService';
import ClientForm from './ClientForm';
import Button from '../../components/ui/Button';
import { motion } from 'framer-motion';
import { ArrowLeft, RefreshCw } from 'lucide-react';

const ClientEditPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const basePath = '/' + location.pathname.split('/')[1];
    const [client, setClient] = useState(null);
    const [loading, setLoading] = useState(true);
    useEffect(() => {
        const fetchClient = async () => {
            setLoading(true);
            try {
                const res = await clientService.getClient(id);
                setClient(res.data.data);
            } catch (err) {
                console.error('Failed to load client', err);
                navigate(`${basePath}/clients`);
            } finally {
                setLoading(false);
            }
        };
        fetchClient();
    }, [basePath, id, navigate]);

    const handleSuccess = () => {
        navigate(`${basePath}/clients/${id}`);
    };

    if (loading) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '100px', color: 'hsl(var(--primary))' }}>
                <RefreshCw className="animate-spin" size={32} />
                <p style={{ marginTop: '16px', fontSize: '14px', color: 'var(--text-muted)' }}>Loading Client Data...</p>
            </div>
        );
    }

    if (!client && !loading) {
        return (
            <div style={{ padding: '40px', textAlign: 'center' }}>
                <p style={{ color: '#f87171', marginBottom: '16px' }}>Failed to load client details.</p>
                <Button variant="primary" onClick={() => window.location.reload()}>Try Refreshing Page</Button>
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
                    onClick={() => navigate(`${basePath}/clients/${id}`)}
                    style={{ 
                        color: 'var(--text-muted)', 
                        background: 'none', border: 'none', 
                        cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px',
                        fontSize: '14px'
                    }}
                >
                    <ArrowLeft size={16} /> Back to Client Profile
                </button>
            </div>
            
            <ClientForm 
                client={client} 
                isFullPage={true}
                onClose={() => navigate(`${basePath}/clients/${id}`)}
                onSuccess={handleSuccess}
            />
        </motion.div>
    );
};

export default ClientEditPage;
