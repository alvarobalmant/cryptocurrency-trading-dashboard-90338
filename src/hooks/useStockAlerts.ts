import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { Database } from '@/integrations/supabase/types';

type StockAlert = Database['public']['Tables']['stock_alerts']['Row'] & {
  products?: {
    id: string;
    name: string;
    sku: string | null;
    image_urls: string[];
  } | null;
};

export const useStockAlerts = (barbershopId?: string) => {
  const [alerts, setAlerts] = useState<StockAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const fetchAlerts = async () => {
    if (!user || !barbershopId) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('stock_alerts')
        .select(`
          *,
          products (
            id,
            name,
            sku,
            image_urls
          )
        `)
        .eq('barbershop_id', barbershopId)
        .eq('is_resolved', false)
        .order('severity', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAlerts(data || []);
    } catch (error) {
      console.error('Error fetching stock alerts:', error);
    } finally {
      setLoading(false);
    }
  };

  const resolveAlert = async (alertId: string) => {
    const { error } = await supabase
      .from('stock_alerts')
      .update({
        is_resolved: true,
        resolved_at: new Date().toISOString()
      })
      .eq('id', alertId);

    if (error) throw error;
    await fetchAlerts();
  };

  const checkStockLevels = async () => {
    if (!barbershopId) return;

    try {
      await supabase.rpc('check_and_create_stock_alerts', {
        p_barbershop_id: barbershopId
      });
      await fetchAlerts();
    } catch (error) {
      console.error('Error checking stock levels:', error);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, [user, barbershopId]);

  return {
    alerts,
    loading,
    resolveAlert,
    checkStockLevels,
    refetch: fetchAlerts,
  };
};
