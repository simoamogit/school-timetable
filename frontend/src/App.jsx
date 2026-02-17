import { useState, useEffect } from 'react';
import AuthPage from './pages/AuthPage.jsx';
import SetupPage from './pages/SetupPage.jsx';
import TimetablePage from './pages/TimetablePage.jsx';
import api from './api/index.js';

export default function App() {
  const [page, setPage] = useState('loading');
  const [user, setUser] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const username = localStorage.getItem('username');
    if (!token) { setPage('auth'); return; }

    setUser({ username });
    api.get('/timetable/settings')
      .then(res => {
        setPage(res.data.setupComplete ? 'timetable' : 'setup');
      })
      .catch(() => setPage('auth'));
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
    setUser(null);
    setPage('auth');
  };

  const handleSetupComplete = () => setPage('timetable');

  if (page === 'loading') {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>📚</div>
          <p style={{ color: 'var(--text2)' }}>Caricamento...</p>
        </div>
      </div>
    );
  }

  if (page === 'auth') return <AuthPage onLogin={handleLogin} />;
  if (page === 'setup') return <SetupPage onComplete={handleSetupComplete} />;
  return <TimetablePage user={user} onLogout={handleLogout} />;
}