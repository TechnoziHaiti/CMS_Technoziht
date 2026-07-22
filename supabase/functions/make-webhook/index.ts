import { serve } from "https://deno.land/std@0.192.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.21.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const data = await req.json();
    console.log("Received webhook payload:", data);

    const { subject, text, from } = data;

    if (!subject || !text || !from) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Extract message ID from subject (e.g. "Re: Votre demande [TKT-123]")
    const match = subject.match(/\[TKT-(.+?)\]/);
    if (!match || !match[1]) {
      return new Response(
        JSON.stringify({ error: 'Could not find TKT ID in subject' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const shortId = match[1];
    let messageId = shortId;

    // If it's a short ID (e.g. 6 chars), we need to find the full UUID
    if (shortId.length < 30) {
      const { data: recentMessages } = await supabase
        .from('contact_messages')
        .select('id')
        .order('created_at', { ascending: false })
        .limit(500);
      
      const found = recentMessages?.find(m => m.id.startsWith(shortId));
      if (found) {
        messageId = found.id;
      } else {
        return new Response(
          JSON.stringify({ error: `Could not find full UUID for short ID: ${shortId}` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Clean up the text (Make.com might send raw text with previous replies)
    // For simplicity, we just save the text as is.
    
    // Insert into message_replies
    const { error: insertError } = await supabase
      .from('message_replies')
      .insert([
        {
          message_id: messageId,
          content: text.trim(),
          sent_by: 'CUSTOMER'
        }
      ]);

    if (insertError) {
      throw insertError;
    }

    // Optionally update the main message status to 'UNREAD' so the admin notices the reply
    await supabase
      .from('contact_messages')
      .update({ status: 'UNREAD' })
      .eq('id', messageId);

    return new Response(
      JSON.stringify({ success: true, messageId }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
