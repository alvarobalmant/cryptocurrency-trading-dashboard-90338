import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { SafeBarbershop, BarbershopInsert, BarbershopUpdate } from '@/types/barbershop';

export const useBarbershop = () => {
  const [barbershop, setBarbershop] = useState<SafeBarbershop | null>(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const params = useParams<{ barbershopId?: string }>();

  const fetchBarbershop = async () => {
    if (!user) return;

    try {
      // SECURE: Use security definer function instead of direct table access
      const { data, error } = await supabase.rpc('get_safe_barbershops_list', {
        user_id_param: user.id
      });

      if (error) throw error;

      if (data && data.length > 0) {
        // If barbershopId is in URL params, find that specific barbershop
        if (params.barbershopId) {
          const specific = data.find(b => b.id === params.barbershopId);
          setBarbershop(specific || data[0]);
        } else {
          setBarbershop(data[0]); // Fallback to first barbershop
        }
      } else {
        setBarbershop(null);
      }
    } catch (error) {
      console.error('Error fetching barbershop:', error);
    } finally {
      setLoading(false);
    }
  };

  const selectBarbershop = (selectedBarbershop: SafeBarbershop) => {
    setBarbershop(selectedBarbershop);
  };

  const createBarbershop = async (barbershopData: Omit<BarbershopInsert, 'owner_id' | 'slug'>) => {
    if (!user) throw new Error('User not authenticated');

    // Generate slug from name
    const { data: slugData, error: slugError } = await supabase.rpc('generate_slug', {
      name: barbershopData.name
    });

    if (slugError) throw slugError;

    const { data, error } = await supabase
      .from('barbershops')
      .insert([
        {
          ...barbershopData,
          owner_id: user.id,
          slug: slugData,
        },
      ])
      .select()
      .single();

    if (error) throw error;
    
    setBarbershop(data);
    return data;
  };

  const updateBarbershop = async (updates: BarbershopUpdate) => {
    if (!barbershop) throw new Error('No barbershop to update');

    const { data, error } = await supabase
      .from('barbershops')
      .update(updates)
      .eq('id', barbershop.id)
      .select()
      .single();

    if (error) throw error;

    setBarbershop(data);
    return data;
  };

  const deleteBarbershop = async () => {
    if (!barbershop) throw new Error('No barbershop to delete');

    const { error } = await supabase
      .from('barbershops')
      .delete()
      .eq('id', barbershop.id);

    if (error) throw error;

    setBarbershop(null);
  };

  useEffect(() => {
    fetchBarbershop();
  }, [user]);

  return {
    barbershop,
    loading,
    createBarbershop,
    updateBarbershop,
    deleteBarbershop,
    selectBarbershop,
    refetch: fetchBarbershop,
  };
};

export type { SafeBarbershop, BarbershopInsert, BarbershopUpdate };