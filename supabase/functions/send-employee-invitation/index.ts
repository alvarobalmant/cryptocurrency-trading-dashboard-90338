import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { Resend } from "https://esm.sh/resend@4.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface InvitationRequest {
  barbershopId: string;
  barbershopName: string;
  employeeName: string;
  employeeEmail: string;
  employeePhone?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

    const { barbershopId, barbershopName, employeeName, employeeEmail, employeePhone }: InvitationRequest = await req.json();

    console.log('Creating invitation for:', { barbershopId, barbershopName, employeeName, employeeEmail });

    // Check if invitation already exists
    const { data: existingInvitation, error: checkError } = await supabase
      .from('employee_invitations')
      .select('*')
      .eq('barbershop_id', barbershopId)
      .eq('email', employeeEmail)
      .single();

    let invitation;
    
    if (existingInvitation && !checkError) {
      // Update existing invitation
      const { data: updatedInvitation, error: updateError } = await supabase
        .from('employee_invitations')
        .update({
          name: employeeName,
          phone: employeePhone,
          created_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
        })
        .eq('id', existingInvitation.id)
        .select()
        .single();
        
      if (updateError) {
        console.error('Error updating invitation:', updateError);
        throw new Error(`Erro ao atualizar convite: ${updateError.message}`);
      }
      
      invitation = updatedInvitation;
    } else {
      // Create new invitation
      const { data: newInvitation, error: inviteError } = await supabase
        .from('employee_invitations')
        .insert({
          barbershop_id: barbershopId,
          name: employeeName,
          email: employeeEmail,
          phone: employeePhone,
        })
        .select()
        .single();

      if (inviteError) {
        console.error('Error creating invitation:', inviteError);
        throw new Error(`Erro ao criar convite: ${inviteError.message}`);
      }
      
      invitation = newInvitation;
    }


    console.log('Invitation created:', invitation);

    // Get barbershop slug for URL
    const { data: barbershop, error: barbershopError } = await supabase
      .from('barbershops')
      .select('slug')
      .eq('id', barbershopId)
      .single();

    if (barbershopError) {
      console.error('Error getting barbershop:', barbershopError);
      throw new Error('Erro ao buscar dados da barbearia');
    }

    const origin = req.headers.get('origin') || Deno.env.get('PUBLIC_APP_URL') || 'https://'+(Deno.env.get('SUPABASE_URL')?.split('https://')[1] || 'localhost');
    const inviteUrl = `${origin}/${barbershop.slug}/employee/invite/${invitation.token}`;

    // Send invitation email (tolerant to Resend sandbox restrictions)
    const emailResponse = await resend.emails.send({
      from: "Barbearia <noreply@utidosgames.com>",
      to: [employeeEmail],
      subject: `Convite para trabalhar na ${barbershopName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #333;">Você foi convidado para trabalhar na ${barbershopName}!</h1>
          
          <p>Olá ${employeeName},</p>
          
          <p>Você foi convidado para ser funcionário da <strong>${barbershopName}</strong>.</p>
          
          <p>Para aceitar o convite e configurar seu perfil, clique no botão abaixo:</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${inviteUrl}" 
               style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
              Aceitar Convite
            </a>
          </div>
          
          <p>Ou copie e cole este link no seu navegador:</p>
          <p style="word-break: break-all; background: #f5f5f5; padding: 10px; border-radius: 3px;">${inviteUrl}</p>
          
          <p style="color: #666; font-size: 14px;">
            Este convite expira em 7 dias. Se você não solicitou este convite, pode ignorar este email.
          </p>
          
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
          <p style="color: #999; font-size: 12px;">Sistema de Gestão de Barbearias</p>
        </div>
      `,
    });

    console.log("Email send attempt:", emailResponse);

    const emailSent = !emailResponse?.error;
    const emailError = emailResponse?.error?.message || null;

    // Never fail the whole operation due to Resend sandbox restriction (403)
    return new Response(JSON.stringify({ 
      success: true, 
      invitation,
      inviteUrl,
      emailSent,
      emailError,
      emailId: emailResponse.data?.id 
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });

  } catch (error: any) {
    console.error("Error in send-employee-invitation function:", error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Erro interno do servidor',
        details: error 
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);