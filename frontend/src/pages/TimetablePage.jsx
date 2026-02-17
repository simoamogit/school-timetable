import { useState, useEffect, useCallback, useRef } from 'react';
import api from '../api/index.js';

const PRESET_COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#ef4444',
  '#f97316', '#eab308', '#22c55e', '#14b8a6',
  '#06b6d4', '#3b82f6', '#64748b', '#a78bfa'
];

// Tooltip per le note (hover)
function NoteTooltip({ notes }) {
  const [visible, setVisible] = useState(false);
  const ref = useRef(null);

  if (!notes.length) return null;

  return (
    <div
      ref={ref}
      style={{ position: 'relative', display: 'inline-flex' }}
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
    >
      <span style={{
        fontSize: 11,
        background: 'rgba(0,0,0,0.35)',
        borderRadius: 4,
        padding: '2px 5px',
        color: 'white',
        cursor: 'default',
        userSelect: 'none'
      }}>
        📝 {notes.length}
      </span>

      {visible && (
        <div style={{
          position: 'absolute',
          bottom: 'calc(100% + 8px)',
          left: '50%',
          transform: 'translateX(-50%)',
          background: '#1e1e3a',
          border: '1px solid #4f46e5',
          borderRadius: 8,
          padding: '10px 12px',
          width: 220,
          zIndex: 999,
          boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
          pointerEvents: 'none'
        }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#a78bfa', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            📝 Note lezione
          </div>
          {notes.map((n, i) => (
            <div key={n.id} style={{
              fontSize: 12,
              color: '#e2e8f0',
              lineHeight: 1.5,
              borderTop: i > 0 ? '1px solid #2d2d5e' : 'none',
              paddingTop: i > 0 ? 6 : 0,
              marginTop: i > 0 ? 6 : 0
            }}>
              {n.content}
              {n.note_date && (
                <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 2 }}>
                  📅 {new Date(n.note_date).toLocaleDateString('it-IT')}
                </div>
              )}
            </div>
          ))}
          {/* Freccia del tooltip */}
          <div style={{
            position: 'absolute',
            bottom: -6,
            left: '50%',
            transform: 'translateX(-50%)',
            width: 10,
            height: 10,
            background: '#1e1e3a',
            border: '1px solid #4f46e5',
            borderTop: 'none',
            borderLeft: 'none',
            rotate: '45deg'
          }} />
        </div>
      )}
    </div>
  );
}

