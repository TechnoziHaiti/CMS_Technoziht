import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { Plus, Edit2, Trash2, Loader2, ArrowLeft } from 'lucide-react';
import ImageUpload from '../components/ui/ImageUpload';

type Service = {
  id: string;
  title: string;
  description: string;
  icon: string;
  image_url: string;
};

export default function Services() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const { register, handleSubmit, reset, setValue, watch } = useForm<Service>();
  const imageUrl = watch('image_url');

  const fetchServices = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('services').select('*').order('created_at', { ascending: false });
    if (error) {
      toast.error('Erreur lors du chargement des services');
    } else {
      setServices(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchServices();
  }, []);

  const openForm = (service?: Service) => {
    if (service) {
      setEditingId(service.id);
      reset(service);
    } else {
      setEditingId(null);
      reset({ title: '', description: '', icon: '', image_url: '' });
    }
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setEditingId(null);
  };

  const onSubmit = async (data: Service) => {
    const { id, ...serviceData } = data;
    let error;

    if (editingId) {
      const res = await supabase.from('services').update(serviceData).eq('id', editingId);
      error = res.error;
    } else {
      const res = await supabase.from('services').insert([serviceData]);
      error = res.error;
    }

    if (error) {
      toast.error('Erreur lors de la sauvegarde');
    } else {
      toast.success(editingId ? 'Service modifié' : 'Service ajouté');
      closeForm();
      fetchServices();
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Voulez-vous vraiment supprimer ce service ?')) {
      const { error } = await supabase.from('services').delete().eq('id', id);
      if (error) {
        toast.error('Erreur lors de la suppression');
      } else {
        toast.success('Service supprimé');
        fetchServices();
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
            {editingId ? 'Modifier le service' : 'Ajouter un service'}
          </h1>
          <button onClick={closeForm} className="flex items-center text-gray-600 hover:text-gray-900">
            <ArrowLeft className="w-4 h-4 mr-2" /> Retour
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="bg-white shadow rounded-xl p-6 border border-gray-100 space-y-6">
          <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Titre du service</label>
              <input required {...register('title')} className="w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm p-2 border" />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea required {...register('description')} rows={4} className="w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm p-2 border" />
            </div>


            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Image illustrative</label>
              <ImageUpload value={imageUrl || ''} onChange={(url) => setValue('image_url', url)} />
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
          <h1 className="text-2xl font-bold text-gray-900">Services</h1>
          <p className="mt-1 text-sm text-gray-500">Gérez les services proposés par l'agence.</p>
        </div>
        <button onClick={() => openForm()} className="flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700">
          <Plus className="w-4 h-4 mr-2" /> Ajouter un service
        </button>
      </div>

      <div className="bg-white shadow rounded-xl border border-gray-100 overflow-hidden">
        <ul className="divide-y divide-gray-200">
          {services.length === 0 ? (
            <li className="p-6 text-center text-gray-500">Aucun service trouvé.</li>
          ) : (
            services.map((service) => (
              <li key={service.id} className="p-6 hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    {service.image_url ? (
                      <img src={service.image_url} alt="" className="h-16 w-16 rounded-lg object-cover bg-gray-100" />
                    ) : (
                      <div className="h-16 w-16 rounded-lg bg-primary-50 flex items-center justify-center text-primary-500 font-bold text-xl">
                        {service.title.charAt(0)}
                      </div>
                    )}
                    <div className="ml-4">
                      <h3 className="text-lg font-medium text-gray-900">{service.title}</h3>
                      <p className="text-sm text-gray-500 line-clamp-1 max-w-xl">{service.description}</p>
                    </div>
                  </div>
                  <div className="flex space-x-3">
                    <button onClick={() => openForm(service)} className="text-gray-500 hover:text-gray-900 p-2 rounded-full hover:bg-gray-100 transition-colors">
                      <Edit2 className="w-5 h-5" />
                    </button>
                    <button onClick={() => handleDelete(service.id)} className="text-red-500 hover:text-red-700 p-2 rounded-full hover:bg-red-50 transition-colors">
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  );
}
