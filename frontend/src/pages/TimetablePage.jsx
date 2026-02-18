import { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import api from '../api/index.js';

const PRESET_COLORS = [
  '#2563eb', '#7c3aed', '#db2777', '#dc2626',
  '#ea580c', '#ca8a04', '#16a34a', '#0d9488',
  '#0891b2', '#475569'
];

// Clock widget
function ClockWidget() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  return (
    <div style={{
      position: 'fixed', bottom: 20, right: 20, zIndex: 30,
      background: 'var(--card)', border: '1px solid var(--border)',
      borderRadius: 'var(--radius)', padding: '10px 14px',
      textAlign: 'right', boxShadow: 'var(--shadow)'
    }}>
      <div style={{ fontFamily: 'var(--mono)', fontSize: 18, fontWeight: 600, color: 'var(--text)', letterSpacing: '0.05em' }}>
        {now.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
      </div>
      <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--text3)', marginTop: 2, letterSpacing: '0.04em' }}>
        {now.toLocaleDateString('it-IT', { weekday: 'short', day: '2-digit', month: 'short' }).toUpperCase()}
      </div>
    </div>
  );
}

// Tooltip note con portal — non va mai sotto altri elementi
function NoteTooltip({ notes }) {
  const [visible, setVisible] = useState(false);
  const [rect, setRect] = useState(null);
  const ref = useRef(null);

  if (!notes.length) return null;

  const handleEnter = () => {
    if (ref.current) setRect(ref.current.getBoundingClientRect());
    setVisible(true);
  };

  const above = rect && rect.top > 200;

  return (
    <>
      <span
        ref={ref}
        onMouseEnter={handleEnter}
        onMouseLeave={() => setVisible(false)}
        style={{
          fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 600,
          background: 'rgba(0,0,0,0.25)', borderRadius: 3,
          padding: '1px 5px', color: 'white', cursor: 'default', userSelect: 'none'
        }}
      >
        {notes.length} nota{notes.length > 1 ? 'e' : ''}
      </span>

      {visible && rect && createPortal(
        <div style={{
          position: 'fixed',
          left: Math.min(rect.left + rect.width / 2, window.innerWidth - 130),
          ...(above
            ? { bottom: window.innerHeight - rect.top + 8 }
            : { top: rect.bottom + 8 }
          ),
          transform: 'translateX(-50%)',
          background: 'var(--card)',
          border: '1px solid var(--border)',
          borderRadius: 6,
          padding: '10px 12px',
          width: 240,
          zIndex: 9999,
          boxShadow: '0 8px 20px rgba(0,0,0,0.15)',
          pointerEvents: 'none'
        }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text3)', marginBottom: 8,
            textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: 'var(--mono)' }}>
            Note lezione
          </div>
          {notes.map((n, i) => (
            <div key={n.id} style={{
              fontSize: 12, color: 'var(--text)', lineHeight: 1.5,
              borderTop: i > 0 ? '1px solid var(--border)' : 'none',
              paddingTop: i > 0 ? 8 : 0, marginTop: i > 0 ? 8 : 0
            }}>
              {n.content}
              {n.note_date && (
                <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 3, fontFamily: 'var(--mono)' }}>
                  {new Date(n.note_date).toLocaleDateString('it-IT')}
                </div>
              )}
            </div>
          ))}
        </div>,
        document.body
      )}
    </>
  );
}

