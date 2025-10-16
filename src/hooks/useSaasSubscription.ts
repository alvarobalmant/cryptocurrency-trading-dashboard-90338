import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export type SaasPlanType = 'free' | 'basic' | 'pro' | 'premium';

interface SaasSubscription {
  id: string;
  barbershop_id: string;
  plan_type: SaasPlanType;
  amount_paid: number;
  payment_method: string | null;
  status: string;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
}

const PLAN_CONFIG = {
  free: {
    name: 'Gratuito',
    price_1_month: 0,
    price_6_months: 0,
    price_12_months: 0,
  },
  basic: {
    name: 'Plano Básico',
    price_1_month: 29.00,
    price_6_months: 156.00, // R$ 26/mês
    price_12_months: 1.00, // R$ 1 total
  },
  pro: {
    name: 'Plano Pro',
    price_1_month: 49.00,
    price_6_months: 264.00, // R$ 44/mês
    price_12_months: 1.00, // R$ 1 total
  },
  premium: {
    name: 'Plano Premium',
    price_1_month: 99.00,
    price_6_months: 534.00, // R$ 89/mês
    price_12_months: 1.00, // R$ 1 total
  }
};

export const useSaasSubscription = (barbershopId: string | null) => {
  const [subscription, setSubscription] = useState<SaasSubscription | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchSubscription = async () => {
    if (!barbershopId) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('barbershop_subscriptions')
        .select('*')
        .eq('barbershop_id', barbershopId)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      setSubscription(data);
    } catch (error) {
      console.error('Error fetching subscription:', error);
    } finally {
      setLoading(false);
    }
  };

  const createSubscription = async (plan: SaasPlanType, durationMonths: 1 | 6 | 12, paymentMethod: 'pix' | 'card') => {
    if (!barbershopId) {
      throw new Error('No barbershop selected');
    }

    try {
      const { data, error } = await supabase.functions.invoke('create-saas-subscription', {
        body: {
          barbershopId,
          plan,
          durationMonths,
          paymentMethod,
        },
      });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating subscription:', error);
      toast({
        title: 'Erro ao criar assinatura',
        description: 'Não foi possível processar a assinatura.',
        variant: 'destructive',
      });
      throw error;
    }
  };

  const getDaysRemaining = () => {
    if (!subscription?.end_date) return 0;
    const endDate = new Date(subscription.end_date);
    const today = new Date();
    const diff = endDate.getTime() - today.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  const getCurrentPlan = (): SaasPlanType => {
    if (subscription?.status === 'active') {
      return subscription.plan_type as SaasPlanType;
    }
    return 'free';
  };

  const getPlanConfig = (plan: SaasPlanType) => {
    return PLAN_CONFIG[plan];
  };

  useEffect(() => {
    fetchSubscription();
  }, [barbershopId]);

  return {
    subscription,
    loading,
    createSubscription,
    getDaysRemaining,
    getCurrentPlan,
    getPlanConfig,
    refetch: fetchSubscription,
  };
};
