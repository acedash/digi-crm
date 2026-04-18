import React, { useEffect, useState, useRef } from 'react';
import { 
  Mail, Server, ShieldCheck, Save, Eye, Code, 
  User, CreditCard, Layout, Info, ChevronRight,
  Maximize2, FileText, CheckCircle2
} from 'lucide-react';
import Card from '../../components/ui/Card';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import Toast from '../../components/ui/Toast';
import settingsService from './settingsService';
import { useAuthStore } from '../auth/useAuthStore';

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

const defaultForm = {
  host: '',
  port: 587,
  username: '',
  password: '',
  encryption: 'tls',
  from_address: '',
  from_name: '',
};

const VARIABLE_CATEGORIES = {
  customer: {
    label: 'Customer Info',
    icon: User,
    color: '#0ea5e9',
    variables: ['client_name'],
  },
  booking: {
    label: 'Booking Details',
    icon: FileText,
    color: '#8b5cf6',
    variables: [
      'booking_reference', 'currency', 'total_amount', 'status', 
      'travel_date', 'agent_name', 'pnr', 'service_summary',
      'authorization_type_label', 'supplier_label', 'masked_card'
    ],
  },
  layout: {
    label: 'Components',
    icon: Layout,
    color: '#10b981',
    variables: [
      'booking_summary_html', 'flight_image_html', 'hotel_images_html',
      'car_images_html', 'cruise_images_html', 'travellers_html',
      'fare_breakdown_html', 'declaration_html', 'terms_html',
      'approval_button_html', 'support_html', 'signature_html',
      'ticket_images_html', 'flight_change_details_html', 'card_allocations_html'
    ],
  },
};

