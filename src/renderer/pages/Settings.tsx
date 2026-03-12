// src/renderer/pages/Settings.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const bb = (window as any).biblebeam;

interface AudioDevice {
  id: string;
  name: string;
  isDefault: boolean;
}

const PROVIDERS = [
  { id: 'groq',       label: 'Groq',         keyName: 'groq-api-key',       url: 'https://console.groq.com',     desc: 'Whisper-based · fast inference · generous free tier', icon: '⚡' },
  { id: 'deepgram',   label: 'Deepgram',      keyName: 'deepgram-api-key',   url: 'https://console.deepgram.com', desc: 'Best real-time streaming · $200 free credit',         icon: '🎯' },
  { id: 'assemblyai', label: 'AssemblyAI',     keyName: 'assemblyai-api-key', url: 'https://www.assemblyai.com',   desc: 'Accurate transcription · good alternative',          icon: '🔊' },
];

const TRANSLATIONS = [
  { id: 'KJV', label: 'King James Version',      desc: 'Public domain · bundled locally',   tag: 'Free' },
  { id: 'ASV', label: 'American Standard Version', desc: 'Public domain · bundled locally',  tag: 'Free' },
  { id: 'WEB', label: 'World English Bible',      desc: 'Public domain · bundled locally',   tag: 'Free' },
  { id: 'ESV', label: 'English Standard Version', desc: 'Requires free API key from esv.org', tag: 'API' },
];

const THEMES = [
  { id: 'system', label: 'System', desc: 'Follow your OS setting', icon: '💻' },
  { id: 'light',  label: 'Light',  desc: 'Light background',       icon: '☀️' },
  { id: 'dark',   label: 'Dark',   desc: 'Dark background',        icon: '🌙' },
];

