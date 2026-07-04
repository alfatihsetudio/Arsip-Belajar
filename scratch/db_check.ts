import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envContent = fs.readFileSync('.env.local', 'utf8');
envContent.split('\n').forEach(line => {
  const [key, ...values] = line.split('=');
  if (key && values.length > 0) {
    process.env[key.trim()] = values.join('=').trim().replace(/^"|"$/g, '');
  }
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

async function check() {
  console.log('--- LATEST NOTES ---');
  const { data: notes } = await supabase
    .from('notes')
    .select('id, title, image_url, created_at')
    .order('created_at', { ascending: false })
    .limit(3);
  console.log(notes);

  if (notes && notes.length > 0) {
    const noteId = notes[0].id;
    console.log('\n--- CHECK ENUMS / COLUMNS ---');
    const res = await supabase.from('note_media').insert({
      note_id: noteId,
      user_id: '298c471c-3be0-4960-ab78-c07a048753a4',
      media_url: 'test',
      media_type: 'audio',
      order_index: 0
    });
    console.log(res.error);

  }
}

check();
