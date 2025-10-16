import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

type ServiceProductItem = Database['public']['Tables']['service_product_items']['Row'] & {
  products?: {
    id: string;
    name: string;
    sku: string | null;
    unit_type: string;
    image_urls: string[];
  } | null;
};

export const useServiceProducts = (serviceId: string) => {
  const [serviceProducts, setServiceProducts] = useState<ServiceProductItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchServiceProducts = async () => {
    if (!serviceId) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('service_product_items')
        .select(`
          *,
          products (
            id,
            name,
            sku,
            unit_type,
            image_urls
          )
        `)
        .eq('service_id', serviceId);

      if (error) throw error;
      setServiceProducts(data || []);
    } catch (error) {
      console.error('Error fetching service products:', error);
    } finally {
      setLoading(false);
    }
  };

  const addProductToService = async (
    productId: string,
    variantId: string | null,
    quantity: number,
    unit: string,
    costPerUse?: number
  ) => {
    const { data, error } = await supabase
      .from('service_product_items')
      .insert({
        service_id: serviceId,
        product_id: productId,
        variant_id: variantId,
        quantity_per_service: quantity,
        unit: unit,
        cost_per_use: costPerUse || null
      })
      .select()
      .single();

    if (error) throw error;
    await fetchServiceProducts();
    return data;
  };

  const removeProductFromService = async (itemId: string) => {
    const { error } = await supabase
      .from('service_product_items')
      .delete()
      .eq('id', itemId);

    if (error) throw error;
    await fetchServiceProducts();
  };

  const updateServiceProduct = async (
    itemId: string,
    updates: {
      quantity_per_service?: number;
      unit?: string;
      cost_per_use?: number;
      is_optional?: boolean;
    }
  ) => {
    const { data, error } = await supabase
      .from('service_product_items')
      .update(updates)
      .eq('id', itemId)
      .select()
      .single();

    if (error) throw error;
    await fetchServiceProducts();
    return data;
  };

  useEffect(() => {
    fetchServiceProducts();
  }, [serviceId]);

  return {
    serviceProducts,
    loading,
    addProductToService,
    removeProductFromService,
    updateServiceProduct,
    refetch: fetchServiceProducts,
  };
};
