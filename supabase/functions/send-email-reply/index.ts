import { serve } from "https://deno.land/std@0.192.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

// CORS headers
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
    const resendApiKey = Deno.env.get('RESEND_API_KEY')!;
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { messageId, content, recipientEmail, subject, inReplyTo, references } = await req.json();

    if (!messageId || !content || !recipientEmail) {
      throw new Error("Paramètres manquants");
    }

    // Le backend de Resend
    const resendReq = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: 'Support Technozi <itsupport@technozi-ht.com>',
        to: recipientEmail,
        reply_to: 'itsupport@technozi-ht.com',
        subject: subject || `Re: Votre demande [TKT-${messageId}]`,
        text: content,
        headers: {
          ...(inReplyTo && { 'In-Reply-To': inReplyTo }),
          ...(references && { 'References': references }),
        }
      }),
    });

    const resendRes = await resendReq.json();

    if (!resendReq.ok) {
      throw new Error(JSON.stringify(resendRes));
    }

    // Le smtp_message_id généré par Resend servira pour lier les futures réponses
    const smtpMessageId = resendRes.id ? `<${resendRes.id}@resend.com>` : undefined;

    // Enregistrer la réponse dans notre base de données
    const { data: replyData, error: dbError } = await supabase.from('message_replies').insert({
      message_id: messageId,
      content: content,
      sent_by: 'ADMIN',
      smtp_message_id: smtpMessageId,
      in_reply_to: inReplyTo
    }).select().single();

    if (dbError) throw dbError;

    // Mettre à jour le dernier message et status
    await supabase.from('contact_messages').update({ 
      status: 'REPLIED',
      updated_at: new Date().toISOString()
    }).eq('id', messageId);

    return new Response(JSON.stringify({ success: true, reply: replyData }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error("Erreur send-email-reply:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
