import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface ClientProfile {
  id: string;
  name: string;
  phone: string;
  notes?: string;
  barbershop_id: string;
  barbershop_name: string;
  created_at: string;
}

interface ClientAppointment {
  id: string;
  appointment_date: string;
  start_time: string;
  end_time: string;
  status: string;
  payment_status: string;
  client_name: string;
  client_phone: string;
  barbershop_name: string;
  service_name: string;
  service_price: number;
  employee_name: string;
  created_at: string;
}

export function useClientData() {
  const { user } = useAuth();
  const [profiles, setProfiles] = useState<ClientProfile[]>([]);
  const [appointments, setAppointments] = useState<ClientAppointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    fetchClientData();
  }, [user]);

  const fetchClientData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Buscar perfis do cliente em todas as barbearias
      const { data: clientProfiles, error: profilesError } = await supabase
        .from('client_profiles')
        .select(`
          id,
          name,
          phone,
          notes,
          barbershop_id,
          created_at
        `)
        .eq('user_id', user.id)
        .eq('phone_verified', true);

      if (profilesError) throw profilesError;

      // Mapear barbearias para nomes sem usar joins
      const barbershopIds = Array.from(new Set((clientProfiles || []).map((p: any) => p.barbershop_id))).filter(Boolean);
      let barbershopMap: Record<string, { name: string }> = {};

      if (barbershopIds.length) {
        const { data: shops } = await supabase
          .from('barbershops')
          .select('id,name,slug,avatar_url')
          .in('id', barbershopIds as string[]);

        barbershopMap = (shops || []).reduce((acc: Record<string, { name: string }>, s: any) => {
          if (s?.id) acc[s.id] = { name: s.name || '' };
          return acc;
        }, {});
      }

      const formattedProfiles: ClientProfile[] = (clientProfiles || []).map((profile: any) => ({
        id: profile.id,
        name: profile.name,
        phone: profile.phone,
        notes: profile.notes,
        barbershop_id: profile.barbershop_id,
        barbershop_name: barbershopMap[profile.barbershop_id]?.name || '',
        created_at: profile.created_at,
      }));

      setProfiles(formattedProfiles);

      if (formattedProfiles.length === 0) {
        setAppointments([]);
        return;
      }

      // Buscar agendamentos do cliente (sem joins) e ordenar de forma compatível
      const { data: clientAppointments, error: appointmentsError } = await supabase
        .from('appointments')
        .select(`
          id,
          barbershop_id,
          appointment_date,
          start_time,
          end_time,
          status,
          payment_status,
          client_name,
          client_phone,
          created_at
        `)
        .in('client_phone', formattedProfiles.map(p => p.phone))
        .order('created_at', { ascending: false })
        .limit(20);

      if (appointmentsError) throw appointmentsError;

      const formattedAppointments: ClientAppointment[] = (clientAppointments || []).map((apt: any) => ({
        id: apt.id,
        appointment_date: apt.appointment_date,
        start_time: apt.start_time,
        end_time: apt.end_time,
        status: apt.status,
        payment_status: apt.payment_status,
        client_name: apt.client_name,
        client_phone: apt.client_phone,
        barbershop_name: barbershopMap[apt.barbershop_id]?.name || '',
        service_name: '',
        service_price: 0,
        employee_name: '',
        created_at: apt.created_at,
      }));

      setAppointments(formattedAppointments);
    } catch (err) {
      console.error('Error fetching client data:', err);
      setError(err instanceof Error ? err.message : 'Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const cancelAppointment = async (appointmentId: string) => {
    try {
      const { error } = await supabase
        .from('appointments')
        .update({ status: 'cancelled' })
        .eq('id', appointmentId);

      if (error) throw error;

      // Atualizar localmente
      setAppointments(prev => 
        prev.map(apt => 
          apt.id === appointmentId 
            ? { ...apt, status: 'cancelled' }
            : apt
        )
      );

      return { success: true };
    } catch (err) {
      console.error('Error cancelling appointment:', err);
      return { 
        success: false, 
        error: err instanceof Error ? err.message : 'Erro ao cancelar agendamento' 
      };
    }
  };

  return {
    profiles,
    appointments,
    loading,
    error,
    refetch: fetchClientData,
    cancelAppointment,
  };
}