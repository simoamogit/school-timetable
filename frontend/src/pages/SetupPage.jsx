import { useState } from 'react';
import api from '../api/index.js';

const ALL_DAYS = ['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato'];

export default function SetupPage({ onComplete }) {
  const [selectedDays, setSelectedDays] = useState(['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì']);
  const [hoursPerDay, setHoursPerDay] = useState(6);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const toggleDay = day => setSelectedDays(prev =>
    prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
  );

  const save = async () => {
    if (selectedDays.length === 0) return setError('Seleziona almeno un giorno');
    setLoading(true);
    try {
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
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ width: '100%', maxWidth: 420 }}>
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text3)', letterSpacing: '0.12em', marginBottom: 8 }}>
            PRIMO ACCESSO
          </div>
          <h1 style={{ fontSize: 20, fontWeight: 600 }}>Configura il tuo orario</h1>
          <p style={{ color: 'var(--text2)', fontSize: 13, marginTop: 4 }}>Potrai modificarlo in seguito dalle impostazioni.</p>
        </div>

        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, padding: 24 }}>
          {error && (
            <div style={{ background: 'var(--danger-bg)', border: '1px solid var(--danger)', borderRadius: 'var(--radius)',
              padding: '8px 12px', marginBottom: 16, color: 'var(--danger)', fontSize: 13 }}>
              {error}
            </div>
          )}

          <div className="form-group">
            <label className="label">Giorni scolastici</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 2 }}>
              {ALL_DAYS.map(day => (
                <button key={day} onClick={() => toggleDay(day)} style={{
                  padding: '6px 12px', borderRadius: 4, fontSize: 12, fontWeight: 500,
                  border: '1px solid',
                  borderColor: selectedDays.includes(day) ? 'var(--primary)' : 'var(--border)',
                  background: selectedDays.includes(day) ? 'var(--primary-bg)' : 'transparent',
                  color: selectedDays.includes(day) ? 'var(--primary)' : 'var(--text2)',
                }}>
                  {day.slice(0, 3)}
                </button>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label className="label">
              Ore massime per giorno —{' '}
              <span style={{ color: 'var(--primary)', fontFamily: 'var(--mono)' }}>{hoursPerDay}</span>
            </label>
            <input type="range" min="1" max="12" value={hoursPerDay}
              onChange={e => setHoursPerDay(e.target.value)} style={{ width: '100%' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text3)', marginTop: 4, fontFamily: 'var(--mono)' }}>
              <span>1</span><span>12</span>
            </div>
          </div>

          <div style={{ background: 'var(--bg2)', borderRadius: 4, padding: '10px 12px', marginBottom: 20,
            fontSize: 12, color: 'var(--text2)', fontFamily: 'var(--mono)' }}>
            {selectedDays.length} giorni × {hoursPerDay} ore max ={' '}
            <strong style={{ color: 'var(--primary)' }}>{selectedDays.length * hoursPerDay} celle</strong>
          </div>

          <button className="btn-primary" onClick={save} disabled={loading} style={{ width: '100%', padding: 10 }}>
            {loading ? 'Salvataggio...' : 'Crea orario'}
          </button>
        </div>
      </div>
    </div>
  );
}