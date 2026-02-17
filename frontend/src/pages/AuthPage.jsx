import { useState } from 'react';
import api from '../api/index.js';

export default function AuthPage({ onLogin }) {
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ username: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const update = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const submit = async () => {
    setError('');
    setLoading(true);
    try {
      const endpoint = mode === 'login' ? '/auth/login' : '/auth/register';
      const payload = mode === 'login'
        ? { email: form.email, password: form.password }
        : { username: form.username, email: form.email, password: form.password };
      const res = await api.post(endpoint, payload);
      onLogin(res.data);
    } catch (e) {
      setError(e.response?.data?.error || 'Errore di rete');
    } finally {
      setLoading(false);
    }
  };

  const handleKey = e => { if (e.key === 'Enter') submit(); };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 16,
      background: 'linear-gradient(135deg, #0f0f1a 0%, #1a1a2e 50%, #16213e 100%)'
    }}>
      <div style={{ width: '100%', maxWidth: 400 }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{ fontSize: 56, marginBottom: 12 }}>📚</div>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: 'var(--text)' }}>Orario Scolastico</h1>
          <p style={{ color: 'var(--text2)', marginTop: 6, fontSize: 14 }}>
            Organizza il tuo anno scolastico
          </p>
        </div>

        {/* Card */}
        <div style={{
          background: 'var(--card)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius)',
          padding: 32,
          boxShadow: 'var(--shadow)'
        }}>
          {/* Tabs */}
          <div style={{ display: 'flex', background: 'var(--bg)', borderRadius: 8, padding: 4, marginBottom: 24 }}>
            {['login', 'register'].map(m => (
              <button key={m} onClick={() => { setMode(m); setError(''); }}
                style={{
                  flex: 1, padding: '8px 0', borderRadius: 6, fontSize: 14, fontWeight: 600,
                  background: mode === m ? 'var(--primary)' : 'transparent',
                  color: mode === m ? 'white' : 'var(--text2)',
                  transition: 'all 0.2s'
                }}>
                {m === 'login' ? 'Accedi' : 'Registrati'}
              </button>
            ))}
          </div>

          {error && (
            <div style={{
              background: 'rgba(239,68,68,0.12)',
              border: '1px solid rgba(239,68,68,0.4)',
              borderRadius: 8,
              padding: '10px 14px',
              marginBottom: 16,
              color: '#fca5a5',
              fontSize: 14
            }}>
              ⚠️ {error}
            </div>
          )}

          {mode === 'register' && (
            <div className="form-group">
              <label className="label">Username</label>
              <input
                placeholder="il_tuo_username"
                value={form.username}
                onChange={update('username')}
                onKeyDown={handleKey}
              />
            </div>
          )}

          <div className="form-group">
            <label className="label">Email</label>
            <input
              type="email"
              placeholder="nome@email.it"
              value={form.email}
              onChange={update('email')}
              onKeyDown={handleKey}
            />
          </div>

          <div className="form-group">
            <label className="label">Password</label>
            <input
              type="password"
              placeholder="••••••••"
              value={form.password}
              onChange={update('password')}
              onKeyDown={handleKey}
            />
          </div>

          <button
            className="btn-primary"
            onClick={submit}
            disabled={loading}
            style={{ width: '100%', padding: 12, fontSize: 15, marginTop: 8 }}
          >
            {loading ? '⏳ Attendi...' : mode === 'login' ? '→ Accedi' : '✓ Registrati'}
          </button>
        </div>
      </div>
    </div>
  );
}