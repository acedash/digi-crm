import React, { useEffect, useState } from 'react';
import { Mail, Server, ShieldCheck, Save } from 'lucide-react';
import Card from '../../components/ui/Card';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import Toast from '../../components/ui/Toast';
import settingsService from './settingsService';

const defaultForm = {
  host: '',
  port: 587,
  username: '',
  password: '',
  encryption: 'tls',
  from_address: '',
  from_name: '',
};

const SettingsPage = () => {
  const [form, setForm] = useState(defaultForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState({ message: '', type: 'error' });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const response = await settingsService.getMailSettings();
      setForm({
        ...defaultForm,
        ...response.data.data,
      });
    } catch {
      setToast({ message: 'Failed to load SMTP settings.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (key, value) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async () => {
    try {
      setSaving(true);
      await settingsService.updateMailSettings({
        ...form,
        port: Number(form.port),
      });
      setToast({ message: 'SMTP settings saved successfully.', type: 'success' });
      setForm(prev => ({ ...prev, password: '' }));
      await loadSettings();
    } catch (error) {
      setToast({
        message: error?.response?.data?.message || 'Failed to save SMTP settings.',
        type: 'error',
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '24px', color: 'var(--text-muted)' }}>
        Loading settings...
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div>
        <h1 style={{ fontSize: '32px', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.8px' }}>
          Settings
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginTop: '4px' }}>
          Configure SMTP so booking authorization emails can be sent from the CRM.
        </p>
      </div>

      <Card title="SMTP Configuration" subtitle="Mail server used for customer approval emails" icon={Mail}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 180px', gap: '16px' }}>
          <Input
            label="SMTP Host"
            icon={Server}
            value={form.host}
            onChange={(e) => handleChange('host', e.target.value)}
            placeholder="smtp.gmail.com"
          />
          <Input
            label="Port"
            value={form.port}
            onChange={(e) => handleChange('port', e.target.value)}
            placeholder="587"
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <Input
            label="Username"
            value={form.username}
            onChange={(e) => handleChange('username', e.target.value)}
            placeholder="mailer@example.com"
          />
          <Input
            label="Password"
            type="password"
            value={form.password}
            onChange={(e) => handleChange('password', e.target.value)}
            placeholder="Leave blank to keep existing password"
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr 1fr', gap: '16px', alignItems: 'end' }}>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '8px', color: 'var(--text-muted)' }}>
              Encryption
            </label>
            <select
              value={form.encryption}
              onChange={(e) => handleChange('encryption', e.target.value)}
              style={{
                width: '100%',
                background: 'var(--bg-input)',
                border: '1px solid var(--border-color)',
                borderRadius: '12px',
                padding: '12px 16px',
                color: 'var(--text-main)',
                fontSize: '14px',
                outline: 'none',
              }}
            >
              <option value="tls">TLS</option>
              <option value="ssl">SSL</option>
              <option value="none">None</option>
            </select>
          </div>

          <Input
            label="From Email"
            value={form.from_address}
            onChange={(e) => handleChange('from_address', e.target.value)}
            placeholder="noreply@example.com"
          />
          <Input
            label="From Name"
            icon={ShieldCheck}
            value={form.from_name}
            onChange={(e) => handleChange('from_name', e.target.value)}
            placeholder="Travel CRM"
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Button variant="primary" icon={Save} onClick={handleSubmit} isLoading={saving}>
            Save SMTP Settings
          </Button>
        </div>
      </Card>

      <Toast
        message={toast.message}
        type={toast.type}
        onClose={() => setToast({ message: '', type: 'error' })}
      />
    </div>
  );
};

export default SettingsPage;
