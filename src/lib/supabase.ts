import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://kwedbyldfnmalhotffjt.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt3ZWRieWxkZm5tYWxob3RmZmp0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzg2MjE1ODQsImV4cCI6MjA1NDE5NzU4NH0.IQgSlGmg2Xs_89zwF32AskFsbKu1dd5Mq_zVFKiO3zI';

console.log('[Supabase] Initialisation du client Supabase avec URL:', supabaseUrl);

// Créer un intercepteur pour les requêtes Supabase
const loggerPlugin = {
  name: 'logger',
  // Intercepter les requêtes
  fetch: async (url: string, options: any, fetch: any) => {
    const startTime = performance.now();
    
    // Extraire la table et l'opération de l'URL
    const urlObj = new URL(url);
    const path = urlObj.pathname;
    const table = path.includes('/rest/v1/') ? path.split('/rest/v1/')[1] : 'unknown';
    
    console.log(`[Supabase] Début requête ${options.method} vers ${table}`);
    console.log(`[Supabase] URL complète: ${url}`);
    
    try {
      const response = await fetch(url, options);
      const endTime = performance.now();
      
      console.log(`[Supabase] Fin requête ${options.method} vers ${table} (${Math.round(endTime - startTime)}ms)`);
      console.log(`[Supabase] Status: ${response.status} ${response.statusText}`);
      
      // Cloner la réponse pour ne pas la consommer
      return response;
    } catch (error) {
      const endTime = performance.now();
      console.error(`[Supabase] Erreur requête ${options.method} vers ${table} (${Math.round(endTime - startTime)}ms):`, error);
      throw error;
    }
  }
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'pkce'
  },
  global: {
    headers: {
      'X-Client-Info': 'immobilier-mali-web',
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'apikey': supabaseAnonKey,
      'Prefer': 'return=representation'
    }
  },
  // @ts-ignore - Le type n'inclut pas plugins mais c'est supporté
  plugins: [loggerPlugin]
});

// Ajouter un écouteur d'authentification pour le débogage
supabase.auth.onAuthStateChange((event, session) => {
  console.log(`[Supabase Auth] Événement: ${event}`, { 
    userId: session?.user?.id,
    hasSession: !!session,
    timestamp: new Date().toISOString()
  });
});
