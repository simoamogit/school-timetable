import { useState } from 'react';
import api from '../api/index.js';

const ALL_DAYS = ['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato'];

export default function SetupPage({ onComplete }) {
  const [selectedDays, setSelectedDays] = useState(['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì']);
  const [hoursPerDay, setHoursPerDay] = useState(6);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const toggleDay = day => {
    setSelectedDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  };

  const save = async () => {
    if (selectedDays.length === 0) return setError('Seleziona almeno un giorno');
    if (hoursPerDay < 1 || hoursPerDay > 12) return setError('Ore tra 1 e 12');
    setLoading(true);
    try {
      // Mantieni l'ordine originale dei giorni
      const ordered = ALL_DAYS.filter(d => selectedDays.includes(d));
      await api.post('/timetable/settings', { schoolDays: ordered, hoursPerDay: Number(hoursPerDay) });
      onComplete();
    } catch (e) {
      setError(e.response?.data?.error || 'Errore nel salvataggio');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 16,
      background: 'linear-gradient(135deg, #0f0f1a 0%, #1a1a2e 100%)'
    }}>
      <div style={{ width: '100%', maxWidth: 480 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🗓️</div>
          <h1 style={{ fontSize: 24, fontWeight: 800 }}>Configura il tuo Orario</h1>
          <p style={{ color: 'var(--text2)', marginTop: 8, fontSize: 14 }}>
            Questo ti verrà chiesto solo la prima volta
          </p>
        </div>

        <div style={{
          background: 'var(--card)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius)',
          padding: 32,
          boxShadow: 'var(--shadow)'
        }}>
          {error && (
            <div style={{
              background: 'rgba(239,68,68,0.12)',
              border: '1px solid rgba(239,68,68,0.4)',
              borderRadius: 8, padding: '10px 14px', marginBottom: 20,
              color: '#fca5a5', fontSize: 14
            }}>
              ⚠️ {error}
            </div>
          )}

          <div className="form-group">
            <label className="label">📅 Giorni scolastici</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
              {ALL_DAYS.map(day => (
                <button
                  key={day}
                  onClick={() => toggleDay(day)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: 20,
                    fontSize: 13,
                    fontWeight: 600,
                    border: '1.5px solid',
                    borderColor: selectedDays.includes(day) ? 'var(--primary)' : 'var(--border)',
                    background: selectedDays.includes(day) ? 'rgba(99,102,241,0.18)' : 'transparent',
                    color: selectedDays.includes(day) ? 'var(--primary)' : 'var(--text2)',
                    transition: 'all 0.2s'
                  }}
                >
                  {day}
                </button>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label className="label">⏰ Ore per giorno: <span style={{ color: 'var(--primary)', fontSize: 18 }}>{hoursPerDay}</span></label>
            <input
              type="range"
              min="1"
              max="12"
              value={hoursPerDay}
              onChange={e => setHoursPerDay(e.target.value)}
              style={{
                width: '100%',
                accentColor: 'var(--primary)',
                background: 'transparent',
                border: 'none',
                padding: '8px 0',
                cursor: 'pointer'
              }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text2)', marginTop: 2 }}>
              <span>1 ora</span>
              <span>12 ore</span>
            </div>
          </div>

          {/* Preview */}
          <div style={{
            background: 'var(--bg)',
            border: '1px solid var(--border)',
            borderRadius: 8,
            padding: '12px 16px',
            marginBottom: 24,
            fontSize: 13,
            color: 'var(--text2)'
          }}>
            📊 Riepilogo: <strong style={{ color: 'var(--text)' }}>{selectedDays.length} giorni</strong> × <strong style={{ color: 'var(--text)' }}>{hoursPerDay} ore</strong> = <strong style={{ color: 'var(--primary)' }}>{selectedDays.length * hoursPerDay} ore/settimana</strong>
          </div>

          <button
            className="btn-primary"
            onClick={save}
            disabled={loading}
            style={{ width: '100%', padding: 14, fontSize: 15 }}
          >
            {loading ? '⏳ Salvataggio...' : '✓ Crea il mio Orario →'}
          </button>
        </div>
      </div>
    </div>
  );
}