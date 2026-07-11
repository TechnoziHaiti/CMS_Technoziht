import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const envFile = fs.readFileSync('.env.local', 'utf8');
const envVars = envFile.split('\n').reduce((acc, line) => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) acc[match[1].trim()] = match[2].trim();
  return acc;
}, {});

const supabaseUrl = envVars.VITE_SUPABASE_URL;
const supabaseKey = envVars.VITE_SUPABASE_SERVICE_ROLE_KEY || envVars.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

const mockProjects = [
  {
    title: 'Autonomie Solaire Résidentielle',
    category: 'Solar',
    description: 'Installation d\'un système hybride composé de 12 panneaux solaires et de batteries au Lithium pour une alimentation continue dans une résidence à Pétion-Ville.',
    client: 'Famille Saint-Clair',
    date: 'Mars 2026',
    image_url: 'https://images.unsplash.com/photo-1613665813446-82a78c468a1d?auto=format&fit=crop&w=800&q=80'
  },
  {
    title: 'Déploiement Internet Starlink Multi-Site',
    category: 'Starlink',
    description: 'Vente, fixation robuste sur toit incliné et configuration réseau de kits Starlink pour interconnecter trois écoles régionales avec Internet haut débit.',
    client: 'Fondation Éducation Haïti',
    date: 'Janvier 2026',
    image_url: 'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?auto=format&fit=crop&w=800&q=80'
  },
  {
    title: 'Réseau Structuré d\'un Bureau d\'Études',
    category: 'Networking',
    description: 'Conception et réalisation du câblage réseau Cat6, pose de goulottes et baie de brassage de 24 ports, et configuration du Wi-Fi unifié.',
    client: 'D&D Cabinet d\'Architecture',
    date: 'Février 2026',
    image_url: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=800&q=80'
  },
  {
    title: 'Vidéosurveillance d\'un Entrepôt Commercial',
    category: 'CCTV',
    description: 'Déploiement de 16 caméras IP extérieures et intérieures de 4 MP, avec un enregistreur NVR de 32 canaux et configuration des alertes sur smartphone.',
    client: 'Dis-Haiti Distribution',
    date: 'Avril 2026',
    image_url: 'https://images.unsplash.com/photo-1557597774-9d273605dfa9?auto=format&fit=crop&w=800&q=80'
  },
  {
    title: 'Équipement Complet d\'un Centre d\'Appels',
    category: 'Office Installations',
    description: 'Fourniture et installation de 45 ordinateurs tout-en-un, casques téléphoniques anti-bruit, onduleurs centralisés et câblage intégral de l\'espace.',
    client: 'Vox-Ht Services',
    date: 'Mai 2026',
    image_url: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=800&q=80'
  }
];

async function seed() {
  await supabase.from('projects').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  
  for (const p of mockProjects) {
    const { error } = await supabase.from('projects').insert({
      title: p.title,
      description: p.description,
      technologies: [p.category, p.client, p.date],
      image_url: p.image_url,
      link: ''
    });
    if (error) console.error('Error inserting', p.title, error);
  }
  console.log('Seeded projects!');
}
seed();
