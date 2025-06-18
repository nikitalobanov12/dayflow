import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Verify the user is authenticated
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response('Unauthorized', { status: 401, headers: corsHeaders })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    )

    // Verify user authentication
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return new Response('Unauthorized', { status: 401, headers: corsHeaders })
    }

    if (req.method === 'POST') {
      const { code, redirectUri } = await req.json()

      if (!code || !redirectUri) {
        return new Response('Missing required parameters', { status: 400, headers: corsHeaders })
      }

      // Exchange authorization code for tokens using server-side secret
      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: Deno.env.get('GOOGLE_CLIENT_ID') ?? '',
          client_secret: Deno.env.get('GOOGLE_CLIENT_SECRET') ?? '', // Secure server-side secret
          code,
          grant_type: 'authorization_code',
          redirect_uri: redirectUri,
        }),
      })

      if (!tokenResponse.ok) {
        const errorText = await tokenResponse.text()
        console.error('Token exchange failed:', errorText)
        return new Response('Token exchange failed', { status: 400, headers: corsHeaders })
      }

      const tokenData = await tokenResponse.json()

      if (!tokenData.refresh_token) {
        return new Response('No refresh token received', { status: 400, headers: corsHeaders })
      }

      // Calculate expiration time
      const expiresAt = new Date(Date.now() + (tokenData.expires_in * 1000)).toISOString()

      // Store tokens securely in database
      const { error: insertError } = await supabase
        .from('google_calendar_tokens')
        .upsert({
          id: user.id,
          access_token: tokenData.access_token,
          refresh_token: tokenData.refresh_token,
          expires_at: expiresAt,
          scope: tokenData.scope,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'id' })

      if (insertError) {
        console.error('Failed to store tokens:', insertError)
        return new Response('Failed to store tokens', { status: 500, headers: corsHeaders })
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Handle token refresh
    if (req.method === 'PUT') {
      // Get stored refresh token
      const { data: tokenData, error: tokenError } = await supabase
        .from('google_calendar_tokens')
        .select('refresh_token')
        .eq('id', user.id)
        .single()

      if (tokenError || !tokenData) {
        return new Response('No refresh token found', { status: 404, headers: corsHeaders })
      }

      // Refresh the access token
      const refreshResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: Deno.env.get('GOOGLE_CLIENT_ID') ?? '',
          client_secret: Deno.env.get('GOOGLE_CLIENT_SECRET') ?? '', // Secure server-side secret
          refresh_token: tokenData.refresh_token,
          grant_type: 'refresh_token',
        }),
      })

      if (!refreshResponse.ok) {
        const errorText = await refreshResponse.text()
        console.error('Token refresh failed:', errorText)
        return new Response('Token refresh failed', { status: 400, headers: corsHeaders })
      }

      const refreshData = await refreshResponse.json()
      const expiresAt = new Date(Date.now() + (refreshData.expires_in * 1000)).toISOString()

      // Update stored tokens
      const { error: updateError } = await supabase
        .from('google_calendar_tokens')
        .update({
          access_token: refreshData.access_token,
          expires_at: expiresAt,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id)

      if (updateError) {
        console.error('Failed to update tokens:', updateError)
        return new Response('Failed to update tokens', { status: 500, headers: corsHeaders })
      }

      return new Response(JSON.stringify({
        access_token: refreshData.access_token,
        expires_at: expiresAt,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response('Method not allowed', { status: 405, headers: corsHeaders })
  } catch (error) {
    console.error('Error:', error)
    return new Response('Internal server error', { status: 500, headers: corsHeaders })
  }
}) 