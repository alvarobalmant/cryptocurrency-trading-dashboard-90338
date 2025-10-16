import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface PurchaseSuggestion {
  variant_id: string;
  variant_name: string;
  unit_size: number;
  unit_cost: number;
  quantity_to_buy: number;
  total_cost: number;
  total_volume: number;
}

export const usePurchaseSuggestion = () => {
  const [loading, setLoading] = useState(false);

  const getSuggestion = async (productId: string, neededVolume: number): Promise<PurchaseSuggestion | null> => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .rpc('suggest_optimal_purchase', {
          p_product_id: productId,
          p_needed_volume: neededVolume
        });

      if (error) throw error;
      return data?.[0] || null;
    } catch (error) {
      console.error('Error getting purchase suggestion:', error);
      return null;
    } finally {
      setLoading(false);
    }
  };

  return {
    getSuggestion,
    loading
  };
};
