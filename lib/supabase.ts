import { AppState, Platform } from 'react-native'
import 'react-native-url-polyfill/auto'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { createClient, SupabaseClientOptions } from '@supabase/supabase-js'
import config from '../api/config'

// Custom fetch with longer timeout for Android emulator
const customFetch = (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
  const url = typeof input === 'string' ? input : input.toString();
  console.log(`🌐 Network request to: ${url.split('?')[0]}`);
  
  // Increase timeout for database operations
  const timeoutMs = Platform.OS === 'android' ? 30000 : 20000; // Increased to 30s for Android, 20s for others
  
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
        if (!response.ok) {
          console.log(`⚠️ Response not OK from: ${url.split('?')[0]}, status: ${response.status}`);
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        console.log(`✅ Response received from: ${url.split('?')[0]}, status: ${response.status}`);
        resolve(response);
      })
      .catch(error => {
        clearTimeout(timeoutId);
        console.log(`❌ Error in fetch to: ${url.split('?')[0]}:`, error.message);
        if (error.name === 'AbortError') {
          reject(new Error(`Request timed out after ${timeoutMs}ms`));
        } else {
          reject(error);
        }
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
      fetch: customFetch,
      headers: {
        'x-client-info': 'supabase-js-admin',  // Identify admin client
        'apikey': config.supabase.serviceRoleKey  // Explicitly set the service role key
      }
    },
    db: {
      schema: 'public'
    }
  }
);

// Add error handling for admin client
supabaseAdmin.auth.onAuthStateChange((event, session) => {
  if (event === 'SIGNED_OUT') {
    console.log('❌ Admin client session ended');
  } else if (event === 'TOKEN_REFRESHED') {
    console.log('✅ Admin client token refreshed');
  }
});

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