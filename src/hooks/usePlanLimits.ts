import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface PlanUsageStats {
  active_employees: number;
  active_services: number;
  current_month_appointments: number;
  plan_type: string;
  max_employees: number;
  max_services: number;
  max_appointments_per_month: number;
  can_add_employee: boolean;
  can_add_service: boolean;
  can_create_appointment: boolean;
}

export const usePlanLimits = (barbershopId: string | undefined) => {
  const [usageStats, setUsageStats] = useState<PlanUsageStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUsageStats = async () => {
    if (!barbershopId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase.rpc('get_barbershop_usage_stats', {
        barbershop_id_param: barbershopId
      });

      if (error) throw error;

      if (data && data.length > 0) {
        setUsageStats(data[0]);
      }
      setError(null);
    } catch (err) {
      console.error('Error fetching usage stats:', err);
      setError(err instanceof Error ? err.message : 'Erro ao carregar estatísticas');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsageStats();
  }, [barbershopId]);

  const checkCanAddEmployee = async (): Promise<boolean> => {
    if (!barbershopId) return false;
    
    try {
      const { data, error } = await supabase.rpc('can_add_employee', {
        barbershop_id_param: barbershopId
      });
      
      if (error) throw error;
      return data;
    } catch (err) {
      console.error('Error checking employee limit:', err);
      return false;
    }
  };

  const checkCanAddService = async (): Promise<boolean> => {
    if (!barbershopId) return false;
    
    try {
      const { data, error } = await supabase.rpc('can_add_service', {
        barbershop_id_param: barbershopId
      });
      
      if (error) throw error;
      return data;
    } catch (err) {
      console.error('Error checking service limit:', err);
      return false;
    }
  };

  const checkCanCreateAppointment = async (appointmentDate?: Date): Promise<boolean> => {
    if (!barbershopId) return false;
    
    try {
      const { data, error } = await supabase.rpc('can_create_appointment', {
        barbershop_id_param: barbershopId,
        appointment_date_param: appointmentDate?.toISOString().split('T')[0] || new Date().toISOString().split('T')[0]
      });
      
      if (error) throw error;
      return data;
    } catch (err) {
      console.error('Error checking appointment limit:', err);
      return false;
    }
  };

  return {
    usageStats,
    loading,
    error,
    refetch: fetchUsageStats,
    checkCanAddEmployee,
    checkCanAddService,
    checkCanCreateAppointment
  };
};