function CellModal({ cell, isLocked, notes, substitutions, onClose, onSave, onAddNote, onDeleteNote, onAddSub, onDeleteSub }) {
  const defaultTab = isLocked ? 'notes' : 'edit';
  const [tab, setTab] = useState(defaultTab);
  const [subject, setSubject] = useState(cell.subject || '');
  const [color, setColor] = useState(cell.color || '#6366f1');

  const [noteContent, setNoteContent] = useState('');
  const [noteDate, setNoteDate] = useState('');

  const [subText, setSubText] = useState('');
  const [subDate, setSubDate] = useState(new Date().toISOString().split('T')[0]);
  const [subNote, setSubNote] = useState('');

  const cellNotes = notes.filter(n => n.day === cell.day && n.hour === cell.hour);
  const cellSubs = substitutions.filter(s => s.day === cell.day && s.hour === cell.hour);

  const saveSlot = () => {
    onSave({ day: cell.day, hour: cell.hour, subject, color });
    onClose();
  };

  const addNote = async () => {
    if (!noteContent.trim()) return;
    await onAddNote({ day: cell.day, hour: cell.hour, content: noteContent, note_date: noteDate || null });
    setNoteContent('');
    setNoteDate('');
  };

  const addSub = async () => {
    if (!subText.trim() || !subDate) return;
    await onAddSub({ day: cell.day, hour: cell.hour, substitute: subText, sub_date: subDate, note: subNote });
    setSubText('');
    setSubNote('');
  };

  const tabs = [
    ...(isLocked ? [] : [{ id: 'edit', label: '✏️ Materia' }]),
    { id: 'notes', label: `📝 Note${cellNotes.length ? ` (${cellNotes.length})` : ''}` },
    { id: 'subs', label: `🔄 Supplenze${cellSubs.length ? ` (${cellSubs.length})` : ''}` }
  ];

  return (
    <div className="overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700 }}>
                {cell.day} — {cell.hour}ª ora
              </h2>
              {isLocked && (
                <span style={{
                  fontSize: 11,
                  background: 'rgba(245,158,11,0.15)',
                  border: '1px solid rgba(245,158,11,0.4)',
                  color: '#fbbf24',
                  borderRadius: 20,
                  padding: '2px 8px',
                  fontWeight: 600
                }}>
                  🔒 Bloccato
                </span>
              )}
            </div>
            {cell.subject && (
              <span style={{ fontSize: 13, color: 'var(--text2)' }}>{cell.subject}</span>
            )}
          </div>
          <button onClick={onClose} style={{
            background: 'var(--bg)', border: '1px solid var(--border)',
            borderRadius: 8, padding: '6px 12px', color: 'var(--text2)', fontSize: 18
          }}>×</button>
        </div>

        <div className="tabs">
          {tabs.map(t => (
            <button key={t.id} className={`tab ${tab === t.id ? 'active' : ''}`} onClick={() => setTab(t.id)}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab: Modifica materia */}
        {tab === 'edit' && (
          <div>
            <div className="form-group">
              <label className="label">Nome Materia</label>
              <input
                placeholder="es. Matematica, Italiano..."
                value={subject}
                onChange={e => setSubject(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && saveSlot()}
                autoFocus
              />
            </div>

            <div className="form-group">
              <label className="label">Colore</label>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
                {PRESET_COLORS.map(c => (
                  <button key={c} onClick={() => setColor(c)} style={{
                    width: 32, height: 32, borderRadius: '50%', background: c,
                    border: color === c ? '3px solid white' : '3px solid transparent',
                    boxShadow: color === c ? `0 0 0 2px ${c}` : 'none',
                    transition: 'all 0.15s', padding: 0
                  }} />
                ))}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <input type="color" value={color} onChange={e => setColor(e.target.value)} style={{
                  width: 48, height: 40, padding: 4, borderRadius: 8,
                  border: '1.5px solid var(--border)', cursor: 'pointer', background: 'var(--bg)'
                }} />
                <span style={{ fontSize: 13, color: 'var(--text2)' }}>Colore personalizzato</span>
              </div>
            </div>

            <div style={{
              background: color, borderRadius: 8, padding: '12px 16px',
              marginBottom: 20, textAlign: 'center', boxShadow: `0 4px 12px ${color}66`
            }}>
              <span style={{ color: 'white', fontWeight: 700, fontSize: 15, textShadow: '0 1px 3px rgba(0,0,0,0.5)' }}>
                {subject || 'Anteprima materia'}
              </span>
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn-ghost" onClick={onClose} style={{ flex: 1 }}>Annulla</button>
              <button className="btn-primary" onClick={saveSlot} style={{ flex: 2 }}>✓ Salva</button>
            </div>
          </div>
        )}

        {/* Tab: Note */}
        {tab === 'notes' && (
          <div>
            <div className="form-group">
              <label className="label">Nuova Nota</label>
              <textarea
                placeholder="Scrivi una nota per questa lezione..."
                value={noteContent}
                onChange={e => setNoteContent(e.target.value)}
                rows={3}
                style={{ resize: 'vertical' }}
              />
            </div>
            <div className="form-group">
              <label className="label">Data (opzionale)</label>
              <input type="date" value={noteDate} onChange={e => setNoteDate(e.target.value)} />
            </div>
            <button className="btn-primary" onClick={addNote}
              style={{ width: '100%', marginBottom: 20 }}
              disabled={!noteContent.trim()}>
              + Aggiungi Nota
            </button>

            {cellNotes.length === 0
              ? <div className="empty-state">📝 Nessuna nota per questa lezione</div>
              : cellNotes.map(n => (
                <div key={n.id} className="note-card">
                  <div style={{ flex: 1 }}>
                    <p>{n.content}</p>
                    {n.note_date && <span>📅 {new Date(n.note_date).toLocaleDateString('it-IT')}</span>}
                  </div>
                  <button className="btn-danger" onClick={() => onDeleteNote(n.id)}
                    style={{ padding: '4px 10px', fontSize: 12, flexShrink: 0 }}>✕</button>
                </div>
              ))
            }
          </div>
        )}

        {/* Tab: Supplenze */}
        {tab === 'subs' && (
          <div>
            <div className="form-group">
              <label className="label">Supplente / Materia alternativa *</label>
              <input
                placeholder="es. Prof. Rossi, Educazione Fisica..."
                value={subText}
                onChange={e => setSubText(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="label">Data supplenza *</label>
              <input type="date" value={subDate} onChange={e => setSubDate(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="label">Nota (opzionale)</label>
              <input
                placeholder="Ulteriori dettagli..."
                value={subNote}
                onChange={e => setSubNote(e.target.value)}
              />
            </div>
            <button className="btn-primary" onClick={addSub}
              style={{ width: '100%', marginBottom: 20 }}
              disabled={!subText.trim() || !subDate}>
              + Aggiungi Supplenza
            </button>

            {cellSubs.length === 0
              ? <div className="empty-state">🔄 Nessuna supplenza registrata</div>
              : [...cellSubs].sort((a, b) => new Date(b.sub_date) - new Date(a.sub_date)).map(s => (
                <div key={s.id} className="note-card">
                  <div style={{ flex: 1 }}>
                    <p style={{ fontWeight: 700, color: '#fbbf24' }}>🔄 {s.substitute}</p>
                    <span>📅 {new Date(s.sub_date).toLocaleDateString('it-IT')}</span>
                    {s.note && <p style={{ marginTop: 4, fontSize: 13, color: 'var(--text2)' }}>{s.note}</p>}
                  </div>
                  <button className="btn-danger" onClick={() => onDeleteSub(s.id)}
                    style={{ padding: '4px 10px', fontSize: 12, flexShrink: 0 }}>✕</button>
                </div>
              ))
            }
          </div>
        )}
      </div>
    </div>
  );
}

// Cella della tabella
function TimetableCell({ day, hour, slot, cellNotes, cellSubs, isLocked, onClick }) {
  const isEmpty = !slot?.subject;

  // Supplenza più recente
  const latestSub = cellSubs.length
    ? [...cellSubs].sort((a, b) => new Date(b.sub_date) - new Date(a.sub_date))[0]
    : null;

  const hasSub = !!latestSub;
  const bg = isEmpty ? 'var(--card)' : slot.color;

  return (
    <button
      onClick={onClick}
      style={{
        background: hasSub
          ? 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)'
          : bg,
        border: `1.5px solid ${isEmpty ? 'var(--border)' : hasSub ? '#f59e0b' : slot.color}`,
        borderRadius: 8,
        padding: '8px 6px',
        cursor: 'pointer',
        transition: 'all 0.15s',
        minHeight: 80,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 3,
        position: 'relative',
        boxShadow: hasSub
          ? '0 2px 8px rgba(245,158,11,0.25)'
          : isEmpty ? 'none' : `0 2px 8px ${slot.color}44`,
        overflow: 'hidden'
      }}
      onMouseEnter={e => {
        e.currentTarget.style.transform = 'scale(1.03)';
        e.currentTarget.style.zIndex = '10';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform = 'scale(1)';
        e.currentTarget.style.zIndex = '1';
      }}
    >
      {isEmpty && !hasSub ? (
        <span style={{ fontSize: 20, opacity: 0.2, color: 'var(--text2)' }}>
          {isLocked ? '🔒' : '+'}
        </span>
      ) : hasSub ? (
        // Cella con supplenza in primo piano
        <>
          {/* Materia originale barrata in alto */}
          {slot?.subject && (
            <span style={{
              fontSize: 9,
              color: 'rgba(255,255,255,0.35)',
              textDecoration: 'line-through',
              textDecorationColor: 'rgba(255,100,100,0.7)',
              textDecorationThickness: 1.5,
              fontWeight: 500,
              lineHeight: 1.2,
              textAlign: 'center',
              maxWidth: '100%',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}>
              {slot.subject}
            </span>
          )}

          {/* Divisore */}
          <div style={{ width: '70%', height: 1, background: 'rgba(245,158,11,0.3)', margin: '2px 0' }} />

          {/* Supplente */}
          <span style={{
            fontSize: 12,
            fontWeight: 800,
            color: '#fbbf24',
            textAlign: 'center',
            lineHeight: 1.2,
            maxWidth: '100%',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            padding: '0 4px'
          }}>
            🔄 {latestSub.substitute}
          </span>

          {/* Data supplenza */}
          <span style={{
            fontSize: 9,
            color: 'rgba(251,191,36,0.65)',
            fontWeight: 500
          }}>
            {new Date(latestSub.sub_date).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' })}
          </span>

          {/* Badge note */}
          {cellNotes.length > 0 && (
            <div style={{ marginTop: 2 }} onClick={e => e.stopPropagation()}>
              <NoteTooltip notes={cellNotes} />
            </div>
          )}
        </>
      ) : (
        // Cella normale
        <>
          <span style={{
            fontSize: 12,
            fontWeight: 700,
            color: 'white',
            textShadow: '0 1px 3px rgba(0,0,0,0.5)',
            lineHeight: 1.2,
            textAlign: 'center',
            maxWidth: '100%',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            padding: '0 4px'
          }}>
            {slot.subject}
          </span>

          {/* Badge note + supplenze */}
          {cellNotes.length > 0 && (
            <div style={{ marginTop: 2 }} onClick={e => e.stopPropagation()}>
              <NoteTooltip notes={cellNotes} />
            </div>
          )}
        </>
      )}
    </button>
  );
}

export default function TimetablePage({ user, onLogout }) {
  const [settings, setSettings] = useState(null);
  const [slots, setSlots] = useState([]);
  const [notes, setNotes] = useState([]);
  const [substitutions, setSubstitutions] = useState([]);
  const [selectedCell, setSelectedCell] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showMenu, setShowMenu] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [importError, setImportError] = useState('');
  const [importSuccess, setImportSuccess] = useState('');
  const fileInputRef = useRef(null);

  const load = useCallback(async () => {
    try {
      const [sRes, slRes, nRes, subRes] = await Promise.all([
        api.get('/timetable/settings'),
        api.get('/timetable/slots'),
        api.get('/timetable/notes'),
        api.get('/timetable/substitutions')
      ]);
      setSettings(sRes.data);
      setIsLocked(sRes.data.locked || false);
      setSlots(slRes.data);
      setNotes(nRes.data);
      setSubstitutions(subRes.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const getSlot = (day, hour) => slots.find(s => s.day === day && s.hour === hour);

  const openCell = (day, hour) => {
    const slot = getSlot(day, hour) || { day, hour, subject: '', color: '#6366f1' };
    setSelectedCell(slot);
  };

  const handleSave = async ({ day, hour, subject, color }) => {
    await api.post('/timetable/slots', { day, hour, subject, color });
    setSlots(prev => {
      const idx = prev.findIndex(s => s.day === day && s.hour === hour);
      const newSlot = { day, hour, subject, color };
      if (idx >= 0) return prev.map((s, i) => i === idx ? newSlot : s);
      return [...prev, newSlot];
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
    const newLocked = !isLocked;
    await api.post('/timetable/settings/lock', { locked: newLocked });
    setIsLocked(newLocked);
  };

  const resetSetup = async () => {
    if (!window.confirm('Riconfigurare l\'orario cancellerà tutte le materie. Continuare?')) return;
    await api.post('/timetable/settings/reset');
    window.location.reload();
  };

  // Export
  const handleExport = async () => {
    try {
      const res = await api.get('/timetable/export');
      const blob = new Blob([JSON.stringify(res.data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `orario-scolastico-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setShowMenu(false);
    } catch (e) {
      alert('Errore durante l\'esportazione');
    }
  };

  // Import
  const handleImportFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImportError('');
    setImportSuccess('');

    try {
      const text = await file.text();
      const data = JSON.parse(text);

      if (!data.settings || !data.slots || !data.notes || !data.substitutions) {
        setImportError('File non valido: struttura non riconosciuta.');
        return;
      }

      if (!window.confirm(`Importare questo file sovrascriverà tutti i dati attuali (${data.slots.length} materie, ${data.notes.length} note, ${data.substitutions.length} supplenze). Continuare?`))
        return;

      await api.post('/timetable/import', data);
      setImportSuccess('Importazione completata!');
      setShowMenu(false);
      setTimeout(() => { setImportSuccess(''); load(); }, 1500);
    } catch (e) {
      setImportError('Errore durante l\'importazione. Controlla il file.');
    } finally {
      e.target.value = '';
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <p style={{ color: 'var(--text2)' }}>⏳ Caricamento orario...</p>
      </div>
    );
  }

  const hours = Array.from({ length: settings?.hoursPerDay || 6 }, (_, i) => i + 1);
  const days = settings?.schoolDays || [];

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      {/* Navbar */}
      <header style={{
        background: 'var(--card)',
        borderBottom: '1px solid var(--border)',
        padding: '0 20px',
        height: 64,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'sticky',
        top: 0,
        zIndex: 50
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 28 }}>📚</span>
          <div>
            <h1 style={{ fontSize: 18, fontWeight: 700, lineHeight: 1 }}>Orario Scolastico</h1>
            <p style={{ fontSize: 12, color: 'var(--text2)', marginTop: 2 }}>Ciao, {user?.username}!</p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {/* Lucchetto */}
          <button
            onClick={toggleLock}
            title={isLocked ? 'Sblocca modifica materie' : 'Blocca modifica materie'}
            style={{
              background: isLocked ? 'rgba(245,158,11,0.15)' : 'var(--bg)',
              border: `1.5px solid ${isLocked ? '#f59e0b' : 'var(--border)'}`,
              borderRadius: 8,
              padding: '8px 12px',
              color: isLocked ? '#fbbf24' : 'var(--text2)',
              fontSize: 18,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              transition: 'all 0.2s'
            }}
          >
            {isLocked ? '🔒' : '🔓'}
            <span style={{ fontSize: 12, fontWeight: 600 }}>
              {isLocked ? 'Bloccato' : 'Libero'}
            </span>
          </button>

          {/* Menu */}
          <div style={{ position: 'relative' }}>
            <button onClick={() => setShowMenu(!showMenu)} style={{
              background: 'var(--bg)', border: '1px solid var(--border)',
              borderRadius: 8, padding: '8px 14px', color: 'var(--text)',
              display: 'flex', alignItems: 'center', gap: 8, fontSize: 14
            }}>
              ⚙️ Menu
            </button>

            {showMenu && (
              <div style={{
                position: 'absolute', right: 0, top: 44,
                background: 'var(--card)', border: '1px solid var(--border)',
                borderRadius: 8, overflow: 'hidden', minWidth: 200,
                boxShadow: 'var(--shadow)', zIndex: 100
              }}>
                <button onClick={handleExport} style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  width: '100%', padding: '12px 16px', textAlign: 'left',
                  background: 'transparent', color: 'var(--text)', fontSize: 14,
                  borderBottom: '1px solid var(--border)'
                }}>
                  📤 Esporta dati (.json)
                </button>

                <button onClick={() => fileInputRef.current?.click()} style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  width: '100%', padding: '12px 16px', textAlign: 'left',
                  background: 'transparent', color: 'var(--text)', fontSize: 14,
                  borderBottom: '1px solid var(--border)'
                }}>
                  📥 Importa dati (.json)
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json"
                  style={{ display: 'none' }}
                  onChange={handleImportFile}
                />

                <button onClick={() => { resetSetup(); setShowMenu(false); }} style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  width: '100%', padding: '12px 16px', textAlign: 'left',
                  background: 'transparent', color: 'var(--text)', fontSize: 14,
                  borderBottom: '1px solid var(--border)'
                }}>
                  🔄 Riconfigura orario
                </button>

                <button onClick={onLogout} style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  width: '100%', padding: '12px 16px', textAlign: 'left',
                  background: 'transparent', color: '#fca5a5', fontSize: 14
                }}>
                  🚪 Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Toast notifiche import */}
      {(importError || importSuccess) && (
        <div style={{
          position: 'fixed', top: 72, right: 16, zIndex: 200,
          background: importSuccess ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)',
          border: `1px solid ${importSuccess ? 'rgba(34,197,94,0.5)' : 'rgba(239,68,68,0.5)'}`,
          borderRadius: 10, padding: '12px 18px', maxWidth: 320,
          color: importSuccess ? '#86efac' : '#fca5a5', fontSize: 14, fontWeight: 600,
          boxShadow: 'var(--shadow)'
        }}>
          {importSuccess ? `✅ ${importSuccess}` : `⚠️ ${importError}`}
        </div>
      )}

      {/* Banner locked */}
      {isLocked && (
        <div style={{
          background: 'rgba(245,158,11,0.08)',
          borderBottom: '1px solid rgba(245,158,11,0.25)',
          padding: '8px 20px',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          fontSize: 13,
          color: '#fbbf24'
        }}>
          🔒 <strong>Orario bloccato</strong> — Puoi aggiungere solo note e supplenze. Clicca il lucchetto per sbloccare.
        </div>
      )}

      {/* Stats bar */}
      <div style={{
        display: 'flex', gap: 12, padding: '14px 20px',
        overflowX: 'auto', borderBottom: '1px solid var(--border)',
        background: 'var(--bg2)'
      }}>
        {[
          { label: 'Giorni', value: days.length, icon: '📅' },
          { label: 'Ore/sett.', value: days.length * hours.length, icon: '⏰' },
          { label: 'Materie', value: new Set(slots.filter(s => s.subject).map(s => s.subject)).size, icon: '📖' },
          { label: 'Note', value: notes.length, icon: '📝' },
          { label: 'Supplenze', value: substitutions.length, icon: '🔄' }
        ].map(stat => (
          <div key={stat.label} style={{
            background: 'var(--card)', border: '1px solid var(--border)',
            borderRadius: 8, padding: '10px 16px', minWidth: 100, flexShrink: 0
          }}>
            <div style={{ fontSize: 11, color: 'var(--text2)', marginBottom: 4 }}>{stat.icon} {stat.label}</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--primary)' }}>{stat.value}</div>
          </div>
        ))}
      </div>

      {/* Timetable grid */}
      <div style={{ padding: 16, overflowX: 'auto' }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: `52px repeat(${days.length}, minmax(110px, 1fr))`,
          gap: 4,
          minWidth: days.length * 114 + 56
        }}>
          {/* Header */}
          <div />
          {days.map(day => (
            <div key={day} style={{
              background: 'var(--card)',
              border: '1px solid var(--border)',
              borderRadius: 8,
              padding: '10px 8px',
              textAlign: 'center',
              fontWeight: 700,
              fontSize: 12,
              color: 'var(--text)'
            }}>
              {day.slice(0, 3).toUpperCase()}
              <div style={{ fontSize: 9, color: 'var(--text2)', fontWeight: 400, marginTop: 2 }}>{day}</div>
            </div>
          ))}

          {/* Righe ore */}
          {hours.map(hour => (
            <>
              <div key={`h${hour}`} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'var(--card)', border: '1px solid var(--border)',
                borderRadius: 8, fontSize: 12, fontWeight: 700, color: 'var(--text2)',
                flexDirection: 'column', padding: '8px 4px'
              }}>
                <span style={{ fontSize: 16, color: 'var(--primary)', fontWeight: 800 }}>{hour}</span>
                <span style={{ fontSize: 8, marginTop: 1, letterSpacing: '0.05em' }}>ORA</span>
              </div>

              {days.map(day => {
                const slot = getSlot(day, hour);
                const cellNotes = notes.filter(n => n.day === day && n.hour === hour);
                const cellSubs = substitutions.filter(s => s.day === day && s.hour === hour);

                return (
                  <TimetableCell
                    key={`${day}-${hour}`}
                    day={day}
                    hour={hour}
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

        <div style={{ display: 'flex', gap: 16, justifyContent: 'center', marginTop: 20, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 12, color: 'var(--text2)' }}>
            💡 Clicca su una cella per modificarla
          </span>
          <span style={{ fontSize: 12, color: '#fbbf24' }}>
            🔄 Celle gialle = supplenza attiva
          </span>
          <span style={{ fontSize: 12, color: '#a78bfa' }}>
            📝 Passa il mouse sull'emoji nota per leggerla
          </span>
        </div>
      </div>

      {/* Modal */}
      {selectedCell && (
        <CellModal
          cell={selectedCell}
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

      {showMenu && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 40 }} onClick={() => setShowMenu(false)} />
      )}
    </div>
  );
}