export function Settings() {
  const navigate = useNavigate();
  const [provider,     setProvider]     = useState('groq');
  const [apiKey,       setApiKey]       = useState('');
  const [savedKey,     setSavedKey]     = useState(false);
  const [translation,  setTranslation]  = useState('KJV');
  const [threshold,    setThreshold]    = useState(0.9);
  const [semantic,     setSemantic]     = useState(false);
  const [autoDisplay,  setAutoDisplay]  = useState(true);
  const [theme,        setTheme]        = useState('system');
  const [audioDevice,  setAudioDevice]  = useState('default');
  const [devices,      setDevices]      = useState<AudioDevice[]>([]);
  const [saving,       setSaving]       = useState(false);
  const [status,       setStatus]       = useState('');
  const [activeTab,    setActiveTab]    = useState('general');

  const currentProvider = PROVIDERS.find(p => p.id === provider)!;

  useEffect(() => {
    (async () => {
      // Load settings
      const s = await bb?.getSettings?.();
      if (s) {
        setProvider(s.sttProvider || 'groq');
        setTranslation(s.translation || 'KJV');
        setThreshold(s.confidenceThreshold ?? 0.9);
        setSemantic(s.semanticMatchingEnabled ?? false);
        setAutoDisplay(s.autoDisplay ?? true);
        setAudioDevice(s.audioDevice || 'default');
        setTheme(s.theme || 'system');
      }

      // Load audio devices
      const devs = await bb?.getAudioDevices?.();
      if (devs) setDevices(devs);
    })();
  }, []);

  // Load saved key status when provider changes
  useEffect(() => {
    (async () => {
      const key = await bb?.getKey?.(currentProvider.keyName);
      setSavedKey(!!key);
      setApiKey('');
    })();
  }, [provider]);

  const saveKey = async () => {
    if (!apiKey.trim()) return;
    setSaving(true);
    try {
      await bb?.setKey?.(currentProvider.keyName, apiKey.trim());
      setSavedKey(true);
      setApiKey('');
      flash('API key saved to system keychain');
    } catch (e: any) {
      flash(`Error: ${e.message}`);
    }
    setSaving(false);
  };

  const handleThemeChange = async (newTheme: string) => {
    setTheme(newTheme);
    await bb?.setTheme?.(newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
  };

  const saveAll = async () => {
    await bb?.saveSettings?.({
      sttProvider: provider,
      translation,
      confidenceThreshold: threshold,
      semanticMatchingEnabled: semantic,
      autoDisplay,
      audioDevice,
      theme,
    });
    flash('All settings saved');
  };

  const refreshDevices = async () => {
    const devs = await bb?.getAudioDevices?.();
    if (devs) setDevices(devs);
    flash('Device list refreshed');
  };

  const flash = (msg: string) => {
    setStatus(msg);
    setTimeout(() => setStatus(''), 3000);
  };

  const tabs = [
    { id: 'general',   label: 'General' },
    { id: 'audio',     label: 'Audio' },
    { id: 'detection', label: 'Detection' },
    { id: 'about',     label: 'About' },
  ];

  return (
    <div style={p.root}>
      {/* Header */}
      <header style={p.header}>
        <button onClick={() => navigate('/operator')} style={p.backBtn}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="m15 18-6-6 6-6"/>
          </svg>
        </button>
        <span style={p.headerTitle}>Settings</span>
        <div style={p.headerRight}>
          {status && (
            <span style={p.statusMsg} className="fade-in">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 4 }}>
                <path d="M20 6 9 17l-5-5"/>
              </svg>
              {status}
            </span>
          )}
          <button onClick={saveAll} style={p.saveBtn}>Save all</button>
        </div>
      </header>

      <div style={p.layout}>
        {/* Sidebar tabs */}
        <nav style={p.nav}>
          {tabs.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              style={{
                ...p.navItem,
                ...(activeTab === tab.id ? p.navItemActive : {}),
              }}>
              {tab.label}
            </button>
          ))}
        </nav>

        {/* Content */}
        <div style={p.content}>
          {/* ── General ── */}
          {activeTab === 'general' && (
            <div className="fade-in">
              {/* Theme */}
              <SettingsGroup title="Appearance" desc="Choose your preferred theme">
                <div style={p.optionGrid}>
                  {THEMES.map(t => (
                    <button key={t.id} onClick={() => handleThemeChange(t.id)}
                      style={{
                        ...p.optionCard,
                        ...(theme === t.id ? p.optionCardActive : {}),
                      }}>
                      <span style={p.optionIcon}>{t.icon}</span>
                      <span style={p.optionLabel}>{t.label}</span>
                      <span style={p.optionDesc}>{t.desc}</span>
                    </button>
                  ))}
                </div>
              </SettingsGroup>

              {/* STT Provider */}
              <SettingsGroup title="Speech-to-text provider"
                desc="Select a provider and enter your API key">
                <div style={p.providerList}>
                  {PROVIDERS.map(pr => (
                    <button key={pr.id} onClick={() => setProvider(pr.id)}
                      style={{
                        ...p.providerRow,
                        ...(provider === pr.id ? p.providerRowActive : {}),
                      }}>
                      <div style={p.providerInfo}>
                        <span style={p.providerIcon}>{pr.icon}</span>
                        <div>
                          <span style={p.providerName}>{pr.label}</span>
                          <span style={p.providerDesc}>{pr.desc}</span>
                        </div>
                      </div>
                      {provider === pr.id && (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                          stroke="var(--accent)" strokeWidth="2.5"
                          strokeLinecap="round" strokeLinejoin="round">
                          <path d="M20 6 9 17l-5-5"/>
                        </svg>
                      )}
                    </button>
                  ))}
                </div>

                <div style={p.keySection}>
                  <label style={p.fieldLabel}>
                    API key
                    {savedKey && <span className="pill pill-green" style={{ marginLeft: 8 }}>Saved</span>}
                  </label>
                  <div style={p.keyRow}>
                    <input
                      type="password"
                      value={apiKey}
                      onChange={e => setApiKey(e.target.value)}
                      placeholder={savedKey ? '••••••••••••••••' : `Paste your ${currentProvider.label} API key`}
                      style={{ flex: 1, fontFamily: 'var(--mono)', fontSize: 12 }}
                    />
                    <button onClick={saveKey} disabled={saving || !apiKey.trim()} style={p.keyBtn}>
                      {saving ? 'Saving…' : 'Save key'}
                    </button>
                  </div>
                  <p style={p.fieldHint}>
                    Get a free key at{' '}
                    <a href={currentProvider.url} style={p.link} target="_blank" rel="noreferrer">
                      {currentProvider.url.replace('https://', '')}
                    </a>
                    . Keys are stored in your OS keychain — never sent to BibleBeam.
                  </p>
                </div>
              </SettingsGroup>

              {/* Translation */}
              <SettingsGroup title="Bible translation" desc="Select your default translation">
                <div style={p.translationList}>
                  {TRANSLATIONS.map(t => (
                    <button key={t.id} onClick={() => setTranslation(t.id)}
                      style={{
                        ...p.translationRow,
                        ...(translation === t.id ? p.translationRowActive : {}),
                      }}>
                      <div style={p.translationInfo}>
                        <span style={p.translationName}>{t.id}</span>
                        <span style={p.translationFull}>{t.label}</span>
                        <span style={p.translationDesc}>{t.desc}</span>
                      </div>
                      <span className={`pill pill-${t.tag === 'Free' ? 'green' : 'amber'}`}>
                        {t.tag}
                      </span>
                    </button>
                  ))}
                </div>
              </SettingsGroup>
            </div>
          )}

          {/* ── Audio ── */}
          {activeTab === 'audio' && (
            <div className="fade-in">
              <SettingsGroup title="Audio input"
                desc="Select which microphone or audio interface to use">
                <div style={p.fieldRow}>
                  <label style={p.fieldLabel}>Input device</label>
                  <div style={p.keyRow}>
                    <select value={audioDevice}
                      onChange={e => setAudioDevice(e.target.value)}
                      style={{ flex: 1, fontFamily: 'var(--mono)', fontSize: 12 }}>
                      <option value="default">System default</option>
                      {devices.map(d => (
                        <option key={d.id} value={d.id}>
                          {d.name}{d.isDefault ? ' (default)' : ''}
                        </option>
                      ))}
                    </select>
                    <button onClick={refreshDevices} style={p.keyBtn} title="Refresh device list">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                        strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
                        <path d="M3 3v5h5"/>
                        <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/>
                        <path d="M16 16h5v5"/>
                      </svg>
                    </button>
                  </div>
                  <p style={p.fieldHint}>
                    Connect your mixer or soundboard output to your computer's audio input.
                    BibleBeam works with any audio source your OS recognizes.
                  </p>
                </div>

                <div style={p.audioTip}>
                  <div style={p.tipIcon}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10"/>
                      <path d="M12 16v-4"/>
                      <path d="M12 8h.01"/>
                    </svg>
                  </div>
                  <div>
                    <span style={p.tipTitle}>Audio setup tip</span>
                    <span style={p.tipText}>
                      For best results, take a direct feed from your mixer's auxiliary or monitor output
                      rather than using a room microphone. This eliminates echo and background noise.
                    </span>
                  </div>
                </div>
              </SettingsGroup>
            </div>
          )}

          {/* ── Detection ── */}
          {activeTab === 'detection' && (
            <div className="fade-in">
              <SettingsGroup title="Auto-display"
                desc="Control how detected verses are shown on the projector">
                <div style={p.fieldRow}>
                  <label style={p.fieldLabel}>
                    Confidence threshold — <span style={{ color: 'var(--accent)', fontFamily: 'var(--mono)' }}>
                      {Math.round(threshold * 100)}%
                    </span>
                  </label>
                  <input
                    type="range" min="0.5" max="1" step="0.05"
                    value={threshold}
                    onChange={e => setThreshold(parseFloat(e.target.value))}
                  />
                  <p style={p.fieldHint}>
                    Verses detected with confidence above this threshold are displayed automatically.
                    Below it, they are queued for manual approval in the operator panel.
                  </p>
                </div>

                <Toggle
                  label="Auto-display"
                  desc="Automatically show high-confidence verses without manual approval"
                  value={autoDisplay}
                  onChange={setAutoDisplay}
                />

                <Toggle
                  label="Semantic matching"
                  desc="Detect paraphrases using a local AI model — uses more CPU and memory"
                  value={semantic}
                  onChange={setSemantic}
                  tag="Advanced"
                />
              </SettingsGroup>
            </div>
          )}

          {/* ── About ── */}
          {activeTab === 'about' && (
            <div className="fade-in">
              <SettingsGroup title="About BibleBeam" desc="">
                <div style={p.aboutCard}>
                  <div style={p.aboutLogo}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                      style={{ color: 'var(--accent)' }}>
                      <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/>
                    </svg>
                    <div>
                      <div style={p.aboutName}>BibleBeam</div>
                      <div style={p.aboutVersion}>Version 0.1.0 · MIT License</div>
                    </div>
                  </div>
                  <p style={p.aboutDesc}>
                    Open-source, real-time Bible verse detection for live sermons.
                    No subscriptions. No cloud accounts. Your API keys stay on your machine.
                  </p>
                  <div style={p.aboutLinks}>
                    <span style={p.aboutLink}>github.com/yourusername/biblebeam</span>
                  </div>
                </div>

                <div style={p.privacyCard}>
                  <div style={p.privacyTitle}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                      style={{ marginRight: 6 }}>
                      <rect width="18" height="11" x="3" y="11" rx="2" ry="2"/>
                      <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                    </svg>
                    Privacy
                  </div>
                  <ul style={p.privacyList}>
                    <li>Audio is streamed only to your chosen STT provider — never stored</li>
                    <li>API keys stored in your OS keychain — never in plaintext</li>
                    <li>All verse matching runs locally on your machine</li>
                    <li>No telemetry, no analytics, no tracking</li>
                  </ul>
                </div>
              </SettingsGroup>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Subcomponents ─────────────────────────────────────────────────────────────

function SettingsGroup({ title, desc, children }: {
  title: string; desc: string; children: React.ReactNode;
}) {
  return (
    <div style={p.group}>
      <div style={p.groupHeader}>
        <h2 style={p.groupTitle}>{title}</h2>
        {desc && <p style={p.groupDesc}>{desc}</p>}
      </div>
      <div style={p.groupBody}>{children}</div>
    </div>
  );
}

function Toggle({ label, desc, value, onChange, tag }: {
  label: string; desc: string; value: boolean;
  onChange: (v: boolean) => void; tag?: string;
}) {
  return (
    <div style={p.toggleRow} onClick={() => onChange(!value)}>
      <div style={{ flex: 1 }}>
        <div style={p.toggleLabel}>
          {label}
          {tag && <span className="pill pill-purple" style={{ marginLeft: 8 }}>{tag}</span>}
        </div>
        <div style={p.toggleDesc}>{desc}</div>
      </div>
      <div style={{
        width: 44, height: 24, borderRadius: 12,
        background: value ? 'var(--accent)' : 'var(--bg3)',
        border: `1px solid ${value ? 'var(--accent)' : 'var(--border2)'}`,
        position: 'relative', cursor: 'pointer',
        transition: 'all 150ms ease', flexShrink: 0,
      }}>
        <div style={{
          position: 'absolute',
          top: 2, left: value ? 22 : 2,
          width: 18, height: 18, borderRadius: '50%',
          background: value ? '#fff' : 'var(--text3)',
          transition: 'all 150ms ease',
          boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
        }} />
      </div>
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const p: Record<string, React.CSSProperties> = {
  root: {
    height: '100vh', background: 'var(--bg)',
    display: 'flex', flexDirection: 'column', overflow: 'hidden',
  },
  header: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '0 16px', height: 48,
    borderBottom: '1px solid var(--border)',
    background: 'var(--bg2)', flexShrink: 0,
  },
  backBtn: {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    background: 'transparent', color: 'var(--text2)',
    width: 32, height: 32, padding: 0,
  },
  headerTitle: { fontSize: 14, fontWeight: 600, letterSpacing: '-0.02em' },
  headerRight: { display: 'flex', alignItems: 'center', gap: 12 },
  statusMsg: {
    display: 'inline-flex', alignItems: 'center',
    fontSize: 11, color: 'var(--accent)', fontWeight: 500,
    fontFamily: 'var(--mono)',
  },
  saveBtn: {
    background: 'var(--accent)', color: 'var(--text-inverse)',
    padding: '6px 16px', fontSize: 12, fontWeight: 600,
  },

  layout: { display: 'flex', flex: 1, overflow: 'hidden' },

  // Nav sidebar
  nav: {
    width: 180, flexShrink: 0,
    padding: '16px 8px',
    borderRight: '1px solid var(--border)',
    background: 'var(--bg2)',
    display: 'flex', flexDirection: 'column', gap: 2,
  },
  navItem: {
    display: 'flex', alignItems: 'center',
    background: 'transparent', color: 'var(--text2)',
    padding: '8px 12px', fontSize: 13,
    borderRadius: 'var(--radius)', textAlign: 'left',
    fontWeight: 400,
  },
  navItemActive: {
    background: 'var(--bg-hover)',
    color: 'var(--text)',
    fontWeight: 500,
  },

  // Content
  content: {
    flex: 1, overflowY: 'auto',
    padding: '24px 32px',
  },

  // Group
  group: {
    marginBottom: 24,
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-lg)',
    overflow: 'hidden',
  },
  groupHeader: { padding: '16px 20px', borderBottom: '1px solid var(--border-subtle)' },
  groupTitle: { fontSize: 14, fontWeight: 600, marginBottom: 2, letterSpacing: '-0.01em' },
  groupDesc: { fontSize: 12, color: 'var(--text3)', lineHeight: 1.5 },
  groupBody: { padding: '16px 20px' },

  // Fields
  fieldRow: { marginBottom: 20 },
  fieldLabel: {
    display: 'flex', alignItems: 'center',
    fontSize: 13, fontWeight: 500, marginBottom: 8,
  },
  fieldHint: { fontSize: 11, color: 'var(--text3)', lineHeight: 1.6, marginTop: 8 },
  link: { color: 'var(--accent)', textDecoration: 'none', fontWeight: 500 },

  // Theme / option grid
  optionGrid: { display: 'flex', gap: 8 },
  optionCard: {
    flex: 1, display: 'flex', flexDirection: 'column',
    alignItems: 'center', gap: 4,
    padding: '14px 12px',
    background: 'var(--bg3)', border: '1px solid var(--border)',
    borderRadius: 'var(--radius-md)',
    cursor: 'pointer', textAlign: 'center',
    transition: 'all 150ms ease',
  },
  optionCardActive: {
    background: 'var(--accent-dim)',
    borderColor: 'var(--accent-border)',
  },
  optionIcon: { fontSize: 20 },
  optionLabel: { fontSize: 12, fontWeight: 600 },
  optionDesc: { fontSize: 10, color: 'var(--text3)' },

  // Provider list
  providerList: {
    display: 'flex', flexDirection: 'column', gap: 4,
    marginBottom: 16,
  },
  providerRow: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '10px 14px',
    background: 'var(--bg3)', border: '1px solid var(--border)',
    borderRadius: 'var(--radius-md)',
    cursor: 'pointer', textAlign: 'left',
    transition: 'all 150ms ease',
  },
  providerRowActive: {
    background: 'var(--accent-dim)',
    borderColor: 'var(--accent-border)',
  },
  providerInfo: { display: 'flex', alignItems: 'center', gap: 10 },
  providerIcon: { fontSize: 18 },
  providerName: { fontSize: 13, fontWeight: 600, display: 'block' },
  providerDesc: { fontSize: 11, color: 'var(--text3)', display: 'block' },

  // Key section
  keySection: { marginTop: 4 },
  keyRow: { display: 'flex', gap: 8 },
  keyBtn: {
    display: 'inline-flex', alignItems: 'center',
    background: 'var(--bg-active)', border: '1px solid var(--border2)',
    color: 'var(--text)', padding: '7px 14px', fontSize: 12,
    fontWeight: 500, flexShrink: 0,
  },

  // Translation list
  translationList: { display: 'flex', flexDirection: 'column', gap: 4 },
  translationRow: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '10px 14px',
    background: 'var(--bg3)', border: '1px solid var(--border)',
    borderRadius: 'var(--radius-md)',
    cursor: 'pointer', textAlign: 'left',
    transition: 'all 150ms ease',
  },
  translationRowActive: {
    background: 'var(--accent-dim)',
    borderColor: 'var(--accent-border)',
  },
  translationInfo: { display: 'flex', flexDirection: 'column', gap: 1 },
  translationName: {
    fontFamily: 'var(--mono)', fontSize: 13, fontWeight: 700,
    color: 'var(--text)',
  },
  translationFull: { fontSize: 12, fontWeight: 500, color: 'var(--text)' },
  translationDesc: { fontSize: 11, color: 'var(--text3)' },

  // Toggle
  toggleRow: {
    display: 'flex', justifyContent: 'space-between',
    alignItems: 'center', gap: 16,
    padding: '14px 0',
    borderTop: '1px solid var(--border-subtle)',
    cursor: 'pointer',
  },
  toggleLabel: {
    display: 'flex', alignItems: 'center',
    fontSize: 13, fontWeight: 500, marginBottom: 2,
  },
  toggleDesc: { fontSize: 11, color: 'var(--text3)', lineHeight: 1.5 },

  // Audio tip
  audioTip: {
    display: 'flex', gap: 12,
    padding: '14px 16px', marginTop: 16,
    background: 'var(--blue-dim)',
    border: '1px solid var(--blue-border)',
    borderRadius: 'var(--radius-md)',
  },
  tipIcon: {
    color: 'var(--blue)', flexShrink: 0, paddingTop: 2,
  },
  tipTitle: {
    fontSize: 12, fontWeight: 600, color: 'var(--blue)',
    display: 'block', marginBottom: 2,
  },
  tipText: { fontSize: 11, color: 'var(--text2)', lineHeight: 1.6, display: 'block' },

  // About
  aboutCard: { marginBottom: 16 },
  aboutLogo: {
    display: 'flex', alignItems: 'center', gap: 12,
    marginBottom: 12,
  },
  aboutName: { fontSize: 16, fontWeight: 700, letterSpacing: '-0.02em' },
  aboutVersion: {
    fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text3)',
  },
  aboutDesc: {
    fontSize: 13, color: 'var(--text2)',
    lineHeight: 1.6, marginBottom: 12,
  },
  aboutLinks: { display: 'flex', gap: 12 },
  aboutLink: {
    fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text3)',
  },

  privacyCard: {
    padding: '14px 16px',
    background: 'var(--accent-subtle)',
    border: '1px solid var(--accent-border)',
    borderRadius: 'var(--radius-md)',
  },
  privacyTitle: {
    display: 'flex', alignItems: 'center',
    fontSize: 13, fontWeight: 600, color: 'var(--accent)',
    marginBottom: 8,
  },
  privacyList: {
    margin: 0, paddingLeft: 20,
    fontSize: 12, color: 'var(--text2)',
    lineHeight: 1.8, listStyleType: 'disc',
  },
};