// Import and initialize all polyfills
import './global';

// Initialize React Native features
import 'react-native-gesture-handler';
import { LogBox } from 'react-native';

// Ignore specific warnings that might interfere with development
LogBox.ignoreLogs([
  'Require cycle:',
  'Non-serializable values were found in the navigation state',
]);

// Initialize any services that need to be ready before navigation
import { updateLastActive } from './api/securityApi';

// Run initialization
updateLastActive().catch(error => {
  console.warn('Initialization error:', error);
});

// Initialize Expo Router
import 'expo-router/entry';

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Types for Alchemy webhook payload
interface AlchemyWebhookPayload {
  createdAt: string;
  event: {
    activity: Array<{
      asset: string;
      category: string;
      fromAddress: string;
      toAddress: string;
      value: number;
      blockNum: string;
      hash: string;
      rawContract?: {
        address: string;
        decimals: number;
      };
    }>;
    network: string;
  };
  id: string;
  type: string;
  webhookId: string;
}

// Deno types
declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
};

serve(async (req: Request) => {
  try {
    // Parse the webhook payload
    const payload: AlchemyWebhookPayload = await req.json();
    console.log('Received Alchemy webhook:', payload);

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          persistSession: false
        }
      }
    );

    // Process each activity in the webhook
    for (const activity of payload.event.activity) {
      // Get the wallet records for both from and to addresses
      const { data: wallets, error: walletsError } = await supabase
        .from('wallets')
        .select('id, public_address')
        .or(`public_address.eq.${activity.fromAddress},public_address.eq.${activity.toAddress}`)
        .limit(2);

      if (walletsError) {
        console.error('Error fetching wallets:', walletsError);
        continue;
      }

      // Process each affected wallet
      for (const wallet of wallets) {
        const isReceiver = wallet.public_address.toLowerCase() === activity.toAddress.toLowerCase();
        
        // Get existing token balance
        const { data: existingToken, error: tokenError } = await supabase
          .from('token_balances')
          .select('*')
          .eq('wallet_id', wallet.id)
          .eq('token_address', activity.rawContract?.address || '0x0000000000000000000000000000000000000000')
          .single();

        if (tokenError && tokenError.code !== 'PGRST116') { // Ignore not found error
          console.error('Error fetching token balance:', tokenError);
          continue;
        }

        // Calculate new balance
        const currentBalance = parseFloat(existingToken?.balance || '0');
        const changeAmount = activity.value;
        const newBalance = isReceiver ? 
          currentBalance + changeAmount :
          currentBalance - changeAmount;

        // Update or insert token balance
        const { error: upsertError } = await supabase
          .from('token_balances')
          .upsert({
            wallet_id: wallet.id,
            token_address: activity.rawContract?.address || '0x0000000000000000000000000000000000000000',
            chain_id: 1, // Ethereum mainnet
            symbol: activity.asset,
            name: activity.asset,
            decimals: activity.rawContract?.decimals || 18,
            balance: newBalance.toString(),
            timestamp: new Date().toISOString()
          });

        if (upsertError) {
          console.error('Error updating token balance:', upsertError);
          continue;
        }

        console.log(`Updated balance for wallet ${wallet.public_address}, token ${activity.asset}: ${newBalance}`);
      }
    }

    return new Response(
      JSON.stringify({ success: true }),
      {
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error: unknown) {
    console.error('Error processing webhook:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}); 