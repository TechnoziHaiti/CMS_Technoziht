import { useEffect } from 'react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

const INACTIVITY_LIMIT = 30 * 60 * 1000; // 30 minutes in ms

export default function AutoLogout() {
  useEffect(() => {
    let timeoutId: number;
    let intervalId: number;

    const logout = async () => {
      try {
        await supabase.auth.signOut();
        localStorage.removeItem('lastActivity');
        toast.error('Déconnecté pour inactivité (30 min)');
      } catch (err) {
        console.error('Logout error', err);
      }
    };

    const checkInactivity = () => {
      const lastActivity = localStorage.getItem('lastActivity');
      if (lastActivity) {
        const timeSinceLastActivity = Date.now() - parseInt(lastActivity, 10);
        if (timeSinceLastActivity >= INACTIVITY_LIMIT) {
          logout();
        }
      }
    };

    const updateActivity = () => {
      localStorage.setItem('lastActivity', Date.now().toString());
      window.clearTimeout(timeoutId);
      timeoutId = window.setTimeout(checkInactivity, INACTIVITY_LIMIT);
    };

    // Vérification immédiate (utile si l'ordi s'est mis en veille ou l'onglet a été fermé)
    checkInactivity();
    
    // Vérification périodique (car les navigateurs mettent souvent en pause les setTimeout en arrière-plan)
    intervalId = window.setInterval(checkInactivity, 60000); // toutes les minutes

    // Événements à surveiller pour l'activité
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];

    // Limitation des mises à jour du localStorage pour ne pas ralentir le site (max 1 fois par seconde)
    let lastUpdate = 0;
    const throttledUpdateActivity = () => {
      const now = Date.now();
      if (now - lastUpdate > 1000) { 
        updateActivity();
        lastUpdate = now;
      }
    };

    // Ajout des écouteurs d'événements
    events.forEach(event => {
      document.addEventListener(event, throttledUpdateActivity, { passive: true });
    });

    // Initialisation
    updateActivity();

    return () => {
      window.clearTimeout(timeoutId);
      window.clearInterval(intervalId);
      events.forEach(event => {
        document.removeEventListener(event, throttledUpdateActivity);
      });
    };
  }, []);

  return null;
}
