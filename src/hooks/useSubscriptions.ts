import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface SubscriptionPlan {
  id: string;
  barbershop_id: string;
  name: string;
  description?: string;
  price_1_month: number;
  price_6_months: number;
  price_12_months: number;
  commission_enabled: boolean;
  commission_percentage: number;
  is_employee_specific: boolean;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ClientSubscription {
  id: string;
  barbershop_id: string;
  client_profile_id: string;
  subscription_plan_id: string;
  mercadopago_subscription_id?: string;
  mercadopago_preapproval_id?: string;
  duration_months: number;
  amount_paid: number;
  status: 'pending' | 'active' | 'cancelled' | 'expired' | 'paused';
  start_date?: string;
  end_date?: string;
  auto_renewal: boolean;
  created_at: string;
  updated_at: string;
  subscription_plans?: SubscriptionPlan;
}

export interface SubscriptionPlanEmployee {
  id: string;
  subscription_plan_id: string;
  employee_id: string;
  created_at: string;
}

export const useSubscriptions = (barbershopId?: string) => {
  const [subscriptionPlans, setSubscriptionPlans] = useState<SubscriptionPlan[]>([]);
  const [clientSubscriptions, setClientSubscriptions] = useState<ClientSubscription[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchSubscriptionPlans = async () => {
    if (!barbershopId) return;

    try {
      const { data, error } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('barbershop_id', barbershopId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSubscriptionPlans(data || []);
    } catch (error) {
      console.error('Error fetching subscription plans:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os planos de assinatura",
        variant: "destructive",
      });
    }
  };

  const fetchClientSubscriptions = async () => {
    if (!barbershopId) return;

    try {
      const { data, error } = await supabase
        .from('client_subscriptions')
        .select(`
          *,
          subscription_plans(*)
        `)
        .eq('barbershop_id', barbershopId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setClientSubscriptions(data as ClientSubscription[] || []);
    } catch (error) {
      console.error('Error fetching client subscriptions:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as assinaturas dos clientes",
        variant: "destructive",
      });
    }
  };

  const createSubscriptionPlan = async (planData: Omit<SubscriptionPlan, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const { data, error } = await supabase
        .from('subscription_plans')
        .insert(planData)
        .select()
        .single();

      if (error) throw error;

      await fetchSubscriptionPlans();
      toast({
        title: "Sucesso",
        description: "Plano de assinatura criado com sucesso",
      });

      return data;
    } catch (error) {
      console.error('Error creating subscription plan:', error);
      toast({
        title: "Erro",
        description: "Não foi possível criar o plano de assinatura",
        variant: "destructive",
      });
      throw error;
    }
  };

  const updateSubscriptionPlan = async (planId: string, updates: Partial<SubscriptionPlan>) => {
    try {
      const { error } = await supabase
        .from('subscription_plans')
        .update(updates)
        .eq('id', planId);

      if (error) throw error;

      await fetchSubscriptionPlans();
      toast({
        title: "Sucesso",
        description: "Plano de assinatura atualizado com sucesso",
      });
    } catch (error) {
      console.error('Error updating subscription plan:', error);
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o plano de assinatura",
        variant: "destructive",
      });
      throw error;
    }
  };

  const deleteSubscriptionPlan = async (planId: string) => {
    try {
      const { error } = await supabase
        .from('subscription_plans')
        .delete()
        .eq('id', planId);

      if (error) throw error;

      await fetchSubscriptionPlans();
      toast({
        title: "Sucesso",
        description: "Plano de assinatura deletado com sucesso",
      });
    } catch (error) {
      console.error('Error deleting subscription plan:', error);
      toast({
        title: "Erro",
        description: "Não foi possível deletar o plano de assinatura",
        variant: "destructive",
      });
      throw error;
    }
  };

  const createSubscription = async (subscriptionData: {
    barbershopId: string;
    subscriptionPlanId: string;
    clientProfileId: string;
    durationMonths: number;
    successUrl: string;
    failureUrl: string;
  }) => {
    try {
      const { data, error } = await supabase.functions.invoke('create-subscription', {
        body: subscriptionData,
        headers: {
          Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
      });

      if (error) throw error;

      if (data.success) {
        toast({
          title: "Sucesso",
          description: "Assinatura criada com sucesso",
        });
        return data;
      } else {
        throw new Error(data.error || 'Erro ao criar assinatura');
      }
    } catch (error) {
      console.error('Error creating subscription:', error);
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Não foi possível criar a assinatura",
        variant: "destructive",
      });
      throw error;
    }
  };

  const getSubscriptionPlanEmployees = async (planId: string) => {
    try {
      const { data, error } = await supabase
        .from('subscription_plan_employees')
        .select(`
          *,
          employees(id, name, email)
        `)
        .eq('subscription_plan_id', planId);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching subscription plan employees:', error);
      return [];
    }
  };

  const updateSubscriptionPlanEmployees = async (planId: string, employeeIds: string[]) => {
    try {
      // Delete existing assignments
      await supabase
        .from('subscription_plan_employees')
        .delete()
        .eq('subscription_plan_id', planId);

      // Insert new assignments
      if (employeeIds.length > 0) {
        const assignments = employeeIds.map(employeeId => ({
          subscription_plan_id: planId,
          employee_id: employeeId,
        }));

        const { error } = await supabase
          .from('subscription_plan_employees')
          .insert(assignments);

        if (error) throw error;
      }

      toast({
        title: "Sucesso",
        description: "Funcionários do plano atualizados com sucesso",
      });
    } catch (error) {
      console.error('Error updating subscription plan employees:', error);
      toast({
        title: "Erro",
        description: "Não foi possível atualizar os funcionários do plano",
        variant: "destructive",
      });
      throw error;
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([
        fetchSubscriptionPlans(),
        fetchClientSubscriptions(),
      ]);
      setLoading(false);
    };

    loadData();
  }, [barbershopId]);

  // Subscribe to real-time updates
  useEffect(() => {
    if (!barbershopId) return;

    const plansChannel = supabase
      .channel('subscription-plans-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'subscription_plans',
          filter: `barbershop_id=eq.${barbershopId}`,
        },
        () => {
          fetchSubscriptionPlans();
        }
      )
      .subscribe();

    const subscriptionsChannel = supabase
      .channel('client-subscriptions-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'client_subscriptions',
          filter: `barbershop_id=eq.${barbershopId}`,
        },
        () => {
          fetchClientSubscriptions();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(plansChannel);
      supabase.removeChannel(subscriptionsChannel);
    };
  }, [barbershopId]);

  return {
    subscriptionPlans,
    clientSubscriptions,
    loading,
    createSubscriptionPlan,
    updateSubscriptionPlan,
    deleteSubscriptionPlan,
    createSubscription,
    getSubscriptionPlanEmployees,
    updateSubscriptionPlanEmployees,
    refetch: () => {
      fetchSubscriptionPlans();
      fetchClientSubscriptions();
    },
  };
};