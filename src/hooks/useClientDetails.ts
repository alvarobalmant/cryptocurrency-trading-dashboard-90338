import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface ClientDetails {
  id?: string;
  name: string;
  phone: string;
  notes?: string;
  phone_verified?: boolean;
  created_at?: string;
  isRegistered: boolean;
  recentAppointments: any[];
  hasActiveSubscription: boolean;
  clientSince?: string;
  totalAppointments: number;
  subscriptionEndDate?: string;
}

export const useClientDetails = (phone: string, barbershopId: string) => {
  const [clientDetails, setClientDetails] = useState<ClientDetails | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (phone && barbershopId) {
      fetchClientDetails();
    }
  }, [phone, barbershopId]);

  const fetchClientDetails = async () => {
    try {
      setLoading(true);
      
      // Normalizar telefone e criar variações para busca flexível
      const normalizedPhone = phone.replace(/\D/g, '');
      const last11Digits = normalizedPhone.slice(-11);
      const last10Digits = normalizedPhone.slice(-10);
      
      console.log('🔍 Buscando cliente por telefone:', phone);
      console.log('   Variações:', {
        original: phone,
        normalized: normalizedPhone,
        withCountryCode: `+55${normalizedPhone}`,
        last11: last11Digits,
        last10: last10Digits
      });
      
      // Buscar TODOS os perfis da barbearia para comparação manual
      const { data: allProfiles } = await supabase
        .from('client_profiles')
        .select('*')
        .eq('barbershop_id', barbershopId);
      
      let clientProfile = null;
      
      if (allProfiles && allProfiles.length > 0) {
        // Comparar manualmente cada perfil
        for (const profile of allProfiles) {
          const profileNormalized = profile.phone.replace(/\D/g, '');
          const profileLast11 = profileNormalized.slice(-11);
          const profileLast10 = profileNormalized.slice(-10);
          
          // Match exato tem prioridade
          if (profile.phone === phone || 
              profile.phone === normalizedPhone || 
              profile.phone === `+55${normalizedPhone}`) {
            clientProfile = profile;
            console.log('✅ Cliente encontrado (match exato):', profile.name);
            break;
          }
          
          // Match por últimos dígitos (mais flexível)
          if (profileLast11 === last11Digits || 
              profileLast10 === last10Digits ||
              profileNormalized === normalizedPhone) {
            clientProfile = profile;
            console.log('✅ Cliente encontrado (match por dígitos):', profile.name);
            // Não break aqui, continuar buscando match exato
          }
        }
      }
      
      if (!clientProfile) {
        console.log('ℹ️ Cliente não encontrado no cadastro');
      }

      // Buscar agendamentos recentes
      const { data: clientAppointments, error: appointmentsError } = await supabase
        .from('appointments')
        .select(`
          id,
          appointment_date,
          start_time,
          end_time,
          status,
          payment_status,
          client_name,
          client_phone,
          created_at,
          service_id,
          employee_id
        `)
        .eq('client_phone', phone)
        .eq('barbershop_id', barbershopId)
        .order('created_at', { ascending: false })
        .limit(5);

      if (appointmentsError) throw appointmentsError;

      // Buscar dados dos serviços e funcionários separadamente
      const serviceIds = [...new Set((clientAppointments || []).map(apt => apt.service_id).filter(Boolean))];
      const employeeIds = [...new Set((clientAppointments || []).map(apt => apt.employee_id).filter(Boolean))];

      let servicesMap = new Map();
      let employeesMap = new Map();

      if (serviceIds.length > 0) {
        const { data: services } = await supabase
          .from('services')
          .select('id, name, price')
          .in('id', serviceIds);
        
        if (services) {
          servicesMap = new Map(services.map(s => [s.id, s]));
        }
      }

      if (employeeIds.length > 0) {
        const { data: employees } = await supabase
          .from('employees')
          .select('id, name')
          .in('id', employeeIds);
        
        if (employees) {
          employeesMap = new Map(employees.map(e => [e.id, e]));
        }
      }

      const formattedAppointments = (clientAppointments || []).map((apt: any) => ({
        id: apt.id,
        appointment_date: apt.appointment_date,
        start_time: apt.start_time,
        end_time: apt.end_time,
        status: apt.status,
        payment_status: apt.payment_status,
        client_name: apt.client_name,
        client_phone: apt.client_phone,
        created_at: apt.created_at,
        service: servicesMap.get(apt.service_id),
        employee: employeesMap.get(apt.employee_id)
      }));

      // Verificar assinatura ativa
      const { data: hasSubscription } = await supabase
        .rpc('has_active_subscription_by_phone', {
          p_client_phone: phone,
          p_barbershop_id: barbershopId
        });

      // Buscar dados da assinatura ativa se existir
      let subscriptionEndDate;
      if (hasSubscription && clientProfile?.id) {
        const { data: activeSubscription } = await supabase
          .from('client_subscriptions')
          .select('end_date')
          .eq('client_id', clientProfile.id)
          .eq('status', 'active')
          .order('end_date', { ascending: false })
          .limit(1)
          .maybeSingle();
        
        subscriptionEndDate = activeSubscription?.end_date;
      }

      // Contar total de agendamentos
      const { count: totalCount } = await supabase
        .from('appointments')
        .select('*', { count: 'exact', head: true })
        .eq('client_phone', phone)
        .eq('barbershop_id', barbershopId);

      const details: ClientDetails = {
        id: clientProfile?.id,
        name: clientProfile?.name || '',
        phone: phone,
        notes: clientProfile?.notes,
        phone_verified: clientProfile?.phone_verified || false,
        created_at: clientProfile?.created_at,
        isRegistered: !!clientProfile,
        recentAppointments: formattedAppointments || [],
        hasActiveSubscription: !!hasSubscription,
        clientSince: clientProfile?.created_at,
        totalAppointments: totalCount || 0,
        subscriptionEndDate: subscriptionEndDate
      };

      setClientDetails(details);
    } catch (error) {
      console.error('Error fetching client details:', error);
    } finally {
      setLoading(false);
    }
  };

  return {
    clientDetails,
    loading,
    refetch: fetchClientDetails
  };
};