import { useState, useEffect } from 'react';

import toast from 'react-hot-toast';
import { Loader2, CheckCircle, XCircle, ExternalLink, Package, Search, RefreshCw } from 'lucide-react';

type Order = {
  id: string;
  order_number: string;
  customers: {
    name: string;
    email: string;
    phone: string;
  };
  total_amount: number;
  status: string;
  payment_method: string;
  receipt_url?: string;
  created_at: string;
  order_items: {
    quantity: number;
    unit_price: number;
    products: { name: string };
  }[];
};

export default function Orders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'ALL' | 'PAYMENT_PENDING' | 'PAID' | 'EXPIRED' | 'REJECTED'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDate, setFilterDate] = useState('');

  const fetchOrders = async () => {
    setLoading(true);
    
    try {
      // Force bypass cache by instantiating inside the component
      const url = "https://dkkofpznrlyeigdafctg.supabase.co";
      const key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRra29mcHpucmx5ZWlnZGFmY3RnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MzU5NTYzNywiZXhwIjoyMDk5MTcxNjM3fQ.SLCDvhRWeQAX1MPom7glcMz2IhZd3MlGdTywoU2SlCY";
      const { createClient } = await import('@supabase/supabase-js');
      const directAdminClient = createClient(url, key, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false
        }
      });

      const { data, error } = await directAdminClient
        .from('orders')
        .select('*, customers(name, email, phone), order_items(*, products(name))')
        .order('created_at', { ascending: false });
      
      if (error) {
        throw error;
      }
      
      setOrders(data as Order[] || []);
    } catch (error: any) {
      toast.error('Erreur lors du chargement des commandes: ' + error.message);
      console.error(error);
    }
    
    setLoading(false);
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const handleConfirmPayment = async (orderId: string) => {
    if (!window.confirm("Êtes-vous sûr que le paiement a été reçu ? Cette action déduira le stock définitivement, et enverra une facture PDF au client.")) return;
    
    setProcessingId(orderId);
    try {
      const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5005";
      const res = await fetch(`${API_URL}/api/admin/orders/${orderId}/confirm`, {
        method: 'POST'
      });
      
      if (!res.ok) {
        // Fallback to direct DB call if backend is not updated
        const url = "https://dkkofpznrlyeigdafctg.supabase.co";
        const key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRra29mcHpucmx5ZWlnZGFmY3RnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MzU5NTYzNywiZXhwIjoyMDk5MTcxNjM3fQ.SLCDvhRWeQAX1MPom7glcMz2IhZd3MlGdTywoU2SlCY";
        const { createClient } = await import('@supabase/supabase-js');
        const directAdminClient = createClient(url, key, {
          auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
        });

        const { error } = await directAdminClient.rpc('confirm_payment', { p_order_id: orderId, p_admin_id: null });
        if (error) throw error;
        
        toast.success("Validé! (Email non envoyé : le backend n'est pas à jour)");
        fetchOrders();
        return;
      }
      
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Erreur serveur");
      
      toast.success("Commande validée et facture envoyée au client !");
      fetchOrders();
    } catch (error: any) {
      toast.error(error.message || "Erreur de validation");
    } finally {
      setProcessingId(null);
    }
  };

  const handleRejectProof = async (orderId: string) => {
    if (!window.confirm("Êtes-vous sûr de vouloir signaler cette preuve de paiement comme anormale et annuler la commande ? Le client sera alerté par email.")) return;
    
    setProcessingId(orderId);
    try {
      const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5005";
      const res = await fetch(`${API_URL}/api/admin/orders/${orderId}/reject-proof`, {
        method: 'POST'
      });
      
      if (!res.ok) {
        // Fallback to direct DB call if backend is not updated
        const url = "https://dkkofpznrlyeigdafctg.supabase.co";
        const key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRra29mcHpucmx5ZWlnZGFmY3RnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MzU5NTYzNywiZXhwIjoyMDk5MTcxNjM3fQ.SLCDvhRWeQAX1MPom7glcMz2IhZd3MlGdTywoU2SlCY";
        const { createClient } = await import('@supabase/supabase-js');
        const directAdminClient = createClient(url, key, {
          auth: {
            persistSession: false,
            autoRefreshToken: false,
            detectSessionInUrl: false
          }
        });

        // 1. ATOMIC CHECK & UPDATE
        const { data: updatedOrders, error: updateErr } = await directAdminClient
          .from('orders')
          .update({ status: 'REJECTED' })
          .eq('id', orderId)
          .eq('status', 'PAYMENT_PENDING')
          .select('id');

        if (updateErr) throw updateErr;

        if (!updatedOrders || updatedOrders.length === 0) {
          toast.error("Action refusée : commande déjà traitée par un autre admin (course perdue).");
          fetchOrders();
          return;
        }

        // 2. Récupérer les articles de la commande
        const { data: items, error: fetchError } = await directAdminClient.from('order_items').select('product_id, quantity').eq('order_id', orderId);
        if (fetchError) throw fetchError;

        // 3. Libérer le stock réservé de maniÃ¨re sécurisée (OCC - Optimistic Concurrency Control)
        if (items) {
          for (const item of items) {
            let success = false;
            let attempts = 0;
            while (!success && attempts < 5) {
              attempts++;
              const { data: p, error: pError } = await directAdminClient.from('products').select('quantite_reservee').eq('id', item.product_id).single();
              if (!pError && p && p.quantite_reservee > 0) {
                const newReserved = Math.max(0, p.quantite_reservee - item.quantity);
                
                // Atomic update: only update if quantite_reservee hasn't changed since we read it
                const { data: updated, error: updErr } = await directAdminClient
                  .from('products')
                  .update({ quantite_reservee: newReserved })
                  .eq('id', item.product_id)
                  .eq('quantite_reservee', p.quantite_reservee)
                  .select('id');
                
                if (!updErr && updated && updated.length > 0) {
                  success = true; // Update successful
                }
              } else {
                success = true; // Nothing to decrement or product not found
              }
            }
          }
        }
        
        toast.success("Commande annulée et stock libéré ! (Email non envoyé : backend injoignable)");
        fetchOrders();
        return;
      }

      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Erreur serveur");
      
      toast.success("Preuve rejetée, commande annulée et email envoyé au client !");
      fetchOrders();
    } catch (error: any) {
      toast.error(error.message || "Erreur lors du rejet de la preuve");
    } finally {
      setProcessingId(null);
    }
  };

  const handleRestoreOrder = async (orderId: string) => {
    if (!window.confirm("Êtes-vous sûr de vouloir restaurer cette commande ? Si le stock est inférieur à la demande, la commande sera partiellement validée.")) return;
    
    setProcessingId(orderId);
    try {
      const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5005";
      const res = await fetch(`${API_URL}/api/admin/orders/${orderId}/restore`, {
        method: 'POST'
      });
      
      if (!res.ok) {
        // Fallback to direct DB call if backend is not updated
        const url = "https://dkkofpznrlyeigdafctg.supabase.co";
        const key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRra29mcHpucmx5ZWlnZGFmY3RnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MzU5NTYzNywiZXhwIjoyMDk5MTcxNjM3fQ.SLCDvhRWeQAX1MPom7glcMz2IhZd3MlGdTywoU2SlCY";
        const { createClient } = await import('@supabase/supabase-js');
        const directAdminClient = createClient(url, key, {
          auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
        });

        const { data, error } = await directAdminClient.rpc('restore_order', { p_order_id: orderId, p_admin_id: null });
        if (error) throw error;
        
        if (data && data.is_partial) {
          toast.success("Commande partiellement restaurée ! (Stock incomplet). Le prix a été recalculé.", { duration: 6000 });
        } else {
          toast.success("Commande restaurée à 100% !");
        }
        fetchOrders();
        return;
      }
      
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Erreur serveur");
      
      if (json.is_partial) {
        toast.success("Commande partiellement restaurée ! Le client sera notifié pour un remboursement partiel.", { duration: 6000 });
      } else {
        toast.success("Commande restaurée et validée, facture envoyée !");
      }
      fetchOrders();
    } catch (error: any) {
      toast.error(error.message || "Erreur lors de la restauration. Stock épuisé ?");
    } finally {
      setProcessingId(null);
    }
  };

  const filteredOrders = orders.filter(order => {
    // Filtrage par Onglet
    if (activeTab !== 'ALL') {
      if (activeTab === 'PAID') {
        if (order.status !== 'COMPLETED' && order.status !== 'PAID') return false;
      } else {
        if (order.status !== activeTab) return false;
      }
    }
    
    // Filtrage par Recherche (Nom ou Numéro)
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const matchName = order.customers?.name?.toLowerCase().includes(term);
      const matchNumber = order.order_number.toLowerCase().includes(term);
      if (!matchName && !matchNumber) return false;
    }
    
    // Filtrage par Date
    if (filterDate) {
      const orderDate = order.created_at.split('T')[0];
      if (orderDate !== filterDate) return false;
    }
    
    return true;
  });

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-gray-900" />
      </div>
    );
  }

  const pendingCount = orders.filter(o => o.status === 'PAYMENT_PENDING').length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">Commandes & Paiements</h1>
            {pendingCount > 0 && (
              <span className="inline-flex items-center justify-center h-5 min-w-[20px] px-1.5 text-[11px] font-bold bg-red-500 text-white rounded-full">
                {pendingCount}
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-gray-500">Gérez les achats clients et vérifiez les reçus.</p>
        </div>
        <button 
          onClick={fetchOrders}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 shadow-sm text-sm font-medium transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline">Rafraîchir</span>
        </button>
      </div>

      {/* Barre de recherche et filtres */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            className="block w-full pl-10 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-blue-500 focus:border-blue-500 shadow-sm"
            placeholder="Rechercher par nom de client ou nÂ° de commande (ex: TZ-26...)"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="sm:w-48">
          <input
            type="date"
            className="block w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-blue-500 focus:border-blue-500 shadow-sm text-gray-600"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1 bg-white p-1 rounded-xl shadow-sm border border-gray-100">
        <button
          onClick={() => setActiveTab('ALL')}
          className={`px-2 py-2 text-xs sm:text-sm font-medium rounded-lg transition-colors ${
            activeTab === 'ALL' ? 'bg-gray-100 text-gray-900' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
          }`}
        >
          Toutes
        </button>
        <button
          onClick={() => setActiveTab('PAYMENT_PENDING')}
          className={`px-2 py-2 text-xs sm:text-sm font-medium rounded-lg transition-colors flex justify-center items-center gap-1 sm:gap-2 ${
            activeTab === 'PAYMENT_PENDING' ? 'bg-yellow-50 text-yellow-700' : 'text-gray-500 hover:text-yellow-600 hover:bg-yellow-50/50'
          }`}
        >
          En attente
        </button>
        <button
          onClick={() => setActiveTab('PAID')}
          className={`px-2 py-2 text-xs sm:text-sm font-medium rounded-lg transition-colors flex justify-center items-center gap-2 ${
            activeTab === 'PAID' ? 'bg-green-50 text-green-700' : 'text-gray-500 hover:text-green-600 hover:bg-green-50/50'
          }`}
        >
          Validées
        </button>
        <button
          onClick={() => setActiveTab('EXPIRED')}
          className={`px-2 py-2 text-xs sm:text-sm font-medium rounded-lg transition-colors flex justify-center items-center gap-2 ${
            activeTab === 'EXPIRED' ? 'bg-red-50 text-red-700' : 'text-gray-500 hover:text-red-600 hover:bg-red-50/50'
          }`}
        >
          Expirées
        </button>
        <button
          onClick={() => setActiveTab('REJECTED')}
          className={`px-2 py-2 text-xs sm:text-sm font-medium rounded-lg transition-colors flex justify-center items-center gap-2 ${
            activeTab === 'REJECTED' ? 'bg-purple-50 text-purple-700' : 'text-gray-500 hover:text-purple-600 hover:bg-purple-50/50'
          }`}
        >
          Rejetées
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {filteredOrders.length === 0 ? (
          <div className="col-span-full p-10 text-center text-gray-500 bg-white shadow rounded-xl border border-gray-100 flex flex-col items-center justify-center">
            <Package className="w-10 h-10 text-gray-300 mb-3" />
            <p>Aucune commande pour le moment.</p>
          </div>
        ) : (
          filteredOrders.map((order) => (
            <div key={order.id} className="bg-white overflow-hidden shadow-sm rounded-lg border border-gray-100">
              <div className="p-4 flex flex-col md:flex-row gap-4">
                
                {/* Infos Client */}
                <div className="flex-1 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-base font-bold">#{order.order_number}</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                      order.status === 'PAYMENT_PENDING' ? 'bg-yellow-100 text-yellow-800' :
                      (order.status === 'COMPLETED' || order.status === 'PAID') ? 'bg-green-100 text-green-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {order.status === 'PAYMENT_PENDING' ? 'En Attente' : (order.status === 'COMPLETED' || order.status === 'PAID') ? 'Payée' : 'Expirée'}
                    </span>
                  </div>
                  <p className="text-sm font-medium">{order.customers?.name || 'Client Inconnu'}</p>
                  <p className="text-sm text-gray-500">{order.customers?.email} â€¢ {order.customers?.phone}</p>
                  <p className="text-xs text-gray-400">{new Date(order.created_at).toLocaleString('fr-FR')}</p>
                </div>

                {/* Items */}
                <div className="flex-1 border-t md:border-t-0 md:border-l border-gray-100 pt-3 md:pt-0 md:pl-5 space-y-1.5">
                  <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider">Articles :</h4>
                  <ul className="text-xs text-gray-600 space-y-0.5">
                    {order.order_items.map((item, idx) => (
                      <li key={idx}>
                        {item.quantity}x {item.products?.name} ({item.unit_price} HTG)
                      </li>
                    ))}
                  </ul>
                  <p className="text-base font-black mt-2">Total: {order.total_amount} HTG</p>
                </div>

                {/* Paiement & Actions */}
                <div className="flex-1 border-t md:border-t-0 md:border-l border-gray-100 pt-3 md:pt-0 md:pl-5 flex flex-col justify-center">
                  <div className="flex justify-between items-start mb-2 gap-2">
                    <p className="text-xs text-gray-500">Méthode : <span className="font-bold text-gray-700 uppercase">{order.payment_method}</span></p>
                  </div>

                  <div className="flex flex-col 2xl:flex-row gap-2 mt-2 w-full">
                    {order.receipt_url ? (
                      <a href={order.receipt_url} target="_blank" rel="noopener noreferrer" className="flex-1 flex justify-center items-center px-3 py-2 bg-gray-50 hover:bg-gray-100 text-blue-600 border border-gray-200 rounded-lg shadow-sm text-[13px] font-medium transition-colors text-center whitespace-nowrap">
                        <ExternalLink className="w-4 h-4 mr-1.5" />
                        Voir le reçu
                      </a>
                    ) : (
                      <p className="flex-1 flex justify-center items-center px-3 py-2 text-[13px] text-gray-400 italic text-center whitespace-nowrap">Aucun reçu uploadé.</p>
                    )}

                    {order.status === 'PAYMENT_PENDING' && (
                      <>
                        <button 
                          onClick={() => handleConfirmPayment(order.id)}
                          disabled={processingId === order.id}
                          className="flex-1 flex justify-center items-center px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg shadow-sm text-[13px] font-medium transition-colors disabled:opacity-50 whitespace-nowrap"
                        >
                          {processingId === order.id ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : <CheckCircle className="w-3.5 h-3.5 mr-1.5" />}
                          Valider
                        </button>
                        <button 
                          onClick={() => handleRejectProof(order.id)}
                          disabled={processingId === order.id}
                          className="flex-1 flex justify-center items-center px-3 py-2 bg-white border border-red-200 text-red-600 hover:bg-red-50 rounded-lg shadow-sm text-[13px] font-medium transition-colors disabled:opacity-50 whitespace-nowrap"
                        >
                          {processingId === order.id ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : <XCircle className="w-3.5 h-3.5 mr-1.5" />}
                          Preuve non fiable
                        </button>
                      </>
                    )}
                  </div>
                  
                  {(order.status === 'COMPLETED' || order.status === 'PAID') && (
                    <div className="flex items-center text-green-600 font-medium text-xs mt-2">
                      <CheckCircle className="w-4 h-4 mr-1" /> Commande validée
                    </div>
                  )}
                  
                  {(order.status === 'EXPIRED' || order.status === 'REJECTED') && (
                    <div className="flex flex-col gap-1.5 w-full mt-2">
                      <div className="flex items-center text-red-600 font-medium text-xs mb-1">
                        <XCircle className="w-4 h-4 mr-1" /> {order.status === 'REJECTED' ? 'Preuve non fiable' : 'Expirée (Stock libéré)'}
                      </div>
                      <button 
                        onClick={() => handleRestoreOrder(order.id)}
                        disabled={processingId === order.id}
                        className="w-full flex justify-center items-center px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md shadow-sm text-xs font-medium transition-colors disabled:opacity-50"
                      >
                        {processingId === order.id ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : <RefreshCw className="w-3.5 h-3.5 mr-1.5" />}
                        Restaurer / Valider
                      </button>
                    </div>
                  )}
                </div>

              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
