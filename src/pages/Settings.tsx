import { useState, useEffect } from 'react';
import { supabase, supabaseAdmin } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import toast from 'react-hot-toast';
import {
  Loader2, Trash2, AlertCircle, Pencil, X, Shield, ShieldCheck,
  KeyRound, Eye, EyeOff, Check, UserPlus, Moon, Sun,
  LayoutDashboard, Home, Briefcase, FolderGit2, Package,
  ShoppingBag, MessageSquareQuote, AppWindow, Mail, Crown, ChevronDown, ChevronUp
} from 'lucide-react';
import { useForm } from 'react-hook-form';

const ALL_SECTIONS = [
  { key: 'Dashboard',    label: 'Dashboard',    icon: LayoutDashboard },
  { key: 'Accueil',      label: 'Accueil',       icon: Home },
  { key: 'Services',     label: 'Services',      icon: Briefcase },
  { key: 'Réalisations', label: 'Réalisations',  icon: FolderGit2 },
  { key: 'Produits',     label: 'Produits',       icon: Package },
  { key: 'Commandes',    label: 'Commandes',      icon: ShoppingBag },
  { key: 'Témoignages',  label: 'Témoignages',   icon: MessageSquareQuote },
  { key: 'Pied de page', label: 'Pied de page',  icon: AppWindow },
  { key: 'Messages',     label: 'Messages',       icon: Mail },
];

type UserData = {
  id: string;
  email: string;
  created_at: string;
  user_metadata: { role?: string; permissions?: string[] };
};

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-[0.1em]">
      {children}
    </h2>
  );
}

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white dark:bg-[#111827] border border-gray-200 dark:border-gray-800 rounded-lg ${className}`}>
      {children}
    </div>
  );
}

function SuperAdminBadge() {
  return (
    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-500/30 rounded">
      <ShieldCheck className="w-2.5 h-2.5" />
      Super Admin
    </span>
  );
}

function AdminBadge() {
  return (
    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-500/30 rounded">
      <Shield className="w-2.5 h-2.5" />
      Admin
    </span>
  );
}

