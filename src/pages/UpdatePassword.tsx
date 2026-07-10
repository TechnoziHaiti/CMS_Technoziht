import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { KeyRound, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function UpdatePassword() {
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const getPasswordStrength = (p: string) => {
    let score = 0;
    if (p.length >= 6) score += 20;
    if (/[A-Z]/.test(p)) score += 20;
    if (/[a-z]/.test(p)) score += 20;
    if (/[0-9]/.test(p)) score += 20;
    if (/[^a-zA-Z0-9]/.test(p)) score += 20;
    
    if (score === 0) return { color: 'bg-gray-200', w: '0%', label: '' };
    if (score <= 40) return { color: 'bg-red-500', w: `${score}%`, label: 'Faible' };
    if (score <= 80) return { color: 'bg-yellow-500', w: `${score}%`, label: 'Moyen' };
    return { color: 'bg-emerald-500', w: '100%', label: 'Robuste' };
  };

  const strength = getPasswordStrength(newPassword);

  useEffect(() => {
    // Vérifier s'il y a une session active. 
    // Supabase va automatiquement créer une session via le token de l'url (#access_token)
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Lien de réinitialisation invalide ou expiré.');
        navigate('/login');
      }
    };
    checkSession();
  }, [navigate]);

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (strength.label !== 'Robuste') {
      toast.error('Veuillez entrer un mot de passe robuste.');
      return;
    }
    
    setLoading(true);
    
    const { error } = await supabase.auth.updateUser({
      password: newPassword
    });

    if (error) {
      toast.error(error.message);
      setLoading(false);
    } else {
      toast.success('Mot de passe mis à jour avec succès');
      navigate('/');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-[400px] w-full space-y-8 bg-white p-8 rounded-xl shadow-sm border border-gray-200">
        <div className="text-center">
          <img src="/logo.png" alt="Technozi Haiti" className="h-12 w-auto mx-auto object-contain mb-6" />
          <h2 className="text-2xl font-semibold tracking-tight text-gray-900">
            Nouveau mot de passe
          </h2>
          <p className="mt-2 text-sm text-gray-500">
            Veuillez définir un mot de passe robuste.
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleUpdatePassword}>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              Nouveau mot de passe
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                required
                className="appearance-none rounded-lg relative block w-full px-3 py-3 pr-10 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="Ex: Secur1t€!"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center focus:outline-none"
              >
                <div className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${showPassword ? 'bg-gray-800' : 'bg-gray-200'}`}>
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${showPassword ? 'translate-x-6' : 'translate-x-1'}`} />
                </div>
              </button>
            </div>
            
            {newPassword.length > 0 && (
              <div className="mt-2">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs text-gray-500">Robustesse</span>
                  <span className={`text-xs font-bold ${strength.color.replace('bg-', 'text-')}`}>{strength.label}</span>
                </div>
                <div className="w-full h-1 bg-gray-200 rounded-full overflow-hidden">
                  <div className={`h-full transition-all duration-300 ${strength.color}`} style={{ width: strength.w }}></div>
                </div>
              </div>
            )}
          </div>

          <div>
            <button
              type="submit"
              disabled={loading || newPassword.length === 0}
              className="w-full flex justify-center items-center gap-2 py-2.5 px-4 text-sm font-medium rounded-lg text-white bg-gray-900 hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-900 transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Enregistrer
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
