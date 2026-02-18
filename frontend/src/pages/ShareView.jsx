import { useState, useEffect } from 'react';
import api from '../api/index.js';

const DAYS_SHORT = { 'Lunedì': 'LUN', 'Martedì': 'MAR', 'Mercoledì': 'MER',
  'Giovedì': 'GIO', 'Venerdì': 'VEN', 'Sabato': 'SAB' };

export default function ShareView({ token }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/timetable/view/${token}`)
      .then(res => setData(res.data))
      .catch(e => setError(e.response?.data?.error || 'Link non valido o scaduto'))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center',
      height: '100vh', fontFamily: "'IBM Plex Mono', monospace", fontSize: 11,
      color: '#94a3b8', letterSpacing: '0.1em' }}>
      CARICAMENTO...
    </div>
  );

  if (error) return (
    <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center',
      alignItems: 'center', height: '100vh', gap: 12, padding: 20 }}>
      <div style={{ fontSize: 32 }}>🔒</div>
      <h2 style={{ fontSize: 18, fontWeight: 600, color: '#0f172a' }}>{error}</h2>
      <p style={{ fontSize: 13, color: '#64748b' }}>Il proprietario potrebbe aver revocato l'accesso.</p>
    </div>
  );

  const { username, avatarColor, settings, slots, notes, substitutions } = data;
  const { schoolDays, hoursPerDay } = settings;
  const hours = Array.from({ length: hoursPerDay }, (_, i) => i + 1);

  const getSlot = (day, hour) => slots.find(s => s.day === day && s.hour === hour);
  const getCellNotes = (day, hour) => notes.filter(n => n.day === day && n.hour === hour);
  const getCellSubs = (day, hour) => substitutions.filter(s =>
    s.day === day && s.hour <= hour && (s.hour_to || s.hour) >= hour
  );

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', fontFamily: "'IBM Plex Sans', system-ui, sans-serif" }}>
      <style>
        {`@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;600&family=IBM+Plex+Sans:wght@400;500;600&display=swap');`}
      </style>

      {/* Header */}
      <header style={{ background: 'white', borderBottom: '1px solid #e2e8f0',
        padding: '0 20px', height: 52, display: 'flex', alignItems: 'center',
        justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 30, height: 30, borderRadius: '50%', background: avatarColor || '#2563eb',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 13, fontWeight: 700, color: 'white' }}>
            {(username || '?')[0].toUpperCase()}
          </div>
          <div>
            <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11,
              color: '#64748b', letterSpacing: '0.08em' }}>
              ORARIO DI {username?.toUpperCase()}
            </span>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: 4,
            padding: '3px 10px', fontSize: 11, color: '#64748b', fontFamily: "'IBM Plex Mono', monospace" }}>
            SOLA LETTURA
          </span>
          <a href="/" style={{ fontSize: 12, color: '#2563eb', textDecoration: 'none', fontWeight: 500 }}>
            Crea il tuo →
          </a>
        </div>
      </header>

      {/* Griglia */}
      <div style={{ padding: 16, overflowX: 'auto' }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: `40px repeat(${schoolDays.length}, minmax(100px, 1fr))`,
          gap: 3,
          minWidth: schoolDays.length * 103 + 43
        }}>
          <div />
          {schoolDays.map(day => (
            <div key={day} style={{ background: 'white', border: '1px solid #e2e8f0',
              borderRadius: 4, padding: '7px 6px', textAlign: 'center' }}>
              <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10,
                fontWeight: 600, color: '#0f172a', letterSpacing: '0.08em' }}>
                {DAYS_SHORT[day] || day.slice(0, 3).toUpperCase()}
              </div>
            </div>
          ))}

          {hours.map(hour => (
            <>
              <div key={`h${hour}`} style={{ display: 'flex', alignItems: 'center',
                justifyContent: 'center', background: 'white', border: '1px solid #e2e8f0',
                borderRadius: 4 }}>
                <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11,
                  fontWeight: 600, color: '#94a3b8' }}>{hour}</span>
              </div>

              {schoolDays.map(day => {
                const slot = getSlot(day, hour);
                const cellNotes = getCellNotes(day, hour);
                const cellSubs = getCellSubs(day, hour);
                const latestSub = cellSubs.length
                  ? [...cellSubs].sort((a, b) => new Date(b.sub_date) - new Date(a.sub_date))[0]
                  : null;
                const hasSub = !!latestSub;
                const isFree = slot?.slot_type === 'free';
                const isEmpty = !slot?.subject && !isFree;

                return (
                  <div key={`${day}-${hour}`} style={{
                    background: hasSub ? 'rgba(217,119,6,0.08)' : isFree ? 'rgba(13,148,136,0.07)'
                      : isEmpty ? 'white' : slot.color,
                    border: `1px solid ${hasSub ? '#d97706' : isFree ? '#0d9488'
                      : isEmpty ? '#e2e8f0' : slot.color}`,
                    borderRadius: 4, padding: '7px 6px', minHeight: 72,
                    display: 'flex', flexDirection: 'column', alignItems: 'center',
                    justifyContent: 'center', gap: 3, position: 'relative'
                  }}>
                    {isFree ? (
                      <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9,
                        color: '#0d9488', fontWeight: 600, letterSpacing: '0.05em' }}>LIBERA</span>
                    ) : isEmpty ? (
                      <span style={{ fontSize: 16, color: '#e2e8f0' }}>—</span>
                    ) : hasSub ? (
                      <>
                        {slot?.subject && (
                          <span style={{ fontSize: 9, color: 'rgba(0,0,0,0.3)', textDecoration: 'line-through',
                            fontFamily: "'IBM Plex Mono', monospace" }}>{slot.subject}</span>
                        )}
                        <span style={{ fontSize: 11, fontWeight: 700, color: '#d97706',
                          textAlign: 'center', lineHeight: 1.2 }}>{latestSub.substitute}</span>
                        <span style={{ fontSize: 9, color: '#92400e', fontFamily: "'IBM Plex Mono', monospace" }}>
                          {new Date(latestSub.sub_date).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' })}
                        </span>
                      </>
                    ) : (
                      <>
                        <span style={{ fontSize: 11, fontWeight: 600, color: 'white', textAlign: 'center',
                          lineHeight: 1.2, textShadow: '0 1px 2px rgba(0,0,0,0.3)',
                          maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', padding: '0 4px' }}>
                          {slot.subject}
                        </span>
                        {cellNotes.length > 0 && (
                          <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9,
                            background: 'rgba(0,0,0,0.2)', borderRadius: 3, padding: '1px 4px',
                            color: 'white' }}>{cellNotes.length}n</span>
                        )}
                      </>
                    )}
                  </div>
                );
              })}
            </>
          ))}
        </div>

        {/* Footer */}
        <div style={{ textAlign: 'center', marginTop: 32, paddingTop: 16,
          borderTop: '1px solid #e2e8f0', color: '#94a3b8', fontSize: 12 }}>
          Visualizzato tramite{' '}
          <a href="/" style={{ color: '#2563eb', fontWeight: 600, textDecoration: 'none' }}>
            Orario Scolastico
          </a>
          {' '}· Questo orario è condiviso in sola lettura
        </div>
      </div>
    </div>
  );
}