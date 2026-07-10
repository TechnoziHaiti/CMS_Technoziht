import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Lock, Mail } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    if (isForgotPassword) {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/update-password`,
      });
      if (error) {
        toast.error(error.message);
      } else {
        toast.success('Email de réinitialisation envoyé ! Vérifiez votre boîte de réception.');
        setIsForgotPassword(false);
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        toast.error(error.message);
      } else {
        toast.success('Connexion réussie');
        navigate('/');
      }
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-[400px] w-full space-y-8 bg-white p-8 rounded-xl shadow-sm border border-gray-200">
        <div className="text-center">
          <img src="/logo.png" alt="Technozi Haiti" className="h-12 w-auto mx-auto object-contain mb-6" />
          <h2 className="text-2xl font-semibold tracking-tight text-gray-900">
            {isForgotPassword ? 'Mot de passe oublié' : 'WebTechnozi CMS'}
          </h2>
          <p className="mt-2 text-sm text-gray-500">
            {isForgotPassword 
              ? 'Entrez votre email pour recevoir un lien de réinitialisation.' 
              : 'Connectez-vous pour accéder à l\'administration.'}
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm space-y-4">
            <div>
              <label htmlFor="email-address" className="sr-only">
                Adresse email
              </label>
              <input
                id="email-address"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="appearance-none rounded-lg relative block w-full px-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="Adresse email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            {!isForgotPassword && (
              <div>
                <label htmlFor="password" className="sr-only">
                  Mot de passe
                </label>
                <div className="relative">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    required
                    className="appearance-none rounded-lg relative block w-full px-3 py-3 pr-10 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    placeholder="Mot de passe"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
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
              </div>
            )}
          </div>

          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setIsForgotPassword(!isForgotPassword)}
              className="text-sm font-medium text-gray-600 hover:text-gray-900 underline underline-offset-4 focus:outline-none transition-colors"
            >
              {isForgotPassword ? 'Retour à la connexion' : 'Mot de passe oublié ?'}
            </button>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className={`group relative w-full flex justify-center py-2.5 px-4 text-sm font-medium rounded-lg text-white bg-gray-900 hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-900 transition-colors ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
            >
              {loading 
                ? (isForgotPassword ? 'Envoi...' : 'Connexion...') 
                : (isForgotPassword ? 'Envoyer le lien' : 'Se connecter')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
