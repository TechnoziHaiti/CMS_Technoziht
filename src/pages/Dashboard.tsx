import { useState, useEffect } from 'react';
import { supabase, supabaseAdmin } from '../lib/supabase';
import { Briefcase, FolderGit2, Mail, Loader2, ArrowRight, Package, MessageSquareQuote, Users } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Dashboard() {
  const [stats, setStats] = useState({
    services: 0,
    projects: 0,
    products: 0,
    testimonials: 0,
    users: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        const [servicesRes, projectsRes, productsRes, testimonialsRes] = await Promise.all([
          supabase.from('services').select('id', { count: 'exact' }),
          supabase.from('projects').select('id', { count: 'exact' }),
          supabase.from('products').select('id', { count: 'exact' }),
          supabase.from('testimonials').select('id', { count: 'exact' })
        ]);

        let usersCount = 1;
        if (supabaseAdmin) {
          try {
            const { data, error } = await supabaseAdmin.auth.admin.listUsers();
            if (data?.users) {
              usersCount = data.users.length;
            }
          } catch (e) {
            console.error('Error fetching users:', e);
          }
        }

        setStats({
          services: servicesRes.count || 0,
          projects: projectsRes.count || 0,
          products: productsRes.count || 0,
          testimonials: testimonialsRes.count || 0,
          users: usersCount
        });
      } catch (error) {
        console.error('Error fetching stats:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    );
  }

  const cards = [
    { name: 'Services', count: stats.services, icon: Briefcase, color: 'text-blue-600', link: '/services' },
    { name: 'Réalisations', count: stats.projects, icon: FolderGit2, color: 'text-indigo-600', link: '/projects' },
    { name: 'Produits', count: stats.products, icon: Package, color: 'text-emerald-600', link: '/products' },
    { name: 'Témoignages', count: stats.testimonials, icon: MessageSquareQuote, color: 'text-amber-500', link: '/testimonials' },
    { name: 'Comptes Admin', count: stats.users, icon: Users, color: 'text-purple-600', link: '/settings' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Tableau de bord</h1>
        <p className="mt-1 text-sm text-gray-500">Bienvenue sur votre espace d'administration. Voici un aperçu de votre contenu.</p>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => (
          <div key={card.name} className="bg-white overflow-hidden shadow rounded-xl border border-gray-100 hover:shadow-md transition-shadow">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className={card.color}>
                    <card.icon className="h-7 w-7" aria-hidden="true" />
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">{card.name}</dt>
                    <dd>
                      <div className="text-2xl font-bold text-gray-900">{card.count}</div>
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 px-5 py-3">
              <div className="text-sm">
                <Link to={card.link} className="font-medium text-gray-700 hover:text-gray-900 flex items-center">
                  Gérer {card.name.toLowerCase()} <ArrowRight className="ml-1 w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
