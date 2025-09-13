import React, { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { messageCountService } from '../services/messageCountService';
import { User as SupabaseUser, Session } from '@supabase/supabase-js';

// Type étendu pour User avec les propriétés supplémentaires
export interface User extends SupabaseUser {
  user_type?: 'user' | 'agent' | 'admin';
  full_name?: string;
  isAdmin?: boolean; // Ajout du statut admin
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isAdmin: boolean; // Exposer le statut admin
  signIn: (email: string, password: string) => Promise<{ data?: any; error?: any }>;
  signUp: (email: string, password: string, userData?: any) => Promise<{ data?: any; error?: any }>;
  signOut: () => Promise<void>;
  updateProfile: (updates: any) => Promise<{ data?: any; error?: any }>;
  fetchAllUsers: () => Promise<{ data: any[] | null; error: any }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false); // État pour le statut admin

  useEffect(() => {
    const fetchUserDetails = async (supabaseUser: SupabaseUser): Promise<User> => {
      let isAdminUser = false;
      try {
        const { data: userRoles } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', supabaseUser.id)
          .eq('role', 'admin')
          .single();
        isAdminUser = !!userRoles;
      } catch (error) {
        console.warn('Fallback admin check');
        isAdminUser = supabaseUser.email === 'traorehamidou1990@gmail.com';
      }

      return {
        ...supabaseUser,
        full_name: supabaseUser.user_metadata?.full_name || supabaseUser.email,
        user_type: supabaseUser.user_metadata?.user_type || 'client',
        isAdmin: isAdminUser,
      };
    };

    const handleAuthStateChange = async (session: Session | null) => {
      try {
        if (session?.user) {
          const userDetails = await fetchUserDetails(session.user);
          setUser(userDetails);
          setSession(session);
          setIsAdmin(userDetails.isAdmin || false);
          messageCountService.startCountingForUser(userDetails.id);
        } else {
          setUser(null);
          setSession(null);
          setIsAdmin(false);
          messageCountService.stopCounting();
        }
      } catch (e) {
        console.error("Auth error:", e);
        setUser(null);
        setSession(null);
        setIsAdmin(false);
      } finally {
        setLoading(false);
      }
    };

    supabase.auth.getSession().then(({ data: { session } }) => {
      handleAuthStateChange(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      handleAuthStateChange(session);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);


  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { data, error };
  };

  const signUp = async (email: string, password: string, userData?: any) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: userData,
      },
    });
    return { data, error };
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    // Le onAuthStateChange gérera l'arrêt du service
  };

  const fetchAllUsers = async () => {
    try {
      const { data, error } = await supabase.from('profiles').select('*');

      if (error) {
        console.error('Error fetching all users:', error);
        return { data: null, error };
      }

      return { data, error: null };
    } catch (error) {
      console.error('Error in fetchAllUsers:', error);
      return { data: null, error };
    }
  };

  const updateProfile = async (updates: any) => {
    const { data, error } = await supabase.auth.updateUser({
      data: updates,
    });
    return { data, error };
  };

  const value = {
    user,
    session,
    loading,
    isAdmin,
    signIn,
    signUp,
    signOut,
    updateProfile,
    fetchAllUsers,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
