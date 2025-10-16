import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { Database } from '@/integrations/supabase/types';

type Supplier = Database['public']['Tables']['suppliers']['Row'];
type SupplierInsert = Database['public']['Tables']['suppliers']['Insert'];
type SupplierUpdate = Database['public']['Tables']['suppliers']['Update'];

export const useSuppliers = (barbershopId?: string) => {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const fetchSuppliers = async () => {
    if (!user || !barbershopId) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('suppliers')
        .select('*')
        .eq('barbershop_id', barbershopId)
        .order('name');

      if (error) throw error;
      setSuppliers(data || []);
    } catch (error) {
      console.error('Error fetching suppliers:', error);
    } finally {
      setLoading(false);
    }
  };

  const createSupplier = async (supplierData: Omit<SupplierInsert, 'barbershop_id'>) => {
    if (!user || !barbershopId) throw new Error('User not authenticated or barbershop not selected');

    const { data, error } = await supabase
      .from('suppliers')
      .insert([
        {
          ...supplierData,
          barbershop_id: barbershopId,
        },
      ])
      .select()
      .single();

    if (error) throw error;
    
    await fetchSuppliers();
    return data;
  };

  const updateSupplier = async (id: string, updates: SupplierUpdate) => {
    const { data, error } = await supabase
      .from('suppliers')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    await fetchSuppliers();
    return data;
  };

  const deleteSupplier = async (id: string) => {
    const { error } = await supabase
      .from('suppliers')
      .delete()
      .eq('id', id);

    if (error) throw error;
    await fetchSuppliers();
  };

  useEffect(() => {
    fetchSuppliers();
  }, [user, barbershopId]);

  return {
    suppliers,
    loading,
    createSupplier,
    updateSupplier,
    deleteSupplier,
    refetch: fetchSuppliers,
  };
};
