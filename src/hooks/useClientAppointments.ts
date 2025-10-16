import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ClientAppointment {
  id: string;
  appointment_date: string;
  start_time: string;
  end_time: string;
  status: string;
  payment_status?: string;
  notes?: string;
  service_name: string;
  service_price?: number;
  employee_name: string;
  created_at: string;
  is_subscription_appointment?: boolean;
}

export const useClientAppointments = (clientId?: string, barbershopId?: string) => {
  const { data: appointments, isLoading: loading } = useQuery({
    queryKey: ["client-appointments", clientId, barbershopId],
    queryFn: async () => {
      if (!clientId) return [];
      
      // Get client data first to find phone and barbershop_id
      const { data: client, error: clientError } = await supabase
        .from("client_profiles")
        .select("phone, barbershop_id")
        .eq("id", clientId)
        .single();

      if (clientError || !client) throw clientError || new Error("Client not found");

      // Use barbershopId from parameter or from client profile
      const targetBarbershopId = barbershopId || client.barbershop_id;

      // Get appointments by client_profile_id (best) OR by phone + barbershop_id
      let query = supabase
        .from("appointments")
        .select(`
          id,
          appointment_date,
          start_time,
          end_time,
          status,
          payment_status,
          notes,
          created_at,
          employee_id,
          service_id,
          is_subscription_appointment
        `);

      // Filter by barbershop FIRST to ensure data isolation
      if (targetBarbershopId) {
        query = query.eq("barbershop_id", targetBarbershopId);
      }

      // Then filter by client_profile_id (preferred) or phone
      query = query.eq("client_profile_id", clientId);

      const { data, error } = await query.order("appointment_date", { ascending: false });

      if (error) throw error;

      // Get services and employees separately to avoid foreign key issues
      const serviceIds = [...new Set((data || []).map(a => a.service_id).filter(Boolean))];
      const employeeIds = [...new Set((data || []).map(a => a.employee_id).filter(Boolean))];

      const [servicesResult, employeesResult] = await Promise.all([
        serviceIds.length > 0 ? supabase.from("services").select("id, name, price").in("id", serviceIds) : { data: [], error: null },
        employeeIds.length > 0 ? supabase.from("employees").select("id, name").in("id", employeeIds) : { data: [], error: null }
      ]);

      const servicesMap = new Map((servicesResult.data || []).map(s => [s.id, s]));
      const employeesMap = new Map((employeesResult.data || []).map(e => [e.id, e]));

      return (data || []).map(appointment => {
        const service = servicesMap.get(appointment.service_id);
        const employee = employeesMap.get(appointment.employee_id);
        
        return {
          id: appointment.id,
          appointment_date: appointment.appointment_date,
          start_time: appointment.start_time,
          end_time: appointment.end_time,
          status: appointment.status,
          payment_status: appointment.payment_status,
          notes: appointment.notes,
          service_name: service?.name || 'Serviço não informado',
          service_price: service?.price,
          employee_name: employee?.name || 'Funcionário não informado',
          created_at: appointment.created_at,
          is_subscription_appointment: appointment.is_subscription_appointment || false,
        };
      }) as ClientAppointment[];
    },
    enabled: !!clientId,
  });

  return {
    appointments: appointments || [],
    loading,
  };
};