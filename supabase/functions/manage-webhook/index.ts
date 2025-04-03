import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const ALCHEMY_AUTH_TOKEN = 'lPmalTriZ4DtBx47FSROKvO41ja4qLd8';
const ALCHEMY_SIGNING_KEY = 'whsec_OnifU5uKSq2KOlRmEkwL3qKX';
const WEBHOOK_ID = 'wh_0h8dcqbb9xyicw0j';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Verify request has valid auth token
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new Error('Missing or invalid authorization header');
    }

    const { action, address } = await req.json()

    if (!action || !address) {
      throw new Error('Missing required parameters: action and address')
    }

    if (action !== 'add' && action !== 'remove') {
      throw new Error('Invalid action. Must be either "add" or "remove"')
    }

    // Get current webhook configuration
    const getWebhookUrl = `https://dashboard.alchemy.com/api/webhook-addresses/${WEBHOOK_ID}`;
    const getResponse = await fetch(getWebhookUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${ALCHEMY_AUTH_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    if (!getResponse.ok) {
      throw new Error(`Failed to get webhook configuration: ${getResponse.statusText}`);
    }

    const webhookConfig = await getResponse.json();
    let addresses = webhookConfig.addresses || [];

    // Update addresses list based on action
    if (action === 'add') {
      if (!addresses.includes(address.toLowerCase())) {
        addresses.push(address.toLowerCase());
      }
    } else {
      addresses = addresses.filter((addr: string) => addr.toLowerCase() !== address.toLowerCase());
    }

    // Update webhook configuration
    const updateWebhookUrl = `https://dashboard.alchemy.com/api/update-webhook-addresses/${WEBHOOK_ID}`;
    const updateResponse = await fetch(updateWebhookUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ALCHEMY_AUTH_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ addresses })
    });

    if (!updateResponse.ok) {
      throw new Error(`Failed to update webhook addresses: ${updateResponse.statusText}`);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Successfully ${action}ed address ${address}`,
        addresses
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error: unknown) {
    console.error('Error managing webhook addresses:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
}) 