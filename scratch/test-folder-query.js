const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://aqauisdkpqrdpdywnruh.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFxYXVpc2RrcHFyZHBkeXducnVoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI3NzcxNTcsImV4cCI6MjA5ODM1MzE1N30.rbWsSP2A5OWDSz1AihrehPWOELJZl9TBJ-A2Jrq_vb4'
);

async function run() {
  const fId = 'c0e8132a-7b17-4cc4-ab0f-255a96f177c6';
  console.log(`Querying folder ${fId} anonymously:`);
  const { data: folder, error } = await supabase
    .from('folders')
    .select('*')
    .eq('id', fId)
    .single();

  console.log('Folder result:', folder);
  console.log('Folder error:', error);
}

run();
