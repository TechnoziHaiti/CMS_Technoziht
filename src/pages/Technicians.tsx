import { useState, useEffect } from 'react';
import { supabaseAdmin } from '../lib/supabase';
import toast from 'react-hot-toast';
import { 
  Users, 
  Search, 
  Plus, 
  Edit2, 
  Trash2, 
  X, 
  CheckCircle, 
  Clock, 
  Ban, 
  Eye, 
  ArrowLeft,
  Briefcase,
  Phone,
  Mail,
  MapPin,
  Calendar
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

type Technician = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  address: string;
  department: string;
  specialty: string;
  status: 'AVAILABLE' | 'BUSY' | 'INACTIVE';
  is_deleted: boolean;
  created_at: string;
};

type ViewMode = 'LIST' | 'FORM' | 'DETAILS';

export default function Technicians() {
  const { } = useAuth();
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('LIST');
  const [selectedTech, setSelectedTech] = useState<Technician | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDept] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');

  // Stats and History for Details View
  const [techStats, setTechStats] = useState({ total: 0, ongoing: 0, done: 0 });
  const [techHistory, setTechHistory] = useState<any[]>([]);

  // Form State
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    address: '',
    department: '',
    specialty: '',
    status: 'AVAILABLE'
  });

  const fetchTechnicians = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabaseAdmin
        .from('technicians')
        .select('*')
        .eq('is_deleted', false)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTechnicians(data || []);
    } catch (error: any) {
      toast.error('Erreur lors du chargement des techniciens');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTechnicians();
  }, []);

  const handleOpenForm = (tech?: Technician) => {
    if (tech) {
      setFormData({
        first_name: tech.first_name,
        last_name: tech.last_name,
        email: tech.email,
        phone: tech.phone || '',
        address: tech.address || '',
        department: tech.department,
        specialty: tech.specialty,
        status: tech.status
      });
      setSelectedTech(tech);
    } else {
      setFormData({
        first_name: '', last_name: '', email: '', phone: '', address: '', department: '', specialty: '', status: 'AVAILABLE'
      });
      setSelectedTech(null);
    }
    setViewMode('FORM');
  };

  const handleOpenDetails = async (tech: Technician) => {
    setSelectedTech(tech);
    setViewMode('DETAILS');
    setLoading(true);
    
    try {
      // Fetch Interventions for Stats
      const { data: interventions, error } = await supabaseAdmin
        .from('contact_messages')
        .select('id, assignment_status, status')
        .eq('technician_id', tech.id);
        
      if (!error && interventions) {
        const ongoing = interventions.filter(i => i.assignment_status === 'ASSIGNED' && i.status !== 'RESOLVED').length;
        const done = interventions.filter(i => i.assignment_status === 'ASSIGNED' && i.status === 'RESOLVED').length;
        setTechStats({ total: interventions.length, ongoing, done });
      }

      // Fetch History 
      const { data: history, error: historyErr } = await supabaseAdmin
        .from('contact_messages')
        .select('*, message_history(*)')
        .eq('technician_id', tech.id)
        .order('scheduled_at', { ascending: false });
        
      if (!historyErr) setTechHistory(history || []);
      
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (selectedTech) {
        const { error } = await supabaseAdmin
          .from('technicians')
          .update({ ...formData, updated_at: new Date() })
          .eq('id', selectedTech.id);
        if (error) throw error;
        toast.success('Technicien mis à jour');
      } else {
        const { error } = await supabaseAdmin
          .from('technicians')
          .insert([formData]);
        if (error) throw error;
        toast.success('Technicien ajouté');
      }
      fetchTechnicians();
      setViewMode('LIST');
    } catch (error: any) {
      toast.error(error.message || 'Erreur lors de la sauvegarde');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Voulez-vous vraiment désactiver ce technicien ? (Soft delete)")) return;
    try {
      const { error } = await supabaseAdmin
        .from('technicians')
        .update({ is_deleted: true, status: 'INACTIVE' })
        .eq('id', id);
      if (error) throw error;
      toast.success('Technicien supprimé');
      fetchTechnicians();
    } catch (error: any) {
      toast.error('Erreur lors de la suppression');
    }
  };

  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'AVAILABLE': return <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700"><CheckCircle className="w-3 h-3 mr-1"/> Disponible</span>;
      case 'BUSY': return <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700"><Clock className="w-3 h-3 mr-1"/> Occupé</span>;
      case 'INACTIVE': return <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700"><Ban className="w-3 h-3 mr-1"/> Inactif</span>;
      default: return null;
    }
  };

  const filteredTechnicians = technicians.filter(tech => {
    if (filterDept !== 'ALL' && tech.department !== filterDept) return false;
    if (filterStatus !== 'ALL' && tech.status !== filterStatus) return false;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      return (tech.first_name?.toLowerCase() || '').includes(term) || 
             (tech.last_name?.toLowerCase() || '').includes(term) ||
             (tech.email?.toLowerCase() || '').includes(term) ||
             (tech.specialty?.toLowerCase() || '').includes(term);
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div>
            <Users className="w-8 h-8 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Techniciens</h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Gestion des équipes et des interventions.</p>
          </div>
        </div>
        {viewMode === 'LIST' && (
          <button 
            onClick={() => handleOpenForm()}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            Nouveau Technicien
          </button>
        )}
      </div>

      {viewMode === 'LIST' && (
        <div className="bg-white dark:bg-[#1e293b] rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden">
          {/* FILTERS */}
          <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex flex-col md:flex-row gap-4 items-center justify-between bg-gray-50/50 dark:bg-gray-800/30">
            <div className="relative flex-1 max-w-md w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input 
                type="text" 
                placeholder="Rechercher (Nom, Email, Spécialité)..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              />
            </div>
            <div className="flex gap-3 w-full md:w-auto">
              <select 
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              >
                <option value="ALL">Tous les statuts</option>
                <option value="AVAILABLE">Disponibles</option>
                <option value="BUSY">Occupés</option>
                <option value="INACTIVE">Inactifs</option>
              </select>
            </div>
          </div>

          {/* TABLE */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-800/50 text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400 font-semibold border-b border-gray-200 dark:border-gray-700">
                  <th className="px-6 py-4">Technicien</th>
                  <th className="px-6 py-4">Contact</th>
                  <th className="px-6 py-4">Département & Spécialité</th>
                  <th className="px-6 py-4">Statut</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                {loading ? (
                  <tr><td colSpan={5} className="text-center py-10"><div className="animate-spin w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full mx-auto"></div></td></tr>
                ) : filteredTechnicians.length === 0 ? (
                  <tr><td colSpan={5} className="text-center py-10 text-gray-500 dark:text-gray-400">Aucun technicien trouvé.</td></tr>
                ) : (
                  filteredTechnicians.map((tech) => (
                    <tr key={tech.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold uppercase shrink-0">
                            {tech.first_name?.[0] || ''}{tech.last_name?.[0] || ''}
                          </div>
                          <div>
                            <div className="font-semibold text-gray-900 dark:text-white">{tech.first_name} {tech.last_name}</div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">Ajouté le {new Date(tech.created_at).toLocaleDateString()}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900 dark:text-white">{tech.email}</div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">{tech.phone || '-'}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">{tech.department}</div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">{tech.specialty}</div>
                      </td>
                      <td className="px-6 py-4">
                        {getStatusBadge(tech.status)}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={() => handleOpenDetails(tech)} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors" title="Voir Fiche">
                            <Eye className="w-5 h-5" />
                          </button>
                          <button onClick={() => handleOpenForm(tech)} className="p-2 text-gray-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/30 rounded-lg transition-colors" title="Modifier">
                            <Edit2 className="w-5 h-5" />
                          </button>
                          <button onClick={() => handleDelete(tech.id)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors" title="Désactiver">
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* FORM MODE */}
      {viewMode === 'FORM' && (
        <div className="bg-white dark:bg-[#1e293b] rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center bg-gray-50/50 dark:bg-gray-800/30">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">
              {selectedTech ? 'Modifier Technicien' : 'Nouveau Technicien'}
            </h2>
            <button onClick={() => setViewMode('LIST')} className="p-2 text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full">
              <X className="w-5 h-5" />
            </button>
          </div>
          <form onSubmit={handleSave} className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Prénom *</label>
                <input required type="text" value={formData.first_name} onChange={e => setFormData({...formData, first_name: e.target.value})} className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-4 py-2.5 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nom *</label>
                <input required type="text" value={formData.last_name} onChange={e => setFormData({...formData, last_name: e.target.value})} className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-4 py-2.5 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email Professionnel *</label>
                <input required type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-4 py-2.5 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Téléphone</label>
                <input type="text" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-4 py-2.5 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Département *</label>
                <input required type="text" placeholder="Ex: Réseau, Sécurité..." value={formData.department} onChange={e => setFormData({...formData, department: e.target.value})} className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-4 py-2.5 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Spécialité *</label>
                <input required type="text" placeholder="Ex: Fibre Optique, Caméras..." value={formData.specialty} onChange={e => setFormData({...formData, specialty: e.target.value})} className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-4 py-2.5 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Adresse</label>
                <input type="text" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-4 py-2.5 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Statut Initial</label>
                <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value as any})} className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-4 py-2.5 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500">
                  <option value="AVAILABLE">Disponible</option>
                  <option value="INACTIVE">Inactif</option>
                </select>
              </div>
            </div>
            <div className="mt-8 flex justify-end gap-3">
              <button type="button" onClick={() => setViewMode('LIST')} className="px-5 py-2.5 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 font-medium">
                Annuler
              </button>
              <button type="submit" className="px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium shadow-sm">
                Enregistrer le technicien
              </button>
            </div>
          </form>
        </div>
      )}

      {/* DETAILS MODE (FICHE TECHNICIEN) */}
      {viewMode === 'DETAILS' && selectedTech && (
        <div className="space-y-6">
          <button onClick={() => setViewMode('LIST')} className="flex items-center text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors">
            <ArrowLeft className="w-4 h-4 mr-2" /> Retour à la liste
          </button>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Colonne Profil */}
            <div className="lg:col-span-1 space-y-6">
              <div className="bg-white dark:bg-[#1e293b] rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden">
                <div className="p-6 flex flex-col items-center text-center border-b border-gray-200 dark:border-gray-800">
                  <div className="w-24 h-24 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center text-blue-600 dark:text-blue-400 text-3xl font-bold uppercase mb-4 shadow-inner">
                    {selectedTech.first_name?.[0] || ''}{selectedTech.last_name?.[0] || ''}                  </div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">{selectedTech.first_name} {selectedTech.last_name}</h2>
                  <p className="text-gray-500 dark:text-gray-400 font-medium mb-3">{selectedTech.specialty}</p>
                  {getStatusBadge(selectedTech.status)}
                </div>
                <div className="p-6 space-y-4">
                  <div className="flex items-center text-sm">
                    <Mail className="w-4 h-4 text-gray-400 mr-3 shrink-0" />
                    <span className="text-gray-700 dark:text-gray-300">{selectedTech.email}</span>
                  </div>
                  <div className="flex items-center text-sm">
                    <Phone className="w-4 h-4 text-gray-400 mr-3 shrink-0" />
                    <span className="text-gray-700 dark:text-gray-300">{selectedTech.phone || 'Non renseigné'}</span>
                  </div>
                  <div className="flex items-center text-sm">
                    <Briefcase className="w-4 h-4 text-gray-400 mr-3 shrink-0" />
                    <span className="text-gray-700 dark:text-gray-300">Dép: {selectedTech.department}</span>
                  </div>
                  <div className="flex items-center text-sm">
                    <MapPin className="w-4 h-4 text-gray-400 mr-3 shrink-0" />
                    <span className="text-gray-700 dark:text-gray-300">{selectedTech.address || 'Non renseignée'}</span>
                  </div>
                  <div className="flex items-center text-sm">
                    <Calendar className="w-4 h-4 text-gray-400 mr-3 shrink-0" />
                    <span className="text-gray-700 dark:text-gray-300">Inscrit le {new Date(selectedTech.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>

              {/* Statistiques Rapides */}
              <div className="bg-white dark:bg-[#1e293b] rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 p-6">
                <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider mb-4">Statistiques</h3>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-500 dark:text-gray-400">Total Interventions</span>
                      <span className="font-bold text-gray-900 dark:text-white">{techStats.total}</span>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-500 dark:text-gray-400">En cours</span>
                      <span className="font-bold text-blue-600 dark:text-blue-400">{techStats.ongoing}</span>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-500 dark:text-gray-400">Réalisées</span>
                      <span className="font-bold text-green-600 dark:text-green-400">{techStats.done}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Colonne Historique Interventions */}
            <div className="lg:col-span-2">
              <div className="bg-white dark:bg-[#1e293b] rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 h-full flex flex-col">
                <div className="p-6 border-b border-gray-200 dark:border-gray-800">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">Historique des Interventions</h3>
                </div>
                <div className="p-6 flex-1 overflow-y-auto">
                  {loading ? (
                    <div className="flex justify-center py-10"><div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full"></div></div>
                  ) : techHistory.length === 0 ? (
                    <div className="text-center py-10 text-gray-500 dark:text-gray-400">
                      Aucune intervention n'a été assignée à ce technicien pour le moment.
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {techHistory.map(mission => (
                        <div key={mission.id} className="relative pl-6 border-l-2 border-gray-200 dark:border-gray-700 pb-2">
                          <div className="absolute w-3 h-3 bg-blue-500 rounded-full -left-[7px] top-1.5 border-2 border-white dark:border-[#1e293b]"></div>
                          <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4">
                            <div className="flex justify-between items-start mb-2">
                              <div>
                                <h4 className="font-bold text-gray-900 dark:text-white">{mission.service}</h4>
                                <p className="text-xs text-gray-500 dark:text-gray-400">Client : {mission.name}</p>
                              </div>
                              <div className="text-right">
                                <span className={`inline-block px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${
                                  mission.status === 'RESOLVED' ? 'bg-green-100 text-green-700' : 
                                  mission.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'
                                }`}>
                                  {mission.status}
                                </span>
                              </div>
                            </div>
                            <div className="text-sm text-gray-700 dark:text-gray-300 line-clamp-2 mb-3">
                              {mission.message}
                            </div>
                            <div className="flex flex-wrap gap-4 text-xs text-gray-500 dark:text-gray-400 bg-white dark:bg-[#1e293b] p-2 rounded border border-gray-100 dark:border-gray-700">
                              <span>Prévu le : <strong className="text-gray-700 dark:text-gray-300">{mission.scheduled_at ? new Date(mission.scheduled_at).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short'}) : 'Non défini'}</strong></span>
                              <span>Priorité : <strong className="text-gray-700 dark:text-gray-300">{mission.priority}</strong></span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
            
          </div>
        </div>
      )}
    </div>
  );
}
