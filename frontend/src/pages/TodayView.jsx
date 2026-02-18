import { useState, useEffect } from 'react';

// Assunzione: 1ª ora = 8:00, ogni ora = 60 min
function getCurrentHour() {
  const now = new Date();
  const totalMin = now.getHours() * 60 + now.getMinutes();
  const schoolStart = 8 * 60; // 8:00
  const periodLen = 60;
  if (totalMin < schoolStart) return 0;
  return Math.floor((totalMin - schoolStart) / periodLen) + 1;
}

function hourLabel(h) {
  const startH = 7 + h;
  return `${startH}:00 – ${startH + 1}:00`;
}

export default function TodayView({ settings, slots, notes, substitutions, isLocked, onOpenCell }) {
  const [currentHour, setCurrentHour] = useState(getCurrentHour);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => { setCurrentHour(getCurrentHour()); setNow(new Date()); }, 10000);
    return () => clearInterval(t);
  }, []);

  const todayName = now.toLocaleDateString('it-IT', { weekday: 'long' });
  const todayCapitalized = todayName.charAt(0).toUpperCase() + todayName.slice(1);
  const schoolDays = settings?.schoolDays || [];
  const hoursPerDay = settings?.hoursPerDay || 6;
  const hours = Array.from({ length: hoursPerDay }, (_, i) => i + 1);
  const isSchoolDay = schoolDays.includes(todayCapitalized);

  const getSlot = (hour) => slots.find(s => s.day === todayCapitalized && s.hour === hour);
  const getCellNotes = (hour) => notes.filter(n => n.day === todayCapitalized && n.hour === hour);
  const getCellSubs = (hour) => substitutions.filter(s =>
    s.day === todayCapitalized && s.hour <= hour && (s.hour_to || s.hour) >= hour
  );

  return (
    <div style={{ padding: '24px 20px', maxWidth: 560, margin: '0 auto', paddingBottom: 100 }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text3)',
          letterSpacing: '0.1em', marginBottom: 4 }}>
          {now.toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' }).toUpperCase()}
        </div>
        <h2 style={{ fontSize: 22, fontWeight: 600, color: 'var(--text)' }}>{todayCapitalized}</h2>
      </div>

      {!isSchoolDay ? (
        <div style={{ textAlign: 'center', padding: '48px 20px' }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>🎉</div>
          <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text)', marginBottom: 8 }}>
            Oggi non si va a scuola
          </div>
          <div style={{ fontSize: 13, color: 'var(--text3)' }}>
            {todayCapitalized} non è tra i giorni scolastici configurati.
          </div>
        </div>
      ) : (
        <div>
          {hours.map(hour => {
            const slot = getSlot(hour);
            const cellNotes = getCellNotes(hour);
            const cellSubs = getCellSubs(hour);
            const isCurrent = hour === currentHour;
            const isFree = slot?.slot_type === 'free';
            const latestSub = cellSubs.length
              ? [...cellSubs].sort((a, b) => new Date(b.sub_date) - new Date(a.sub_date))[0]
              : null;
            const hasSub = !!latestSub;
            const isEmpty = !slot?.subject && !isFree;

            return (
              <div
                key={hour}
                className={`today-row ${isCurrent ? 'current' : ''}`}
                onClick={() => onOpenCell(todayCapitalized, hour)}
                style={{ cursor: 'pointer' }}
              >
                {/* Ora */}
                <div style={{ textAlign: 'center', paddingTop: 4 }}>
                  <div style={{ fontFamily: 'var(--mono)', fontSize: 16, fontWeight: 700,
                    color: isCurrent ? 'var(--primary)' : 'var(--text2)' }}>{hour}</div>
                  <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--text3)',
                    marginTop: 2, lineHeight: 1.2 }}>
                    {hourLabel(hour).split(' – ')[0]}
                  </div>
                </div>

                {/* Contenuto */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10,
                  padding: '4px 8px', borderRadius: 6,
                  background: isCurrent ? 'transparent' : 'var(--bg2)',
                  border: `1px solid ${isCurrent ? 'var(--primary)' : 'var(--border)'}`,
                  minHeight: 52, position: 'relative' }}>

                  {/* Indicatore colore */}
                  {slot?.color && !isFree && !hasSub && (
                    <div style={{ width: 4, height: 32, borderRadius: 2, background: slot.color,
                      flexShrink: 0 }} />
                  )}

                  <div style={{ flex: 1 }}>
                    {isFree ? (
                      <span style={{ fontSize: 13, color: 'var(--free)', fontWeight: 500,
                        fontFamily: 'var(--mono)', letterSpacing: '0.05em' }}>ORA LIBERA</span>
                    ) : isEmpty ? (
                      <span style={{ fontSize: 13, color: 'var(--text3)' }}>
                        {isLocked ? '—' : 'Cella vuota · clicca per aggiungere'}
                      </span>
                    ) : hasSub ? (
                      <div>
                        {slot?.subject && (
                          <div style={{ fontSize: 11, textDecoration: 'line-through',
                            color: 'var(--text3)', marginBottom: 2 }}>
                            {slot.subject}
                          </div>
                        )}
                        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--warning)' }}>
                          {latestSub.substitute}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'var(--mono)', marginTop: 1 }}>
                          Supplenza · {new Date(latestSub.sub_date).toLocaleDateString('it-IT')}
                          {latestSub.hour_to && latestSub.hour_to !== latestSub.hour && ` · ore ${latestSub.hour}–${latestSub.hour_to}`}
                        </div>
                      </div>
                    ) : (
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>
                          {slot.subject}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'var(--mono)', marginTop: 1 }}>
                          {hourLabel(hour)}
                        </div>
                      </div>
                    )}

                    {/* Note inline */}
                    {cellNotes.length > 0 && (
                      <div style={{ marginTop: 6 }}>
                        {cellNotes.map(n => (
                          <div key={n.id} style={{ fontSize: 12, color: 'var(--text2)',
                            background: 'var(--bg3)', borderRadius: 4, padding: '3px 8px',
                            marginTop: 3, lineHeight: 1.5 }}>
                            {n.content}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Badge ora corrente */}
                  {isCurrent && (
                    <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%',
                        background: 'var(--primary)', animation: 'pulse 1.5s ease-in-out infinite' }} />
                      <span style={{ fontFamily: 'var(--mono)', fontSize: 10,
                        color: 'var(--primary)', fontWeight: 600 }}>ORA</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(0.8); }
        }
      `}</style>
    </div>
  );
}