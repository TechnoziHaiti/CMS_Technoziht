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

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing env vars');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const mockServices = [
  {
    title: 'Énergie Solaire',
    icon: 'Sun',
    short_desc: 'Installation complète de panneaux solaires, batteries haute performance et inverters.',
    long_desc: 'Nous concevons et installons des systèmes d\'énergie solaire sur mesure pour les résidences, commerces et institutions. Notre offre comprend des panneaux photovoltaïques monocristallins, des batteries avancées (Gel et Lithium), des régulateurs de charge intelligents et des inverters robustes pour garantir votre autonomie énergétique 24h/24.',
    image_url: 'https://images.unsplash.com/photo-1509391366360-2e959784a276?auto=format&fit=crop&w=800&q=80'
  },
  {
    title: 'Service Starlink',
    icon: 'Globe',
    short_desc: 'Vente de kits, installation professionnelle et configuration Internet haut débit.',
    long_desc: 'Bénéficiez de la puissance de la connexion par satellite de SpaceX partout en Haïti. Nous vendons les kits Starlink officiels, assurons leur installation physique sécurisée sur toit ou mât, réalisons le câblage propre et configurons vos routeurs pour une couverture Wi-Fi optimale et un débit internet maximal.',
    image_url: 'https://images.unsplash.com/photo-1621605815971-fbc98d665033?auto=format&fit=crop&w=800&q=80'
  },
  {
    title: 'Sécurité & Vidéosurveillance',
    icon: 'Shield',
    short_desc: 'Systèmes de caméras IP/analogiques intelligents avec enregistreurs DVR/NVR.',
    long_desc: 'Protégez vos locaux grâce à nos systèmes de vidéosurveillance de pointe. Nous déployons des caméras haute définition (IP et analogiques) avec vision nocturne infrarouge et détection de mouvement. L\'installation comprend la configuration d\'enregistreurs (DVR/NVR) permettant la visualisation à distance en temps réel sur smartphone.',
    image_url: 'https://images.unsplash.com/photo-1557597774-9d273605dfa9?auto=format&fit=crop&w=800&q=80'
  },
  {
    title: 'Réseaux & Câblage',
    icon: 'Network',
    short_desc: 'Conception d\'infrastructures réseau d\'entreprise et câblage structuré.',
    long_desc: 'Nous concevons, câblons et configurons l\'infrastructure informatique de vos bureaux. De l\'installation de goulottes et de prises RJ45 au paramétrage des serveurs, commutateurs (switches), routeurs professionnels et points d\'accès Wi-Fi unifiés pour assurer un réseau stable, rapide et sécurisé.',
    image_url: 'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?auto=format&fit=crop&w=800&q=80'
  },
  {
    title: 'Appareils Informatiques',
    icon: 'Laptop',
    short_desc: 'Fourniture d\'ordinateurs professionnels, écrans, onduleurs et accessoires.',
    long_desc: 'Nous fournissons du matériel informatique de marques reconnues (Dell, HP, Lenovo). Ordinateurs portables légers pour la mobilité, stations de travail de bureau puissantes, écrans ergonomiques, disques SSD rapides, onduleurs de protection contre les surtensions et accessoires divers indispensables.',
    image_url: 'https://images.unsplash.com/photo-1588508065123-287b28e013da?auto=format&fit=crop&w=800&q=80'
  },
  {
    title: 'Consultance & Audit IT',
    icon: 'Users',
    short_desc: 'Analyse de votre parc informatique et conseils en transformation numérique.',
    long_desc: 'Optimisez vos processus métiers grâce à nos audits d\'infrastructures. Nous analysons l\'état de vos ordinateurs, serveurs et réseaux pour identifier les failles de sécurité et les goulets d\'étranglement, puis nous vous conseillons les meilleures solutions technologiques adaptées à votre budget.',
    image_url: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=800&q=80'
  },
  {
    title: 'Maintenance & Support',
    icon: 'Wrench',
    short_desc: 'Contrats de maintenance préventive et assistance technique réactive.',
    long_desc: 'Évitez les interruptions d\'activité grâce à notre assistance proactive. Nous proposons des contrats de maintenance récurrents incluant le nettoyage physique des machines, la mise à jour des systèmes, la protection antivirus, le dépannage rapide sur site ou à distance en cas de panne.',
    image_url: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80'
  },
  {
    title: 'Fournitures de Bureau',
    icon: 'Briefcase',
    short_desc: 'Gamme complète de fournitures de bureau professionnelles de haute qualité.',
    long_desc: 'Parce que la technologie ne fait pas tout, nous approvisionnons vos équipes en consommables essentiels : stylos, classeurs, chemises de rangement, enveloppes de toutes tailles, agrafeuses robustes, calculatrices de bureau et papier d\'impression haut de gamme pour votre quotidien.',
    image_url: 'https://images.unsplash.com/photo-1513151233558-d860c5398176?auto=format&fit=crop&w=800&q=80'
  }
];

async function seed() {
  // optionally clear existing to avoid duplicates if ran multiple times
  await supabase.from('services').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  
  for (const s of mockServices) {
    const { error } = await supabase.from('services').insert({
      title: s.title,
      description: s.short_desc + '\n\n' + s.long_desc,
      icon: s.icon,
      image_url: s.image_url
    });
    if (error) console.error('Error inserting', s.title, error);
  }
  console.log('Seeding completed!');
}
seed();
