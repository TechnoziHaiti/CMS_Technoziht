import { useState, useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import toast from 'react-hot-toast';
import {
  Mail, CheckCircle, Search, RefreshCw, MessageSquare,
  Trash2, X, UserPlus, Loader2, Send, ChevronLeft,
  Phone, Calendar, Tag
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

const SUPABASE_URL = 'https://dkkofpznrlyeigdafctg.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRra29mcHpucmx5ZWlnZGFmY3RnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MzU5NTYzNywiZXhwIjoyMDk5MTcxNjM3fQ.SLCDvhRWeQAX1MPom7glcMz2IhZd3MlGdTywoU2SlCY';
const db = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
});

type Technician = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  department: string;
  specialty: string;
  status: 'AVAILABLE' | 'BUSY' | 'INACTIVE';
};

type ContactMessage = {
  id: string;
  name: string;
  email: string;
  phone: string;
  service: string;
  message: string;
  status: 'UNREAD' | 'READ';
  created_at: string;
  technician_id?: string;
  priority?: string;
  scheduled_at?: string;
  assignment_status?: string;
  technicians?: Technician;
  message_history?: {
    id: string;
    action: string;
    actor_email: string;
    details: any;
    created_at: string;
  }[];
};

type Reply = {
  id: string;
  message_id: string;
  content: string;
  sent_by: 'admin';
  created_at: string;
};

function formatTime(dateStr: string) {
  const d = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 1) return "À l'instant";
  if (mins < 60) return `il y a ${mins} min`;
  if (hours < 24) return `il y a ${hours}h`;
  if (days < 7) return `il y a ${days}j`;
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

