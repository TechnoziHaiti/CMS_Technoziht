import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Briefcase, FolderGit2, Mail, Loader2, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Dashboard() {
  const [stats, setStats] = useState({
    services: 0,
    projects: 0,
    unreadMessages: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        const [servicesRes, projectsRes, messagesRes] = await Promise.all([
          supabase.from('services').select('id', { count: 'exact' }),
          supabase.from('projects').select('id', { count: 'exact' }),
          supabase.from('messages').select('id', { count: 'exact' }).eq('status', false)
        ]);

        setStats({
          services: servicesRes.count || 0,
          projects: projectsRes.count || 0,
          unreadMessages: messagesRes.count || 0,
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
    { name: 'Services', count: stats.services, icon: Briefcase, color: 'text-gray-700 bg-gray-100', link: '/services' },
    { name: 'Projets', count: stats.projects, icon: FolderGit2, color: 'text-gray-700 bg-gray-100', link: '/projects' },
    { name: 'Messages non lus', count: stats.unreadMessages, icon: Mail, color: 'text-gray-700 bg-gray-100', link: '/messages' },
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
                  <div className={`p-1 ${card.color.replace('bg-gray-100', '')}`}>
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
