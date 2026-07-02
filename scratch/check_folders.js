const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8');
const getVal = (key) => env.split('\n').find(l => l.startsWith(key))?.split('=')[1]?.trim();

const supabaseUrl = getVal('NEXT_PUBLIC_SUPABASE_URL');
const supabaseAnonKey = getVal('NEXT_PUBLIC_SUPABASE_ANON_KEY');

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function test() {
  const { error } = await supabase.from('notes').select('non_existent_column').limit(1);
  console.log('Error details:', error);
}
test();
