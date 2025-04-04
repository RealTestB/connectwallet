/// <reference lib="deno.ns" />
/// <reference types="https://deno.land/x/types/index.d.ts" />

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { crypto } from "https://deno.land/std@0.168.0/crypto/mod.ts";

const ALCHEMY_SIGNING_KEY = 'whsec_OnifU5uKSq2KOlRmEkwL3qKX';

// Map webhook IDs to chain information
interface ChainInfo {
  id: number;
  name: string;
  symbol: string;
  decimals: number;
  rpcUrl: string;
}

const WEBHOOK_TO_CHAIN: Record<string, ChainInfo> = {
  'wh_0h8dcqbb9xyicw0j': { id: 1, name: 'Ethereum', symbol: 'ETH', decimals: 18, rpcUrl: 'https://eth-mainnet.g.alchemy.com/v2/your-api-key' },
  'wh_yrz4wsilbyi4r3te': { id: 42161, name: 'Arbitrum', symbol: 'ETH', decimals: 18, rpcUrl: 'https://arb-mainnet.g.alchemy.com/v2/your-api-key' },
  'wh_ls9h4o6yvl4vgihk': { id: 8453, name: 'Base', symbol: 'ETH', decimals: 18, rpcUrl: 'https://base-mainnet.g.alchemy.com/v2/your-api-key' },
  'wh_jy4305rmrrh4tch9': { id: 137, name: 'Polygon', symbol: 'MATIC', decimals: 18, rpcUrl: 'https://polygon-mainnet.g.alchemy.com/v2/your-api-key' },
  'wh_qfjcobe6febny6jq': { id: 56, name: 'BSC', symbol: 'BNB', decimals: 18, rpcUrl: 'https://bsc-dataseed.binance.org' },
  'wh_n2186j0v0fwdpp7t': { id: 43114, name: 'Avalanche', symbol: 'AVAX', decimals: 18, rpcUrl: 'https://api.avax.network/ext/bc/C/rpc' },
  'wh_iley7lav9klnpsuy': { id: 10, name: 'Optimism', symbol: 'ETH', decimals: 18, rpcUrl: 'https://opt-mainnet.g.alchemy.com/v2/your-api-key' }
};

// Add type definitions
type WebhookId = keyof typeof WEBHOOK_TO_CHAIN;

interface WebhookPayload {
  webhookId: WebhookId;
  id: string;
  createdAt: string;
  payload: any[];
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-alchemy-signature',
}

