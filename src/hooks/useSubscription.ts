import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export type PlanType = 'free' | 'basic' | 'pro' | 'premium';

export interface SubscriptionInfo {
  subscribed: boolean;
  plan: PlanType;
  product_id: string | null;
  subscription_end: string | null;
}

export const PLAN_LIMITS = {
  free: {
    employees: 3,
    services: 2,
    appointmentsPerMonth: 10,
    price: 0,
    features: ['Até 3 funcionários', '2 serviços', '10 agendamentos/mês', 'Suporte básico']
  },
  basic: {
    employees: 3,
    services: 5,
    appointmentsPerMonth: 100,
    price: 29.90,
    features: ['Até 3 funcionários', 'Até 5 serviços', '100 agendamentos/mês', 'Suporte básico']
  },
  pro: {
    employees: 10,
    services: 20,
    appointmentsPerMonth: 500,
    price: 49.90,
    features: ['Até 10 funcionários', 'Até 20 serviços', '500 agendamentos/mês', 'Relatórios avançados', 'Suporte prioritário']
  },
  premium: {
    employees: -1, // Unlimited
    services: -1, // Unlimited
    appointmentsPerMonth: -1, // Unlimited
    price: 99.90,
    features: ['Funcionários ilimitados', 'Serviços ilimitados', 'Agendamentos ilimitados', 'Múltiplas unidades', 'API personalizada', 'Suporte 24/7']
  }
};

export const useSubscription = () => {
  const [subscription, setSubscription] = useState<SubscriptionInfo>({
    subscribed: false,
    plan: 'free',
    product_id: null,
    subscription_end: null
  });
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const checkSubscription = async () => {
    if (!user) {
      setSubscription({
        subscribed: false,
        plan: 'free',
        product_id: null,
        subscription_end: null
      });
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('check-subscription', {
        headers: {
          Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
      });

      if (error) throw error;
      
      setSubscription(data);
    } catch (error) {
      console.error('Error checking subscription:', error);
      setSubscription({
        subscribed: false,
        plan: 'free',
        product_id: null,
        subscription_end: null
      });
    } finally {
      setLoading(false);
    }
  };

  const createCheckout = async (plan: PlanType) => {
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase.functions.invoke('create-checkout', {
      body: { plan },
      headers: {
        Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
      },
    });

    if (error) throw error;
    return data.url;
  };

  const openCustomerPortal = async () => {
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase.functions.invoke('customer-portal', {
      headers: {
        Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
      },
    });

    if (error) throw error;
    return data.url;
  };

  const canAccessFeature = (requiredCount: number, currentCount: number, plan: PlanType = subscription.plan) => {
    const limits = PLAN_LIMITS[plan];
    return limits.employees === -1 || currentCount < requiredCount;
  };

  const getEmployeeLimit = (plan: PlanType = subscription.plan) => {
    return PLAN_LIMITS[plan].employees;
  };

  const getServiceLimit = (plan: PlanType = subscription.plan) => {
    return PLAN_LIMITS[plan].services;
  };

  const isFeatureAvailable = (feature: 'employees' | 'services' | 'appointments', currentCount: number) => {
    const limit = PLAN_LIMITS[subscription.plan][feature === 'employees' ? 'employees' : feature === 'services' ? 'services' : 'appointmentsPerMonth'];
    return limit === -1 || currentCount < limit;
  };

  useEffect(() => {
    checkSubscription();
  }, [user]);

  // Auto-refresh subscription every 30 seconds when user is active
  useEffect(() => {
    if (!user) return;
    
    const interval = setInterval(checkSubscription, 30000);
    return () => clearInterval(interval);
  }, [user]);

  return {
    subscription,
    loading,
    checkSubscription,
    createCheckout,
    openCustomerPortal,
    canAccessFeature,
    getEmployeeLimit,
    getServiceLimit,
    isFeatureAvailable,
    planLimits: PLAN_LIMITS
  };
};