import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { Database } from '@/integrations/supabase/types';

export type EmployeeInvitation = Database['public']['Tables']['employee_invitations']['Row'];
type EmployeeInvitationInsert = Database['public']['Tables']['employee_invitations']['Insert'];

export const useEmployeeInvitations = (barbershopId?: string) => {
  const [invitations, setInvitations] = useState<EmployeeInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const fetchInvitations = async () => {
    if (!user || !barbershopId) return;

    try {
      const { data, error } = await supabase
        .from('employee_invitations')
        .select('*')
        .eq('barbershop_id', barbershopId)
        .is('accepted_at', null) // Only fetch invitations that haven't been accepted yet
        .order('created_at', { ascending: false });

      if (error) throw error;
      setInvitations(data || []);
    } catch (error) {
      console.error('Error fetching invitations:', error);
    } finally {
      setLoading(false);
    }
  };

  const sendInvitation = async (invitationData: {
    barbershopName: string;
    employeeName: string;
    employeeEmail: string;
    employeePhone?: string;
  }) => {
    if (!user || !barbershopId) throw new Error('User not authenticated or barbershop not selected');

    const { data, error } = await supabase.functions.invoke('send-employee-invitation', {
      body: {
        barbershopId,
        barbershopName: invitationData.barbershopName,
        employeeName: invitationData.employeeName,
        employeeEmail: invitationData.employeeEmail,
        employeePhone: invitationData.employeePhone,
      },
    });

    if (error) throw error;

    // Refresh invitations
    await fetchInvitations();
    
    return data;
  };

  const resendInvitation = async (invitationId: string) => {
    if (!user) throw new Error('User not authenticated');

    const invitation = invitations.find(inv => inv.id === invitationId);
    if (!invitation) throw new Error('Invitation not found');

    // Delete old invitation and create new one
    const { error: deleteError } = await supabase
      .from('employee_invitations')
      .delete()
      .eq('id', invitationId);

    if (deleteError) throw deleteError;

    // Get barbershop name
    const { data: barbershop, error: barbershopError } = await supabase
      .from('barbershops')
      .select('name')
      .eq('id', invitation.barbershop_id)
      .single();

    if (barbershopError) throw barbershopError;

    return await sendInvitation({
      barbershopName: barbershop.name,
      employeeName: invitation.name,
      employeeEmail: invitation.email,
      employeePhone: invitation.phone || undefined,
    });
  };

  const cancelInvitation = async (invitationId: string) => {
    const { error } = await supabase
      .from('employee_invitations')
      .delete()
      .eq('id', invitationId);

    if (error) throw error;

    setInvitations(prev => prev.filter(inv => inv.id !== invitationId));
  };

  const acceptInvitation = async (token: string) => {
    const { data, error } = await supabase.rpc('accept_employee_invitation', {
      invitation_token: token
    });

    if (error) throw error;
    return data;
  };

  const getInvitationByToken = async (token: string) => {
    try {
      // First try the new RPC function for unauthenticated access
      const { data, error } = await supabase.rpc('get_employee_invitation', {
        p_token: token
      });

      if (error) throw error;
      
      if (!data || data.length === 0) {
        throw new Error('Convite inválido ou expirado');
      }

      // Transform RPC result to match expected format
      const invitation = data[0];
      return {
        ...invitation,
        barbershops: {
          name: invitation.barbershop_name,
          slug: invitation.barbershop_slug,
          slogan: invitation.barbershop_description
        }
      };
    } catch (error) {
      // Fallback to direct table query if RPC fails
      console.warn('RPC failed, trying direct query:', error);
      const { data, error: directError } = await supabase
        .from('employee_invitations')
        .select(`
          *,
          barbershops (
            name,
            slug,
            slogan
          )
        `)
        .eq('token', token)
        .gt('expires_at', new Date().toISOString())
        .is('accepted_at', null)
        .single();

      if (directError) throw directError;
      return data;
    }
  };

  useEffect(() => {
    fetchInvitations();
  }, [user, barbershopId]);

  return {
    invitations,
    loading,
    sendInvitation,
    resendInvitation,
    cancelInvitation,
    acceptInvitation,
    getInvitationByToken,
    refetch: fetchInvitations,
  };
};