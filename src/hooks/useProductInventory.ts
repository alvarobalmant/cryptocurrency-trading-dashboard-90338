import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

type InventoryBatch = Database['public']['Tables']['inventory_batches']['Row'];
type InventoryTransaction = Database['public']['Tables']['inventory_transactions']['Row'];

export interface InventorySummary {
  total_quantity: number;
  total_value: number;
  batch_count: number;
  oldest_expiry: string | null;
  weighted_avg_cost: number;
}

export const useProductInventory = (productId: string, variantId?: string) => {
  const [inventory, setInventory] = useState<InventorySummary | null>(null);
  const [batches, setBatches] = useState<InventoryBatch[]>([]);
  const [transactions, setTransactions] = useState<InventoryTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchInventory = async () => {
    if (!productId) {
      setLoading(false);
      return;
    }

    try {
      // Fetch inventory summary
      const { data: summaryData } = await supabase
        .rpc('calculate_available_stock', {
          p_product_id: productId,
          p_variant_id: variantId || null
        });

      if (summaryData && summaryData.length > 0) {
        setInventory(summaryData[0]);
      }

      // Fetch batches
      let batchQuery = supabase
        .from('inventory_batches')
        .select('*')
        .eq('product_id', productId)
        .eq('status', 'active')
        .order('expiry_date', { nullsLast: true })
        .order('created_at');

      if (variantId) {
        batchQuery = batchQuery.eq('variant_id', variantId);
      }

      const { data: batchData } = await batchQuery;
      setBatches(batchData || []);

      // Fetch recent transactions
      let transactionQuery = supabase
        .from('inventory_transactions')
        .select('*')
        .eq('product_id', productId)
        .order('created_at', { ascending: false })
        .limit(20);

      if (variantId) {
        transactionQuery = transactionQuery.eq('variant_id', variantId);
      }

      const { data: transactionData } = await transactionQuery;
      setTransactions(transactionData || []);

    } catch (error) {
      console.error('Error fetching inventory:', error);
    } finally {
      setLoading(false);
    }
  };

  const addInventoryTransaction = async (
    transactionData: {
      barbershopId: string;
      transactionType: 'IN' | 'OUT' | 'ADJUSTMENT';
      quantity: number;
      unitCost?: number;
      reason?: string;
      batchId?: string;
    }
  ) => {
    const { error } = await supabase
      .from('inventory_transactions')
      .insert({
        barbershop_id: transactionData.barbershopId,
        product_id: productId,
        variant_id: variantId || null,
        batch_id: transactionData.batchId || null,
        transaction_type: transactionData.transactionType,
        quantity: transactionData.quantity,
        unit_cost: transactionData.unitCost || null,
        reason: transactionData.reason || null,
      });

    if (error) throw error;
    await fetchInventory();
  };

  useEffect(() => {
    fetchInventory();
  }, [productId, variantId]);

  return {
    inventory,
    batches,
    transactions,
    loading,
    addInventoryTransaction,
    refetch: fetchInventory,
  };
};
