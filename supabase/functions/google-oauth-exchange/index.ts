import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Check required environment variables
    const requiredEnvVars = ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'SUPABASE_URL', 'SUPABASE_ANON_KEY']
    const missingEnvVars = requiredEnvVars.filter(envVar => !Deno.env.get(envVar))
    
    if (missingEnvVars.length > 0) {
      console.error('Missing required environment variables:', missingEnvVars)
      return new Response(`Missing environment variables: ${missingEnvVars.join(', ')}`, { 
        status: 500, 
        headers: corsHeaders 
      })
    }

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
        console.error('Missing required parameters:', { hasCode: !!code, hasRedirectUri: !!redirectUri })
        return new Response('Missing required parameters', { status: 400, headers: corsHeaders })
      }

      console.log(`🔄 Exchanging authorization code for user: ${user.id}`)

      // Exchange authorization code for tokens using server-side secret
      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: Deno.env.get('GOOGLE_CLIENT_ID') ?? '',
          client_secret: Deno.env.get('GOOGLE_CLIENT_SECRET') ?? '',
          code,
          grant_type: 'authorization_code',
          redirect_uri: redirectUri,
        }),
      })

      if (!tokenResponse.ok) {
        const errorText = await tokenResponse.text()
        console.error('Token exchange failed:', {
          status: tokenResponse.status,
          statusText: tokenResponse.statusText,
          error: errorText,
          userId: user.id
        })
        return new Response('Token exchange failed', { status: 400, headers: corsHeaders })
      }

      const tokenData = await tokenResponse.json()
      console.log('📦 Token exchange successful, checking for refresh token...')

      if (!tokenData.refresh_token) {
        console.error('No refresh token in response - user may need to reauthorize with consent')
        return new Response('No refresh token received. Please try disconnecting and reconnecting with full consent.', { 
          status: 400, 
          headers: corsHeaders 
        })
      }

      // Calculate expiration time
      const expiresAt = new Date(Date.now() + (tokenData.expires_in * 1000)).toISOString()
      console.log(`💾 Storing tokens for user ${user.id}, expires at: ${expiresAt}`)

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

      console.log('✅ Tokens stored successfully')

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Handle token refresh
    if (req.method === 'PUT') {
      console.log(`🔄 Refreshing tokens for user: ${user.id}`)

      // Get stored refresh token
      const { data: tokenData, error: tokenError } = await supabase
        .from('google_calendar_tokens')
        .select('refresh_token, expires_at')
        .eq('id', user.id)
        .single()

      if (tokenError || !tokenData) {
        console.error('No refresh token found for user:', user.id, tokenError)
        return new Response('No refresh token found', { status: 404, headers: corsHeaders })
      }

      console.log('📦 Found refresh token, attempting refresh...')

      // Refresh the access token
      const refreshResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: Deno.env.get('GOOGLE_CLIENT_ID') ?? '',
          client_secret: Deno.env.get('GOOGLE_CLIENT_SECRET') ?? '',
          refresh_token: tokenData.refresh_token,
          grant_type: 'refresh_token',
        }),
      })

      if (!refreshResponse.ok) {
        const errorText = await refreshResponse.text()
        console.error('Token refresh failed:', {
          status: refreshResponse.status,
          statusText: refreshResponse.statusText,
          error: errorText,
          userId: user.id
        })
        
        // If refresh token is invalid, delete the stored tokens to force re-authentication
        if (refreshResponse.status === 400) {
          console.log('Refresh token invalid, cleaning up stored tokens...')
          await supabase
            .from('google_calendar_tokens')
            .delete()
            .eq('id', user.id)
        }
        
        return new Response(JSON.stringify({
          error: 'Token refresh failed',
          details: errorText,
          needsReauth: true
        }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }

      const refreshData = await refreshResponse.json()
      
      if (!refreshData.access_token) {
        console.error('No access token in refresh response:', refreshData)
        return new Response('Invalid refresh response', { status: 400, headers: corsHeaders })
      }

      const expiresAt = new Date(Date.now() + (refreshData.expires_in * 1000)).toISOString()
      
      console.log(`✅ Token refreshed successfully, expires at: ${expiresAt}`)

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