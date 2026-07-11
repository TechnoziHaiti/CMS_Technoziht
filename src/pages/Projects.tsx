import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { Plus, Edit2, Trash2, Loader2, ArrowLeft, ExternalLink } from 'lucide-react';
import ImageUpload from '../components/ui/ImageUpload';

type Project = {
  id: string;
  title: string;
  description: string;
  technologies: string[];
  link: string;
  image_url: string;
};

type ProjectForm = Omit<Project, 'technologies'> & {
  category: string;
  client: string;
  date: string;
};

export default function Projects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const { register, handleSubmit, reset, setValue, watch } = useForm<ProjectForm>();
  const imageUrl = watch('image_url');

  const fetchProjects = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('projects').select('*').order('created_at', { ascending: false });
    if (error) {
      toast.error('Erreur lors du chargement des projets');
    } else {
      setProjects(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const openForm = (project?: Project) => {
    if (project) {
      setEditingId(project.id);
      reset({
        ...project,
        category: project.technologies?.[0] || 'Solar',
        client: project.technologies?.[1] || '',
        date: project.technologies?.[2] || ''
      });
    } else {
      setEditingId(null);
      reset({ title: '', description: '', category: 'Solar', client: '', date: '', link: '', image_url: '' });
    }
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setEditingId(null);
  };

  const onSubmit = async (data: ProjectForm) => {
    const { id, category, client, date, ...rest } = data;
    
    const technologies = [category, client, date];
    const projectData = { ...rest, technologies };
    let error;

    if (editingId) {
      const res = await supabase.from('projects').update(projectData).eq('id', editingId);
      error = res.error;
    } else {
      const res = await supabase.from('projects').insert([projectData]);
      error = res.error;
    }

    if (error) {
      toast.error('Erreur lors de la sauvegarde');
      console.error(error);
    } else {
      toast.success(editingId ? 'Projet modifié' : 'Projet ajouté');
      closeForm();
      fetchProjects();
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Voulez-vous vraiment supprimer ce projet ?')) {
      const { error } = await supabase.from('projects').delete().eq('id', id);
      if (error) {
        toast.error('Erreur lors de la suppression');
      } else {
        toast.success('Projet supprimé');
        fetchProjects();
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
            {editingId ? 'Modifier le projet' : 'Ajouter un projet'}
          </h1>
          <button onClick={closeForm} className="flex items-center text-gray-600 hover:text-gray-900">
            <ArrowLeft className="w-4 h-4 mr-2" /> Retour
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="bg-white shadow rounded-xl p-6 border border-gray-100 space-y-6">
          <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Nom du projet</label>
              <input required {...register('title')} className="w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm p-2 border" />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea required {...register('description')} rows={4} className="w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm p-2 border" />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Catégorie</label>
              <select {...register('category')} className="w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm p-2 border bg-white">
                <option value="Solar">Solar</option>
                <option value="Starlink">Starlink</option>
                <option value="CCTV">CCTV</option>
                <option value="Networking">Networking</option>
                <option value="Office Installations">Office Installations</option>
              </select>
            </div>

            <div className="sm:col-span-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Client</label>
              <input {...register('client')} placeholder="ex: Entreprise XYZ" className="w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm p-2 border" />
            </div>

            <div className="sm:col-span-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
              <input {...register('date')} placeholder="ex: Mars 2026" className="w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm p-2 border" />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Image du projet</label>
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
          <h1 className="text-2xl font-bold text-gray-900">Projets / Portfolio</h1>
          <p className="mt-1 text-sm text-gray-500">Gérez vos réalisations et études de cas.</p>
        </div>
        <button onClick={() => openForm()} className="flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700">
          <Plus className="w-4 h-4 mr-2" /> Ajouter un projet
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {projects.length === 0 ? (
          <div className="col-span-full p-6 text-center text-gray-500 bg-white shadow rounded-xl border border-gray-100">
            Aucun projet trouvé.
          </div>
        ) : (
          projects.map((project) => (
            <div key={project.id} className="bg-white overflow-hidden shadow rounded-xl border border-gray-100 flex flex-col hover:shadow-md transition-shadow">
              {project.image_url ? (
                <img src={project.image_url} alt={project.title} className="h-48 w-full object-cover" />
              ) : (
                <div className="h-48 w-full bg-gray-100 flex items-center justify-center text-gray-400">
                  Pas d'image
                </div>
              )}
              <div className="p-5 flex-1 flex flex-col">
                <div className="flex justify-between items-start">
                  <h3 className="text-lg font-bold text-gray-900 truncate">{project.title}</h3>
                  {project.link && (
                    <a href={project.link} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-primary-600">
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  )}
                </div>
                <p className="text-sm text-gray-500 mt-2 line-clamp-2">{project.description}</p>
                <div className="mt-4 flex flex-wrap gap-1">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded border border-gray-200 text-xs font-medium bg-gray-50 text-gray-600">
                    {project.technologies?.[0]}
                  </span>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded border border-gray-200 text-xs font-medium bg-gray-50 text-gray-600">
                    {project.technologies?.[1]}
                  </span>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded border border-gray-200 text-xs font-medium bg-gray-50 text-gray-600">
                    {project.technologies?.[2]}
                  </span>
                </div>
                <div className="mt-auto pt-4 flex space-x-2 border-t border-gray-100 mt-4">
                  <button onClick={() => openForm(project)} className="flex-1 flex justify-center items-center px-3 py-1.5 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors">
                    <Edit2 className="w-4 h-4 mr-1.5" /> Modifier
                  </button>
                  <button onClick={() => handleDelete(project.id)} className="flex-1 flex justify-center items-center px-3 py-1.5 border border-gray-300 rounded-md text-sm font-medium text-red-600 bg-white hover:bg-red-50 hover:border-red-200 transition-colors">
                    <Trash2 className="w-4 h-4 mr-1.5" /> Supprimer
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
