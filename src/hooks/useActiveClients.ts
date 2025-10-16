import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const useActiveClients = (barbershopId?: string) => {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split('T')[0];

  const { data: activeClients, isLoading } = useQuery({
    queryKey: ["active-clients", barbershopId],
    queryFn: async (): Promise<number> => {
      if (!barbershopId) return 0;

      // Get unique clients who had appointments in the last 30 days
      const { data, error } = await supabase
        .from("appointments")
        .select("client_phone")
        .eq("barbershop_id", barbershopId)
        .gte("appointment_date", thirtyDaysAgoStr)
        .in("status", ["confirmed", "pending"]);

      if (error) throw error;

      // Count unique phone numbers
      const uniqueClients = new Set(data?.map(apt => apt.client_phone) || []);
      return uniqueClients.size;
    },
    enabled: !!barbershopId,
  });

  return {
    activeClientsCount: activeClients || 0,
    loading: isLoading,
  };
};