export default function SettingsPage() {
  const { user } = useAuth();
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [creatingUser, setCreatingUser] = useState(false);
  const [newUserPermissions, setNewUserPermissions] = useState<string[]>([]);
  const [showPermissionsPicker, setShowPermissionsPicker] = useState(false);

  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [showFormPwd, setShowFormPwd] = useState(false);
  const [savingPwd, setSavingPwd] = useState(false);

  const [permissionsTarget, setPermissionsTarget] = useState<UserData | null>(null);
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [savingPermissions, setSavingPermissions] = useState(false);
  const [promotingId, setPromotingId] = useState<string | null>(null);

  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm();
  const pwdValue = watch('password', '');

  const getStrength = (p: string) => {
    let s = 0;
    if (p.length >= 6) s += 20;
    if (/[A-Z]/.test(p)) s += 20;
    if (/[a-z]/.test(p)) s += 20;
    if (/[0-9]/.test(p)) s += 20;
    if (/[^a-zA-Z0-9]/.test(p)) s += 20;
    if (s === 0) return { color: 'bg-gray-200 dark:bg-gray-700', w: '0%', label: '', textColor: '' };
    if (s <= 40) return { color: 'bg-red-500', w: `${s}%`, label: 'Faible', textColor: 'text-red-500' };
    if (s <= 80) return { color: 'bg-amber-400', w: `${s}%`, label: 'Moyen', textColor: 'text-amber-500' };
    return { color: 'bg-emerald-500', w: '100%', label: 'Robuste', textColor: 'text-emerald-500' };
  };

  const formStrength = getStrength(pwdValue);
  const myPwdStrength = getStrength(newPassword);
  const isSuperAdmin = user?.user_metadata?.role === 'super_admin';

  const fetchUsers = async () => {
    if (!supabaseAdmin) { toast.error('Clé administrateur manquante.'); setLoading(false); return; }
    try {
      setLoading(true);
      const { data, error } = await supabaseAdmin.auth.admin.listUsers();
      if (error) throw error;
      setUsers(data.users.map(u => ({
        id: u.id, email: u.email || '', created_at: u.created_at,
        user_metadata: u.user_metadata || {},
      })));
    } catch { toast.error('Erreur lors du chargement'); } finally { setLoading(false); }
  };

  useEffect(() => {
    fetchUsers();
    setIsDarkMode(document.documentElement.classList.contains('dark'));
  }, []);

  const toggleTheme = () => {
    const next = !isDarkMode;
    setIsDarkMode(next);
    document.documentElement.classList.toggle('dark', next);
    localStorage.setItem('theme', next ? 'dark' : 'light');
  };

  const toggleNewPerm = (key: string) =>
    setNewUserPermissions(p => p.includes(key) ? p.filter(x => x !== key) : [...p, key]);

  const onCreateUser = async (data: any) => {
    if (!supabaseAdmin) return;
    setCreatingUser(true);
    try {
      const { error } = await supabaseAdmin.auth.admin.createUser({
        email: data.email, password: data.password, email_confirm: true,
        user_metadata: {
          role: 'admin',
          permissions: newUserPermissions,
          first_name: data.firstName,
          last_name: data.lastName,
          full_name: `${data.firstName} ${data.lastName}`,
        },
      });
      if (error) throw error;
      toast.success('Compte créé avec succès !');
      reset();
      setNewUserPermissions([]);
      setShowPermissionsPicker(false);
      fetchUsers();
    } catch (err: any) {
      toast.error(err.message || 'Erreur lors de la création');
    } finally { setCreatingUser(false); }
  };

  const deleteUser = async (id: string) => {
    if (id === user?.id) { toast.error('Impossible de supprimer votre propre compte.'); return; }
    if (!window.confirm('Supprimer cet utilisateur définitivement ?')) return;
    if (!supabaseAdmin) return;
    try {
      const { error } = await supabaseAdmin.auth.admin.deleteUser(id);
      if (error) throw error;
      toast.success('Utilisateur supprimé');
      fetchUsers();
    } catch { toast.error('Erreur lors de la suppression'); }
  };

  const promoteToSuperAdmin = async (u: UserData) => {
    if (!supabaseAdmin) return;
    if (!window.confirm(`Promouvoir ${u.email} en Super Admin ? Il aura un accès total au CMS.`)) return;
    setPromotingId(u.id);
    try {
      const { error } = await supabaseAdmin.auth.admin.updateUserById(u.id, {
        user_metadata: { ...u.user_metadata, role: 'super_admin', permissions: [] },
      });
      if (error) throw error;
      toast.success(`${u.email} promu Super Admin`);
      fetchUsers();
    } catch { toast.error('Erreur lors de la promotion'); } finally { setPromotingId(null); }
  };

  const handleSavePassword = async () => {
    if (myPwdStrength.label !== 'Robuste') { toast.error('Mot de passe trop faible.'); return; }
    setSavingPwd(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setSavingPwd(false);
    if (error) { toast.error(error.message); } else {
      toast.success('Mot de passe mis à jour');
      setShowPasswordModal(false);
      setNewPassword('');
      setShowPwd(false);
    }
  };

  const openPermissionsModal = (u: UserData) => {
    setPermissionsTarget(u);
    setSelectedPermissions(u.user_metadata?.permissions || []);
  };

  const togglePerm = (key: string) =>
    setSelectedPermissions(p => p.includes(key) ? p.filter(x => x !== key) : [...p, key]);

  const savePermissions = async () => {
    if (!permissionsTarget || !supabaseAdmin) return;
    setSavingPermissions(true);
    try {
      const { error } = await supabaseAdmin.auth.admin.updateUserById(permissionsTarget.id, {
        user_metadata: { ...permissionsTarget.user_metadata, permissions: selectedPermissions },
      });
      if (error) throw error;
      toast.success('Accès mis à jour');
      setPermissionsTarget(null);
      fetchUsers();
    } catch { toast.error('Erreur lors de la mise à jour'); } finally { setSavingPermissions(false); }
  };

  if (!supabaseAdmin) {
    return (
      <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-900/10 text-red-600 dark:text-red-400 rounded-lg border border-red-200 dark:border-red-900 max-w-xl mt-8">
        <AlertCircle className="w-5 h-5 shrink-0" />
        <p className="text-sm">Clé de service manquante dans <code className="font-mono bg-red-100 dark:bg-red-900/30 px-1 rounded">.env.local</code>.</p>
      </div>
    );
  }

  const inputClass = "w-full px-3 py-2 text-sm bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-md text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-gray-400 dark:focus:ring-gray-600 focus:border-gray-400 dark:focus:border-gray-600 transition";

  return (
    <div className="max-w-3xl mx-auto py-10 px-4 space-y-10">

      {/* Page Header */}
      <div className="border-b border-gray-200 dark:border-gray-800 pb-6">
        <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Paramètres</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Gérez votre compte, les accès et les préférences du système.
        </p>
      </div>

      {/* ── Profil ── */}
      <div className="space-y-3">
        <SectionTitle>Profil</SectionTitle>
        <Card>
          <div className="p-5 flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-gray-900 dark:bg-gray-100 flex items-center justify-center text-white dark:text-gray-900 font-semibold text-sm select-none">
                {user?.email?.[0].toUpperCase()}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-900 dark:text-white">{user?.email}</span>
                  {isSuperAdmin ? <SuperAdminBadge /> : <AdminBadge />}
                </div>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Compte actif</p>
              </div>
            </div>
            <button
              onClick={() => setShowPasswordModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-md transition-colors"
            >
              <Pencil className="w-3.5 h-3.5" />
              Changer le mot de passe
            </button>
          </div>
        </Card>
      </div>

      {/* ── Apparence ── */}
      <div className="space-y-3">
        <SectionTitle>Apparence</SectionTitle>
        <Card>
          <div className="p-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              {isDarkMode
                ? <Moon className="w-4 h-4 text-gray-400" />
                : <Sun className="w-4 h-4 text-gray-400" />
              }
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">Thème {isDarkMode ? 'sombre' : 'clair'}</p>
                <p className="text-xs text-gray-400 dark:text-gray-500">Basculer entre le mode clair et sombre</p>
              </div>
            </div>
            <button
              onClick={toggleTheme}
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'}`}
            >
              <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${isDarkMode ? 'translate-x-[18px]' : 'translate-x-[3px]'}`} />
            </button>
          </div>
        </Card>
      </div>

      {/* ── Comptes ── */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <SectionTitle>Comptes administrateurs</SectionTitle>
          <span className="text-xs text-gray-400">{users.length} compte{users.length > 1 ? 's' : ''}</span>
        </div>
        <Card>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
            </div>
          ) : (
            <div>
              {users.map((u, i) => {
                const isSelf = u.id === user?.id;
                const uIsSuperAdmin = u.user_metadata?.role === 'super_admin';
                const perms = u.user_metadata?.permissions || [];
                return (
                  <div key={u.id} className={`flex items-center justify-between px-5 py-4 gap-4 ${i > 0 ? 'border-t border-gray-100 dark:border-gray-800' : ''}`}>
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 ${uIsSuperAdmin ? 'bg-amber-100 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'}`}>
                        {u.email[0].toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm text-gray-900 dark:text-white font-medium truncate">{u.email}</span>
                          {isSelf && <span className="text-[10px] font-medium text-gray-400 bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">vous</span>}
                          {uIsSuperAdmin ? <SuperAdminBadge /> : <AdminBadge />}
                        </div>
                        {(u.user_metadata as any)?.full_name && (
                          <p className="text-xs font-medium text-gray-600 dark:text-gray-300 mt-0.5">{(u.user_metadata as any).full_name}</p>
                        )}
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                          Ajouté le {new Date(u.created_at).toLocaleDateString('fr-FR')}
                          {!uIsSuperAdmin && (
                            <span className="ml-2">
                              · {perms.length === 0
                                ? <span className="text-amber-500">aucun accès</span>
                                : <span className="text-gray-400">{perms.length} section{perms.length > 1 ? 's' : ''}</span>
                              }
                            </span>
                          )}
                        </p>
                      </div>
                    </div>

                    {isSuperAdmin && !isSelf && (
                      <div className="flex items-center gap-1 shrink-0">
                        {!uIsSuperAdmin && (
                          <>
                            <button
                              onClick={() => promoteToSuperAdmin(u)}
                              disabled={promotingId === u.id}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-700/50 hover:bg-amber-50 dark:hover:bg-amber-500/10 rounded-md transition-colors"
                            >
                              {promotingId === u.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Crown className="w-3 h-3" />}
                              Promouvoir
                            </button>
                            <button
                              onClick={() => openPermissionsModal(u)}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-md transition-colors"
                            >
                              <Shield className="w-3 h-3" />
                              Accès
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => deleteUser(u.id)}
                          disabled={uIsSuperAdmin}
                          className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 disabled:opacity-25 disabled:cursor-not-allowed rounded-md transition-colors"
                          title="Supprimer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>

      {/* ── Créer un compte (Super Admin uniquement) ── */}
      {isSuperAdmin && (
      <div className="space-y-3">
        <SectionTitle>Créer un compte</SectionTitle>
        <Card>
          <form onSubmit={handleSubmit(onCreateUser)} autoComplete="off">
            <div className="p-5 space-y-5">
              {/* Prénom + Nom */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">Prénom</label>
                  <input
                    type="text"
                    {...register('firstName', { required: 'Requis' })}
                    className={inputClass}
                    placeholder="Jean"
                    autoComplete="new-password"
                  />
                  {errors.firstName && <p className="mt-1 text-xs text-red-500">{errors.firstName.message as string}</p>}
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">Nom</label>
                  <input
                    type="text"
                    {...register('lastName', { required: 'Requis' })}
                    className={inputClass}
                    placeholder="Dupont"
                    autoComplete="new-password"
                  />
                  {errors.lastName && <p className="mt-1 text-xs text-red-500">{errors.lastName.message as string}</p>}
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">Adresse email</label>
                <input
                  type="email"
                  {...register('email', { required: "L'email est requis" })}
                  className={inputClass}
                  placeholder="admin@entreprise.com"
                  autoComplete="new-password"
                />
                {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email.message as string}</p>}
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">Mot de passe provisoire</label>
                <div className="relative">
                  <input
                    type={showFormPwd ? 'text' : 'password'}
                    {...register('password', {
                      required: 'Requis',
                      pattern: {
                        value: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^a-zA-Z0-9]).{6,}$/,
                        message: 'Au moins 1 majuscule, 1 chiffre et 1 caractère spécial.'
                      }
                    })}
                    className={`${inputClass} pr-10`}
                    placeholder="••••••••"
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowFormPwd(!showFormPwd)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    {showFormPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {pwdValue.length > 0 && (
                  <div className="mt-2 flex items-center gap-3">
                    <div className="flex-1 h-1 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all duration-300 ${formStrength.color}`} style={{ width: formStrength.w }} />
                    </div>
                    <span className={`text-[11px] font-medium ${formStrength.textColor}`}>{formStrength.label}</span>
                  </div>
                )}
                {errors.password && <p className="mt-1 text-xs text-red-500 leading-relaxed">{errors.password.message as string}</p>}
              </div>

              {/* Sections access */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Sections accessibles</label>
                  <button
                    type="button"
                    onClick={() => setShowPermissionsPicker(!showPermissionsPicker)}
                    className="inline-flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                  >
                    {newUserPermissions.length === 0 ? 'Aucune sélectionnée' : `${newUserPermissions.length} sélectionnée${newUserPermissions.length > 1 ? 's' : ''}`}
                    {showPermissionsPicker ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>
                </div>

                {showPermissionsPicker && (
                  <div className="border border-gray-200 dark:border-gray-700 rounded-md overflow-hidden">
                    {ALL_SECTIONS.map((section, i) => {
                      const isSelected = newUserPermissions.includes(section.key);
                      return (
                        <button
                          key={section.key}
                          type="button"
                          onClick={() => toggleNewPerm(section.key)}
                          className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left transition-colors ${i > 0 ? 'border-t border-gray-100 dark:border-gray-800' : ''} ${isSelected ? 'bg-gray-50 dark:bg-gray-800/60' : 'hover:bg-gray-50 dark:hover:bg-gray-800/40'}`}
                        >
                          <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${isSelected ? 'bg-gray-900 dark:bg-white border-gray-900 dark:border-white' : 'border-gray-300 dark:border-gray-600'}`}>
                            {isSelected && <Check className="w-2.5 h-2.5 text-white dark:text-gray-900" />}
                          </div>
                          <section.icon className="w-4 h-4 text-gray-400 shrink-0" />
                          <span className="text-gray-700 dark:text-gray-300">{section.label}</span>
                        </button>
                      );
                    })}
                  </div>
                )}

                {newUserPermissions.length === 0 && !showPermissionsPicker && (
                  <p className="text-xs text-amber-600 dark:text-amber-500 flex items-center gap-1.5 mt-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    Aucune section — l'utilisateur n'aura accès à rien après connexion.
                  </p>
                )}
              </div>
            </div>

            <div className="px-5 py-3 bg-gray-50 dark:bg-gray-800/30 border-t border-gray-200 dark:border-gray-800 flex items-center justify-between">
              <p className="text-xs text-gray-400">{newUserPermissions.length} section{newUserPermissions.length !== 1 ? 's' : ''} attribuée{newUserPermissions.length !== 1 ? 's' : ''}</p>
              <button
                type="submit"
                disabled={creatingUser}
                className="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-sm font-medium rounded-md hover:bg-gray-700 dark:hover:bg-gray-100 disabled:opacity-50 transition-colors"
              >
                {creatingUser ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                Créer le compte
              </button>
            </div>
          </form>
        </Card>
      </div>
      )}

      {/* ══ Modal : Modifier mot de passe ══ */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-[2px]">
          <div className="bg-white dark:bg-[#111827] w-full max-w-sm rounded-lg shadow-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-2.5">
                <KeyRound className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Nouveau mot de passe</h3>
              </div>
              <button onClick={() => { setShowPasswordModal(false); setNewPassword(''); setShowPwd(false); }} className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">Nouveau mot de passe</label>
                <div className="relative">
                  <input
                    type={showPwd ? 'text' : 'password'}
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    className={`${inputClass} pr-10`}
                    placeholder="Ex: Secur1t€!"
                    autoFocus
                  />
                  <button type="button" onClick={() => setShowPwd(!showPwd)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                    {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {newPassword.length > 0 && (
                  <div className="mt-2 flex items-center gap-3">
                    <div className="flex-1 h-1 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all duration-300 ${myPwdStrength.color}`} style={{ width: myPwdStrength.w }} />
                    </div>
                    <span className={`text-[11px] font-medium ${myPwdStrength.textColor}`}>{myPwdStrength.label}</span>
                  </div>
                )}
              </div>
            </div>
            <div className="px-5 py-3 bg-gray-50 dark:bg-gray-800/30 border-t border-gray-100 dark:border-gray-800 flex justify-end gap-2">
              <button onClick={() => { setShowPasswordModal(false); setNewPassword(''); setShowPwd(false); }} className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors">
                Annuler
              </button>
              <button
                onClick={handleSavePassword}
                disabled={savingPwd || newPassword.length === 0}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-sm font-medium rounded-md hover:bg-gray-700 dark:hover:bg-gray-100 disabled:opacity-50 transition-colors"
              >
                {savingPwd ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                Enregistrer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══ Modal : Gérer les accès ══ */}
      {permissionsTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-[2px]">
          <div className="bg-white dark:bg-[#111827] w-full max-w-md rounded-lg shadow-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
              <div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Gestion des accès</h3>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 truncate max-w-[280px]">{permissionsTarget.email}</p>
              </div>
              <button onClick={() => setPermissionsTarget(null)} className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="overflow-hidden">
              {ALL_SECTIONS.map((section, i) => {
                const isSelected = selectedPermissions.includes(section.key);
                return (
                  <button
                    key={section.key}
                    onClick={() => togglePerm(section.key)}
                    className={`w-full flex items-center gap-3 px-5 py-3 text-sm text-left transition-colors ${i > 0 ? 'border-t border-gray-100 dark:border-gray-800' : ''} ${isSelected ? 'bg-gray-50 dark:bg-gray-800/60' : 'hover:bg-gray-50 dark:hover:bg-gray-800/30'}`}
                  >
                    <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${isSelected ? 'bg-gray-900 dark:bg-white border-gray-900 dark:border-white' : 'border-gray-300 dark:border-gray-600'}`}>
                      {isSelected && <Check className="w-2.5 h-2.5 text-white dark:text-gray-900" />}
                    </div>
                    <section.icon className="w-4 h-4 text-gray-400 shrink-0" />
                    <span className="text-gray-700 dark:text-gray-300">{section.label}</span>
                    {isSelected && <span className="ml-auto text-xs text-gray-400">Accès autorisé</span>}
                  </button>
                );
              })}
            </div>
            <div className="px-5 py-3 bg-gray-50 dark:bg-gray-800/30 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
              <span className="text-xs text-gray-400">{selectedPermissions.length} / {ALL_SECTIONS.length} sections</span>
              <div className="flex gap-2">
                <button onClick={() => setPermissionsTarget(null)} className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors">
                  Annuler
                </button>
                <button
                  onClick={savePermissions}
                  disabled={savingPermissions}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-sm font-medium rounded-md hover:bg-gray-700 dark:hover:bg-gray-100 disabled:opacity-50 transition-colors"
                >
                  {savingPermissions ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  Sauvegarder
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