async function isValidSignature(body: string, signature: string): Promise<boolean> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(ALCHEMY_SIGNING_KEY),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  
  const bodyHash = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(body)
  );
  
  const calculatedSignature = Array.from(new Uint8Array(bodyHash))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
    
  return signature === calculatedSignature;
}

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get the raw body for signature verification
    const rawBody = await req.text();
    
    // Verify the signature
    const signature = req.headers.get('x-alchemy-signature');
    if (!signature || !(await isValidSignature(rawBody, signature))) {
      throw new Error('Invalid webhook signature');
    }
    
    // Parse the webhook payload
    const { webhookId, id, createdAt, payload } = JSON.parse(rawBody) as WebhookPayload;

    // Get chain information
    const chain = WEBHOOK_TO_CHAIN[webhookId];
    if (!chain) {
      throw new Error(`Unknown webhook ID: ${webhookId}`);
    }

    // Log the incoming webhook data
    console.log('Received webhook:', {
      webhookId,
      chainId: chain.id,
      chainName: chain.name,
      id,
      createdAt,
      payload
    });

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get the transaction details
    const transaction = payload[0];
    if (!transaction) {
      throw new Error('No transaction data in payload');
    }

    // Process both 'from' and 'to' addresses
    const addresses = [
      transaction.from?.toLowerCase(),
      transaction.to?.toLowerCase()
    ].filter(Boolean);

    // Get all affected wallets
    const { data: wallets, error: walletsError } = await supabaseClient
      .from('wallets')
      .select('id, public_address, user_id')
      .in('public_address', addresses);

    if (walletsError) {
      console.error('Error fetching wallets:', walletsError);
      throw walletsError;
    }

    // Process each affected wallet
    for (const wallet of wallets) {
      const isReceiver = wallet.public_address.toLowerCase() === transaction.to?.toLowerCase();
      
      // Get the token address (Native or ERC20)
      const tokenAddress = transaction.contractAddress?.toLowerCase() || '0x0000000000000000000000000000000000000000';
      const isNativeToken = tokenAddress === '0x0000000000000000000000000000000000000000';

      // Get token details from our tokens table
      const { data: token, error: tokenError } = await supabaseClient
        .from('token_balances')
        .select('*')
        .eq('token_address', tokenAddress)
        .eq('wallet_id', wallet.id)
        .eq('chain_id', chain.id)
        .single();

      if (tokenError && tokenError.code !== 'PGRST116') { // PGRST116 is "not found"
        console.error('Error fetching token:', tokenError);
        throw tokenError;
      }

      // Log the transaction
      const { error: txError } = await supabaseClient
        .from('transactions')
        .insert({
          wallet_id: wallet.id,
          hash: transaction.hash,
          from_address: transaction.from,
          to_address: transaction.to,
          value: transaction.value || '0',
          token_address: tokenAddress,
          token_symbol: isNativeToken ? chain.symbol : (token?.symbol || 'UNKNOWN'),
          token_decimals: isNativeToken ? chain.decimals : (token?.decimals || 18),
          status: 'confirmed',
          network_id: chain.id,
          gas_price: transaction.gasPrice || '0',
          gas_used: transaction.gasUsed || '0'
        });

      if (txError) {
        console.error('Error logging transaction:', txError);
        // Don't throw here, continue with balance update
      }

      // Get user preferences for notifications
      const { data: userPrefs, error: prefsError } = await supabaseClient
        .from('user_preferences')
        .select('notification_preferences, user_id')
        .eq('user_id', wallet.user_id)
        .single();

      if (prefsError) {
        console.error('Error fetching user preferences:', prefsError);
      } else if (userPrefs?.notification_preferences) {
        const prefs = userPrefs.notification_preferences;
        const notifications = [];

        // Check for gas spike
        if (prefs.GAS_SPIKE && transaction.gasPrice) {
          const gasPrice = BigInt(transaction.gasPrice);
          // Alert if gas price is over 100 gwei
          if (gasPrice > BigInt('100000000000')) {
            notifications.push({
              user_id: userPrefs.user_id,
              type: 'GAS_SPIKE',
              status: 'UNREAD',
              metadata: {
                gas_price: transaction.gasPrice,
                chain: chain.name,
                transaction_hash: transaction.hash
              }
            });
          }
        }

        // Check for large transaction
        if (prefs.LARGE_TRANSACTION && transaction.value) {
          const value = BigInt(transaction.value);
          // Alert if transaction is over 1 ETH/equivalent
          if (value > BigInt('1000000000000000000')) {
            notifications.push({
              user_id: userPrefs.user_id,
              type: 'LARGE_TRANSACTION',
              status: 'UNREAD',
              metadata: {
                value: transaction.value,
                chain: chain.name,
                transaction_hash: transaction.hash,
                token_symbol: isNativeToken ? chain.symbol : (token?.symbol || 'UNKNOWN')
              }
            });
          }
        }

        // Check for smart contract interaction
        if (prefs.SMART_CONTRACT_INTERACTION && transaction.to) {
          // If the 'to' address has code, it's a contract
          const { data: contractCode } = await fetch(
            `${chain.rpcUrl}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                jsonrpc: '2.0',
                id: 1,
                method: 'eth_getCode',
                params: [transaction.to, 'latest']
              })
            }
          ).then(res => res.json());

          if (contractCode && contractCode !== '0x') {
            notifications.push({
              user_id: userPrefs.user_id,
              type: 'SMART_CONTRACT_INTERACTION',
              status: 'UNREAD',
              metadata: {
                contract_address: transaction.to,
                chain: chain.name,
                transaction_hash: transaction.hash
              }
            });
          }
        }

        // Insert all notifications
        if (notifications.length > 0) {
          const { error: notifyError } = await supabaseClient
            .from('notification_logs')
            .insert(notifications);

          if (notifyError) {
            console.error('Error inserting notifications:', notifyError);
          }
        }
      }

      // Calculate the new balance
      const value = BigInt(transaction.value || '0');
      const currentBalance = token ? BigInt(token.balance || '0') : BigInt(0);
      const newBalance = isReceiver ? 
        currentBalance + value : 
        currentBalance - value;

      // Update or insert token balance
      const { error: upsertError } = await supabaseClient
        .from('token_balances')
        .upsert({
          wallet_id: wallet.id,
          token_address: tokenAddress,
          symbol: isNativeToken ? chain.symbol : (token?.symbol || 'UNKNOWN'),
          name: isNativeToken ? chain.name : (token?.name || 'Unknown Token'),
          decimals: isNativeToken ? chain.decimals : (token?.decimals || 18),
          balance: newBalance.toString(),
          chain_id: chain.id,
          last_updated: new Date().toISOString(),
          is_native: isNativeToken,
          contract_type: isNativeToken ? 'NATIVE' : 'ERC20'
        });

      if (upsertError) {
        console.error('Error upserting token:', upsertError);
        throw upsertError;
      }

      console.log(`Updated balance for wallet ${wallet.public_address}:`, {
        chain: chain.name,
        token: isNativeToken ? chain.symbol : token?.symbol,
        oldBalance: currentBalance.toString(),
        newBalance: newBalance.toString(),
        change: isReceiver ? '+' + value.toString() : '-' + value.toString()
      });
    }

    return new Response(
      JSON.stringify({ 
        message: 'Webhook processed successfully',
        chain: chain.name,
        processedWallets: wallets.length
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error: unknown) {
    console.error('Error processing webhook:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        details: errorStack
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
}); 