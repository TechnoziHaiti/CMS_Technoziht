import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const envFile = fs.readFileSync('../.env.local', 'utf8');
const envVars = envFile.split('\n').reduce((acc, line) => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) acc[match[1].trim()] = match[2].trim();
  return acc;
}, {});

const supabaseUrl = envVars.VITE_SUPABASE_URL;
const supabaseKey = envVars.VITE_SUPABASE_SERVICE_ROLE_KEY || envVars.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

const mockMessages = [
  {
    name: 'Jean Dupont',
    email: 'jean.dupont@example.com',
    message: 'Téléphone : +509 37 00 1122\nService : Énergie Solaire\n\nMessage :\nBonjour, j\'aimerais avoir un devis pour une installation solaire résidentielle.',
    status: false
  },
  {
    name: 'Marie Claire',
    email: 'marie.claire@example.com',
    message: 'Téléphone : Non renseigné\nService : Internet Starlink\n\nMessage :\nEst-ce que vous couvrez la zone de Jacmel pour l\'installation Starlink ?',
    status: false
  }
];

async function seed() {
  for (const m of mockMessages) {
    const { error } = await supabase.from('messages').insert([m]);
    if (error) console.error('Error inserting', m.name, error);
  }
  console.log('Seeded messages!');
}
seed();
