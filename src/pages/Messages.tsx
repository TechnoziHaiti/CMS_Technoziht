import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import { Trash2, Loader2, Mail, MailOpen, Check } from 'lucide-react';

type Message = {
  id: string;
  name: string;
  email: string;
  message: string;
  status: boolean; // false = non lu, true = lu
  created_at: string;
};

export default function Messages() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMessages = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('messages').select('*').order('created_at', { ascending: false });
    if (error) {
      toast.error('Erreur lors du chargement des messages');
    } else {
      setMessages(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchMessages();
  }, []);

  const markAsRead = async (id: string, currentStatus: boolean) => {
    if (currentStatus) return; // Déjà lu

    const { error } = await supabase.from('messages').update({ status: true }).eq('id', id);
    if (error) {
      toast.error('Erreur lors de la mise à jour');
    } else {
      // Mettre à jour l'état localement pour éviter un re-fetch complet
      setMessages(messages.map(msg => msg.id === id ? { ...msg, status: true } : msg));
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Voulez-vous vraiment supprimer ce message ?')) {
      const { error } = await supabase.from('messages').delete().eq('id', id);
      if (error) {
        toast.error('Erreur lors de la suppression');
      } else {
        toast.success('Message supprimé');
        fetchMessages();
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
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Messages (Contact)</h1>
        <p className="mt-1 text-sm text-gray-500">Gérez les messages reçus depuis le formulaire de contact.</p>
      </div>

      <div className="bg-white shadow rounded-xl border border-gray-100 overflow-hidden">
        <ul className="divide-y divide-gray-200">
          {messages.length === 0 ? (
            <li className="p-6 text-center text-gray-500">Aucun message reçu.</li>
          ) : (
            messages.map((msg) => (
              <li 
                key={msg.id} 
                className={`p-6 transition-colors ${msg.status ? 'bg-white' : 'bg-blue-50/30'}`}
                onClick={() => markAsRead(msg.id, msg.status)}
              >
                <div className="flex justify-between items-start">
                  <div className="flex items-start">
                    <div className="flex-shrink-0 mt-1">
                      {msg.status ? (
                        <MailOpen className="w-5 h-5 text-gray-400" />
                      ) : (
                        <Mail className="w-5 h-5 text-primary-500" />
                      )}
                    </div>
                    <div className="ml-4">
                      <div className="flex items-center">
                        <h3 className={`text-sm font-medium ${msg.status ? 'text-gray-900' : 'text-primary-900 font-bold'}`}>
                          {msg.name}
                        </h3>
                        <span className="mx-2 text-gray-300">•</span>
                        <a href={`mailto:${msg.email}`} className="text-sm text-gray-500 hover:text-primary-600">
                          {msg.email}
                        </a>
                      </div>
                      <p className={`mt-2 text-sm ${msg.status ? 'text-gray-600' : 'text-gray-800 font-medium'}`}>
                        {msg.message}
                      </p>
                      <p className="mt-2 text-xs text-gray-400">
                        {new Date(msg.created_at).toLocaleString('fr-FR')}
                      </p>
                    </div>
                  </div>
                  <div className="flex space-x-2 ml-4">
                    {!msg.status && (
                      <button 
                        onClick={(e) => { e.stopPropagation(); markAsRead(msg.id, msg.status); }} 
                        className="text-primary-600 hover:text-primary-900 p-2 rounded-full hover:bg-primary-50"
                        title="Marquer comme lu"
                      >
                        <Check className="w-5 h-5" />
                      </button>
                    )}
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleDelete(msg.id); }} 
                      className="text-red-600 hover:text-red-900 p-2 rounded-full hover:bg-red-50"
                      title="Supprimer"
                    >
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