// Modale cella
function CellModal({ cell, hours, isLocked, notes, substitutions, onClose, onSave, onAddNote, onDeleteNote, onAddSub, onDeleteSub }) {
  const defaultTab = isLocked ? 'notes' : 'edit';
  const [tab, setTab] = useState(defaultTab);
  const [subject, setSubject] = useState(cell.subject || '');
  const [color, setColor] = useState(cell.color || '#2563eb');
  const [noteContent, setNoteContent] = useState('');
  const [noteDate, setNoteDate] = useState('');
  const [subText, setSubText] = useState('');
  const [subHourFrom, setSubHourFrom] = useState(cell.hour);
  const [subHourTo, setSubHourTo] = useState(cell.hour);
  const [subDate, setSubDate] = useState(new Date().toISOString().split('T')[0]);
  const [subNote, setSubNote] = useState('');

  const cellNotes = notes.filter(n => n.day === cell.day && n.hour === cell.hour);
  const cellSubs = substitutions.filter(s => s.day === cell.day && s.hour === cell.hour);

  const saveSlot = () => { onSave({ day: cell.day, hour: cell.hour, subject, color }); onClose(); };

  const addNote = async () => {
    if (!noteContent.trim()) return;
    await onAddNote({ day: cell.day, hour: cell.hour, content: noteContent, note_date: noteDate || null });
    setNoteContent(''); setNoteDate('');
  };

  const addSub = async () => {
    if (!subText.trim() || !subDate) return;
    await onAddSub({ day: cell.day, hour: subHourFrom, hour_to: subHourTo, substitute: subText, sub_date: subDate, note: subNote });
    setSubText(''); setSubNote('');
  };

  const tabs = [
    ...(isLocked ? [] : [{ id: 'edit', label: 'Materia' }]),
    { id: 'notes', label: `Note${cellNotes.length ? ` (${cellNotes.length})` : ''}` },
    { id: 'subs', label: `Supplenze${cellSubs.length ? ` (${cellSubs.length})` : ''}` }
  ];

  return (
    <div className="overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
          <div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--text3)', letterSpacing: '0.1em', marginBottom: 4 }}>
              {cell.day.toUpperCase()} — ORA {cell.hour}
            </div>
            <h2 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text)' }}>
              {cell.subject || 'Cella vuota'}
            </h2>
            {isLocked && (
              <span style={{ fontSize: 11, color: 'var(--warning)', fontFamily: 'var(--mono)' }}>BLOCCATO</span>
            )}
          </div>
          <button onClick={onClose} className="btn-ghost" style={{ padding: '4px 10px', fontSize: 16, lineHeight: 1 }}>×</button>
        </div>

        <div className="tabs">
          {tabs.map(t => (
            <button key={t.id} className={`tab ${tab === t.id ? 'active' : ''}`} onClick={() => setTab(t.id)}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab Materia */}
        {tab === 'edit' && (
          <div>
            <div className="form-group">
              <label className="label">Nome materia</label>
              <input placeholder="es. Matematica" value={subject} onChange={e => setSubject(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && saveSlot()} autoFocus />
            </div>
            <div className="form-group">
              <label className="label">Colore</label>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
                {PRESET_COLORS.map(c => (
                  <button key={c} onClick={() => setColor(c)} style={{
                    width: 28, height: 28, borderRadius: 4, background: c, padding: 0,
                    border: color === c ? '2px solid var(--text)' : '2px solid transparent',
                    outline: color === c ? `2px solid ${c}` : 'none', outlineOffset: 1
                  }} />
                ))}
                <input type="color" value={color} onChange={e => setColor(e.target.value)}
                  style={{ width: 28, height: 28, border: '1px solid var(--border)', padding: 2, borderRadius: 4 }} />
              </div>
            </div>
            {/* Anteprima */}
            <div style={{ borderLeft: `3px solid ${color}`, padding: '8px 12px', marginBottom: 20,
              background: 'var(--bg2)', borderRadius: `0 ${4}px ${4}px 0` }}>
              <span style={{ fontWeight: 600, color: 'var(--text)', fontSize: 14 }}>
                {subject || 'Anteprima materia'}
              </span>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn-ghost" onClick={onClose} style={{ flex: 1 }}>Annulla</button>
              <button className="btn-primary" onClick={saveSlot} style={{ flex: 2 }}>Salva</button>
            </div>
          </div>
        )}

        {/* Tab Note */}
        {tab === 'notes' && (
          <div>
            <div className="form-group">
              <label className="label">Nuova nota</label>
              <textarea placeholder="Nota per questa lezione..." value={noteContent}
                onChange={e => setNoteContent(e.target.value)} rows={3} style={{ resize: 'vertical' }} />
            </div>
            <div className="form-group">
              <label className="label">Data (opzionale — verrà eliminata il giorno dopo)</label>
              <input type="date" value={noteDate} onChange={e => setNoteDate(e.target.value)} />
            </div>
            <button className="btn-primary" onClick={addNote} disabled={!noteContent.trim()}
              style={{ width: '100%', marginBottom: 16 }}>
              Aggiungi nota
            </button>
            {cellNotes.length === 0
              ? <div className="empty-state">Nessuna nota.</div>
              : cellNotes.map(n => (
                <div key={n.id} className="note-card">
                  <div style={{ flex: 1 }}>
                    <p>{n.content}</p>
                    {n.note_date && <span className="meta">{new Date(n.note_date).toLocaleDateString('it-IT')}</span>}
                  </div>
                  <button className="btn-danger" onClick={() => onDeleteNote(n.id)}
                    style={{ padding: '3px 8px', fontSize: 12 }}>×</button>
                </div>
              ))
            }
          </div>
        )}

        {/* Tab Supplenze */}
        {tab === 'subs' && (
          <div>
            <div className="form-group">
              <label className="label">Supplente / materia alternativa</label>
              <input placeholder="es. Prof. Rossi" value={subText} onChange={e => setSubText(e.target.value)} />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="label">Ora inizio</label>
                <select value={subHourFrom} onChange={e => { setSubHourFrom(Number(e.target.value)); setSubHourTo(t => Math.max(t, Number(e.target.value))); }}>
                  {hours.map(h => <option key={h} value={h}>{h}ª ora</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="label">Ora fine</label>
                <select value={subHourTo} onChange={e => setSubHourTo(Number(e.target.value))}>
                  {hours.filter(h => h >= subHourFrom).map(h => <option key={h} value={h}>{h}ª ora</option>)}
                </select>
              </div>
            </div>
            <div className="form-group">
              <label className="label">Data supplenza *</label>
              <input type="date" value={subDate} onChange={e => setSubDate(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="label">Nota (opzionale)</label>
              <input placeholder="Dettagli aggiuntivi..." value={subNote} onChange={e => setSubNote(e.target.value)} />
            </div>
            <button className="btn-primary" onClick={addSub} disabled={!subText.trim() || !subDate}
              style={{ width: '100%', marginBottom: 16 }}>
              Aggiungi supplenza
            </button>
            {cellSubs.length === 0
              ? <div className="empty-state">Nessuna supplenza.</div>
              : [...cellSubs].sort((a, b) => new Date(b.sub_date) - new Date(a.sub_date)).map(s => (
                <div key={s.id} className="note-card">
                  <div style={{ flex: 1 }}>
                    <p style={{ fontWeight: 600 }}>{s.substitute}</p>
                    <span className="meta">
                      {new Date(s.sub_date).toLocaleDateString('it-IT')}
                      {s.hour_to && s.hour_to !== s.hour ? ` · ore ${s.hour}–${s.hour_to}` : ` · ora ${s.hour}`}
                    </span>
                    {s.note && <p style={{ fontSize: 12, color: 'var(--text2)', marginTop: 2 }}>{s.note}</p>}
                  </div>
                  <button className="btn-danger" onClick={() => onDeleteSub(s.id)}
                    style={{ padding: '3px 8px', fontSize: 12 }}>×</button>
                </div>
              ))
            }
          </div>
        )}
      </div>
    </div>
  );
}

// Singola cella della griglia
function TimetableCell({ day, hour, slot, cellNotes, cellSubs, isLocked, onClick }) {
  const isEmpty = !slot?.subject;

  const latestSub = cellSubs.length
    ? [...cellSubs].sort((a, b) => new Date(b.sub_date) - new Date(a.sub_date))[0]
    : null;

  const hasSub = !!latestSub;
  const bg = isEmpty ? 'var(--bg)' : slot.color;

  return (
    <button
      onClick={onClick}
      style={{
        background: hasSub ? 'var(--warning-bg)' : isEmpty ? 'var(--bg)' : bg,
        border: `1px solid ${hasSub ? 'var(--warning)' : isEmpty ? 'var(--border)' : bg}`,
        borderRadius: 4,
        padding: '7px 6px',
        cursor: 'pointer',
        minHeight: 76,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
        position: 'relative',
        transition: 'opacity 0.1s, transform 0.1s',
        overflow: 'visible'
      }}
      onMouseEnter={e => { e.currentTarget.style.opacity = '0.85'; }}
      onMouseLeave={e => { e.currentTarget.style.opacity = '1'; }}
    >
      {isEmpty && !hasSub ? (
        <span style={{ fontSize: 16, color: 'var(--border2)', fontWeight: 300 }}>
          {isLocked ? '—' : '+'}
        </span>
      ) : hasSub ? (
        <>
          {slot?.subject && (
            <span style={{
              fontSize: 9, color: 'var(--text3)', textDecoration: 'line-through',
              textDecorationColor: 'var(--warning)', fontWeight: 400,
              maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              fontFamily: 'var(--mono)'
            }}>
              {slot.subject}
            </span>
          )}
          <span style={{
            fontSize: 11, fontWeight: 700, color: 'var(--warning)',
            textAlign: 'center', lineHeight: 1.2,
            maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', padding: '0 4px'
          }}>
            {latestSub.substitute}
          </span>
          <span style={{ fontSize: 9, color: 'var(--text3)', fontFamily: 'var(--mono)' }}>
            {new Date(latestSub.sub_date).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' })}
            {latestSub.hour_to && latestSub.hour_to !== latestSub.hour && ` ${latestSub.hour}–${latestSub.hour_to}`}
          </span>
          {cellNotes.length > 0 && (
            <div onClick={e => e.stopPropagation()}>
              <NoteTooltip notes={cellNotes} />
            </div>
          )}
        </>
      ) : (
        <>
          <span style={{
            fontSize: 12, fontWeight: 600, color: 'white',
            lineHeight: 1.2, textAlign: 'center',
            maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', padding: '0 4px',
            textShadow: '0 1px 2px rgba(0,0,0,0.3)'
          }}>
            {slot.subject}
          </span>
          {cellNotes.length > 0 && (
            <div onClick={e => e.stopPropagation()}>
              <NoteTooltip notes={cellNotes} />
            </div>
          )}
        </>
      )}
    </button>
  );
}

// Settings panel
function SettingsPanel({ onClose, onReset, onExport, onImport, isLocked, onToggleLock, theme, onThemeChange, fileRef }) {
  return (
    <div className="overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 360 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h2 style={{ fontSize: 15, fontWeight: 600 }}>Impostazioni</h2>
          <button onClick={onClose} className="btn-ghost" style={{ padding: '4px 10px', fontSize: 16 }}>×</button>
        </div>

        {/* Riga: Tema */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>Tema scuro</div>
            <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>Attiva/disattiva la modalità scura</div>
          </div>
          <label className="toggle">
            <input type="checkbox" checked={theme === 'dark'} onChange={e => onThemeChange(e.target.checked ? 'dark' : 'light')} />
            <span className="toggle-slider" />
          </label>
        </div>

        {/* Riga: Blocco */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>Blocca orario</div>
            <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>Permette solo note e supplenze</div>
          </div>
          <label className="toggle">
            <input type="checkbox" checked={isLocked} onChange={onToggleLock} />
            <span className="toggle-slider" />
          </label>
        </div>

        {/* Azioni */}
        <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <button onClick={onExport} className="btn-ghost" style={{ textAlign: 'left', justifyContent: 'flex-start' }}>
            Esporta dati (.json)
          </button>
          <button onClick={() => fileRef.current?.click()} className="btn-ghost" style={{ textAlign: 'left' }}>
            Importa dati (.json)
          </button>
          <input ref={fileRef} type="file" accept=".json" style={{ display: 'none' }} onChange={onImport} />
          <button onClick={onReset} style={{ textAlign: 'left', background: 'transparent', border: '1px solid var(--border)',
            borderRadius: 'var(--radius)', padding: '8px 16px', fontSize: 13, fontWeight: 500,
            color: 'var(--danger)', cursor: 'pointer' }}>
            Riconfigura orario
          </button>
          <button onClick={() => { onClose(); }} style={{ textAlign: 'left', background: 'transparent',
            border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '8px 16px',
            fontSize: 13, fontWeight: 500, color: 'var(--text2)', cursor: 'pointer' }}>
            Chiudi
          </button>
        </div>
      </div>
    </div>
  );
}

export default function TimetablePage({ user, onLogout, theme, onThemeChange }) {
  const [settings, setSettings] = useState(null);
  const [slots, setSlots] = useState([]);
  const [notes, setNotes] = useState([]);
  const [substitutions, setSubstitutions] = useState([]);
  const [selectedCell, setSelectedCell] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isLocked, setIsLocked] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [toast, setToast] = useState(null);
  const fileInputRef = useRef(null);

  const showToast = (msg, type = 'ok') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const load = useCallback(async () => {
    try {
      const res = await api.get('/timetable/all');
      const { settings: s, slots: sl, notes: n, substitutions: sub } = res.data;
      setSettings(s);
      setIsLocked(s.locked || false);
      setSlots(sl);
      setNotes(n);
      setSubstitutions(sub);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const getSlot = (day, hour) => slots.find(s => s.day === day && s.hour === hour);

  const openCell = (day, hour) => {
    const slot = getSlot(day, hour) || { day, hour, subject: '', color: '#2563eb' };
    setSelectedCell(slot);
  };

  const handleSave = async ({ day, hour, subject, color }) => {
    await api.post('/timetable/slots', { day, hour, subject, color });
    setSlots(prev => {
      const idx = prev.findIndex(s => s.day === day && s.hour === hour);
      const ns = { day, hour, subject, color };
      if (idx >= 0) return prev.map((s, i) => i === idx ? ns : s);
      return [...prev, ns];
    });
  };

  const handleAddNote = async (data) => {
    const res = await api.post('/timetable/notes', data);
    setNotes(prev => [...prev, { ...data, id: res.data.id, created_at: new Date().toISOString() }]);
  };

  const handleDeleteNote = async (id) => {
    await api.delete(`/timetable/notes/${id}`);
    setNotes(prev => prev.filter(n => n.id !== id));
  };

  const handleAddSub = async (data) => {
    const res = await api.post('/timetable/substitutions', data);
    setSubstitutions(prev => [...prev, { ...data, id: res.data.id }]);
  };

  const handleDeleteSub = async (id) => {
    await api.delete(`/timetable/substitutions/${id}`);
    setSubstitutions(prev => prev.filter(s => s.id !== id));
  };

  const toggleLock = async () => {
    const nl = !isLocked;
    await api.post('/timetable/settings/lock', { locked: nl });
    setIsLocked(nl);
  };

  const resetSetup = async () => {
    if (!window.confirm('Riconfigurare l\'orario cancellerà tutte le materie. Continuare?')) return;
    await api.post('/timetable/settings/reset');
    window.location.reload();
  };

  const handleExport = async () => {
    try {
      const res = await api.get('/timetable/export');
      const blob = new Blob([JSON.stringify(res.data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `orario-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setShowSettings(false);
    } catch { showToast('Errore export', 'err'); }
  };

  const handleImportFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const data = JSON.parse(await file.text());
      if (!data.settings || !data.slots) return showToast('File non valido', 'err');
      if (!window.confirm(`Importare sovrascriverà tutti i dati. Continuare?`)) return;
      await api.post('/timetable/import', data);
      showToast('Importazione completata');
      setShowSettings(false);
      load();
    } catch { showToast('Errore importazione', 'err'); }
    finally { e.target.value = ''; }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text3)', letterSpacing: '0.1em' }}>
          CARICAMENTO...
        </div>
      </div>
    );
  }

  const hours = Array.from({ length: settings?.hoursPerDay || 6 }, (_, i) => i + 1);
  const days = settings?.schoolDays || [];

  // Ore effettive: basate su celle con materia inserita
  const filledSlots = slots.filter(s => s.subject && s.subject.trim() !== '');
  const uniqueSubjects = new Set(filledSlots.map(s => s.subject)).size;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      {/* Navbar */}
      <header style={{
        background: 'var(--card)', borderBottom: '1px solid var(--border)',
        padding: '0 20px', height: 52,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        position: 'sticky', top: 0, zIndex: 50
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text3)', letterSpacing: '0.1em' }}>
            ORARIO SCOLASTICO
          </span>
          {isLocked && (
            <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--warning)', letterSpacing: '0.08em' }}>
              · BLOCCATO
            </span>
          )}
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ fontSize: 12, color: 'var(--text3)' }}>
            {user?.username}
          </span>
          <button onClick={() => setShowSettings(true)} className="btn-ghost"
            style={{ padding: '5px 12px', fontSize: 12 }}>
            Impostazioni
          </button>
          <button onClick={onLogout} className="btn-ghost"
            style={{ padding: '5px 12px', fontSize: 12, color: 'var(--danger)', borderColor: 'transparent' }}>
            Esci
          </button>
        </div>
      </header>

      {/* Stats strip */}
      <div style={{
        borderBottom: '1px solid var(--border)', padding: '8px 20px',
        display: 'flex', gap: 24, background: 'var(--bg2)',
        overflowX: 'auto'
      }}>
        {[
          { label: 'giorni/sett.', value: days.length },
          { label: 'ore inserite', value: filledSlots.length },
          { label: 'materie', value: uniqueSubjects },
          { label: 'note attive', value: notes.length },
          { label: 'supplenze', value: substitutions.length }
        ].map(s => (
          <div key={s.label} style={{ display: 'flex', alignItems: 'baseline', gap: 5, flexShrink: 0 }}>
            <span style={{ fontFamily: 'var(--mono)', fontSize: 16, fontWeight: 600, color: 'var(--primary)' }}>
              {s.value}
            </span>
            <span style={{ fontSize: 11, color: 'var(--text3)' }}>{s.label}</span>
          </div>
        ))}
      </div>

      {/* Griglia */}
      <div style={{ padding: 16, overflowX: 'auto', paddingBottom: 80 }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: `40px repeat(${days.length}, minmax(100px, 1fr))`,
          gap: 3,
          minWidth: days.length * 103 + 43
        }}>
          {/* Header giorni */}
          <div />
          {days.map(day => (
            <div key={day} style={{
              background: 'var(--bg2)', border: '1px solid var(--border)',
              borderRadius: 4, padding: '7px 6px', textAlign: 'center',
            }}>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 600,
                color: 'var(--text)', letterSpacing: '0.08em' }}>
                {day.slice(0, 3).toUpperCase()}
              </div>
            </div>
          ))}

          {/* Righe ore */}
          {hours.map(hour => (
            <>
              <div key={`h${hour}`} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'var(--bg2)', border: '1px solid var(--border)',
                borderRadius: 4
              }}>
                <span style={{ fontFamily: 'var(--mono)', fontSize: 11, fontWeight: 600,
                  color: 'var(--text2)' }}>{hour}</span>
              </div>

              {days.map(day => {
                const slot = getSlot(day, hour);
                const cellNotes = notes.filter(n => n.day === day && n.hour === hour);
                // Include supplenze multi-ora
                const cellSubs = substitutions.filter(s =>
                  s.day === day && s.hour <= hour && (s.hour_to || s.hour) >= hour
                );
                return (
                  <TimetableCell
                    key={`${day}-${hour}`}
                    day={day} hour={hour}
                    slot={slot}
                    cellNotes={cellNotes}
                    cellSubs={cellSubs}
                    isLocked={isLocked}
                    onClick={() => openCell(day, hour)}
                  />
                );
              })}
            </>
          ))}
        </div>

        <div style={{ marginTop: 16, display: 'flex', gap: 20, justifyContent: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontSize: 11, color: 'var(--text3)' }}>Clicca una cella per modificarla</span>
          <span style={{ fontSize: 11, color: 'var(--warning)' }}>Bordo giallo = supplenza attiva</span>
          <span style={{ fontSize: 11, color: 'var(--text3)' }}>Hover su "nota" per leggerla</span>
        </div>
      </div>

      {/* Clock */}
      <ClockWidget />

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', top: 60, right: 16, zIndex: 300,
          background: toast.type === 'err' ? 'var(--danger-bg)' : 'var(--card)',
          border: `1px solid ${toast.type === 'err' ? 'var(--danger)' : 'var(--border)'}`,
          borderRadius: 6, padding: '10px 16px', fontSize: 13,
          color: toast.type === 'err' ? 'var(--danger)' : 'var(--success)',
          boxShadow: 'var(--shadow-md)'
        }}>
          {toast.msg}
        </div>
      )}

      {/* Modali */}
      {selectedCell && (
        <CellModal
          cell={selectedCell}
          hours={hours}
          isLocked={isLocked}
          notes={notes}
          substitutions={substitutions}
          onClose={() => setSelectedCell(null)}
          onSave={handleSave}
          onAddNote={handleAddNote}
          onDeleteNote={handleDeleteNote}
          onAddSub={handleAddSub}
          onDeleteSub={handleDeleteSub}
        />
      )}

      {showSettings && (
        <SettingsPanel
          onClose={() => setShowSettings(false)}
          onReset={resetSetup}
          onExport={handleExport}
          onImport={handleImportFile}
          isLocked={isLocked}
          onToggleLock={toggleLock}
          theme={theme}
          onThemeChange={onThemeChange}
          fileRef={fileInputRef}
        />
      )}
    </div>
  );
}