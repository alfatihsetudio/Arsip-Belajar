const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://aqauisdkpqrdpdywnruh.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFxYXVpc2RrcHFyZHBkeXducnVoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI3NzcxNTcsImV4cCI6MjA5ODM1MzE1N30.rbWsSP2A5OWDSz1AihrehPWOELJZl9TBJ-A2Jrq_vb4'
);

async function run() {
  console.log('Testing if shared_folders_history exists:');
  const { data, error } = await supabase
    .from('shared_folders_history')
    .select('*')
    .limit(1);

  console.log('Result:', data);
  console.log('Error:', error);
}

run();
