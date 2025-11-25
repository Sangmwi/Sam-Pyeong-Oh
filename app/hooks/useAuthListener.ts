import { useEffect } from 'react';
import { supabase } from '@app/lib/supabase';
import { SupabaseAuthService } from '@app/services/auth/supabase-auth';
import { useAuthStore } from '@app/stores/authStore';

export function useAuthListener() {
  const { setSession, setLoading } = useAuthStore();

  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      try {
        const session = await SupabaseAuthService.getSession();
        if (mounted) {
          setSession(session);
        }
      } catch (error) {
        console.error('[useAuthListener] Session restore failed:', error);
        if (mounted) {
          setLoading(false);
        }
      }
    };

    initializeAuth();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        console.log(`[Auth] Auth state changed: ${_event}`);
        if (mounted) {
          setSession(session);
        }
      }
    );

    return () => {
      mounted = false;
      authListener.subscription.unsubscribe();
    };
  }, [setSession, setLoading]);
}

