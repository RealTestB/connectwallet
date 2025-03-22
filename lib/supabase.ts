import { AppState, Platform } from 'react-native'
import 'react-native-url-polyfill/auto'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { createClient, SupabaseClientOptions } from '@supabase/supabase-js'
import config from '../api/config'

// Custom fetch with longer timeout for Android emulator
const customFetch = (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
  const url = typeof input === 'string' ? input : input.toString();
  console.log(`🌐 Network request to: ${url.split('?')[0]}`);
  
  // Set longer timeout for Android emulator
  const timeoutMs = Platform.OS === 'android' ? 15000 : 10000;
  
  return new Promise<Response>((resolve, reject) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      console.log(`⏱️ Request timeout after ${timeoutMs}ms: ${url.split('?')[0]}`);
      controller.abort();
    }, timeoutMs);
    
    const options = init || {};
    options.signal = controller.signal;
    
    fetch(input, options)
      .then(response => {
        clearTimeout(timeoutId);
        console.log(`✅ Response received from: ${url.split('?')[0]}, status: ${response.status}`);
        resolve(response);
      })
      .catch(error => {
        clearTimeout(timeoutId);
        console.log(`❌ Error in fetch to: ${url.split('?')[0]}`, error);
        reject(error);
      });
  });
};

// Supabase client options with custom fetch
const supabaseOptions: SupabaseClientOptions<'public'> = {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
  global: {
    fetch: customFetch
  }
};

// Public client for client-side operations (with limited permissions)
export const supabase = createClient(
  config.supabase.url, 
  config.supabase.anonKey, 
  supabaseOptions
);

// Admin client for trusted operations (with full permissions)
export const supabaseAdmin = createClient(
  config.supabase.url, 
  config.supabase.serviceRoleKey, 
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false
    },
    global: {
      fetch: customFetch
    },
    db: {
      schema: 'public'
    }
  }
);

// Tells Supabase Auth to continuously refresh the session automatically
// if the app is in the foreground. When this is added, you will continue
// to receive `onAuthStateChange` events with the `TOKEN_REFRESHED` or
// `SIGNED_OUT` event if the user's session is terminated. This should
// only be registered once.
AppState.addEventListener('change', (state) => {
  if (state === 'active') {
    supabase.auth.startAutoRefresh()
  } else {
    supabase.auth.stopAutoRefresh()
  }
}) 