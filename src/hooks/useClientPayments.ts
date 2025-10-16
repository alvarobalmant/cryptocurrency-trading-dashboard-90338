import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ClientPayment {
  id: string;
  amount: number;
  status: string;
  payment_method?: string;
  description?: string;
  transaction_amount?: number;
  net_received_amount?: number;
  fee_amount?: number;
  paid_at?: string;
  created_at: string;
  payment_type?: string;
  appointment_id?: string;
}

export const useClientPayments = (clientId?: string, barbershopId?: string) => {
  const { data: payments, isLoading: loading } = useQuery({
    queryKey: ["client-payments", clientId, barbershopId],
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

      // Get payments by phone AND barbershop_id to ensure data isolation
      const { data, error } = await supabase
        .from("payments")
        .select("*")
        .eq("client_phone", client.phone)
        .eq("barbershop_id", targetBarbershopId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      return (data || []).map(payment => ({
        ...payment,
        payment_type: payment.payment_type || 'walk_in',
      })) as ClientPayment[];
    },
    enabled: !!clientId,
  });

  return {
    payments: payments || [],
    loading,
  };
};