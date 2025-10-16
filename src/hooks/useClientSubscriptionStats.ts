import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface SubscriptionStats {
  totalAppointments: number;
  totalTimeSpent: number; // em minutos
  totalSaved: number;
  appointments: Array<{
    id: string;
    appointment_date: string;
    start_time: string;
    service_name: string;
    service_price: number;
    duration_minutes: number;
    employee_name: string;
  }>;
}

export const useClientSubscriptionStats = (clientId?: string) => {
  const { data: stats, isLoading: loading } = useQuery({
    queryKey: ["client-subscription-stats", clientId],
    queryFn: async (): Promise<SubscriptionStats> => {
      if (!clientId) return {
        totalAppointments: 0,
        totalTimeSpent: 0,
        totalSaved: 0,
        appointments: []
      };
      
      // Get client data first to find phone
      const { data: client, error: clientError } = await supabase
        .from("client_profiles")
        .select("phone")
        .eq("id", clientId)
        .single();

      if (clientError || !client) throw clientError || new Error("Client not found");

      // Get subscription appointments
      const { data: appointments, error } = await supabase
        .from("appointments")
        .select(`
          id,
          appointment_date,
          start_time,
          status,
          employee_id,
          service_id,
          is_subscription_appointment
        `)
        .or(`client_phone.eq.${client.phone},client_phone.eq.${client.phone.replace(/\+55/, '')},client_phone.eq.${client.phone.replace(/^\+/, '')}`)
        .eq("is_subscription_appointment", true)
        .order("appointment_date", { ascending: false });

      if (error) throw error;

      if (!appointments || appointments.length === 0) {
        return {
          totalAppointments: 0,
          totalTimeSpent: 0,
          totalSaved: 0,
          appointments: []
        };
      }

      // Get services and employees data
      const serviceIds = [...new Set(appointments.map(a => a.service_id).filter(Boolean))];
      const employeeIds = [...new Set(appointments.map(a => a.employee_id).filter(Boolean))];

      const [servicesResult, employeesResult] = await Promise.all([
        serviceIds.length > 0 ? supabase.from("services").select("id, name, price, duration_minutes").in("id", serviceIds) : { data: [], error: null },
        employeeIds.length > 0 ? supabase.from("employees").select("id, name").in("id", employeeIds) : { data: [], error: null }
      ]);

      const servicesMap = new Map((servicesResult.data || []).map(s => [s.id, s]));
      const employeesMap = new Map((employeesResult.data || []).map(e => [e.id, e]));

      const processedAppointments = appointments.map(appointment => {
        const service = servicesMap.get(appointment.service_id);
        const employee = employeesMap.get(appointment.employee_id);
        
        return {
          id: appointment.id,
          appointment_date: appointment.appointment_date,
          start_time: appointment.start_time,
          service_name: service?.name || 'Serviço não informado',
          service_price: service?.price || 0,
          duration_minutes: service?.duration_minutes || 60,
          employee_name: employee?.name || 'Funcionário não informado',
        };
      });

      const totalTimeSpent = processedAppointments.reduce((sum, apt) => sum + apt.duration_minutes, 0);
      const totalSaved = processedAppointments.reduce((sum, apt) => sum + apt.service_price, 0);

      return {
        totalAppointments: processedAppointments.length,
        totalTimeSpent,
        totalSaved,
        appointments: processedAppointments,
      };
    },
    enabled: !!clientId,
  });

  return {
    stats: stats || {
      totalAppointments: 0,
      totalTimeSpent: 0,
      totalSaved: 0,
      appointments: []
    },
    loading,
  };
};