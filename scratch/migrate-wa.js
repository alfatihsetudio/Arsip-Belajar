const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  try {
    await pool.query(`
      ALTER TABLE public.profiles 
      ADD COLUMN IF NOT EXISTS whatsapp_number TEXT UNIQUE,
      ADD COLUMN IF NOT EXISTS wa_verify_token TEXT,
      ADD COLUMN IF NOT EXISTS wa_status TEXT DEFAULT 'unlinked' CHECK (wa_status IN ('unlinked', 'pending', 'verified'));
    `);
    console.log('Migration successful!');
  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    await pool.end();
  }
}

run();
