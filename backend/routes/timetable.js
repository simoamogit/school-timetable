const express = require('express');
const { pool } = require('../db/database');
const auth = require('../middleware/auth');

const router = express.Router();
router.use(auth);

// Pulizia automatica: elimina note e supplenze scadute
async function cleanupExpired(userId) {
  const today = new Date().toISOString().split('T')[0];
  await pool.query(
    `DELETE FROM notes WHERE user_id=$1 AND note_date IS NOT NULL AND note_date < $2`,
    [userId, today]
  );
  await pool.query(
    `DELETE FROM substitutions WHERE user_id=$1 AND sub_date < $2`,
    [userId, today]
  );
}

// --- ENDPOINT UNICO PER CARICAMENTO VELOCE ---
router.get('/all', async (req, res) => {
  try {
    await cleanupExpired(req.user.id);
    const [sR, slR, nR, subR] = await Promise.all([
      pool.query('SELECT * FROM user_settings WHERE user_id=$1', [req.user.id]),
      pool.query('SELECT * FROM slots WHERE user_id=$1', [req.user.id]),
      pool.query('SELECT * FROM notes WHERE user_id=$1 ORDER BY created_at DESC', [req.user.id]),
      pool.query('SELECT * FROM substitutions WHERE user_id=$1 ORDER BY sub_date DESC', [req.user.id])
    ]);
    const s = sR.rows[0];
    res.json({
      settings: {
        setupComplete: s?.setup_complete === 1,
        schoolDays: JSON.parse(s?.school_days || '[]'),
        hoursPerDay: s?.hours_per_day || 6,
        locked: s?.locked === 1,
        theme: s?.theme || 'dark'
      },
      slots: slR.rows,
      notes: nR.rows,
      substitutions: subR.rows
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Errore server' });
  }
});

// Health check per warm-up
router.get('/health', (req, res) => res.json({ ok: true, ts: Date.now() }));

// --- SETTINGS ---
router.get('/settings', async (req, res) => {
  try {
    const r = await pool.query('SELECT * FROM user_settings WHERE user_id=$1', [req.user.id]);
    const s = r.rows[0];
    if (!s) return res.json({ setupComplete: false });
    res.json({
      setupComplete: s.setup_complete === 1,
      schoolDays: JSON.parse(s.school_days),
      hoursPerDay: s.hours_per_day,
      locked: s.locked === 1,
      theme: s.theme || 'dark'
    });
  } catch (e) { res.status(500).json({ error: 'Errore server' }); }
});

router.post('/settings', async (req, res) => {
  const { schoolDays, hoursPerDay } = req.body;
  if (!schoolDays || !hoursPerDay) return res.status(400).json({ error: 'Dati mancanti' });
  try {
    await pool.query(
      `UPDATE user_settings SET school_days=$1, hours_per_day=$2, setup_complete=1 WHERE user_id=$3`,
      [JSON.stringify(schoolDays), hoursPerDay, req.user.id]
    );
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: 'Errore server' }); }
});

router.post('/settings/reset', async (req, res) => {
  try {
    await pool.query(
      `UPDATE user_settings SET setup_complete=0, school_days='[]', hours_per_day=6 WHERE user_id=$1`,
      [req.user.id]
    );
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: 'Errore server' }); }
});

router.post('/settings/lock', async (req, res) => {
  const { locked } = req.body;
  try {
    await pool.query(`UPDATE user_settings SET locked=$1 WHERE user_id=$2`, [locked ? 1 : 0, req.user.id]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: 'Errore server' }); }
});

router.post('/settings/theme', async (req, res) => {
  const { theme } = req.body;
  try {
    await pool.query(`UPDATE user_settings SET theme=$1 WHERE user_id=$2`, [theme, req.user.id]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: 'Errore server' }); }
});

// --- SLOTS ---
router.get('/slots', async (req, res) => {
  try {
    const r = await pool.query('SELECT * FROM slots WHERE user_id=$1', [req.user.id]);
    res.json(r.rows);
  } catch (e) { res.status(500).json({ error: 'Errore server' }); }
});

router.post('/slots', async (req, res) => {
  const { day, hour, subject, color } = req.body;
  try {
    await pool.query(
      `INSERT INTO slots (user_id, day, hour, subject, color) VALUES ($1,$2,$3,$4,$5)
       ON CONFLICT (user_id, day, hour) DO UPDATE SET subject=EXCLUDED.subject, color=EXCLUDED.color`,
      [req.user.id, day, hour, subject || '', color || '#2563eb']
    );
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: 'Errore server' }); }
});

// --- NOTES ---
router.get('/notes', async (req, res) => {
  try {
    const r = await pool.query('SELECT * FROM notes WHERE user_id=$1 ORDER BY created_at DESC', [req.user.id]);
    res.json(r.rows);
  } catch (e) { res.status(500).json({ error: 'Errore server' }); }
});

