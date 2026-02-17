const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function initDB() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS user_settings (
        id SERIAL PRIMARY KEY,
        user_id INTEGER UNIQUE NOT NULL REFERENCES users(id),
        school_days TEXT NOT NULL DEFAULT '[]',
        hours_per_day INTEGER NOT NULL DEFAULT 6,
        setup_complete INTEGER NOT NULL DEFAULT 0,
        locked INTEGER NOT NULL DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS slots (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id),
        day TEXT NOT NULL,
        hour INTEGER NOT NULL,
        subject TEXT NOT NULL DEFAULT '',
        color TEXT NOT NULL DEFAULT '#6366f1',
        UNIQUE(user_id, day, hour)
      );

      CREATE TABLE IF NOT EXISTS notes (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id),
        day TEXT NOT NULL,
        hour INTEGER NOT NULL,
        content TEXT NOT NULL,
        note_date TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS substitutions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id),
        day TEXT NOT NULL,
        hour INTEGER NOT NULL,
        substitute TEXT NOT NULL,
        sub_date TEXT NOT NULL,
        note TEXT DEFAULT ''
      );
    `);
    console.log('✅ Database inizializzato');
  } finally {
    client.release();
  }
}

module.exports = { pool, initDB };