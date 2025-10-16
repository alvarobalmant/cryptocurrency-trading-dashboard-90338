import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface TodayAppointment {
  id: string;
  appointment_date: string;
  appointment_time: string;
  status: string;
  client_name: string;
  client_phone: string;
  employee: {
    id: string;
    name: string;
  };
  service: {
    id: string;
    name: string;
    price: number;
    duration_minutes: number;
  };
}

export const useTodayAppointments = (barbershopId?: string) => {
  const today = new Date().toISOString().split('T')[0];

  const { data: appointments, isLoading } = useQuery({
    queryKey: ["today-appointments", barbershopId, today],
    queryFn: async (): Promise<TodayAppointment[]> => {
      if (!barbershopId) return [];

      console.log('🔍 Fetching today appointments for:', { barbershopId, today });

      const { data, error } = await supabase
        .from("appointments")
        .select("*")
        .eq("barbershop_id", barbershopId)
        .eq("appointment_date", today)
        .order("appointment_time", { ascending: true });

      if (error) {
        console.error('❌ Error fetching today appointments:', error);
        throw error;
      }

      console.log('✅ Today appointments fetched:', data?.length || 0, 'appointments');
      
      // Fetch services and employees data separately
      const serviceIds = [...new Set((data || []).map(apt => apt.service_id).filter(Boolean))];
      const employeeIds = [...new Set((data || []).map(apt => apt.employee_id).filter(Boolean))];
      
      const [servicesResponse, employeesResponse] = await Promise.all([
        serviceIds.length > 0 ? supabase
          .from('services')
          .select('id, name, price, duration_minutes')
          .in('id', serviceIds) : Promise.resolve({ data: [] }),
        employeeIds.length > 0 ? supabase
          .from('employees')
          .select('id, name')
          .in('id', employeeIds) : Promise.resolve({ data: [] })
      ]);
      
      const servicesMap = new Map((servicesResponse.data || []).map(s => [s.id, s]));
      const employeesMap = new Map((employeesResponse.data || []).map(e => [e.id, e]));

      return (data || []).map(apt => ({
        id: apt.id,
        appointment_date: apt.appointment_date,
        appointment_time: apt.appointment_time,
        status: apt.status,
        client_name: apt.client_name,
        client_phone: apt.client_phone,
        employee: apt.employee_id ? (employeesMap.get(apt.employee_id) || { id: apt.employee_id, name: 'Unknown' }) : { id: '', name: 'Unknown' },
        service: apt.service_id ? (servicesMap.get(apt.service_id) || { id: apt.service_id, name: 'Unknown', price: 0, duration_minutes: 0 }) : { id: '', name: 'Unknown', price: 0, duration_minutes: 0 },
      }));
    },
    enabled: !!barbershopId,
  });

  return {
    appointments: appointments || [],
    loading: isLoading,
  };
};
