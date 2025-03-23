import NetInfo from '@react-native-community/netinfo';

// Network testing utility
export const testNetwork = async () => {
  try {
    console.log('[Network] Starting network test...');
    
    // Check basic connectivity
    const netInfo = await NetInfo.fetch();
    console.log('[Network] Connection status:', netInfo.isConnected ? 'Connected' : 'Disconnected');
    console.log('[Network] Connection type:', netInfo.type);
    console.log('[Network] Connection details:', netInfo.details);
    
    if (!netInfo.isConnected) {
      console.log('[Network] Device is offline - network operations will fail');
      return { success: false, error: 'Device is offline' };
    }
    
    // Test ethereum network endpoints with simple fetch
    const endpoints = [
      { name: 'Infura', url: 'https://mainnet.infura.io/v3/your-infura-id' },
      { name: 'Alchemy', url: 'https://eth-mainnet.alchemyapi.io/v2/your-alchemy-id' },
      { name: 'Public', url: 'https://cloudflare-eth.com' }
    ];
    
    const results = [];
    
    for (const endpoint of endpoints) {
      try {
        const startTime = Date.now();
        const response = await fetch(endpoint.url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: 1,
            method: 'eth_blockNumber',
            params: []
          }),
          // 10 second timeout for this test
          timeout: 10000
        });
        
        const elapsed = Date.now() - startTime;
        const data = await response.json();
        
        results.push({
          endpoint: endpoint.name,
          success: true,
          status: response.status,
          time: elapsed,
          blockNumber: data.result
        });
        
        console.log(`[Network] ${endpoint.name} test successful (${elapsed}ms) - Block: ${data.result}`);
      } catch (error) {
        results.push({
          endpoint: endpoint.name,
          success: false,
          error: error.message
        });
        console.log(`[Network] ${endpoint.name} test failed:`, error.message);
      }
    }
    
    // Overall assessment
    const anySuccessful = results.some(r => r.success);
    console.log('[Network] Test complete -', anySuccessful ? 'Some endpoints available' : 'All endpoints failed');
    
    return {
      success: anySuccessful,
      networkConnected: netInfo.isConnected,
      results: results
    };
  } catch (error) {
    console.error('[Network] Test failed with error:', error);
    return { success: false, error: error.message };
  }
};