const SAMPLE_VALUES = {
  client_name: 'John Doe',
  booking_reference: 'REF12345678',
  currency: 'USD',
  total_amount: '1,250.00',
  status: 'Confirmed',
  travel_date: '2024-06-15',
  agent_name: 'Sarah Smith',
  pnr: 'QZ7YWR',
  authorization_type_label: 'PAYMENT AUTHORIZATION',
  supplier_label: 'United Airlines',
  masked_card: '**** **** **** 4242',
  service_summary: 'Roundtrip Flight + 3 Nights Hotel in London',
  // Mock HTML sections
  booking_summary_html: '<div style="padding:16px;background:#f3f4f6;border-radius:12px;margin:12px 0;"><strong>Booking:</strong> LHR-JFK (United)</div>',
  flight_image_html: '<img src="https://images.unsplash.com/photo-1436491865332-7a61a109c055?w=600" style="width:100%;border-radius:12px;margin:12px 0;" />',
  hotel_images_html: '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:12px 0;"><div style="height:100px;background:#e5e7eb;border-radius:8px;"></div><div style="height:100px;background:#e5e7eb;border-radius:8px;"></div></div>',
  travellers_html: '<div style="margin:16px 0;padding:12px;border:1px solid #e5e7eb;border-radius:12px;"><strong>Travellers:</strong> John Doe, Jane Doe</div>',
  fare_breakdown_html: '<div style="margin:16px 0;padding:12px;border-top:1px solid #e5e7eb;"><strong>Total: $1,250.00</strong></div>',
  terms_html: '<div style="font-size:12px;color:#6b7280;margin:16px 0;">* Terms and conditions apply. Cancellation fees may vary by airline...</div>',
  approval_button_html: '<div style="text-align:center;margin:24px 0;"><button style="background:#016040;color:white;padding:12px 32px;border-radius:12px;border:none;font-weight:600;">Approve Now</button></div>',
  support_html: '<p style="font-size:13px;color:#6b7280;text-align:center;margin-top:32px;">Need help? Contact sarah@example.com</p>',
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
  const [activeTab, setActiveTab] = useState('edit'); // 'edit' | 'preview'
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const bodyRef = useRef(null);
  const termsRef = useRef(null);
  const [lastFocusedRef, setLastFocusedRef] = useState(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      
      const requests = [settingsService.getMailTemplates()];
      if (isAdmin) {
        requests.push(settingsService.getMailSettings());
      }

      const responses = await Promise.all(requests);
      const templatesResponse = responses[0];
      const mailResponse = isAdmin ? responses[1] : null;

      if (isAdmin && mailResponse) {
        setForm({
          ...defaultForm,
          ...mailResponse.data.data,
        });
      }

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

  const insertVariable = (variable) => {
    const targetRef = lastFocusedRef || bodyRef;
    if (!targetRef.current) return;

    const textarea = targetRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const insertion = `{{${variable}}}`;
    const before = text.substring(0, start);
    const after = text.substring(end, text.length);

    const newValue = before + insertion + after;
    
    // Determine which field to update
    const isTerms = targetRef === termsRef;
    handleTemplateChange(activeTemplateKey, isTerms ? 'terms_content' : 'body', newValue);

    // Reset focus and selection
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + insertion.length, start + insertion.length);
    }, 0);
  };

  const renderPreview = (content) => {
    if (!content) return '';
    let preview = content;
    Object.entries(SAMPLE_VALUES).forEach(([key, val]) => {
      preview = preview.split(`{{${key}}}`).join(val);
    });
    // Remove any remaining unresolved variables
    preview = preview.replace(/\{\{[^}]+\}\}/g, '<span style="color:#ef4444;background:#fee2e2;padding:2px 4px;border-radius:4px;font-size:10px;">[MISSING DATA]</span>');
    return preview;
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

      {!isAdmin && (
        <Card title="Workspace Settings" subtitle="Configurations available for your role" icon={ShieldCheck}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
            <div style={{ padding: '16px', background: 'var(--bg-app)', borderRadius: '16px', border: '1px solid var(--border-color)' }}>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px', textTransform: 'uppercase', fontWeight: 700 }}>Profile</div>
              <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>{user?.name}</div>
            </div>
            <div style={{ padding: '16px', background: 'var(--bg-app)', borderRadius: '16px', border: '1px solid var(--border-color)' }}>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px', textTransform: 'uppercase', fontWeight: 700 }}>Access Role</div>
              <div style={{ fontWeight: 700, color: 'hsl(var(--primary))' }}>{activeRole?.toUpperCase()}</div>
            </div>
            <div style={{ padding: '16px', background: 'var(--bg-app)', borderRadius: '16px', border: '1px solid var(--border-color)' }}>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px', textTransform: 'uppercase', fontWeight: 700 }}>Permissions</div>
              <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>Templates Enabled</div>
            </div>
          </div>
        </Card>
      )}

      {isAdmin && (
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
              placeholder="Digi CRM"
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button variant="primary" icon={Save} onClick={handleSubmit} isLoading={saving}>
              Save SMTP Settings
            </Button>
          </div>
        </Card>
      )}

      {/* Email Templates Card - Now visible to all roles */}
      <Card 
        title="Email Templates" 
        subtitle="Manage customer-facing mail copy for the CRM lifecycle" 
        icon={Mail}
        extra={(
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => setActiveTab('edit')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 16px',
                borderRadius: '10px',
                fontSize: '13px',
                fontWeight: 600,
                background: activeTab === 'edit' ? 'var(--accent-primary)' : 'transparent',
                color: activeTab === 'edit' ? 'white' : 'var(--text-muted)',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              <Code size={16} />
              Editor
            </button>
            <button
              onClick={() => setActiveTab('preview')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 16px',
                borderRadius: '10px',
                fontSize: '13px',
                fontWeight: 600,
                background: activeTab === 'preview' ? 'var(--accent-primary)' : 'transparent',
                color: activeTab === 'preview' ? 'white' : 'var(--text-muted)',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              <Eye size={16} />
              Preview
            </button>
          </div>
        )}
      >
        <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: '20px' }}>
          {/* Left Sidebar - Template List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', borderRight: '1px solid var(--border-color)', paddingRight: '20px' }}>
            {templates.map((template) => {
              const isActive = template.key === activeTemplate?.key;

              return (
                <button
                  key={template.key}
                  type="button"
                  onClick={() => {
                    setActiveTemplateKey(template.key);
                    setActiveTab('edit');
                  }}
                  style={{
                    textAlign: 'left',
                    padding: '14px 16px',
                    borderRadius: '16px',
                    border: isActive ? '1px solid var(--accent-primary)' : '1px solid var(--border-color)',
                    background: isActive ? 'rgba(11, 97, 71, 0.08)' : 'var(--bg-app)',
                    color: 'var(--text-main)',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    position: 'relative',
                    overflow: 'hidden'
                  }}
                >
                  {isActive && <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '4px', background: 'var(--accent-primary)' }} />}
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center' }}>
                    <strong style={{ fontSize: '14px', color: isActive ? 'var(--accent-primary)' : 'var(--text-main)' }}>{template.name}</strong>
                    <div style={{ 
                      width: '8px', 
                      height: '8px', 
                      borderRadius: '50%', 
                      background: template.enabled ? '#10b981' : '#f59e0b',
                      boxShadow: template.enabled ? '0 0 8px rgba(16, 185, 129, 0.4)' : 'none'
                    }} />
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '6px', lineHeight: 1.5 }}>
                    {template.description}
                  </div>
                </button>
              );
            })}
          </div>

          {activeTemplate ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {activeTab === 'edit' ? (
                <div style={{ display: 'grid', gridTemplateColumns: isSidebarOpen ? '1fr 280px' : '1fr', gap: '20px' }}>
                  {/* Editor Part */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 180px', gap: '16px', alignItems: 'end' }}>
                      <Input
                        label="Template Name"
                        value={activeTemplate.name}
                        onChange={(e) => handleTemplateChange(activeTemplate.key, 'name', e.target.value)}
                        placeholder="Authorization"
                      />
                      <div style={{ marginBottom: '20px' }}>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '8px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <CheckCircle2 size={14} /> Status
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
                          <option value="enabled">Active (Live)</option>
                          <option value="disabled">Paused (Draft)</option>
                        </select>
                      </div>
                    </div>

                    <Input
                      label="Email Subject Line"
                      icon={Mail}
                      value={activeTemplate.subject}
                      onChange={(e) => handleTemplateChange(activeTemplate.key, 'subject', e.target.value)}
                      placeholder="Enter a compelling subject..."
                    />

                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 600, color: 'var(--text-muted)' }}>
                          <Code size={16} color="var(--accent-primary)" />
                          Email Body (HTML Supported)
                        </label>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', background: 'var(--bg-app)', padding: '2px 8px', borderRadius: '6px' }}>
                          Real-time sync active
                        </div>
                      </div>
                      <textarea
                        ref={bodyRef}
                        onFocus={() => setLastFocusedRef(bodyRef)}
                        value={activeTemplate.body}
                        onChange={(e) => handleTemplateChange(activeTemplate.key, 'body', e.target.value)}
                        rows={15}
                        style={{
                          width: '100%',
                          background: 'var(--bg-input)',
                          border: '1px solid var(--border-color)',
                          borderRadius: '16px',
                          padding: '16px',
                          color: 'var(--text-main)',
                          fontSize: '14px',
                          lineHeight: 1.6,
                          outline: 'none',
                          resize: 'vertical',
                          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, Liberation Mono, monospace',
                          boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)'
                        }}
                      />
                    </div>

                    {activeTemplate.key === 'authorization' && (
                      <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '20px' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 600, marginBottom: '8px', color: 'var(--text-muted)' }}>
                          <FileText size={16} color="var(--accent-primary)" />
                          Legal Terms & Conditions ({'{{terms_html}}'})
                        </label>
                        <textarea
                          ref={termsRef}
                          onFocus={() => setLastFocusedRef(termsRef)}
                          value={activeTemplate.terms_content || ''}
                          onChange={(e) => handleTemplateChange(activeTemplate.key, 'terms_content', e.target.value)}
                          rows={8}
                          style={{
                            width: '100%',
                            background: 'var(--bg-input)',
                            border: '1px solid var(--border-color)',
                            borderRadius: '16px',
                            padding: '16px',
                            color: 'var(--text-main)',
                            fontSize: '14px',
                            lineHeight: 1.6,
                            outline: 'none',
                            resize: 'vertical',
                            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, Liberation Mono, monospace',
                          }}
                        />
                      </div>
                    )}
                  </div>

                  {/* Right Sidebar - Variable ToolBox */}
                  {isSidebarOpen && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', position: 'sticky', top: '24px', height: 'fit-content' }}>
                      <div style={{ background: 'var(--bg-app)', padding: '16px', borderRadius: '16px', border: '1px solid var(--border-color)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                          <h3 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Layout size={16} /> Variable Library
                          </h3>
                          <Info size={14} color="var(--text-muted)" />
                        </div>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                          {Object.entries(VARIABLE_CATEGORIES).map(([catKey, category]) => {
                            // Filter valid variables for this template
                            const availableVars = category.variables.filter(v => activeTemplate.variables.includes(v));
                            if (availableVars.length === 0) return null;

                            return (
                              <div key={catKey}>
                                <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <category.icon size={12} color={category.color} />
                                  {category.label}
                                </div>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                  {availableVars.map(v => (
                                    <button
                                      key={v}
                                      onClick={() => insertVariable(v)}
                                      title={`Insert {{${v}}}`}
                                      style={{
                                        background: 'var(--bg-card)',
                                        border: '1px solid var(--border-color)',
                                        borderRadius: '8px',
                                        padding: '4px 8px',
                                        fontSize: '11px',
                                        color: 'var(--text-main)',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '4px',
                                        transition: 'all 0.15s'
                                      }}
                                      onMouseOver={(e) => { e.currentTarget.style.borderColor = category.color; e.currentTarget.style.background = `${category.color}10`; }}
                                      onMouseOut={(e) => { e.currentTarget.style.borderColor = 'var(--border-color)'; e.currentTarget.style.background = 'var(--bg-card)'; }}
                                    >
                                      {v}
                                      <ChevronRight size={10} />
                                    </button>
                                  ))}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                        
                        <div style={{ marginTop: '16px', padding: '10px', background: 'rgba(56, 189, 248, 0.05)', borderRadius: '10px', fontSize: '11px', color: 'var(--text-muted)', lineHeight: 1.5, border: '1px dashed rgba(56, 189, 248, 0.2)' }}>
                          <strong>Tip:</strong> Click any variable above to insert it at your cursor position.
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                /* Preview Section */
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                   <div style={{ background: '#f8fafc', borderRadius: '24px', padding: '40px', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', maxWidth: '800px', margin: '0 auto', width: '100%' }}>
                      <div style={{ background: 'white', borderRadius: '16px', padding: '32px', border: '1px solid #cbd5e1', color: '#1e293b', position: 'relative' }}>
                        <div style={{ position: 'absolute', top: '12px', right: '12px', fontSize: '10px', fontWeight: 800, color: '#94a3b8', letterSpacing: '0.1em' }}>LIVE PREVIEW</div>
                        <div style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: '16px', marginBottom: '24px' }}>
                          <div style={{ fontSize: '14px', color: '#64748b', marginBottom: '4px' }}>Subject: <span style={{ color: '#0f172a', fontWeight: 600 }}>{activeTemplate.subject}</span></div>
                          <div style={{ fontSize: '14px', color: '#64748b' }}>From: <span style={{ color: '#0f172a', fontWeight: 600 }}>{form.from_name} &lt;{form.from_address}&gt;</span></div>
                        </div>
                        <div 
                          className="email-preview"
                          style={{ fontSize: '15px', lineHeight: 1.6 }}
                          dangerouslySetInnerHTML={{ __html: renderPreview(activeTemplate.body) }} 
                        />
                        
                        {activeTemplate.key === 'authorization' && activeTemplate.terms_content && (
                          <div style={{ borderTop: '2px dashed #f1f5f9', marginTop: '32px', paddingTop: '24px' }}>
                             <div 
                                style={{ fontSize: '12px', color: '#64748b', whiteSpace: 'pre-wrap' }}
                                dangerouslySetInnerHTML={{ __html: termsHtmlToPlainText(activeTemplate.terms_content).replace(/\n/g, '<br/>') }}
                             />
                          </div>
                        )}
                      </div>
                   </div>
                   <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
                      <Maximize2 size={14} />
                      This is a real-time rendering using sample passenger and booking data.
                   </div>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '10px' }}>
                <Button variant="outline" icon={Save} onClick={handleTemplateSubmit} isLoading={savingTemplates}>
                  Save All Changes
                </Button>
              </div>
            </div>
          ) : null}
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
