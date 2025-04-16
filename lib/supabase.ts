import { AppState, Platform } from 'react-native'
import 'react-native-url-polyfill/auto'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { createClient, SupabaseClientOptions } from '@supabase/supabase-js'
import config from '../api/config'

// Add this new function
export const clearSupabaseStorage = async () => {
  console.log('🧹 [Supabase] Clearing storage...');
  try {
    // Clear all AsyncStorage keys
    const keys = await AsyncStorage.getAllKeys();
    if (keys.length > 0) {
      await AsyncStorage.multiRemove(keys);
      console.log('✅ [Supabase] Cleared all storage keys:', keys);
    } else {
      console.log('ℹ️ [Supabase] No storage to clear');
    }
  } catch (error) {
    console.error('❌ [Supabase] Failed to clear storage:', error);
  }
};

const TIMEOUT_MS = Platform.OS === 'android' ? 30000 : 20000;

// Custom fetch implementation using XMLHttpRequest
const makeSupabaseRequest = (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
  return new Promise((resolve, reject) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
    console.log(`🌐 [Supabase] Making request to:`, url);
    
    const xhr = new XMLHttpRequest();
    xhr.timeout = TIMEOUT_MS;
    
    // Add more specific event listeners
    xhr.addEventListener('loadstart', () => {
      console.log('📡 [Supabase] Request started');
    });

    xhr.addEventListener('progress', (event) => {
      if (event.lengthComputable) {
        console.log(`📡 [Supabase] Progress: ${Math.round((event.loaded / event.total) * 100)}%`);
      }
    });

    xhr.addEventListener('readystatechange', () => {
      console.log(`📡 [Supabase] Ready state: ${xhr.readyState}`);
      
      if (xhr.readyState !== 4) return;

      // Handle network errors
      if (xhr.status === 0) {
        console.error('❌ [Supabase] Network error - unable to connect to server');
        reject(new Error('Unable to connect to Supabase server. Please check your connection and try again.'));
        return;
      }

      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          // For 201 Created responses, we need to parse the response data
          if (xhr.status === 201) {
            console.log('✅ [Supabase] Resource created successfully');
            try {
              const responseText = xhr.responseText || '[]';
              console.log('📥 [Supabase] Creation response:', responseText);
              resolve(new Response(responseText, {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
              }));
              return;
            } catch (error) {
              console.error('❌ [Supabase] Failed to parse creation response:', error);
              reject(new Error('Failed to parse creation response'));
              return;
            }
          }

          // For all other successful responses
          const responseText = xhr.responseText || '[]';
          resolve(new Response(responseText, {
            status: xhr.status,
            statusText: xhr.statusText,
            headers: new Headers({
              'Content-Type': 'application/json'
            })
          }));
        } catch (error) {
          console.error('Failed to parse response:', error);
          reject(new Error('Failed to parse response'));
        }
      } else {
        let errorMessage = `Request failed with status ${xhr.status}`;
        try {
          if (xhr.responseText) {
            const errorData = JSON.parse(xhr.responseText);
            errorMessage = errorData.message || errorData.error || errorMessage;
          }
        } catch (e) {
          // Ignore JSON parse error
        }
        reject(new Error(errorMessage));
      }
    });

    xhr.addEventListener('error', (event) => {
      console.error('❌ [Supabase] Network error:', event);
      reject(new Error('Network request failed. Please check your connection and try again.'));
    });

    xhr.addEventListener('timeout', () => {
      console.error('⏰ [Supabase] Request timed out');
      reject(new Error(`Request timed out after ${TIMEOUT_MS}ms`));
    });

    xhr.addEventListener('abort', () => {
      console.error('🚫 [Supabase] Request aborted');
      reject(new Error('Request was aborted'));
    });

    xhr.open(init?.method || 'GET', url, true);
    
    // Set headers
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...(init?.headers as Record<string, string> || {})
    };

    // Only set API key headers if they're not already set by the Supabase client
    if (!headers['apikey'] && !headers['Authorization']) {
      // Use service role key for /rest/v1/ endpoints, anon key for auth endpoints and others
      const apiKey = url.includes('/rest/v1/') ? config.supabase.serviceRoleKey : config.supabase.anonKey;
      console.log(`🔑 [Supabase] Setting API key for ${url.includes('/rest/v1/') ? 'service role' : 'anon'} request to ${url}`);
      console.log(`🔑 [Supabase] API Key length: ${apiKey?.length || 0}`);
      headers['apikey'] = apiKey;
      headers['Authorization'] = `Bearer ${apiKey}`;
    } else {
      // Override with service role key for /rest/v1/ endpoints even if headers exist
      if (url.includes('/rest/v1/')) {
        console.log('🔑 [Supabase] Overriding with service role key for REST endpoint');
        headers['apikey'] = config.supabase.serviceRoleKey;
        headers['Authorization'] = `Bearer ${config.supabase.serviceRoleKey}`;
      } else {
        console.log('🔑 [Supabase] Using existing API key headers');
      }
    }

    // Add Prefer header for POST/PUT requests
    if (init?.method === 'POST' || init?.method === 'PUT') {
      headers['Prefer'] = 'return=representation';
    }

    // Set all headers
    Object.entries(headers).forEach(([key, value]) => {
      if (value) xhr.setRequestHeader(key, value);
    });

    // Log all headers being sent (safely)
    console.log('📤 [Supabase] Request headers:', {
      ...headers,
      apikey: headers['apikey'] ? `${headers['apikey'].substring(0, 10)}...` : undefined,
      Authorization: headers['Authorization'] ? `${headers['Authorization'].substring(0, 20)}...` : undefined
    });

    // Send request
    xhr.send(init?.body);
  });
};

// Configure Supabase client
const supabaseOptions = {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
  global: {
    fetch: makeSupabaseRequest,
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'apikey': config.supabase.anonKey,
      'Authorization': `Bearer ${config.supabase.anonKey}`
    }
  }
};

// Create Supabase clients
console.log('🔧 [Supabase] Initializing clients with URL:', config.supabase.url);
console.log('🔧 [Supabase] Anon key length:', config.supabase.anonKey?.length || 0);
console.log('🔧 [Supabase] Service role key length:', config.supabase.serviceRoleKey?.length || 0);

export const supabase = createClient(
  config.supabase.url,
  config.supabase.anonKey,
  supabaseOptions
);

export const supabaseAdmin = createClient(
  config.supabase.url,
  config.supabase.serviceRoleKey,
  {
    ...supabaseOptions,
    global: {
      ...supabaseOptions.global,
      headers: {
        ...supabaseOptions.global.headers,
        'x-client-info': 'supabase-js-admin',
        'apikey': config.supabase.serviceRoleKey,
        'Authorization': `Bearer ${config.supabase.serviceRoleKey}`
      }
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
// if the app is in the foreground
AppState.addEventListener('change', (state) => {
  if (state === 'active') {
    supabase.auth.startAutoRefresh();
  } else {
    supabase.auth.stopAutoRefresh();
  }
}); 