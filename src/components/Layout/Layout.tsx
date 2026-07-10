import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { 
  LayoutDashboard, 
  Home,
  Settings, 
  Briefcase, 
  FolderGit2, 
  Package,
  MessageSquareQuote, 
  Mail, 
  LogOut,
  AppWindow,
  Menu,
  X
} from 'lucide-react';
import { useState } from 'react';
import { Toaster } from 'react-hot-toast';

export default function Layout() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  const navItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Accueil', path: '/home', icon: Home },
    { name: 'Services', path: '/services', icon: Briefcase },
    { name: 'Projets', path: '/projects', icon: FolderGit2 },
    { name: 'Produits', path: '/products', icon: Package },
    { name: 'Témoignages', path: '/testimonials', icon: MessageSquareQuote },
    { name: 'Messages', path: '/messages', icon: Mail },
    { name: 'Pied de page', path: '/footer', icon: AppWindow },
    { name: 'Paramètres', path: '/settings', icon: Settings },
  ];

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-[#0f172a] transition-colors overflow-hidden">
      {/* Sidebar - Clean Pro Theme */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-[280px] bg-white dark:bg-[#1e293b] border-r border-gray-200 dark:border-gray-800 flex flex-col transform transition-transform duration-300 md:relative md:translate-x-0 ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        {/* Brand Header */}
        <div className="h-20 flex items-center justify-between px-6 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center gap-3">
            <img 
              src="/logo.png" 
              alt="Technozi Haiti Logo" 
              className="h-10 w-auto object-contain" 
            />
            <div className="flex flex-col select-none">
              <span className="text-[15px] font-semibold tracking-[1px] leading-tight text-gray-900 dark:text-white font-['Orbitron',sans-serif]">
                Technozi Haiti
              </span>
              <span className="text-[8px] font-medium text-cyan-600 dark:text-cyan-400 tracking-[3px] leading-none uppercase font-sans mt-1">
                Faster and Easier
              </span>
            </div>
          </div>
          {/* Close menu button on mobile */}
          <button onClick={() => setIsMobileMenuOpen(false)} className="md:hidden text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-6 overflow-y-auto custom-scrollbar relative z-10">
          <ul className="space-y-1.5 px-4">
            {navItems.map((item) => (
              <li key={item.path}>
                <NavLink
                  to={item.path}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800/50 dark:hover:text-white'
                    }`
                  }
                >
                  <item.icon className={`w-5 h-5 mr-3.5 flex-shrink-0 transition-colors duration-300`} />
                  {item.name}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        {/* User Profile & Logout */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-[#1e293b]">
          <div className="flex items-center mb-4 px-2">
            <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-400 flex items-center justify-center font-bold text-sm mr-3">
              {user?.email?.[0].toUpperCase() || 'A'}
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">Administrateur</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user?.email}</p>
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

      {/* Overlay for mobile */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-gray-900/50 dark:bg-black/50 z-40 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        
        {/* Mobile Header (Dark Theme) */}
        <header className="h-16 bg-white dark:bg-[#1e293b] border-b border-gray-200 dark:border-gray-800 flex items-center justify-between px-4 md:hidden relative z-20">
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
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
      <Toaster position="top-right" />
    </div>
  );
}
