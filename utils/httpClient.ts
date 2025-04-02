const TIMEOUT_MS = 30000; // 30 second timeout

/**
 * Make an HTTP request using XMLHttpRequest with proper event listeners
 */
export const makeHttpRequest = (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
  return new Promise((resolve, reject) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
    console.log(`🌐 [HTTP] Making request to:`, url);
    
    const xhr = new XMLHttpRequest();
    xhr.timeout = TIMEOUT_MS;
    
    // Add more specific event listeners
    xhr.addEventListener('loadstart', () => {
      console.log('📡 [HTTP] Request started');
    });

    xhr.addEventListener('progress', (event) => {
      if (event.lengthComputable) {
        console.log(`📡 [HTTP] Progress: ${Math.round((event.loaded / event.total) * 100)}%`);
      }
    });

    xhr.addEventListener('readystatechange', () => {
      console.log(`📡 [HTTP] Ready state: ${xhr.readyState}`);
      
      if (xhr.readyState !== 4) return;

      // Handle network errors
      if (xhr.status === 0) {
        console.error('❌ [HTTP] Network error - unable to connect to server');
        reject(new Error('Unable to connect to server. Please check your connection and try again.'));
        return;
      }

      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          // For 201 Created responses, we need to parse the response data
          if (xhr.status === 201) {
            console.log('✅ [HTTP] Resource created successfully');
            try {
              const responseText = xhr.responseText || '[]';
              console.log('📥 [HTTP] Creation response:', responseText);
              resolve(new Response(responseText, {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
              }));
              return;
            } catch (error) {
              console.error('❌ [HTTP] Failed to parse creation response:', error);
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
      console.error('❌ [HTTP] Network error:', event);
      reject(new Error('Network request failed. Please check your connection and try again.'));
    });

    xhr.addEventListener('timeout', () => {
      console.error('⏰ [HTTP] Request timed out');
      reject(new Error(`Request timed out after ${TIMEOUT_MS}ms`));
    });

    xhr.addEventListener('abort', () => {
      console.error('🚫 [HTTP] Request aborted');
      reject(new Error('Request was aborted'));
    });

    xhr.open(init?.method || 'GET', url, true);
    
    // Set headers
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...(init?.headers as Record<string, string> || {})
    };

    // Set all headers
    Object.entries(headers).forEach(([key, value]) => {
      if (value) xhr.setRequestHeader(key, value);
    });

    // Log all headers being sent (safely)
    console.log('📤 [HTTP] Request headers:', {
      ...headers,
      apikey: headers['apikey'] ? `${headers['apikey'].substring(0, 10)}...` : undefined,
      Authorization: headers['Authorization'] ? `${headers['Authorization'].substring(0, 20)}...` : undefined
    });

    // Send request
    xhr.send(init?.body);
  });
};

/**
 * Configure global fetch to use XMLHttpRequest
 */
export const configureHttpClient = () => {
  // @ts-ignore
  global.fetch = makeHttpRequest;
  console.log('✅ [HTTP] Configured global fetch to use XMLHttpRequest');
}; 