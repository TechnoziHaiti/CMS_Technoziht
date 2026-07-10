import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { Plus, Edit2, Trash2, Loader2, ArrowLeft } from 'lucide-react';
import ImageUpload from '../components/ui/ImageUpload';

type Testimonial = {
  id: string;
  name: string;
  position: string;
  message: string;
  photo_url: string;
};

export default function Testimonials() {
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const { register, handleSubmit, reset, setValue, watch } = useForm<Testimonial>();
  const photoUrl = watch('photo_url');

  const fetchTestimonials = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('testimonials').select('*').order('created_at', { ascending: false });
    if (error) {
      toast.error('Erreur lors du chargement des témoignages');
    } else {
      setTestimonials(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchTestimonials();
  }, []);

  const openForm = (testimonial?: Testimonial) => {
    if (testimonial) {
      setEditingId(testimonial.id);
      reset(testimonial);
    } else {
      setEditingId(null);
      reset({ name: '', position: '', message: '', photo_url: '' });
    }
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setEditingId(null);
  };

  const onSubmit = async (data: Testimonial) => {
    const { id, ...rest } = data;
    let error;

    if (editingId) {
      const res = await supabase.from('testimonials').update(rest).eq('id', editingId);
      error = res.error;
    } else {
      const res = await supabase.from('testimonials').insert([rest]);
      error = res.error;
    }

    if (error) {
      toast.error('Erreur lors de la sauvegarde');
    } else {
      toast.success(editingId ? 'Témoignage modifié' : 'Témoignage ajouté');
      closeForm();
      fetchTestimonials();
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Voulez-vous vraiment supprimer ce témoignage ?')) {
      const { error } = await supabase.from('testimonials').delete().eq('id', id);
      if (error) {
        toast.error('Erreur lors de la suppression');
      } else {
        toast.success('Témoignage supprimé');
        fetchTestimonials();
      }
    }
  };

  if (loading && !isFormOpen) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    );
  }

  if (isFormOpen) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">
            {editingId ? 'Modifier le témoignage' : 'Ajouter un témoignage'}
          </h1>
          <button onClick={closeForm} className="flex items-center text-gray-600 hover:text-gray-900">
            <ArrowLeft className="w-4 h-4 mr-2" /> Retour
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="bg-white shadow rounded-xl p-6 border border-gray-100 space-y-6">
          <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Nom du client</label>
              <input required {...register('name')} className="w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm p-2 border" />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Poste / Entreprise</label>
              <input required {...register('position')} placeholder="Ex: CEO chez Google" className="w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm p-2 border" />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
              <textarea required {...register('message')} rows={4} className="w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm p-2 border" />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Photo du client</label>
              <ImageUpload value={photoUrl || ''} onChange={(url) => setValue('photo_url', url)} />
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-gray-100">
            <button type="button" onClick={closeForm} className="mr-3 px-4 py-2 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
              Annuler
            </button>
            <button type="submit" className="px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700">
              {editingId ? 'Mettre à jour' : 'Créer'}
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Témoignages</h1>
          <p className="mt-1 text-sm text-gray-500">Gérez les avis de vos clients.</p>
        </div>
        <button onClick={() => openForm()} className="flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700">
          <Plus className="w-4 h-4 mr-2" /> Ajouter un témoignage
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {testimonials.length === 0 ? (
          <div className="col-span-full p-6 text-center text-gray-500 bg-white shadow rounded-xl border border-gray-100">
            Aucun témoignage trouvé.
          </div>
        ) : (
          testimonials.map((testimonial) => (
            <div key={testimonial.id} className="bg-white shadow rounded-xl border border-gray-100 p-6 flex flex-col relative group">
              <div className="absolute top-4 right-4 flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => openForm(testimonial)} className="p-1.5 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-md">
                  <Edit2 className="w-4 h-4" />
                </button>
                <button onClick={() => handleDelete(testimonial.id)} className="p-1.5 bg-red-50 text-red-600 hover:bg-red-100 rounded-md">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              
              <div className="flex items-center mb-4">
                {testimonial.photo_url ? (
                  <img src={testimonial.photo_url} alt={testimonial.name} className="w-12 h-12 rounded-full object-cover mr-4" />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center font-bold text-lg mr-4">
                    {testimonial.name.charAt(0)}
                  </div>
                )}
                <div>
                  <h3 className="text-sm font-bold text-gray-900">{testimonial.name}</h3>
                  <p className="text-xs text-gray-500">{testimonial.position}</p>
                </div>
              </div>
              <p className="text-sm text-gray-700 italic border-l-4 border-primary-200 pl-3">
                "{testimonial.message}"
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
