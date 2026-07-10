import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://dkkofpznrlyeigdafctg.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRra29mcHpucmx5ZWlnZGFmY3RnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MzU5NTYzNywiZXhwIjoyMDk5MTcxNjM3fQ.SLCDvhRWeQAX1MPom7glcMz2IhZd3MlGdTywoU2SlCY';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createAdmin() {
  const { data, error } = await supabase.auth.admin.createUser({
    email: 'pitonrodjy@gmail.com',
    password: 'pitonrp8',
    email_confirm: true,
  });

  if (error) {
    console.error('Error creating user:', error.message);
  } else {
    console.log('User created successfully:', data.user.id);
  }
}

createAdmin();
