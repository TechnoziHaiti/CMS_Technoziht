import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { 
  LayoutDashboard, 
  Settings, 
  Briefcase, 
  MessageSquareQuote, 
  LogOut,
  AppWindow,
  Menu,
  X,
  ShieldCheck,
  Shield,
  User
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import AutoLogout from '../AutoLogout';

const SUPABASE_URL = 'https://dkkofpznrlyeigdafctg.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRra29mcHpucmx5ZWlnZGFmY3RnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MzU5NTYzNywiZXhwIjoyMDk5MTcxNjM3fQ.SLCDvhRWeQAX1MPom7glcMz2IhZd3MlGdTywoU2SlCY';
const db = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
});

const ALL_NAV_ITEMS = [
  { name: 'Dashboard', path: '/', icon: LayoutDashboard },
  { name: 'Services', path: '/services', icon: Briefcase },
  { name: 'Témoignages', path: '/testimonials', icon: MessageSquareQuote },
  { name: 'Techniciens', path: '/technicians', icon: User },
  { name: 'Pied de page', path: '/footer', icon: AppWindow },
];

export default function Layout() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [pendingOrdersCount, setPendingOrdersCount] = useState(0);

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  const isSuperAdmin = user?.user_metadata?.role === 'super_admin';
  const permissions: string[] = user?.user_metadata?.permissions || [];

  const visibleNavItems = isSuperAdmin
    ? ALL_NAV_ITEMS
    : ALL_NAV_ITEMS.filter(item => permissions.includes(item.name));

  const settingsItem = { name: 'Paramètres', path: '/settings', icon: Settings };

  // Fetch unread messages count + real-time polling
  const fetchUnreadCount = async () => {
    try {
      const { count } = await db
        .from('contact_messages')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'UNREAD');
      setUnreadCount(count || 0);
    } catch {
      // silently fail
    }
  };

  const fetchPendingOrdersCount = async () => {
    try {
      const { count } = await db
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'PAYMENT_PENDING');
      setPendingOrdersCount(count || 0);
    } catch {
      // silently fail
    }
  };

  useEffect(() => {
    fetchUnreadCount();
    fetchPendingOrdersCount();
    const interval = setInterval(() => {
      fetchUnreadCount();
      fetchPendingOrdersCount();
    }, 30000); // poll every 30s
    return () => clearInterval(interval);
  }, []);

  // Listen for messages page marking items as read
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        fetchUnreadCount();
        fetchPendingOrdersCount();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
      isActive
        ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400'
        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800/50 dark:hover:text-white'
    }`;

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-[#0f172a] text-gray-900 dark:text-gray-100 transition-colors overflow-hidden">
      <AutoLogout />
      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-[260px] bg-white dark:bg-[#1e293b] border-r border-gray-200 dark:border-gray-800 flex flex-col transform transition-transform duration-300 md:relative md:translate-x-0 ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        
        {/* Brand Header */}
        <div className="h-20 flex items-center justify-between px-5 border-b border-gray-200 dark:border-gray-800 shrink-0">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="Technozi Haiti Logo" className="h-10 w-auto object-contain" />
            <div className="flex flex-col select-none">
              <span className="text-[14px] font-semibold tracking-[1px] leading-tight text-gray-900 dark:text-white font-['Orbitron',sans-serif]">
                Technozi Haiti
              </span>
              <span className="text-[8px] font-medium text-cyan-600 dark:text-cyan-400 tracking-[3px] leading-none uppercase font-sans mt-1">
                Faster and Easier
              </span>
            </div>
          </div>
          <button onClick={() => setIsMobileMenuOpen(false)} className="md:hidden text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 overflow-y-auto">
          <ul className="space-y-0.5 px-3">
            {visibleNavItems.map((item) => (
              <li key={item.path}>
                <NavLink
                  to={item.path}
                  end={item.path === '/'}
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    if (item.name === 'Messages') setTimeout(fetchUnreadCount, 2000);
                    if (item.name === 'Commandes') setTimeout(fetchPendingOrdersCount, 2000);
                  }}
                  className={navLinkClass}
                >
                  <item.icon className="w-4 h-4 mr-3 flex-shrink-0" />
                  <span className="flex-1">{item.name}</span>
                  {/* Unread badge for Messages */}
                  {item.name === 'Messages' && unreadCount > 0 && (
                    <span className="inline-flex items-center justify-center h-5 min-w-[20px] px-1 text-[10px] font-bold bg-red-500 text-white rounded-full ml-auto">
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  )}
                  {/* Pending badge for Orders */}
                  {item.name === 'Commandes' && pendingOrdersCount > 0 && (
                    <span className="inline-flex items-center justify-center h-5 min-w-[20px] px-1 text-[10px] font-bold bg-red-500 text-white rounded-full ml-auto">
                      {pendingOrdersCount > 99 ? '99+' : pendingOrdersCount}
                    </span>
                  )}
                </NavLink>
              </li>
            ))}
          </ul>

          {/* Separator + Settings */}
          <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800 px-3">
            <NavLink
              to={settingsItem.path}
              onClick={() => setIsMobileMenuOpen(false)}
              className={navLinkClass}
            >
              <settingsItem.icon className="w-4 h-4 mr-3 flex-shrink-0" />
              {settingsItem.name}
            </NavLink>
          </div>
        </nav>

        {/* User Profile & Logout */}
        <div className="p-3 border-t border-gray-200 dark:border-gray-800 shrink-0">
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-gray-50 dark:bg-gray-800/50 mb-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${isSuperAdmin ? 'bg-gradient-to-br from-amber-400 to-orange-500 text-white' : 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-400'}`}>
              {user?.email?.[0].toUpperCase() || 'A'}
            </div>
            <div className="overflow-hidden flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                {isSuperAdmin ? (
                  <ShieldCheck className="w-3 h-3 text-amber-500 shrink-0" />
                ) : (
                  <Shield className="w-3 h-3 text-blue-500 shrink-0" />
                )}
                <p className="text-xs font-semibold text-gray-900 dark:text-white truncate">
                  {isSuperAdmin ? 'Super Admin' : 'Administrateur'}
                </p>
              </div>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center justify-center w-full px-4 py-2 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 dark:text-red-400 dark:bg-red-500/10 dark:hover:bg-red-500/20 rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Déconnexion
          </button>
        </div>
      </aside>

      {/* Overlay mobile */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-gray-900/50 dark:bg-black/50 z-40 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile Header */}
        <header className="h-16 bg-white dark:bg-[#1e293b] border-b border-gray-200 dark:border-gray-800 flex items-center justify-between px-4 md:hidden z-20">
          <div className="flex items-center gap-3">
            <button onClick={() => setIsMobileMenuOpen(true)} className="p-1.5 -ml-1.5 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white rounded-lg">
              <Menu className="w-6 h-6" />
            </button>
            <img src="/logo.png" alt="Logo" className="h-8 w-auto object-contain" />
          </div>
          <button onClick={handleLogout} className="p-1.5 text-red-500 hover:text-red-700 dark:text-red-400 rounded-lg">
            <LogOut className="w-5 h-5" />
          </button>
        </header>

        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50 dark:bg-[#0f172a] transition-colors p-4 md:p-8">
          <div className="max-w-7xl mx-auto h-full">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
