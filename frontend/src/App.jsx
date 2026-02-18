import { useState, useEffect } from 'react';
import AuthPage from './pages/AuthPage.jsx';
import SetupPage from './pages/SetupPage.jsx';
import TimetablePage from './pages/TimetablePage.jsx';
import api from './api/index.js';

export default function App() {
  const [page, setPage] = useState('loading');
  const [user, setUser] = useState(null);
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'dark');
  const [slowLoad, setSlowLoad] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    const on = () => setIsOnline(true);
    const off = () => setIsOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const username = localStorage.getItem('username');
    if (!token) { setPage('auth'); return; }
    setUser({ username });

    // Carica da cache se offline
    const cached = localStorage.getItem('timetable_cache');
    if (!navigator.onLine && cached) {
      try {
        const data = JSON.parse(cached);
        if (data.settings?.theme) setTheme(data.settings.theme);
        setPage(data.settings?.setupComplete ? 'timetable' : 'setup');
        return;
      } catch (_) {}
    }

    const slowTimer = setTimeout(() => setSlowLoad(true), 3000);

    api.get('/timetable/all')
      .then(res => {
        clearTimeout(slowTimer);
        const { settings } = res.data;
        localStorage.setItem('timetable_cache', JSON.stringify(res.data));
        if (settings.theme) setTheme(settings.theme);
        setPage(settings.setupComplete ? 'timetable' : 'setup');
      })
      .catch(() => {
        clearTimeout(slowTimer);
        if (cached) {
          try {
            const data = JSON.parse(cached);
            if (data.settings?.theme) setTheme(data.settings.theme);
            setPage(data.settings?.setupComplete ? 'timetable' : 'setup');
            return;
          } catch (_) {}
        }
        setPage('auth');
      });

    return () => clearTimeout(slowTimer);
  }, []);

  const handleLogin = ({ token, username, setupComplete }) => {
    localStorage.setItem('token', token);
    localStorage.setItem('username', username);
    setUser({ username });
    setPage(setupComplete ? 'timetable' : 'setup');
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    localStorage.removeItem('timetable_cache');
    setUser(null);
    setPage('auth');
  };

  const handleThemeChange = (t) => {
    setTheme(t);
    api.post('/timetable/settings/theme', { theme: t }).catch(() => {});
  };

  if (page === 'loading') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center',
        alignItems: 'center', height: '100vh', gap: 12 }}>
        <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text3)', letterSpacing: '0.1em' }}>
          CARICAMENTO
        </div>
        <div style={{ width: 200, height: 2, background: 'var(--border)', borderRadius: 1, overflow: 'hidden' }}>
          <div style={{ height: '100%', background: 'var(--primary)',
            animation: 'ldprog 1.5s ease-in-out infinite', borderRadius: 1 }} />
        </div>
        {slowLoad && (
          <div style={{ fontSize: 12, color: 'var(--text3)', textAlign: 'center', maxWidth: 260, marginTop: 8, lineHeight: 1.7 }}>
            Il server si sta svegliando.<br />Attendi qualche secondo...
          </div>
        )}
        <style>{`@keyframes ldprog{0%{width:0%;margin-left:0}50%{width:60%;margin-left:20%}100%{width:0%;margin-left:100%}}`}</style>
      </div>
    );
  }

  if (page === 'auth') return <AuthPage onLogin={handleLogin} />;
  if (page === 'setup') return <SetupPage onComplete={() => setPage('timetable')} />;
  return (
    <TimetablePage
      user={user}
      onLogout={handleLogout}
      theme={theme}
      onThemeChange={handleThemeChange}
      isOnline={isOnline}
    />
  );
}