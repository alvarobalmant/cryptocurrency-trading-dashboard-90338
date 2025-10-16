import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ClientStats {
  totalScheduled: number;
  totalCancelled: number;
  totalCompleted: number;
  totalNoShow: number;
  totalSpent: number;
  subscriptionMonths: number;
  favoriteBarber: string | null;
  favoriteBarberCount: number;
  averageDaysBetweenVisits: number | null;
  totalVisits: number;
}

export const useClientStats = (clientId?: string, barbershopId?: string) => {
  const { data: stats, isLoading: loading } = useQuery({
    queryKey: ["client-stats", clientId, barbershopId],
    queryFn: async (): Promise<ClientStats> => {
      if (!clientId) {
        return {
          totalScheduled: 0,
          totalCancelled: 0,
          totalCompleted: 0,
          totalNoShow: 0,
          totalSpent: 0,
          subscriptionMonths: 0,
          favoriteBarber: null,
          favoriteBarberCount: 0,
          averageDaysBetweenVisits: null,
          totalVisits: 0,
        };
      }

      // Get client phone and barbershop_id
      const { data: client } = await supabase
        .from("client_profiles")
        .select("phone, barbershop_id")
        .eq("id", clientId)
        .single();

      if (!client) throw new Error("Client not found");

      // Use barbershopId from parameter or from client profile
      const targetBarbershopId = barbershopId || client.barbershop_id;

      // Get all appointments for THIS barbershop only
      const { data: appointments } = await supabase
        .from("appointments")
        .select("*")
        .eq("barbershop_id", targetBarbershopId)
        .eq("client_profile_id", clientId)
        .order("appointment_date", { ascending: true });

      // Get all payments for THIS barbershop only
      const { data: payments } = await supabase
        .from("payments")
        .select("*")
        .eq("barbershop_id", targetBarbershopId)
        .eq("client_phone", client.phone)
        .eq("status", "paid");

      // Get subscriptions
      const { data: subscriptions } = await supabase
        .from("client_subscriptions")
        .select("duration_months")
        .eq("client_profile_id", clientId);

      // CORRETO: Calculate stats usando dados reais
      const totalScheduled = appointments?.filter(a => a.status === 'pending').length || 0;
      const totalCancelled = appointments?.filter(a => a.status === 'cancelled').length || 0;
      const totalCompleted = appointments?.filter(a => a.status === 'confirmed').length || 0;
      const totalNoShow = appointments?.filter(a => a.status === 'no_show').length || 0;

      // CORRETO: totalSpent vem de payments realmente pagos
      const totalSpent = payments?.reduce((sum, p) => sum + (Number(p.net_received_amount) || Number(p.amount) || 0), 0) || 0;

      const subscriptionMonths = subscriptions?.reduce((sum, s) => sum + (s.duration_months || 0), 0) || 0;

      // Calculate favorite barber
      const barberCounts = new Map<string, { name: string; count: number }>();
      const employeeIds = [...new Set(appointments?.map(a => a.employee_id).filter(Boolean))];
      
      if (employeeIds.length > 0) {
        const { data: employees } = await supabase
          .from("employees")
          .select("id, name")
          .in("id", employeeIds);

        const employeesMap = new Map((employees || []).map(e => [e.id, e.name]));

        appointments?.forEach(apt => {
          if (apt.employee_id && apt.status === 'confirmed') {
            const employeeName = employeesMap.get(apt.employee_id);
            if (employeeName) {
              const current = barberCounts.get(apt.employee_id) || { name: employeeName, count: 0 };
              barberCounts.set(apt.employee_id, { name: employeeName, count: current.count + 1 });
            }
          }
        });
      }

      let favoriteBarber = null;
      let favoriteBarberCount = 0;

      barberCounts.forEach(({ name, count }) => {
        if (count > favoriteBarberCount) {
          favoriteBarber = name;
          favoriteBarberCount = count;
        }
      });

      // Calculate average days between visits
      const completedAppointments = appointments
        ?.filter(a => a.status === 'confirmed')
        .sort((a, b) => new Date(a.appointment_date).getTime() - new Date(b.appointment_date).getTime()) || [];

      let averageDaysBetweenVisits = null;

      if (completedAppointments.length >= 2) {
        const daysBetween: number[] = [];
        for (let i = 1; i < completedAppointments.length; i++) {
          const prevDate = new Date(completedAppointments[i - 1].appointment_date);
          const currDate = new Date(completedAppointments[i].appointment_date);
          const diffTime = currDate.getTime() - prevDate.getTime();
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          daysBetween.push(diffDays);
        }
        averageDaysBetweenVisits = Math.round(daysBetween.reduce((sum, days) => sum + days, 0) / daysBetween.length);
      }

      return {
        totalScheduled,
        totalCancelled,
        totalCompleted,
        totalNoShow,
        totalSpent,
        subscriptionMonths,
        favoriteBarber,
        favoriteBarberCount,
        averageDaysBetweenVisits,
        totalVisits: completedAppointments.length,
      };
    },
    enabled: !!clientId,
  });

  return {
    stats: stats || {
      totalScheduled: 0,
      totalCancelled: 0,
      totalCompleted: 0,
      totalNoShow: 0,
      totalSpent: 0,
      subscriptionMonths: 0,
      favoriteBarber: null,
      favoriteBarberCount: 0,
      averageDaysBetweenVisits: null,
      totalVisits: 0,
    },
    loading,
  };
};
