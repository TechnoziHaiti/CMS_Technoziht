import { useState, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import { Loader2, Save, Plus, Trash2 } from 'lucide-react';
import MultiImageUpload from '../components/ui/MultiImageUpload';
import ImageUpload from '../components/ui/ImageUpload';

type Partner = {
  name: string;
  logo_url?: string;
};

type HomeData = {
  id: string;
  about_images: string[];
  partners: Partner[];
};

export default function HomeContent() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { register, control, handleSubmit, setValue, watch, reset } = useForm<HomeData>({
    defaultValues: {
      about_images: [],
      partners: []
    }
  });

  const { fields: partnerFields, append: appendPartner, remove: removePartner } = useFieldArray({
    control,
    name: 'partners'
  });

  const aboutImages = watch('about_images');
  const watchPartners = watch('partners');

  useEffect(() => {
    async function fetchHomeData() {
      try {
        const { data, error } = await supabase
          .from('home_page')
          .select('id, about_images, partners')
          .order('updated_at', { ascending: false })
          .limit(1)
          .single();

        if (error && error.code !== 'PGRST116') throw error;
        if (data) {
          reset({
            id: data.id,
            about_images: data.about_images || [],
            partners: data.partners || []
          });
        }
      } catch (error) {
        toast.error('Erreur lors du chargement des données');
        console.error(error);
      } finally {
        setLoading(false);
      }
    }
    fetchHomeData();
  }, [reset]);

  const onSubmit = async (data: HomeData) => {
    setSaving(true);
    try {
      const { id, ...updateData } = data;
      // Nettoyer les partenaires vides
      updateData.partners = updateData.partners?.filter(p => p.name.trim() !== '') || [];
      
      let error;
      if (id) {
        const res = await supabase.from('home_page').update({
          ...updateData,
          updated_at: new Date().toISOString()
        }).eq('id', id);
        error = res.error;
      } else {
        const res = await supabase.from('home_page').insert([{
          ...updateData,
          updated_at: new Date().toISOString()
        }]);
        error = res.error;
      }
      if (error) throw error;
      toast.success("Données de l'accueil mises à jour");
    } catch (error) {
      console.error(error);
      toast.error('Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64"><Loader2 className="w-8 h-8 animate-spin text-primary-600" /></div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Contenu de l'accueil</h1>
        <p className="mt-1 text-sm text-gray-500">
          Gérez la galerie de photos et la liste de vos partenaires.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        
        {/* SECTION DIAPORAMA */}
        <div className="bg-white shadow rounded-xl p-6 border border-gray-100">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Diaporama (Slider)</h2>
          <div className="grid grid-cols-1 gap-y-6 gap-x-4">
            <div>
              <p className="text-sm text-gray-500 mb-4">Ces images défilent actuellement sur le site WebTechnozi.</p>
              <MultiImageUpload 
                value={aboutImages || []} 
                onChange={(urls) => setValue('about_images', urls, { shouldDirty: true })} 
              />
            </div>
          </div>
        </div>

        {/* SECTION PARTENAIRES */}
        <div className="bg-white shadow rounded-xl p-6 border border-gray-100">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-lg font-medium text-gray-900">Marques et Partenaires</h2>
              <p className="text-sm text-gray-500">Ajoutez les partenaires qui vous font confiance.</p>
            </div>
            <button
              type="button"
              onClick={() => appendPartner({ name: '', logo_url: '' })}
              className="flex items-center px-3 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none"
            >
              <Plus className="w-4 h-4 mr-2" />
              Ajouter
            </button>
          </div>

          <div className="space-y-6">
            {partnerFields.map((field, index) => (
              <div key={field.id} className="relative group flex flex-col sm:flex-row gap-8 items-start p-6 bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md hover:border-primary-200 transition-all duration-200">
                
                {/* Logo Section */}
                <div className="w-full sm:w-48 flex-shrink-0">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Logo <span className="text-gray-400 font-normal">(Optionnel)</span>
                  </label>
                  <div className="bg-gray-50 rounded-lg p-2 border border-dashed border-gray-300">
                    <ImageUpload 
                      value={watchPartners?.[index]?.logo_url || ''} 
                      onChange={(url) => setValue(`partners.${index}.logo_url`, url)} 
                    />
                  </div>
                </div>

                {/* Info Section */}
                <div className="flex-grow w-full pt-1">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Nom du partenaire <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Starlink, Schneider Electric..."
                    className="block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 sm:text-sm transition-shadow"
                    {...register(`partners.${index}.name` as const)}
                  />
                  <p className="mt-2 text-xs text-gray-500">
                    Ce nom sera affiché en texte sous le logo, ou seul si aucun logo n'est fourni.
                  </p>
                </div>

                {/* Delete Action */}
                <button
                  type="button"
                  onClick={() => removePartner(index)}
                  title="Supprimer ce partenaire"
                  className="absolute -top-3 -right-3 p-2.5 bg-white border border-gray-200 text-gray-400 rounded-full shadow-sm hover:text-red-600 hover:bg-red-50 hover:border-red-200 transition-all sm:opacity-0 sm:group-hover:opacity-100"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
            
            {partnerFields.length === 0 && (
              <div className="flex flex-col items-center justify-center p-12 bg-gray-50 border-2 border-dashed border-gray-200 rounded-xl">
                <p className="text-sm text-gray-500 font-medium mb-4">Aucun partenaire n'a encore été ajouté.</p>
                <button
                  type="button"
                  onClick={() => appendPartner({ name: '', logo_url: '' })}
                  className="flex items-center px-4 py-2 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Ajouter mon premier partenaire
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end">
          <button type="submit" disabled={saving} className={`flex items-center px-6 py-3 border border-transparent rounded-lg shadow-md text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 ${saving ? 'opacity-75 cursor-not-allowed' : ''}`}>
            {saving ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <Save className="w-5 h-5 mr-2" />}
            Enregistrer les modifications
          </button>
        </div>
      </form>
    </div>
  );
}
