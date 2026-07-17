import { useEffect } from 'react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

export default function AutoLogout() {
  useEffect(() => {
    let timeoutId: number;

    const logout = async () => {
      try {
        await supabase.auth.signOut();
        toast.error('Déconnecté pour inactivité (30 min)');
      } catch (err) {
        console.error('Logout error', err);
      }
    };

    const resetTimer = () => {
      window.clearTimeout(timeoutId);
      // 30 minutes = 30 * 60 * 1000 = 1800000 ms
      timeoutId = window.setTimeout(logout, 1800000);
    };

    // Events to monitor for activity
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];

    // Add event listeners
    events.forEach(event => {
      document.addEventListener(event, resetTimer, { passive: true });
    });

    // Initialize the timer
    resetTimer();

    return () => {
      window.clearTimeout(timeoutId);
      events.forEach(event => {
        document.removeEventListener(event, resetTimer);
      });
    };
  }, []);

  return null;
}
