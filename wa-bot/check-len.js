const { Pool } = require('pg');
require('dotenv').config({ path: '../.env.local' });
const db = new Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  const res = await db.query('SELECT title, transcribed_text FROM public.notes WHERE user_id = $1', ['user_3ISk788yNAGZ8Xkrgsbnauz05Vu']);
  let totalLen = 0;
  for (const row of res.rows) {
    totalLen += (row.title || '').length + (row.transcribed_text || '').length;
  }
  console.log('Total characters:', totalLen);
  await db.end();
}
run();