export default function Messages() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMessage, setSelectedMessage] = useState<ContactMessage | null>(null);
  const [replies, setReplies] = useState<Reply[]>([]);
  const [loadingReplies, setLoadingReplies] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [sendingReply, setSendingReply] = useState(false);
  const threadBottomRef = useRef<HTMLDivElement>(null);

  // Assignment Modal State
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [techSearch, setTechSearch] = useState('');
  const [selectedTechForAssign, setSelectedTechForAssign] = useState<Technician | null>(null);
  const [assignForm, setAssignForm] = useState({ date: '', time: '', priority: 'NORMAL' });
  const [assigning, setAssigning] = useState(false);

  const fetchMessages = async () => {
    setLoading(true);
    try {
      const { data, error } = await db
        .from('contact_messages')
        .select(`
          *,
          technicians (*),
          message_history (*)
        `)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setMessages(data as ContactMessage[] || []);
      
      // Update selected message if it exists
      if (selectedMessage) {
        const updated = data.find(m => m.id === selectedMessage.id);
        if (updated) setSelectedMessage(updated as ContactMessage);
      }
    } catch (error: any) {
      toast.error(error.message || 'Impossible de récupérer les messages');
    } finally {
      setLoading(false);
    }
  };

  const fetchReplies = async (messageId: string) => {
    setLoadingReplies(true);
    try {
      const { data, error } = await db
        .from('message_replies')
        .select('*')
        .eq('message_id', messageId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      setReplies(data as Reply[] || []);
    } catch {
      setReplies([]);
    } finally {
      setLoadingReplies(false);
    }
  };

  const fetchTechnicians = async () => {
    try {
      const { data, error } = await db
        .from('technicians')
        .select('*')
        .eq('is_deleted', false)
        .order('status', { ascending: true }); // AVAILABLE first
      if (!error) setTechnicians(data || []);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchMessages();
    fetchTechnicians();
  }, []);

  useEffect(() => {
    if (selectedMessage) {
      setTimeout(() => {
        threadBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  }, [replies, selectedMessage]);

  const handleOpenMessage = async (message: ContactMessage) => {
    setSelectedMessage(message);
    setReplyText('');
    fetchReplies(message.id);

    if (message.status === 'UNREAD') {
      setMessages(prev => prev.map(m => m.id === message.id ? { ...m, status: 'READ' } : m));
      await db.from('contact_messages').update({ status: 'READ' }).eq('id', message.id);
      
      // Log Read history
      await db.from('message_history').insert({
        message_id: message.id,
        action: 'READ',
        actor_email: user?.email || 'Admin',
      });
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('Supprimer ce message définitivement ?')) return;
    const { error } = await db.from('contact_messages').delete().eq('id', id);
    if (error) { toast.error('Erreur suppression'); return; }
    setMessages(prev => prev.filter(m => m.id !== id));
    if (selectedMessage?.id === id) setSelectedMessage(null);
    toast.success('Message supprimé');
  };

  const handleSendReply = async () => {
    if (!selectedMessage || !replyText.trim()) return;
    setSendingReply(true);
    try {
      const { data: savedReply, error: dbError } = await db
        .from('message_replies')
        .insert({
          message_id: selectedMessage.id,
          content: replyText.trim(),
          sent_by: 'admin',
        })
        .select()
        .single();

      if (dbError) throw new Error('Erreur DB: ' + dbError.message);

      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5005';
      const res = await fetch(`${API_URL}/api/admin/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: selectedMessage.email,
          name: selectedMessage.name,
          originalService: selectedMessage.service,
          originalMessage: selectedMessage.message,
          replyMessage: replyText.trim(),
        }),
      });

      if (!res.ok) {
        toast('Réponse sauvegardée. Email non envoyé (backend hors ligne?)', { icon: '⚠️' });
      } else {
        toast.success(`Réponse envoyée à ${selectedMessage.name}`);
      }

      setReplies(prev => [...prev, savedReply as Reply]);
      setReplyText('');
    } catch (err: any) {
      toast.error(err.message || 'Erreur lors de l\'envoi');
    } finally {
      setSendingReply(false);
    }
  };

  const handleAssign = async () => {
    if (!selectedTechForAssign || !assignForm.date || !assignForm.time || !selectedMessage) {
      toast.error('Veuillez remplir tous les champs');
      return;
    }

    setAssigning(true);
    try {
      // 1. Update Message
      const scheduledDateTime = `${assignForm.date}T${assignForm.time}:00`;
      await db.from('contact_messages').update({
        technician_id: selectedTechForAssign.id,
        priority: assignForm.priority,
        scheduled_at: scheduledDateTime,
        assignment_status: 'ASSIGNED'
      }).eq('id', selectedMessage.id);

      // 2. Update Technician status to BUSY
      await db.from('technicians').update({ status: 'BUSY' }).eq('id', selectedTechForAssign.id);

      // 3. Log History
      await db.from('message_history').insert({
        message_id: selectedMessage.id,
        action: selectedMessage.technician_id ? 'REASSIGNED' : 'ASSIGNED',
        actor_email: user?.email || 'Admin',
        details: {
          technician_name: `${selectedTechForAssign.first_name} ${selectedTechForAssign.last_name}`,
          priority: assignForm.priority,
          scheduled_at: scheduledDateTime
        }
      });

      // 4. Send Email via Backend
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5005';
      const res = await fetch(`${API_URL}/api/admin/assign-technician`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messageId: selectedMessage.id,
          technician: selectedTechForAssign,
          clientInfo: {
            name: selectedMessage.name,
            phone: selectedMessage.phone,
            service: selectedMessage.service,
            description: selectedMessage.message
          },
          assignmentDetails: {
            date: assignForm.date,
            time: assignForm.time,
            priority: assignForm.priority
          },
          adminEmail: user?.email
        }),
      });

      if (!res.ok) {
        toast('Technicien assigné mais erreur d\'envoi email.', { icon: '⚠️' });
      } else {
        toast.success('Ordre de mission envoyé !');
      }

      setShowAssignModal(false);
      fetchMessages(); // Refresh UI
      
    } catch (e: any) {
      toast.error('Erreur lors de l\'assignation: ' + e.message);
    } finally {
      setAssigning(false);
    }
  };

  const openAssignModal = () => {
    if (selectedMessage?.technician_id) {
      const currentTech = technicians.find(t => t.id === selectedMessage.technician_id);
      if (currentTech) setSelectedTechForAssign(currentTech);
    } else {
      setSelectedTechForAssign(null);
    }
    
    // Preset Date to Tomorrow if not set
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateStr = tomorrow.toISOString().split('T')[0];
    
    setAssignForm({
      date: selectedMessage?.scheduled_at ? selectedMessage.scheduled_at.split('T')[0] : dateStr,
      time: selectedMessage?.scheduled_at ? selectedMessage.scheduled_at.split('T')[1].substring(0,5) : '09:00',
      priority: selectedMessage?.priority || 'NORMAL'
    });
    
    setShowAssignModal(true);
  };

  const unreadCount = messages.filter(m => m.status === 'UNREAD').length;
  const filteredMessages = messages.filter(msg =>
    msg.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    msg.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    msg.service.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredTechs = technicians.filter(t => 
    t.status !== 'INACTIVE' &&
    (t.first_name.toLowerCase().includes(techSearch.toLowerCase()) ||
     t.last_name.toLowerCase().includes(techSearch.toLowerCase()) ||
     t.specialty.toLowerCase().includes(techSearch.toLowerCase()) ||
     t.department.toLowerCase().includes(techSearch.toLowerCase()))
  );

  return (
    <div className="h-full flex flex-col" style={{ height: 'calc(100vh - 64px)' }}>

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 flex-shrink-0 gap-4">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Messages</h1>
          {unreadCount > 0 && (
            <span className="inline-flex items-center justify-center h-5 min-w-[20px] px-1.5 text-[11px] font-bold bg-red-500 text-white rounded-full">
              {unreadCount}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-4 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 w-52"
            />
          </div>
          <button
            onClick={fetchMessages}
            disabled={loading}
            className="p-2 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Main layout: list + thread */}
      <div className="flex flex-1 gap-4 min-h-0">

        {/* ── Messages list ── */}
        <div className={`flex flex-col bg-white dark:bg-[#111827] border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden flex-shrink-0 transition-all ${selectedMessage ? 'w-80 hidden md:flex' : 'flex-1'}`}>
          {loading && messages.length === 0 ? (
            <div className="flex-1 flex items-center justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            </div>
          ) : filteredMessages.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-400 gap-2 p-8">
              <MessageSquare className="w-10 h-10 opacity-30" />
              <p className="text-sm">Aucun message</p>
            </div>
          ) : (
            <div className="overflow-y-auto flex-1">
              {filteredMessages.map((msg) => (
                <button
                  key={msg.id}
                  onClick={() => handleOpenMessage(msg)}
                  className={`w-full text-left px-4 py-4 border-b border-gray-100 dark:border-gray-800 transition-colors relative group ${
                    selectedMessage?.id === msg.id
                      ? 'bg-blue-50 dark:bg-blue-900/20'
                      : 'hover:bg-gray-50 dark:hover:bg-gray-800/40'
                  }`}
                >
                  {msg.status === 'UNREAD' && (
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-blue-500" />
                  )}
                  <div className="flex items-start gap-3 pl-2">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
                      msg.status === 'UNREAD'
                        ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-400'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                    }`}>
                      {msg.name?.charAt(0).toUpperCase() || '?'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className={`text-sm truncate ${msg.status === 'UNREAD' ? 'font-semibold text-gray-900 dark:text-white' : 'font-medium text-gray-700 dark:text-gray-300'}`}>
                          {msg.name}
                        </span>
                        <span className="text-[10px] text-gray-400 shrink-0">{formatTime(msg.created_at)}</span>
                      </div>
                      <p className="text-xs text-blue-600 dark:text-blue-400 truncate mt-0.5">{msg.service}</p>
                      <p className="text-xs text-gray-400 truncate mt-0.5">{msg.message}</p>
                      {msg.assignment_status === 'ASSIGNED' && (
                        <div className="mt-2 inline-flex items-center gap-1 text-[10px] bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400 px-1.5 py-0.5 rounded border border-green-200 dark:border-green-900/50">
                          <CheckCircle className="w-2.5 h-2.5" /> Assigné
                        </div>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={(e) => handleDelete(msg.id, e)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md opacity-0 group-hover:opacity-100 transition-all"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ── Thread view ── */}
        {selectedMessage ? (
          <div className="flex-1 flex flex-col bg-white dark:bg-[#111827] border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden min-h-0 relative">

            {/* Thread header */}
            <div className="flex flex-col border-b border-gray-100 dark:border-gray-800 flex-shrink-0">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 px-4 py-3">
                <div className="flex items-center gap-3 w-full sm:w-auto min-w-0">
                  <button
                  onClick={() => setSelectedMessage(null)}
                  className="md:hidden p-1.5 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 rounded-lg"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <div className="w-9 h-9 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center text-sm font-bold text-blue-700 dark:text-blue-400 shrink-0">
                  {selectedMessage.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{selectedMessage.name}</p>
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="text-xs text-gray-400">{selectedMessage.email}</span>
                    {selectedMessage.phone && (
                      <span className="text-xs text-gray-400 flex items-center gap-1">
                        <Phone className="w-3 h-3" />{selectedMessage.phone}
                      </span>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto justify-end sm:justify-start mt-2 sm:mt-0">
                  <span className="hidden sm:inline-flex items-center px-2 py-1 text-[11px] font-semibold bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 border border-orange-200 dark:border-orange-800/30 rounded">
                    <Tag className="w-3 h-3 mr-1" />{selectedMessage.service}
                  </span>
                  <button
                    onClick={openAssignModal}
                    className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400 dark:hover:bg-blue-900/50 rounded-lg transition-colors border border-blue-200 dark:border-blue-800/50"
                  >
                    <UserPlus className="w-4 h-4" />
                    {selectedMessage.assignment_status === 'ASSIGNED' ? 'Réassigner' : 'Assigner'}
                  </button>
                  <button
                    onClick={() => setSelectedMessage(null)}
                    className="p-1.5 ml-2 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors hidden sm:block"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Technician Assigned Banner */}
              {selectedMessage.assignment_status === 'ASSIGNED' && selectedMessage.technicians && (
                <div className="bg-blue-50/50 dark:bg-blue-900/10 px-4 py-2 flex items-center gap-3 border-t border-blue-100 dark:border-blue-900/30">
                  <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-xs">
                    {selectedMessage.technicians.first_name?.[0] || ''}{selectedMessage.technicians.last_name?.[0] || ''}
                  </div>
                  <div className="flex-1">
                    <p className="text-[13px] font-medium text-gray-900 dark:text-white">
                      Technicien: {selectedMessage.technicians.first_name} {selectedMessage.technicians.last_name}
                    </p>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400 flex items-center gap-2">
                      <span>{selectedMessage.technicians.phone}</span>
                      <span>•</span>
                      <span>Prévu le : {new Date(selectedMessage.scheduled_at!).toLocaleDateString('fr-FR')} à {selectedMessage.scheduled_at!.split('T')[1].substring(0,5)}</span>
                      <span>•</span>
                      <span className="font-bold text-amber-600 dark:text-amber-500">{selectedMessage.priority}</span>
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Thread messages & History */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 bg-gray-50/50 dark:bg-gray-900/20">
              
              <div className="flex items-center justify-center">
                <span className="text-[11px] text-gray-400 bg-gray-100 dark:bg-gray-800 px-3 py-1 rounded-full flex items-center gap-1.5">
                  <Calendar className="w-3 h-3" />
                  Demande créée le {new Date(selectedMessage.created_at).toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </span>
              </div>

              {/* Original client message (left bubble) */}
              <div className="flex items-end gap-2 justify-start">
                <div className="w-7 h-7 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center text-xs font-bold text-blue-700 dark:text-blue-400 shrink-0">
                  {selectedMessage.name.charAt(0).toUpperCase()}
                </div>
                <div className="max-w-[75%]">
                  <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm">
                    <p className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap break-all leading-relaxed">{selectedMessage.message}</p>
                  </div>
                  <p className="text-[10px] text-gray-400 mt-1 ml-1">
                    {new Date(selectedMessage.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>

              {/* Insert History logs inline */}
              {selectedMessage.message_history?.sort((a,b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()).map((hist) => (
                <div key={hist.id} className="flex justify-center my-4">
                  <div className="bg-gray-100 dark:bg-gray-800 px-4 py-2 rounded-lg text-xs text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-700/50 max-w-md text-center">
                    <span className="font-semibold block mb-0.5 text-gray-700 dark:text-gray-300">
                      {hist.action === 'READ' ? 'Consulté' : 
                       hist.action === 'ASSIGNED' ? 'Assigné au technicien' : 
                       hist.action === 'REASSIGNED' ? 'Réassigné à un autre technicien' : hist.action} par {hist.actor_email}
                    </span>
                    {hist.details?.technician_name && (
                      <span className="block text-[10px]">Technicien : {hist.details.technician_name} | Date : {new Date(hist.details.scheduled_at).toLocaleString('fr-FR')}</span>
                    )}
                    <span className="block mt-1 text-[10px] opacity-75">{new Date(hist.created_at).toLocaleString('fr-FR')}</span>
                  </div>
                </div>
              ))}

              {/* Replies */}
              {loadingReplies ? (
                <div className="flex justify-center py-4">
                  <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                </div>
              ) : (
                replies.map((reply) => (
                  <div key={reply.id} className="flex items-end gap-2 justify-end">
                    <div className="max-w-[75%]">
                      <div className="bg-blue-600 rounded-2xl rounded-br-sm px-4 py-3 shadow-sm">
                        <p className="text-sm text-white whitespace-pre-wrap break-all leading-relaxed">{reply.content}</p>
                      </div>
                      <p className="text-[10px] text-gray-400 mt-1 text-right mr-1">
                        {new Date(reply.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })} · Vous
                      </p>
                    </div>
                    <div className="w-7 h-7 rounded-full bg-gray-900 dark:bg-gray-100 flex items-center justify-center text-xs font-bold text-white dark:text-gray-900 shrink-0">
                      A
                    </div>
                  </div>
                ))
              )}

              <div ref={threadBottomRef} />
            </div>

            {/* Reply input */}
            <div className="border-t border-gray-100 dark:border-gray-800 p-3 flex-shrink-0 bg-white dark:bg-[#111827]">
              <div className="flex items-end gap-2">
                <div className="flex-1 relative">
                  <textarea
                    value={replyText}
                    onChange={e => setReplyText(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendReply();
                      }
                    }}
                    placeholder={`Répondre à ${selectedMessage.name}... (Entrée pour envoyer)`}
                    rows={1}
                    className="w-full px-4 py-2.5 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none transition"
                    style={{ maxHeight: '120px', overflowY: 'auto' }}
                    onInput={e => {
                      const t = e.target as HTMLTextAreaElement;
                      t.style.height = 'auto';
                      t.style.height = Math.min(t.scrollHeight, 120) + 'px';
                    }}
                  />
                </div>
                <button
                  onClick={handleSendReply}
                  disabled={!replyText.trim() || sendingReply}
                  className="p-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shrink-0 shadow-sm"
                >
                  {sendingReply ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Modal Assignation */}
            {showAssignModal && (
              <div className="absolute inset-0 z-50 bg-black/40 backdrop-blur-sm flex justify-end">
                <div className="w-full max-w-md bg-white dark:bg-[#1e293b] h-full shadow-2xl flex flex-col transform transition-transform animate-slide-in-right">
                  <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                      Assigner un Technicien
                    </h2>
                    <button onClick={() => setShowAssignModal(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full">
                      <X className="w-5 h-5 text-gray-500" />
                    </button>
                  </div>
                  
                  <div className="p-4 border-b border-gray-100 dark:border-gray-800">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input 
                        type="text" 
                        placeholder="Rechercher par nom, spé, dep..."
                        value={techSearch}
                        onChange={e => setTechSearch(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-sm bg-gray-50 dark:bg-gray-900/50 text-gray-900 dark:text-white"
                      />
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {filteredTechs.map(tech => (
                      <div 
                        key={tech.id} 
                        onClick={() => setSelectedTechForAssign(tech)}
                        className={`p-4 rounded-xl border cursor-pointer transition-all ${
                          selectedTechForAssign?.id === tech.id 
                            ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-900/20 ring-1 ring-blue-500' 
                            : 'border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700'
                        }`}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex gap-3">
                            <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center font-bold text-gray-600 dark:text-gray-300">
                              {tech.first_name[0]}{tech.last_name[0]}
                            </div>
                            <div>
                              <p className="font-semibold text-gray-900 dark:text-white">{tech.first_name} {tech.last_name}</p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">{tech.department} • {tech.specialty}</p>
                            </div>
                          </div>
                          {tech.status === 'AVAILABLE' ? (
                            <span className="w-3 h-3 bg-green-500 rounded-full border border-white" title="Disponible"></span>
                          ) : (
                            <span className="w-3 h-3 bg-yellow-500 rounded-full border border-white" title="Occupé"></span>
                          )}
                        </div>
                        <div className="flex flex-col gap-1 text-xs text-gray-500 dark:text-gray-400 mt-3">
                          <span className="flex items-center gap-1"><Mail className="w-3 h-3"/> {tech.email}</span>
                          {tech.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3"/> {tech.phone}</span>}
                        </div>
                      </div>
                    ))}
                  </div>

                  {selectedTechForAssign && (
                    <div className="p-6 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-200 dark:border-gray-800">
                      <h3 className="text-sm font-semibold mb-4 text-gray-900 dark:text-white">Détails de planification</h3>
                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Date *</label>
                          <input type="date" value={assignForm.date} onChange={e => setAssignForm({...assignForm, date: e.target.value})} className="w-full text-sm p-2 border border-gray-300 dark:border-gray-700 rounded-lg dark:bg-gray-800" />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Heure *</label>
                          <input type="time" value={assignForm.time} onChange={e => setAssignForm({...assignForm, time: e.target.value})} className="w-full text-sm p-2 border border-gray-300 dark:border-gray-700 rounded-lg dark:bg-gray-800" />
                        </div>
                      </div>
                      <div className="mb-6">
                        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Priorité *</label>
                        <select value={assignForm.priority} onChange={e => setAssignForm({...assignForm, priority: e.target.value})} className="w-full text-sm p-2 border border-gray-300 dark:border-gray-700 rounded-lg dark:bg-gray-800">
                          <option value="LOW">Faible</option>
                          <option value="NORMAL">Normale</option>
                          <option value="HIGH">Haute</option>
                          <option value="URGENT">Urgente</option>
                        </select>
                      </div>
                      <button 
                        onClick={handleAssign}
                        disabled={assigning}
                        className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
                      >
                        {assigning ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle className="w-5 h-5" />}
                        {assigning ? 'Envoi en cours...' : 'Attribuer cette intervention'}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

          </div>
        ) : (
          <div className="hidden md:flex flex-1 flex-col items-center justify-center text-gray-400 bg-gray-50/50 dark:bg-[#111827] border border-gray-200 dark:border-gray-800 rounded-xl gap-4">
            <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
              <Mail className="w-8 h-8 text-gray-300 dark:text-gray-600" />
            </div>
            <p className="text-lg font-medium text-gray-500 dark:text-gray-400">Sélectionnez un message</p>
          </div>
        )}
      </div>
      <style>{`
        @keyframes slide-in-right {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        .animate-slide-in-right {
          animation: slide-in-right 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
      `}</style>
    </div>
  );
}
