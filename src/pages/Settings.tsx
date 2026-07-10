import { useState, useEffect } from 'react';
import { supabase, supabaseAdmin } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import toast from 'react-hot-toast';
import { Loader2, Trash2, AlertCircle } from 'lucide-react';
import { useForm } from 'react-hook-form';

type UserData = {
  id: string;
  email: string;
  created_at: string;
};

export default function Settings() {
  const { user } = useAuth();
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [creatingUser, setCreatingUser] = useState(false);
  
  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm();

  const pwdValue = watch('password', '');
  
  const getPasswordStrength = (p: string) => {
    let score = 0;
    if (p.length >= 6) score += 20;
    if (/[A-Z]/.test(p)) score += 20;
    if (/[a-z]/.test(p)) score += 20;
    if (/[0-9]/.test(p)) score += 20;
    if (/[^a-zA-Z0-9]/.test(p)) score += 20;
    
    if (score === 0) return { color: 'bg-gray-200 dark:bg-white/10', w: '0%', label: '' };
    if (score <= 40) return { color: 'bg-red-500', w: `${score}%`, label: 'Faible' };
    if (score <= 80) return { color: 'bg-yellow-500', w: `${score}%`, label: 'Moyen' };
    return { color: 'bg-emerald-500', w: '100%', label: 'Robuste' };
  };

  const strength = getPasswordStrength(pwdValue);

  const fetchUsers = async () => {
    if (!supabaseAdmin) {
      toast.error('Clé administrateur manquante. Gestion des utilisateurs désactivée.');
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const { data, error } = await supabaseAdmin.auth.admin.listUsers();
      if (error) throw error;
      setUsers(data.users.map(u => ({ id: u.id, email: u.email || '', created_at: u.created_at })));
    } catch (err: any) {
      console.error(err);
      toast.error('Erreur lors du chargement des utilisateurs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
    if (document.documentElement.classList.contains('dark')) {
      setIsDarkMode(true);
    }
  }, []);

  const toggleTheme = () => {
    if (isDarkMode) {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
      setIsDarkMode(false);
    } else {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
      setIsDarkMode(true);
    }
  };

  const onCreateUser = async (data: any) => {
    if (!supabaseAdmin) return;
    
    setCreatingUser(true);
    try {
      const { error } = await supabaseAdmin.auth.admin.createUser({
        email: data.email,
        password: data.password,
        email_confirm: true,
      });

      if (error) throw error;
      
      toast.success('Compte utilisateur créé avec succès !');
      reset();
      fetchUsers();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Erreur lors de la création');
    } finally {
      setCreatingUser(false);
    }
  };

  const deleteUser = async (id: string) => {
    if (id === user?.id) {
      toast.error('Vous ne pouvez pas supprimer votre propre compte.');
      return;
    }
    
    const isConfirmed = window.confirm("Êtes-vous sûr de vouloir supprimer cet utilisateur définitivement ?");
    if (!isConfirmed || !supabaseAdmin) return;
    
    try {
      const { error } = await supabaseAdmin.auth.admin.deleteUser(id);
      if (error) throw error;
      
      toast.success('Utilisateur supprimé');
      fetchUsers();
    } catch (err: any) {
      console.error(err);
      toast.error('Erreur lors de la suppression');
    }
  };

  if (!supabaseAdmin) {
    return (
      <div className="p-8 text-center bg-red-50 text-red-600 rounded-lg border border-red-200 max-w-2xl mx-auto mt-10">
        <AlertCircle className="w-10 h-10 mx-auto mb-4" />
        <h2 className="text-lg font-bold">Accès Administrateur Restreint</h2>
        <p className="mt-2 text-sm">La clé de service n'est pas configurée pour gérer les comptes dans .env.local.</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-8">
      
      <div className="mb-10 border-b border-gray-200 dark:border-white/10 pb-5">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Paramètres</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Gérez votre système, les accès à l'administration et vos préférences.
        </p>
      </div>

      <div className="space-y-12">
        
        {/* Apparence */}
        <section>
          <div className="mb-4">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">Apparence</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">Personnalisez le thème de votre espace de travail.</p>
          </div>
          <div className="bg-white dark:bg-[#021227] rounded-lg border border-gray-200 dark:border-white/10 p-5 flex items-center justify-between shadow-sm">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Mode sombre</span>
            <button
              onClick={toggleTheme}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${isDarkMode ? 'bg-blue-600' : 'bg-gray-300'}`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isDarkMode ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>
        </section>

        {/* Comptes */}
        <section>
          <div className="mb-4">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">Comptes Administrateurs</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">Liste des utilisateurs ayant un accès total au système de gestion.</p>
          </div>
          <div className="bg-white dark:bg-[#021227] rounded-lg border border-gray-200 dark:border-white/10 shadow-sm overflow-hidden">
            {loading ? (
              <div className="flex justify-center p-8">
                <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-white/10">
                  <thead className="bg-gray-50 dark:bg-white/5">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Email</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Créé le</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-white/10">
                    {users.map((u) => (
                      <tr key={u.id} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                          {u.email}
                          {u.id === user?.id && <span className="ml-3 px-2 py-0.5 bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300 text-xs rounded-full font-medium">Vous</span>}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          {new Date(u.created_at).toLocaleDateString('fr-FR')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button
                            onClick={() => deleteUser(u.id)}
                            disabled={u.id === user?.id}
                            className="text-red-500 hover:text-red-700 disabled:opacity-30 disabled:cursor-not-allowed p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                            title="Supprimer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>

        {/* Ajouter un compte */}
        <section>
          <div className="mb-4">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">Créer un administrateur</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">Ajouter un nouveau membre à votre équipe. Ils devront changer ce mot de passe plus tard.</p>
          </div>
          <div className="bg-white dark:bg-[#021227] rounded-lg border border-gray-200 dark:border-white/10 shadow-sm overflow-hidden">
            <form onSubmit={handleSubmit(onCreateUser)}>
              <div className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Adresse email</label>
                    <input
                      type="email"
                      {...register('email', { required: "L'email est requis" })}
                      className="w-full px-3 py-2 bg-white dark:bg-transparent border border-gray-300 dark:border-white/10 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:text-white sm:text-sm outline-none transition-all"
                      placeholder="nom@entreprise.com"
                    />
                    {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email.message as string}</p>}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Mot de passe provisoire</label>
                    <input
                      type="password"
                      {...register('password', { 
                        required: "Le mot de passe est requis", 
                        minLength: { value: 6, message: "Minimum 6 caractères" },
                        pattern: {
                          value: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^a-zA-Z0-9]).{6,}$/,
                          message: "Au moins 1 majuscule, 1 minuscule, 1 chiffre et 1 caractère spécial requis."
                        }
                      })}
                      className="w-full px-3 py-2 bg-white dark:bg-transparent border border-gray-300 dark:border-white/10 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:text-white sm:text-sm outline-none transition-all"
                      placeholder="********"
                    />
                    
                    {pwdValue.length > 0 && (
                      <div className="mt-2.5">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-xs text-gray-500 dark:text-gray-400">Force du mot de passe</span>
                          <span className={`text-xs font-medium ${strength.color.replace('bg-', 'text-')}`}>{strength.label}</span>
                        </div>
                        <div className="w-full h-1 bg-gray-200 dark:bg-white/10 rounded-full overflow-hidden">
                          <div className={`h-full transition-all duration-300 ${strength.color}`} style={{ width: strength.w }}></div>
                        </div>
                      </div>
                    )}
                    
                    {errors.password && <p className="mt-1 text-xs text-red-500 leading-tight">{errors.password.message as string}</p>}
                  </div>
                </div>
              </div>
              <div className="px-6 py-4 bg-gray-50 dark:bg-white/5 border-t border-gray-200 dark:border-white/10 flex justify-end">
                <button
                  type="submit"
                  disabled={creatingUser}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-sm font-medium rounded-md hover:bg-gray-800 dark:hover:bg-gray-100 focus:ring-2 focus:ring-offset-2 focus:ring-gray-900 dark:focus:ring-white transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {creatingUser ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  Créer le compte
                </button>
              </div>
            </form>
          </div>
        </section>

      </div>
    </div>
  );
}
