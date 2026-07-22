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

const mockTestimonials = [
  {
    name: 'Jean-Pierre Lemoine',
    position: 'Directeur Général, DistribLink S.A.',
    message: 'Technozi a transformé notre bureau avec son installation solaire et Starlink. Nous n\'avons plus jamais souffert de coupures d\'électricité ni de connexions internet instables. Leurs ingénieurs sont extrêmement professionnels et le service après-vente est ultra réactif !',
    photo_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&h=150&q=80'
  },
  {
    name: 'Marie-Helene Noel',
    position: 'Responsable des Opérations, Hôtel Splendide Haïti',
    message: 'Nous avons fait appel à Technozi pour installer un système de vidéosurveillance complet de 32 caméras. La clarté des images, la facilité de visualisation sur smartphone et l\'écoute de l\'équipe technique nous ont enchantés. Une entreprise haïtienne de confiance.',
    photo_url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&h=150&q=80'
  },
  {
    name: 'Charles Auguste',
    position: 'Fondateur, Auguste & Fils Co.',
    message: 'La fourniture d\'équipements informatiques et la mise en place de notre réseau de bureau ont été réalisées de main de maître. Rapide, fiable et efficace, Technozi porte très bien son slogan "Faster & Easier". Je recommande sans hésitation.',
    photo_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&h=150&q=80'
  }
];

async function seed() {
  await supabase.from('testimonials').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  
  for (const t of mockTestimonials) {
    const { error } = await supabase.from('testimonials').insert({
      name: t.name,
      message: t.message,
      position: t.position,
      photo_url: t.photo_url
    });
    if (error) console.error('Error inserting', t.name, error);
  }
  console.log('Seeded testimonials!');
}
seed();
