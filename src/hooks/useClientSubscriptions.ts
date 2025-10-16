import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ClientSubscription {
  id: string;
  status: string;
  amount_paid: number;
  duration_months: number;
  start_date?: string;
  end_date?: string;
  auto_renewal: boolean;
  plan_name: string;
  description?: string;
  created_at: string;
}

export const useClientSubscriptions = (clientId?: string) => {
  const { data: subscriptions, isLoading: loading } = useQuery({
    queryKey: ["client-subscriptions", clientId],
    queryFn: async () => {
      if (!clientId) return [];
      
      const { data, error } = await supabase
        .from("client_subscriptions")
        .select(`
          id,
          status,
          amount_paid,
          duration_months,
          start_date,
          end_date,
          auto_renewal,
          created_at,
          subscription_plans(name, description)
        `)
        .eq("client_profile_id", clientId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      return (data || []).map(subscription => ({
        id: subscription.id,
        status: subscription.status,
        amount_paid: subscription.amount_paid,
        duration_months: subscription.duration_months,
        start_date: subscription.start_date,
        end_date: subscription.end_date,
        auto_renewal: subscription.auto_renewal,
        plan_name: subscription.subscription_plans?.name || 'Plano não informado',
        description: subscription.subscription_plans?.description,
        created_at: subscription.created_at,
      })) as ClientSubscription[];
    },
    enabled: !!clientId,
  });

  return {
    subscriptions: subscriptions || [],
    loading,
  };
};