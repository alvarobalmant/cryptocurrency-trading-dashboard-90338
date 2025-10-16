import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface TabItem {
  id: string;
  tab_id: string;
  item_type: 'product' | 'service' | 'custom';
  product_id?: string;
  service_id?: string;
  employee_id?: string;
  item_name: string;
  description?: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  discount: number;
  total: number;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export const useTabItems = (tabId?: string) => {
  const [items, setItems] = useState<TabItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchItems = async () => {
    if (!tabId) return;

    try {
      const { data, error } = await supabase
        .from('tab_items')
        .select('*')
        .eq('tab_id', tabId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setItems(data || []);
    } catch (error: any) {
      console.error('Error fetching tab items:', error);
      toast({
        title: 'Erro ao carregar itens',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateTotals = (quantity: number, unitPrice: number, discount: number = 0) => {
    const subtotal = quantity * unitPrice;
    const total = subtotal - discount;
    return { subtotal, total };
  };

  const addItem = async (itemData: {
    item_type: 'product' | 'service' | 'custom';
    product_id?: string;
    service_id?: string;
    employee_id?: string;
    item_name: string;
    description?: string;
    quantity: number;
    unit_price: number;
    discount?: number;
    notes?: string;
  }) => {
    if (!tabId) throw new Error('Tab ID is required');

    try {
      const { subtotal, total } = calculateTotals(
        itemData.quantity,
        itemData.unit_price,
        itemData.discount || 0
      );

      const { data, error } = await supabase
        .from('tab_items')
        .insert({
          tab_id: tabId,
          ...itemData,
          subtotal,
          total,
          discount: itemData.discount || 0,
        })
        .select()
        .single();

      if (error) throw error;

      // Update tab totals
      await updateTabTotals();

      toast({
        title: 'Item adicionado',
        description: 'Item adicionado à comanda com sucesso',
      });

      await fetchItems();
      return data;
    } catch (error: any) {
      console.error('Error adding item:', error);
      toast({
        title: 'Erro ao adicionar item',
        description: error.message,
        variant: 'destructive',
      });
      throw error;
    }
  };

  const updateItem = async (itemId: string, updates: Partial<TabItem>) => {
    try {
      // Recalculate totals if quantity, price or discount changed
      if (updates.quantity !== undefined || updates.unit_price !== undefined || updates.discount !== undefined) {
        const item = items.find(i => i.id === itemId);
        if (item) {
          const { subtotal, total } = calculateTotals(
            updates.quantity ?? item.quantity,
            updates.unit_price ?? item.unit_price,
            updates.discount ?? item.discount
          );
          updates.subtotal = subtotal;
          updates.total = total;
        }
      }

      const { error } = await supabase
        .from('tab_items')
        .update(updates)
        .eq('id', itemId);

      if (error) throw error;

      await updateTabTotals();

      toast({
        title: 'Item atualizado',
        description: 'Item atualizado com sucesso',
      });

      await fetchItems();
    } catch (error: any) {
      console.error('Error updating item:', error);
      toast({
        title: 'Erro ao atualizar item',
        description: error.message,
        variant: 'destructive',
      });
      throw error;
    }
  };

  const removeItem = async (itemId: string) => {
    try {
      const { error } = await supabase
        .from('tab_items')
        .delete()
        .eq('id', itemId);

      if (error) throw error;

      await updateTabTotals();

      toast({
        title: 'Item removido',
        description: 'Item removido da comanda',
      });

      await fetchItems();
    } catch (error: any) {
      console.error('Error removing item:', error);
      toast({
        title: 'Erro ao remover item',
        description: error.message,
        variant: 'destructive',
      });
      throw error;
    }
  };

  const updateTabTotals = async () => {
    if (!tabId) return;

    try {
      // Calculate totals from items
      const { data: itemsData, error: itemsError } = await supabase
        .from('tab_items')
        .select('subtotal, discount, total')
        .eq('tab_id', tabId);

      if (itemsError) throw itemsError;

      const subtotal = itemsData?.reduce((sum, item) => sum + Number(item.subtotal), 0) || 0;
      const discount = itemsData?.reduce((sum, item) => sum + Number(item.discount), 0) || 0;
      const total = itemsData?.reduce((sum, item) => sum + Number(item.total), 0) || 0;

      // Update tab
      const { error: updateError } = await supabase
        .from('tabs')
        .update({ subtotal, discount, total })
        .eq('id', tabId);

      if (updateError) throw updateError;
    } catch (error: any) {
      console.error('Error updating tab totals:', error);
    }
  };

  const getTotalAmount = () => items.reduce((sum, item) => sum + Number(item.total), 0);

  useEffect(() => {
    fetchItems();

    if (!tabId) return;

    const channel = supabase
      .channel('tab-items-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tab_items',
          filter: `tab_id=eq.${tabId}`,
        },
        () => {
          fetchItems();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tabId]);

  return {
    items,
    loading,
    fetchItems,
    addItem,
    updateItem,
    removeItem,
    getTotalAmount,
  };
};
