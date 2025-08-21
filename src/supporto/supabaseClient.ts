import { createClient } from '@supabase/supabase-js';

export const supabaseUrl = 'https://kieyhhmxinmdsnfdglrm.supabase.co';  // Metti qui la URL del tuo progetto Supabase
export const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtpZXloaG14aW5tZHNuZmRnbHJtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMyNzUzODYsImV4cCI6MjA2ODg1MTM4Nn0.TKzuTikncXbF5nzaeK__MKNLTvL6hn_eeSzMWsP16tQ'; // Metti qui la chiave anon pubblica


export const CLIENTS_AVATAR_BASE_URL = `${supabaseUrl}/storage/v1/object/public/avatars-clients/`;
export const AVATAR_BASE_URL = `${supabaseUrl}/storage/v1/object/public/avatars/`;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        storage: localStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
    }
});
