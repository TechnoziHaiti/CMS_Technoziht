import { useState, useEffect } from 'react';
import { supabaseAdmin } from '../lib/supabase';
import { Briefcase, FolderGit2, Loader2, ArrowRight, Package, MessageSquareQuote, Users, User, TrendingUp } from 'lucide-react';
import { Link } from 'react-router-dom';
import { 
  XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, 
  BarChart, Bar, Cell 
} from 'recharts';

export default function Dashboard() {
  const [stats, setStats] = useState({
    services: 0,
    projects: 0,
    products: 0,
    testimonials: 0,
    users: 0,
    technicians: 0,
    ordersTotal: 0
  });
  
  const [ordersChartData, setOrdersChartData] = useState<any[]>([]);
  const [rawOrders, setRawOrders] = useState<any[]>([]);
  const [timeFilter, setTimeFilter] = useState('30D');
  const [topProductsData, setTopProductsData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        const [servicesRes, projectsRes, productsRes, testimonialsRes, techniciansRes, ordersRes] = await Promise.all([
          supabaseAdmin.from('services').select('id', { count: 'exact' }),
          supabaseAdmin.from('projects').select('id', { count: 'exact' }),
          supabaseAdmin.from('products').select('id', { count: 'exact' }),
          supabaseAdmin.from('testimonials').select('id', { count: 'exact' }),
          supabaseAdmin.from('technicians').select('id', { count: 'exact' }).eq('is_deleted', false),
          supabaseAdmin.from('orders').select('created_at, total_amount, order_items(quantity, products(name))')
        ]);

        let usersCount = 1;
        if (supabaseAdmin) {
          try {
            const { data } = await supabaseAdmin.auth.admin.listUsers();
            if (data?.users) {
              usersCount = data.users.length;
            }
          } catch (e) {
            console.error('Error fetching users:', e);
          }
        }

        const ordersData = ordersRes.data || [];
        setRawOrders(ordersData);
        
        // Data processing for top products
        const productMap: Record<string, number> = {};

        ordersData.forEach((order: any) => {
          if (order.order_items) {
             order.order_items.forEach((item: any) => {
               const productName = item.products?.name || 'Produit Inconnu';
               if (!productMap[productName]) productMap[productName] = 0;
               productMap[productName] += item.quantity;
             });
          }
        });

        const topProducts = Object.keys(productMap)
          .map(name => ({ name, quantite: productMap[name] }))
          .sort((a, b) => b.quantite - a.quantite)
          .slice(0, 5);

        setTopProductsData(topProducts);

        setStats({
          services: servicesRes.count || 0,
          projects: projectsRes.count || 0,
          products: productsRes.count || 0,
          testimonials: testimonialsRes.count || 0,
          users: usersCount,
          technicians: techniciansRes.count || 0,
          ordersTotal: ordersData.length
        });
      } catch (error) {
        console.error('Error fetching stats:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchStats();
  }, []);

  useEffect(() => {
    if (!rawOrders.length) {
      setOrdersChartData([]);
      return;
    }

    const dateMap: Record<string, { count: number }> = {};
    const now = new Date();
    
    let filteredOrders = rawOrders;

    if (timeFilter === '7D') {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - 7);
      filteredOrders = rawOrders.filter(o => new Date(o.created_at) >= cutoff);
    } else if (timeFilter === '30D') {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - 30);
      filteredOrders = rawOrders.filter(o => new Date(o.created_at) >= cutoff);
    } else if (timeFilter === 'THIS_YEAR') {
      const currentYear = now.getFullYear();
      filteredOrders = rawOrders.filter(o => new Date(o.created_at).getFullYear() === currentYear);
    }

    filteredOrders.forEach((order: any) => {
      const d = new Date(order.created_at);
      let key = '';
      
      if (timeFilter === '7D' || timeFilter === '30D') {
        key = d.toISOString().split('T')[0]; // YYYY-MM-DD
      } else if (timeFilter === 'THIS_YEAR') {
        key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; // YYYY-MM
      } else if (timeFilter === 'ALL_TIME') {
        key = `${d.getFullYear()}`; // YYYY
      }

      if (!dateMap[key]) dateMap[key] = { count: 0 };
      dateMap[key].count += 1;
    });

    const sortedKeys = Object.keys(dateMap).sort();
    
    const formattedData = sortedKeys.map(key => {
      let label = key;
      if (timeFilter === '7D' || timeFilter === '30D') {
        const d = new Date(key);
        label = d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
      } else if (timeFilter === 'THIS_YEAR') {
        const [year, month] = key.split('-');
        const d = new Date(parseInt(year), parseInt(month) - 1, 1);
        label = d.toLocaleDateString('fr-FR', { month: 'short' });
      } else if (timeFilter === 'ALL_TIME') {
        label = key;
      }
      return {
        date: label,
        commandes: dateMap[key].count
      };
    });

    setOrdersChartData(formattedData);
  }, [rawOrders, timeFilter]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const cards = [
    { name: 'Commandes', count: stats.ordersTotal, icon: TrendingUp, color: 'text-cyan-600', bg: 'bg-cyan-100 dark:bg-cyan-900/30', link: '/orders' },
    { name: 'Produits', count: stats.products, icon: Package, color: 'text-emerald-600', bg: 'bg-emerald-100 dark:bg-emerald-900/30', link: '/products' },
    { name: 'Techniciens', count: stats.technicians, icon: User, color: 'text-orange-500', bg: 'bg-orange-100 dark:bg-orange-900/30', link: '/technicians' },
    { name: 'Réalisations', count: stats.projects, icon: FolderGit2, color: 'text-indigo-600', bg: 'bg-indigo-100 dark:bg-indigo-900/30', link: '/projects' },
    { name: 'Services', count: stats.services, icon: Briefcase, color: 'text-blue-600', bg: 'bg-blue-100 dark:bg-blue-900/30', link: '/services' },
    { name: 'Témoignages', count: stats.testimonials, icon: MessageSquareQuote, color: 'text-amber-500', bg: 'bg-amber-100 dark:bg-amber-900/30', link: '/testimonials' },
    { name: 'Comptes Admin', count: stats.users, icon: Users, color: 'text-purple-600', bg: 'bg-purple-100 dark:bg-purple-900/30', link: '/settings' },
  ];

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Tableau de bord</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Vue d'ensemble de vos statistiques et données d'activité.</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
        {cards.map((card) => (
          <div key={card.name} className="bg-white dark:bg-[#1e293b] overflow-hidden shadow-sm rounded-xl border border-gray-100 dark:border-gray-800 hover:shadow-md transition-shadow flex flex-col">
            <div className="p-3 sm:p-5 flex-1">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div>
                    <card.icon className={`h-6 w-6 sm:h-8 sm:w-8 ${card.color}`} aria-hidden="true" />
                  </div>
                </div>
                <div className="ml-3 sm:ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-[11px] sm:text-sm font-medium text-gray-500 dark:text-gray-400 truncate">{card.name}</dt>
                    <dd>
                      <div className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-white">{card.count}</div>
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 dark:bg-gray-800/50 px-3 py-2 sm:px-5 sm:py-3 border-t border-gray-100 dark:border-gray-800">
              <div className="text-[11px] sm:text-sm">
                <Link to={card.link} className="font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 flex items-center">
                  Gérer <ArrowRight className="ml-1 w-3 h-3 sm:w-4 sm:h-4" />
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Ligne : Commandes dans le temps */}
        <div className="bg-white dark:bg-[#1e293b] rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Évolution des commandes</h2>
            <select
              value={timeFilter}
              onChange={(e) => setTimeFilter(e.target.value)}
              className="text-sm border border-gray-300 dark:border-gray-700 rounded-md px-3 py-1.5 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
            >
              <option value="7D">7 derniers jours</option>
              <option value="30D">30 derniers jours</option>
              <option value="THIS_YEAR">Cette année</option>
              <option value="ALL_TIME">Historique</option>
            </select>
          </div>
          <div className="h-[300px] w-full">
            {ordersChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={ordersChartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6b7280' }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6b7280' }} />
                  <RechartsTooltip 
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    cursor={{ fill: '#f3f4f6' }}
                  />
                  <Bar 
                    dataKey="commandes" 
                    name="Commandes"
                    fill="#0891b2" 
                    radius={[4, 4, 0, 0]}
                    barSize={32}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-500 dark:text-gray-400">
                Pas assez de données pour afficher le graphique
              </div>
            )}
          </div>
        </div>

        {/* Barres : Top 5 Produits */}
        <div className="bg-white dark:bg-[#1e293b] rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 p-6">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-6">Meilleures ventes (Top 5)</h2>
          <div className="h-[300px] w-full">
            {topProductsData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topProductsData} layout="vertical" margin={{ top: 5, right: 30, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#e5e7eb" />
                  <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6b7280' }} />
                  <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#374151', fontWeight: 500 }} width={140} />
                  <RechartsTooltip 
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    cursor={{ fill: '#f3f4f6' }}
                  />
                  <Bar dataKey="quantite" name="Unités vendues" radius={[0, 4, 4, 0]} barSize={32}>
                    {topProductsData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-500 dark:text-gray-400">
                Aucune vente enregistrée pour le moment
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
