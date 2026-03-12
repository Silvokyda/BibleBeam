// src/renderer/pages/Settings.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const bb = (window as any).biblebeam;

const PROVIDERS = [
  { id: 'groq',       label: 'Groq (Whisper)',    keyName: 'groq-api-key',       url: 'https://console.groq.com' },
  { id: 'deepgram',   label: 'Deepgram',           keyName: 'deepgram-api-key',   url: 'https://console.deepgram.com' },
  { id: 'assemblyai', label: 'AssemblyAI',         keyName: 'assemblyai-api-key', url: 'https://www.assemblyai.com' },
];

const TRANSLATIONS = ['KJV', 'ASV', 'WEB', 'ESV'];
const MIC_DEVICE   = 'alsa_input.pci-0000_00_1f.3-platform-skl_hda_dsp_generic.HiFi__Mic1__source';

export function Settings() {
  const navigate = useNavigate();
  const [provider,     setProvider]     = useState('groq');
  const [apiKey,       setApiKey]       = useState('');
  const [savedKey,     setSavedKey]     = useState(false);
  const [translation,  setTranslation]  = useState('KJV');
  const [threshold,    setThreshold]    = useState(0.9);
  const [semantic,     setSemantic]     = useState(false);
  const [autoDisplay,  setAutoDisplay]  = useState(true);
  const [saving,       setSaving]       = useState(false);
  const [status,       setStatus]       = useState('');

  const currentProvider = PROVIDERS.find(p => p.id === provider)!;

  // Load saved key (masked) on mount and when provider changes
  useEffect(() => {
    (async () => {
      const key = await bb?.getKey?.(currentProvider.keyName);
      setSavedKey(!!key);
      setApiKey(''); // never pre-fill the actual key
    })();
  }, [provider]);

  const saveKey = async () => {
    if (!apiKey.trim()) return;
    setSaving(true);
    try {
      await bb?.setKey?.(currentProvider.keyName, apiKey.trim());
      setSavedKey(true);
      setApiKey('');
      setStatus('Key saved to keychain.');
      setTimeout(() => setStatus(''), 3000);
    } catch (e: any) {
      setStatus(`Error: ${e.message}`);
    }
    setSaving(false);
  };

  const saveSettings = async () => {
    await bb?.saveSettings?.({
      sttProvider:            provider,
      translation,
      confidenceThreshold:    threshold,
      semanticMatchingEnabled: semantic,
      autoDisplay,
      micDevice:              MIC_DEVICE,
    });
    setStatus('Settings saved.');
    setTimeout(() => setStatus(''), 2000);
  };

  return (
    <div style={styles.root}>
      <header style={styles.header}>
        <button onClick={() => navigate('/operator')} style={styles.back}>
          ← Back
        </button>
        <span style={styles.title}>Settings</span>
      </header>

      <div style={styles.body}>

        {/* STT Provider */}
        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>Speech-to-text provider</h2>

          <div style={styles.field}>
            <label style={styles.label}>Provider</label>
            <select
              value={provider}
              onChange={e => setProvider(e.target.value)}
              style={styles.select}
            >
              {PROVIDERS.map(p => (
                <option key={p.id} value={p.id}>{p.label}</option>
              ))}
            </select>
          </div>

          <div style={styles.field}>
            <label style={styles.label}>
              API key
              {savedKey && (
                <span className="pill pill-green" style={{ marginLeft: 8 }}>
                  saved
                </span>
              )}
            </label>
            <div style={styles.keyRow}>
              <input
                type="password"
                value={apiKey}
                onChange={e => setApiKey(e.target.value)}
                placeholder={savedKey ? '••••••••••••••••' : `Paste your ${currentProvider.label} key`}
                style={{ ...styles.input, flex: 1 }}
              />
              <button onClick={saveKey} disabled={saving || !apiKey} style={styles.btnSave}>
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
            <p style={styles.hint}>
              Get a free key at{' '}
              <a href={currentProvider.url} style={styles.link}>
                {currentProvider.url}
              </a>
              {' '}— stored in your OS keychain, never sent to us.
            </p>
          </div>
        </section>

        {/* Bible translation */}
        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>Bible translation</h2>
          <div style={styles.field}>
            <label style={styles.label}>Default translation</label>
            <select
              value={translation}
              onChange={e => setTranslation(e.target.value)}
              style={styles.select}
            >
              {TRANSLATIONS.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
        </section>

        {/* Detection */}
        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>Detection</h2>

          <div style={styles.field}>
            <label style={styles.label}>
              Auto-display threshold — {Math.round(threshold * 100)}%
            </label>
            <input
              type="range" min="0.5" max="1" step="0.05"
              value={threshold}
              onChange={e => setThreshold(parseFloat(e.target.value))}
              style={{ width: '100%', accentColor: 'var(--accent)' }}
            />
            <p style={styles.hint}>
              Verses detected above this confidence show automatically.
              Below it they go to the approval queue.
            </p>
          </div>

          <div style={styles.toggleRow}>
            <div>
              <div style={styles.label}>Auto-display</div>
              <div style={styles.hint}>Show high-confidence verses without approval</div>
            </div>
            <Toggle value={autoDisplay} onChange={setAutoDisplay} />
          </div>

          <div style={styles.toggleRow}>
            <div>
              <div style={styles.label}>Semantic matching</div>
              <div style={styles.hint}>Catch paraphrases — slower, uses local AI model</div>
            </div>
            <Toggle value={semantic} onChange={setSemantic} />
          </div>
        </section>

        <div style={styles.footer}>
          {status && <span style={styles.statusMsg}>{status}</span>}
          <button onClick={saveSettings} style={styles.btnPrimary}>
            Save settings
          </button>
        </div>
      </div>
    </div>
  );
}

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div
      onClick={() => onChange(!value)}
      style={{
        width: 40, height: 22, borderRadius: 11,
        background: value ? 'var(--accent)' : 'var(--bg3)',
        border: '1px solid var(--border2)',
        position: 'relative', cursor: 'pointer',
        transition: 'background 0.2s', flexShrink: 0,
      }}
    >
      <div style={{
        position: 'absolute',
        top: 2, left: value ? 20 : 2,
        width: 16, height: 16, borderRadius: '50%',
        background: value ? '#000' : 'var(--text2)',
        transition: 'left 0.2s',
      }} />
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  root: {
    height: '100vh', background: 'var(--bg)',
    display: 'flex', flexDirection: 'column',
    overflow: 'hidden',
  },
  header: {
    display: 'flex', alignItems: 'center', gap: 16,
    padding: '12px 24px',
    borderBottom: '1px solid var(--border)',
    background: 'var(--bg2)',
    flexShrink: 0,
  },
  back: {
    background: 'transparent',
    color: 'var(--text2)',
    border: '1px solid var(--border2)',
    padding: '6px 12px', fontSize: 12,
  },
  title: {
    fontFamily: 'var(--mono)', fontSize: 14, fontWeight: 500,
  },
  body: {
    flex: 1, overflowY: 'auto',
    padding: '24px',
    maxWidth: 640, width: '100%', margin: '0 auto',
  },
  section: {
    marginBottom: 36,
    paddingBottom: 32,
    borderBottom: '1px solid var(--border)',
  },
  sectionTitle: {
    fontFamily: 'var(--mono)', fontSize: 11, fontWeight: 500,
    color: 'var(--text2)', textTransform: 'uppercase',
    letterSpacing: '0.08em', marginBottom: 20,
  },
  field: { marginBottom: 20 },
  label: {
    display: 'flex', alignItems: 'center',
    fontSize: 13, fontWeight: 500,
    marginBottom: 8,
  },
  hint: {
    fontSize: 11, color: 'var(--text2)',
    lineHeight: 1.6, marginTop: 6,
  },
  link: { color: 'var(--accent)', textDecoration: 'none' },
  keyRow: { display: 'flex', gap: 8 },
  input: { fontFamily: 'var(--mono)', fontSize: 12 },
  select: { width: '100%', fontFamily: 'var(--mono)', fontSize: 12 },
  toggleRow: {
    display: 'flex', justifyContent: 'space-between',
    alignItems: 'center', gap: 24, marginBottom: 16,
    padding: '12px 0', borderBottom: '1px solid var(--border)',
  },
  footer: {
    display: 'flex', justifyContent: 'flex-end',
    alignItems: 'center', gap: 16, paddingTop: 8,
  },
  statusMsg: { fontSize: 12, color: 'var(--accent)' },
  btnPrimary: {
    background: 'var(--accent)', color: '#000',
    padding: '9px 24px', fontSize: 13, fontWeight: 600,
  },
  btnSave: {
    background: 'var(--bg3)', color: 'var(--text)',
    border: '1px solid var(--border2)',
    padding: '8px 14px', fontSize: 12,
  },
};
