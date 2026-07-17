import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import { Trash2, Loader2, CheckCircle, XCircle } from 'lucide-react';

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

  const handleApprove = async (testimonial: Testimonial) => {
    if (window.confirm('Voulez-vous vraiment valider et publier ce témoignage sur le site ?')) {
      const newPosition = testimonial.position?.replace('[PENDING] ', '').replace('[PENDING]', '') || '';
      const { error } = await supabase.from('testimonials').update({ position: newPosition }).eq('id', testimonial.id);
      if (error) {
        toast.error('Erreur lors de la validation');
      } else {
        toast.success('Témoignage validé et publié');
        fetchTestimonials();
      }
    }
  };

  const handleReject = async (id: string) => {
    if (window.confirm('Voulez-vous vraiment rejeter et supprimer définitivement ce témoignage ?')) {
      const { error } = await supabase.from('testimonials').delete().eq('id', id);
      if (error) {
        toast.error('Erreur lors du rejet');
      } else {
        toast.success('Témoignage rejeté');
        fetchTestimonials();
      }
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Voulez-vous vraiment supprimer ce témoignage (il disparaîtra du site) ?')) {
      const { error } = await supabase.from('testimonials').delete().eq('id', id);
      if (error) {
        toast.error('Erreur lors de la suppression');
      } else {
        toast.success('Témoignage supprimé');
        fetchTestimonials();
      }
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Témoignages</h1>
          <p className="mt-1 text-sm text-gray-500">Validez ou rejetez les avis laissés par les clients sur le site.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {testimonials.length === 0 ? (
          <div className="col-span-full p-6 text-center text-gray-500 bg-white shadow rounded-xl border border-gray-100">
            Aucun témoignage trouvé.
          </div>
        ) : (
          testimonials.map((testimonial) => {
            const isPending = testimonial.position?.startsWith('[PENDING]');
            const displayPosition = isPending ? testimonial.position.replace('[PENDING] ', '').replace('[PENDING]', '') : testimonial.position;

            return (
              <div key={testimonial.id} className={`bg-white shadow rounded-xl border ${isPending ? 'border-amber-300 ring-1 ring-amber-300' : 'border-gray-100'} p-6 flex flex-col relative group mt-4`}>
                
                {isPending && (
                  <div className="absolute -top-3 -right-3 bg-amber-100 text-amber-700 text-[10px] uppercase font-bold px-3 py-1 rounded-full border border-amber-200 shadow-sm z-10">
                    En attente de validation
                  </div>
                )}

                <div className="absolute top-4 right-4 flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity z-10 bg-white/80 p-1 rounded-lg backdrop-blur-sm">
                  {isPending ? (
                    <>
                      <button onClick={() => handleApprove(testimonial)} className="p-1.5 rounded-md bg-green-50 text-green-600 hover:bg-green-100 transition-colors" title="Valider et Publier">
                        <CheckCircle className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleReject(testimonial.id)} className="p-1.5 bg-red-50 text-red-600 hover:bg-red-100 rounded-md transition-colors" title="Rejeter">
                        <XCircle className="w-4 h-4" />
                      </button>
                    </>
                  ) : (
                    <button onClick={() => handleDelete(testimonial.id)} className="p-1.5 bg-red-50 text-red-600 hover:bg-red-100 rounded-md transition-colors" title="Supprimer">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
                
                <div className="flex items-center mb-4">
                  {testimonial.photo_url ? (
                    <img src={testimonial.photo_url} alt={testimonial.name} className="w-12 h-12 rounded-full object-cover mr-4 ring-2 ring-gray-100" />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center font-bold text-lg mr-4">
                      {testimonial.name.charAt(0)}
                    </div>
                  )}
                  <div className="pr-16">
                    <h3 className="text-sm font-bold text-gray-900">{testimonial.name}</h3>
                    <p className="text-xs text-gray-500">{displayPosition}</p>
                  </div>
                </div>
                <p className="text-sm text-gray-700 italic border-l-4 border-primary-200 pl-3 relative">
                  "{testimonial.message}"
                </p>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
