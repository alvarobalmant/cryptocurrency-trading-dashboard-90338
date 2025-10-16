import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { Database } from '@/integrations/supabase/types';

export type ProductVariant = {
  id: string;
  variant_name: string;
  unit_size: number;
  units: number;
  volume: number;
  value: number;
  unit_cost: number;
};

export type Product = Database['public']['Tables']['products']['Row'] & {
  service_categories?: {
    id: string;
    name: string;
    color: string | null;
  } | null;
  volume_stock?: {
    total_units: number;
    total_volume: number;
    total_value: number;
    variants: ProductVariant[];
  };
};
type ProductInsert = Database['public']['Tables']['products']['Insert'];
type ProductUpdate = Database['public']['Tables']['products']['Update'];

export const useProducts = (barbershopId?: string) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const fetchProducts = async () => {
    if (!user || !barbershopId) {
      setLoading(false);
      return;
    }

    try {
      // Fetch products with category and calculate stock
      const { data, error } = await supabase
        .from('products')
        .select(`
          *,
          service_categories (
            id,
            name,
            color
          )
        `)
        .eq('barbershop_id', barbershopId)
        .order('name');

      if (error) throw error;

      // Enrich with volume stock information
      const productsWithStock = await Promise.all(
        (data || []).map(async (product) => {
          const { data: volumeData } = await supabase
            .rpc('calculate_product_total_volume', {
              p_product_id: product.id,
              p_barbershop_id: barbershopId
            });

          return {
            ...product,
            volume_stock: volumeData?.[0] || {
              total_units: 0,
              total_volume: 0,
              total_value: 0,
              variants: []
            }
          };
        })
      );

      setProducts(productsWithStock);
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };

  const createProduct = async (productData: Omit<ProductInsert, 'barbershop_id' | 'sku'>) => {
    if (!user || !barbershopId) throw new Error('User not authenticated or barbershop not selected');

    // Generate SKU
    const { data: skuData } = await supabase
      .rpc('generate_product_sku', {
        p_barbershop_id: barbershopId,
        p_product_name: productData.name,
        p_product_type: productData.product_type
      });

    const { data, error } = await supabase
      .from('products')
      .insert([
        {
          ...productData,
          barbershop_id: barbershopId,
          sku: skuData,
          created_by_user_id: user.id
        },
      ])
      .select(`
        *,
        service_categories (
          id,
          name,
          color
        )
      `)
      .single();

    if (error) throw error;

    await fetchProducts();
    return data;
  };

  const updateProduct = async (id: string, updates: ProductUpdate) => {
    const { data, error } = await supabase
      .from('products')
      .update(updates)
      .eq('id', id)
      .select(`
        *,
        service_categories (
          id,
          name,
          color
        )
      `)
      .single();

    if (error) throw error;

    await fetchProducts();
    return data;
  };

  const deleteProduct = async (id: string) => {
    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', id);

    if (error) throw error;
    await fetchProducts();
  };

  useEffect(() => {
    fetchProducts();

    if (!barbershopId) return;

    // Subscribe to products changes with unique channel per barbershop
    const productsChannel = supabase
      .channel(`products-realtime-${barbershopId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'products',
          filter: `barbershop_id=eq.${barbershopId}`,
        },
        (payload) => {
          console.log('Products change detected:', payload);
          fetchProducts();
        }
      )
      .subscribe((status) => {
        console.log('Products subscription status:', status);
      });

    // Subscribe to inventory batches changes
    const batchesChannel = supabase
      .channel(`inventory-batches-realtime-${barbershopId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'inventory_batches',
        },
        (payload) => {
          console.log('Batches change detected:', payload);
          fetchProducts();
        }
      )
      .subscribe((status) => {
        console.log('Batches subscription status:', status);
      });

    // Subscribe to product variants changes
    const variantsChannel = supabase
      .channel(`product-variants-realtime-${barbershopId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'product_variants',
        },
        (payload) => {
          console.log('Variants change detected:', payload);
          fetchProducts();
        }
      )
      .subscribe((status) => {
        console.log('Variants subscription status:', status);
      });

    return () => {
      supabase.removeChannel(productsChannel);
      supabase.removeChannel(batchesChannel);
      supabase.removeChannel(variantsChannel);
    };
  }, [user, barbershopId]);

  return {
    products,
    loading,
    createProduct,
    updateProduct,
    deleteProduct,
    refetch: fetchProducts,
  };
};
