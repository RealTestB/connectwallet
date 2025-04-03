import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { crypto } from "https://deno.land/std@0.168.0/crypto/mod.ts";

const ALCHEMY_SIGNING_KEY = 'whsec_OnifU5uKSq2KOlRmEkwL3qKX';

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
    const { webhookId, id, createdAt, payload } = JSON.parse(rawBody);

    // Log the incoming webhook data
    console.log('Received webhook:', {
      webhookId,
      id,
      createdAt,
      payload
    })

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get the transaction details
    const transaction = payload[0]
    if (!transaction) {
      throw new Error('No transaction data in payload')
    }

    // Process both 'from' and 'to' addresses
    const addresses = [
      transaction.from?.toLowerCase(),
      transaction.to?.toLowerCase()
    ].filter(Boolean);

    // Get all affected wallets
    const { data: wallets, error: walletsError } = await supabaseClient
      .from('wallets')
      .select('id, public_address')
      .in('public_address', addresses);

    if (walletsError) {
      console.error('Error fetching wallets:', walletsError);
      throw walletsError;
    }

    // Process each affected wallet
    for (const wallet of wallets) {
      const isReceiver = wallet.public_address.toLowerCase() === transaction.to?.toLowerCase();
      
      // Get the token address (ETH or ERC20)
      const tokenAddress = transaction.contractAddress?.toLowerCase() || '0x0000000000000000000000000000000000000000'
      const isNativeToken = tokenAddress === '0x0000000000000000000000000000000000000000'

      // Get token details from our tokens table
      const { data: token, error: tokenError } = await supabaseClient
        .from('tokens')
        .select('*')
        .eq('token_address', tokenAddress)
        .eq('wallet_id', wallet.id)
        .single()

      if (tokenError && tokenError.code !== 'PGRST116') { // PGRST116 is "not found"
        console.error('Error fetching token:', tokenError)
        throw tokenError
      }

      // Calculate the new balance
      const value = BigInt(transaction.value || '0')
      const currentBalance = token ? BigInt(token.balance || '0') : BigInt(0)
      const newBalance = isReceiver ? 
        currentBalance + value : 
        currentBalance - value;

      // Update or insert token balance
      const { error: upsertError } = await supabaseClient
        .from('tokens')
        .upsert({
          wallet_id: wallet.id,
          token_address: tokenAddress,
          symbol: isNativeToken ? 'ETH' : (token?.symbol || 'UNKNOWN'),
          name: isNativeToken ? 'Ethereum' : (token?.name || 'Unknown Token'),
          decimals: isNativeToken ? 18 : (token?.decimals || 18),
          balance: newBalance.toString(),
          chain_id: 1, // Assuming Ethereum mainnet
          timestamp: new Date().toISOString()
        })

      if (upsertError) {
        console.error('Error upserting token:', upsertError)
        throw upsertError
      }

      console.log(`Updated balance for wallet ${wallet.public_address}:`, {
        token: isNativeToken ? 'ETH' : token?.symbol,
        oldBalance: currentBalance.toString(),
        newBalance: newBalance.toString(),
        change: isReceiver ? '+' + value.toString() : '-' + value.toString()
      });
    }

    return new Response(
      JSON.stringify({ 
        message: 'Webhook processed successfully',
        processedWallets: wallets.length
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error: unknown) {
    console.error('Error processing webhook:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    const errorStack = error instanceof Error ? error.stack : undefined
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        details: errorStack
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
}) 