router.post('/notes', async (req, res) => {
  const { day, hour, content, note_date } = req.body;
  if (!content) return res.status(400).json({ error: 'Contenuto obbligatorio' });
  try {
    const r = await pool.query(
      'INSERT INTO notes (user_id, day, hour, content, note_date) VALUES ($1,$2,$3,$4,$5) RETURNING id',
      [req.user.id, day, hour, content, note_date || null]
    );
    res.json({ id: r.rows[0].id });
  } catch (e) { res.status(500).json({ error: 'Errore server' }); }
});

router.delete('/notes/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM notes WHERE id=$1 AND user_id=$2', [req.params.id, req.user.id]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: 'Errore server' }); }
});

// --- SUBSTITUTIONS ---
router.get('/substitutions', async (req, res) => {
  try {
    const r = await pool.query('SELECT * FROM substitutions WHERE user_id=$1 ORDER BY sub_date DESC', [req.user.id]);
    res.json(r.rows);
  } catch (e) { res.status(500).json({ error: 'Errore server' }); }
});

router.post('/substitutions', async (req, res) => {
  const { day, hour, hour_to, substitute, sub_date, note } = req.body;
  if (!substitute || !sub_date) return res.status(400).json({ error: 'Dati mancanti' });
  try {
    const r = await pool.query(
      'INSERT INTO substitutions (user_id, day, hour, hour_to, substitute, sub_date, note) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id',
      [req.user.id, day, hour, hour_to || hour, substitute, sub_date, note || '']
    );
    res.json({ id: r.rows[0].id });
  } catch (e) { res.status(500).json({ error: 'Errore server' }); }
});

router.delete('/substitutions/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM substitutions WHERE id=$1 AND user_id=$2', [req.params.id, req.user.id]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: 'Errore server' }); }
});

// --- EXPORT ---
router.get('/export', async (req, res) => {
  try {
    const [sR, slR, nR, subR] = await Promise.all([
      pool.query('SELECT * FROM user_settings WHERE user_id=$1', [req.user.id]),
      pool.query('SELECT day, hour, subject, color FROM slots WHERE user_id=$1', [req.user.id]),
      pool.query('SELECT day, hour, content, note_date FROM notes WHERE user_id=$1', [req.user.id]),
      pool.query('SELECT day, hour, hour_to, substitute, sub_date, note FROM substitutions WHERE user_id=$1', [req.user.id])
    ]);
    const s = sR.rows[0];
    res.json({
      version: 2,
      exportedAt: new Date().toISOString(),
      settings: { schoolDays: JSON.parse(s?.school_days || '[]'), hoursPerDay: s?.hours_per_day || 6 },
      slots: slR.rows,
      notes: nR.rows,
      substitutions: subR.rows
    });
  } catch (e) { res.status(500).json({ error: 'Errore export' }); }
});

// --- IMPORT ---
router.post('/import', async (req, res) => {
  const { settings, slots, notes, substitutions } = req.body;
  if (!settings || !Array.isArray(slots) || !Array.isArray(notes) || !Array.isArray(substitutions))
    return res.status(400).json({ error: 'Formato non valido' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(
      `UPDATE user_settings SET school_days=$1, hours_per_day=$2, setup_complete=1 WHERE user_id=$3`,
      [JSON.stringify(settings.schoolDays), settings.hoursPerDay, req.user.id]
    );
    await client.query('DELETE FROM slots WHERE user_id=$1', [req.user.id]);
    await client.query('DELETE FROM notes WHERE user_id=$1', [req.user.id]);
    await client.query('DELETE FROM substitutions WHERE user_id=$1', [req.user.id]);
    for (const s of slots)
      await client.query('INSERT INTO slots (user_id, day, hour, subject, color) VALUES ($1,$2,$3,$4,$5)',
        [req.user.id, s.day, s.hour, s.subject, s.color]);
    for (const n of notes)
      await client.query('INSERT INTO notes (user_id, day, hour, content, note_date) VALUES ($1,$2,$3,$4,$5)',
        [req.user.id, n.day, n.hour, n.content, n.note_date || null]);
    for (const s of substitutions)
      await client.query('INSERT INTO substitutions (user_id, day, hour, hour_to, substitute, sub_date, note) VALUES ($1,$2,$3,$4,$5,$6,$7)',
        [req.user.id, s.day, s.hour, s.hour_to || s.hour, s.substitute, s.sub_date, s.note || '']);
    await client.query('COMMIT');
    res.json({ ok: true });
  } catch (e) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: 'Errore importazione' });
  } finally {
    client.release();
  }
});

module.exports = router;