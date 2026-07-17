import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import { Loader2, Save, Phone, Globe, Mail } from 'lucide-react';

const FacebookIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z"/>
  </svg>
);

const InstagramIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.051.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z"/>
  </svg>
);

const LinkedinIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
  </svg>
);

// Custom TikTok icon since Lucide doesn't have it built-in by default in all versions
const TikTokIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
  </svg>
);

type SettingsData = {
  id: string;
  phone: string;
  email: string;
  social_links: {
    facebook?: string;
    instagram?: string;
    linkedin?: string;
    tiktok?: string;
  };
};

export default function FooterContacts() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const { register, handleSubmit, reset } = useForm<SettingsData>();

  useEffect(() => {
    async function fetchSettings() {
      try {
        const { data, error } = await supabase
          .from('settings')
          .select('id, phone, email, social_links')
          .limit(1)
          .single();

        if (error && error.code !== 'PGRST116') {
          throw error;
        }

        if (data) {
          // Pre-fill fields with existing data
          reset(data);
        } else {
          // Pre-fill with defaults from the live site if DB is empty
          reset({
            phone: '+509 37 03 0009\n+509 37 03 0004',
            email: 'sales@technozi-ht.com',
            social_links: {
              instagram: 'https://instagram.com/Technozi_Haiti_LLC',
              tiktok: 'https://www.tiktok.com/@technozi.haiti?_r=1&_t=ZS-97ptroYVmJE',
              facebook: '',
              linkedin: ''
            }
          });
        }
      } catch (error: any) {
        toast.error('Erreur lors du chargement des paramètres');
        console.error(error);
      } finally {
        setLoading(false);
      }
    }

    fetchSettings();
  }, [reset]);

  const onSubmit = async (data: SettingsData) => {
    const isConfirmed = window.confirm("Êtes-vous sûr de vouloir enregistrer ces modifications ? Elles seront instantanément mises à jour sur le site web.");
    if (!isConfirmed) return;
    
    setSaving(true);
    
    try {
      const { id, ...updateData } = data;
      
      let error;
      if (id) {
        const res = await supabase.from('settings').update(updateData).eq('id', id);
        error = res.error;
      } else {
        const res = await supabase.from('settings').insert([updateData]);
        error = res.error;
      }

      if (error) throw error;
      toast.success('Vos modifications ont été publiées sur le site !');
    } catch (error: any) {
      toast.error('Erreur lors de la sauvegarde');
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-10 h-10 animate-spin text-primary-500" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-10">
      
      {/* Header Section */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Pied de Page & Contacts</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          Gérez facilement les informations qui s'affichent dans le footer de votre site web. 
          Les modifications effectuées ici sont appliquées instantanément pour vos visiteurs.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        
        {/* Telephone Card */}
        <div className="bg-white rounded-2xl p-8 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3 mb-6">
            <div className="text-gray-900">
              <Phone className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Numéros de téléphone</h2>
              <p className="text-sm text-gray-500">Affichés dans le bouton d'appel et le footer</p>
            </div>
          </div>
          
          <div className="relative">
            <div className="absolute top-3 left-4 text-gray-400">
              <Phone className="w-5 h-5" />
            </div>
            <textarea
              {...register('phone')}
              rows={2}
              placeholder="+509 37 03 0000"
              className="block w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl shadow-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 sm:text-sm font-medium text-gray-700 transition-all"
            />
            <p className="mt-2 text-xs text-gray-400">Pour ajouter plusieurs numéros, appuyez sur Entrée pour les séparer sur plusieurs lignes.</p>
          </div>
        </div>

        {/* Email Card */}
        <div className="bg-white rounded-2xl p-8 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3 mb-6">
            <div className="text-gray-900">
              <Mail className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Adresse Email</h2>
              <p className="text-sm text-gray-500">Affichée dans le footer (cliquable pour envoyer un mail)</p>
            </div>
          </div>
          
          <div className="relative">
            <div className="absolute top-3 left-4 text-gray-400">
              <Mail className="w-5 h-5" />
            </div>
            <input
              type="email"
              {...register('email')}
              placeholder="contact@votre-entreprise.com"
              className="block w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl shadow-sm focus:ring-2 focus:ring-rose-500 focus:border-rose-500 sm:text-sm font-medium text-gray-700 transition-all"
            />
          </div>
        </div>

        {/* Social Links Card */}
        <div className="bg-white rounded-2xl p-8 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3 mb-8">
            <div className="text-gray-900">
              <Globe className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Réseaux Sociaux</h2>
              <p className="text-sm text-gray-500">Les liens vers vos différentes pages</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Instagram */}
            <div className="relative group">
              <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                Instagram
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-pink-500 group-focus-within:text-pink-600 transition-colors">
                  <InstagramIcon className="w-5 h-5" />
                </div>
                <input 
                  type="url" 
                  placeholder="https://instagram.com/..." 
                  {...register('social_links.instagram')} 
                  className="block w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl bg-gray-50/50 shadow-sm focus:bg-white focus:ring-2 focus:ring-pink-500 focus:border-pink-500 sm:text-sm text-gray-700 transition-all" 
                />
              </div>
            </div>

            {/* TikTok */}
            <div className="relative group">
              <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                TikTok
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-900 transition-colors">
                  <TikTokIcon className="w-5 h-5" />
                </div>
                <input 
                  type="url" 
                  placeholder="https://tiktok.com/..." 
                  {...register('social_links.tiktok')} 
                  className="block w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl bg-gray-50/50 shadow-sm focus:bg-white focus:ring-2 focus:ring-gray-900 focus:border-gray-900 sm:text-sm text-gray-700 transition-all" 
                />
              </div>
            </div>

            {/* Facebook */}
            <div className="relative group">
              <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                Facebook
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-blue-600 transition-colors">
                  <FacebookIcon className="w-5 h-5" />
                </div>
                <input 
                  type="url" 
                  placeholder="https://facebook.com/..." 
                  {...register('social_links.facebook')} 
                  className="block w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl bg-gray-50/50 shadow-sm focus:bg-white focus:ring-2 focus:ring-blue-600 focus:border-blue-600 sm:text-sm text-gray-700 transition-all" 
                />
              </div>
            </div>

            {/* LinkedIn */}
            <div className="relative group">
              <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                LinkedIn
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-blue-700 transition-colors">
                  <LinkedinIcon className="w-5 h-5" />
                </div>
                <input 
                  type="url" 
                  placeholder="https://linkedin.com/..." 
                  {...register('social_links.linkedin')} 
                  className="block w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl bg-gray-50/50 shadow-sm focus:bg-white focus:ring-2 focus:ring-blue-700 focus:border-blue-700 sm:text-sm text-gray-700 transition-all" 
                />
              </div>
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end pt-4">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:ring-4 focus:ring-blue-500/20 active:scale-95 transition-all disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {saving ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Save className="w-5 h-5" />
            )}
            Appliquer au site web
          </button>
        </div>
      </form>

    </div>
  );
}
