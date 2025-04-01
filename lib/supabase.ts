import { AppState, Platform } from 'react-native'
import 'react-native-url-polyfill/auto'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { createClient, SupabaseClientOptions } from '@supabase/supabase-js'
import config from '../api/config'

const TIMEOUT_MS = Platform.OS === 'android' ? 30000 : 20000;

// Custom fetch implementation using XMLHttpRequest
const makeSupabaseRequest = (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
  return new Promise((resolve, reject) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
    console.log(`🌐 [Supabase] Making request to:`, url);
    
    const xhr = new XMLHttpRequest();
    xhr.timeout = TIMEOUT_MS;
    
    xhr.addEventListener('readystatechange', () => {
      if (xhr.readyState !== 4) return;
      
      console.log(`✅ [Supabase] Response received:`, {
        status: xhr.status,
        statusText: xhr.statusText,
        hasResponse: !!xhr.responseText
      });
      
      if ((xhr.status >= 200 && xhr.status < 300)) {
        try {
          // For 201 Created with no content, return empty array
          const responseText = xhr.status === 201 && !xhr.responseText ? '[]' : xhr.responseText;
          
          // Create a simple Response object with the text
          const response = new Response(responseText, {
            status: xhr.status,
            statusText: xhr.statusText || '',
            headers: new Headers({
              'Content-Type': 'application/json'
            })
          });
          resolve(response);
        } catch (error) {
          console.error(`❌ [Supabase] Failed to create response:`, error);
          reject(new Error('Failed to create response'));
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
        
        console.error(`❌ [Supabase] Request failed:`, {
          status: xhr.status,
          statusText: xhr.statusText,
          responseText: xhr.responseText,
          errorMessage
        });
        reject(new Error(errorMessage));
      }
    });

    xhr.addEventListener('error', () => {
      console.error(`❌ [Supabase] Network request failed`);
      reject(new Error('Network request failed'));
    });

    xhr.addEventListener('timeout', () => {
      console.error(`❌ [Supabase] Request timed out after ${TIMEOUT_MS}ms`);
      reject(new Error(`Request timed out after ${TIMEOUT_MS}ms`));
    });

    try {
      xhr.open(init?.method || 'GET', url);
      
      // Set default headers
      xhr.setRequestHeader('Content-Type', 'application/json');
      xhr.setRequestHeader('Accept', 'application/json');
      
      // Set custom headers
      if (init?.headers) {
        Object.entries(init.headers).forEach(([key, value]) => {
          if (value) xhr.setRequestHeader(key, value.toString());
        });
      }
      
      // Send the request with body if present
      const body = init?.body ? 
        (typeof init.body === 'string' ? init.body : JSON.stringify(init.body)) 
        : null;
      xhr.send(body);
    } catch (error) {
      console.error(`❌ [Supabase] Failed to send request:`, error);
      reject(new Error('Failed to send request'));
    }
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
      'Accept': 'application/json'
    }
  }
};

// Create Supabase clients
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
        'apikey': config.supabase.serviceRoleKey
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