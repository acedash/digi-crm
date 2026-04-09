import React, { useEffect, useState } from 'react';
import { Mail, Server, ShieldCheck, Save } from 'lucide-react';
import Card from '../../components/ui/Card';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import Toast from '../../components/ui/Toast';
import settingsService from './settingsService';
import { useAuthStore } from '../auth/useAuthStore';

const defaultForm = {
  host: '',
  port: 587,
  username: '',
  password: '',
  encryption: 'tls',
  from_address: '',
  from_name: '',
};

const decodeHtmlEntities = (value) => value
  .replace(/&amp;/g, '&')
  .replace(/&lt;/g, '<')
  .replace(/&gt;/g, '>')
  .replace(/&quot;/g, '"')
  .replace(/&#39;/g, "'");

const termsHtmlToPlainText = (value = '') => {
  if (!value || !value.includes('<')) return value;

  return decodeHtmlEntities(
    value
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n\n')
      .replace(/<p[^>]*>/gi, '')
      .replace(/<strong[^>]*>/gi, '')
      .replace(/<\/strong>/gi, '')
      .replace(/<[^>]+>/g, '')
  ).trim();
};

const SettingsPage = () => {
  const { user } = useAuthStore();
  const activeRole = typeof user?.roles?.[0] === 'object' ? user.roles[0].name : user?.roles?.[0];
  const isAdmin = activeRole === 'admin';
  const [form, setForm] = useState(defaultForm);
  const [templates, setTemplates] = useState([]);
  const [activeTemplateKey, setActiveTemplateKey] = useState('authorization');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingTemplates, setSavingTemplates] = useState(false);
  const [toast, setToast] = useState({ message: '', type: 'error' });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    if (!isAdmin) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const [mailResponse, templatesResponse] = await Promise.all([
        settingsService.getMailSettings(),
        settingsService.getMailTemplates(),
      ]);

      setForm({
        ...defaultForm,
        ...mailResponse.data.data,
      });
      const nextTemplates = (templatesResponse.data.data || []).map((template) => (
        template.key === 'authorization'
          ? { ...template, terms_content: termsHtmlToPlainText(template.terms_content || '') }
          : template
      ));
      setTemplates(nextTemplates);
      if (nextTemplates.length > 0) {
        setActiveTemplateKey((current) => (
          nextTemplates.some((template) => template.key === current)
            ? current
            : nextTemplates[0].key
        ));
      }
    } catch {
      setToast({ message: 'Failed to load settings.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (key, value) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  const handleTemplateChange = (templateKey, field, value) => {
    setTemplates((prev) => prev.map((template) => (
      template.key === templateKey
        ? { ...template, [field]: value }
        : template
    )));
  };

  const handleSubmit = async () => {
    if (!isAdmin) return;
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

  const handleTemplateSubmit = async () => {
    if (!isAdmin) return;
    try {
      setSavingTemplates(true);
      const response = await settingsService.updateMailTemplates(templates);
      setTemplates(response.data.data || []);
      setToast({ message: 'Email templates saved successfully.', type: 'success' });
    } catch (error) {
      setToast({
        message: error?.response?.data?.message || 'Failed to save email templates.',
        type: 'error',
      });
    } finally {
      setSavingTemplates(false);
    }
  };

  const activeTemplate = templates.find((template) => template.key === activeTemplateKey) || templates[0];

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
          {isAdmin
            ? 'Configure SMTP and email templates for the CRM.'
            : 'Review your account and workspace preferences.'}
        </p>
      </div>

      {!isAdmin ? (
        <>
          <Card title="Account Overview" subtitle="Your current CRM access" icon={ShieldCheck}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <Input label="Name" value={user?.name || ''} disabled />
              <Input label="Email" value={user?.email || ''} disabled />
              <Input label="Role" value={activeRole || 'User'} disabled />
              <Input label="Status" value={user?.status || 'Active'} disabled />
            </div>
          </Card>

          <Card title="Workspace Preferences" subtitle="Available settings for your role" icon={Mail}>
            <div style={{ display: 'grid', gap: '12px', color: 'var(--text-muted)', fontSize: '14px', lineHeight: 1.7 }}>
              <div>Theme mode can be changed anytime from the toggle in the top bar.</div>
              <div>SMTP configuration and customer email templates are available only to admin users.</div>
              <div>If you need email or system-setting changes, please contact your admin.</div>
            </div>
          </Card>
        </>
      ) : (
        <>
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

      <Card title="Email Templates" subtitle="Manage customer-facing mail copy for the CRM lifecycle" icon={Mail}>
        <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: '20px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {templates.map((template) => {
              const isActive = template.key === activeTemplate?.key;

              return (
                <button
                  key={template.key}
                  type="button"
                  onClick={() => setActiveTemplateKey(template.key)}
                  style={{
                    textAlign: 'left',
                    padding: '14px 16px',
                    borderRadius: '14px',
                    border: isActive ? '1px solid var(--accent-primary)' : '1px solid var(--border-color)',
                    background: isActive ? 'rgba(11, 97, 71, 0.08)' : 'var(--bg-card)',
                    color: 'var(--text-main)',
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center' }}>
                    <strong style={{ fontSize: '14px' }}>{template.name}</strong>
                    <span style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      color: template.enabled ? '#0f766e' : '#b45309',
                    }}>
                      {template.enabled ? 'ACTIVE' : 'PAUSED'}
                    </span>
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '6px', lineHeight: 1.5 }}>
                    {template.description}
                  </div>
                </button>
              );
            })}
          </div>

          {activeTemplate ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 180px', gap: '16px', alignItems: 'end' }}>
                <Input
                  label="Template Name"
                  value={activeTemplate.name}
                  onChange={(e) => handleTemplateChange(activeTemplate.key, 'name', e.target.value)}
                  placeholder="Authorization"
                />
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '8px', color: 'var(--text-muted)' }}>
                    Status
                  </label>
                  <select
                    value={activeTemplate.enabled ? 'enabled' : 'disabled'}
                    onChange={(e) => handleTemplateChange(activeTemplate.key, 'enabled', e.target.value === 'enabled')}
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
                    <option value="enabled">Enabled</option>
                    <option value="disabled">Disabled</option>
                  </select>
                </div>
              </div>

              <Input
                label="Email Subject"
                value={activeTemplate.subject}
                onChange={(e) => handleTemplateChange(activeTemplate.key, 'subject', e.target.value)}
                placeholder="Booking payment approval request"
              />

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '8px', color: 'var(--text-muted)' }}>
                  Description
                </label>
                <textarea
                  value={activeTemplate.description || ''}
                  onChange={(e) => handleTemplateChange(activeTemplate.key, 'description', e.target.value)}
                  rows={3}
                  style={{
                    width: '100%',
                    background: 'var(--bg-input)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '12px',
                    padding: '12px 16px',
                    color: 'var(--text-main)',
                    fontSize: '14px',
                    outline: 'none',
                    resize: 'vertical',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '8px', color: 'var(--text-muted)' }}>
                  Template Body
                </label>
                <textarea
                  value={activeTemplate.body}
                  onChange={(e) => handleTemplateChange(activeTemplate.key, 'body', e.target.value)}
                  rows={12}
                  style={{
                    width: '100%',
                    background: 'var(--bg-input)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '12px',
                    padding: '14px 16px',
                    color: 'var(--text-main)',
                    fontSize: '14px',
                    lineHeight: 1.6,
                    outline: 'none',
                    resize: 'vertical',
                    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, Liberation Mono, monospace',
                  }}
                />
              </div>

              {activeTemplate.key === 'authorization' ? (
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '8px', color: 'var(--text-muted)' }}>
                    Terms Content
                  </label>
                  <textarea
                    value={activeTemplate.terms_content || ''}
                    onChange={(e) => handleTemplateChange(activeTemplate.key, 'terms_content', e.target.value)}
                    rows={10}
                    style={{
                      width: '100%',
                      background: 'var(--bg-input)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '12px',
                      padding: '14px 16px',
                      color: 'var(--text-main)',
                      fontSize: '14px',
                      lineHeight: 1.6,
                      outline: 'none',
                      resize: 'vertical',
                      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, Liberation Mono, monospace',
                    }}
                  />
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '8px', lineHeight: 1.6 }}>
                    This field controls what <code>{'{{terms_html}}'}</code> renders. You can write plain text or HTML here.
                  </div>
                </div>
              ) : null}

              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                Available variables: {(activeTemplate.variables || []).map((item) => `{{${item}}}`).join(', ') || 'None'}
              </div>

              <div style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.7, padding: '12px 14px', borderRadius: '12px', background: 'var(--bg-app)', border: '1px solid var(--border-color)' }}>
                Template body supports HTML, and this saved body is the actual live email content inside the email card.
                {' '}
                {activeTemplate.key === 'authorization'
                  ? (
                    <>
                      You can fully arrange sections using placeholders like <code>{'{{ticket_images_html}}'}</code>, <code>{'{{hotel_images_html}}'}</code>, <code>{'{{car_images_html}}'}</code>, <code>{'{{cruise_images_html}}'}</code>, <code>{'{{travellers_html}}'}</code>, <code>{'{{fare_breakdown_html}}'}</code>, <code>{'{{declaration_html}}'}</code>, <code>{'{{terms_html}}'}</code>, and <code>{'{{approval_button_html}}'}</code>.
                    </>
                  )
                  : (
                    <>
                      You can fully arrange sections using placeholders like <code>{'{{booking_summary_html}}'}</code>, <code>{'{{flight_image_html}}'}</code>, <code>{'{{hotel_images_html}}'}</code>, <code>{'{{car_images_html}}'}</code>, <code>{'{{cruise_images_html}}'}</code>, <code>{'{{flight_change_details_html}}'}</code>, and <code>{'{{support_html}}'}</code>.
                    </>
                  )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <Button variant="primary" icon={Save} onClick={handleTemplateSubmit} isLoading={savingTemplates}>
                  Save Email Templates
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      </Card>
        </>
      )}

      <Toast
        message={toast.message}
        type={toast.type}
        onClose={() => setToast({ message: '', type: 'error' })}
      />
    </div>
  );
};

export default SettingsPage;
