import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { SafeBarbershop, BarbershopInsert, BarbershopUpdate } from '@/types/barbershop';

export const useBarbershops = () => {
  const [barbershops, setBarbershops] = useState<SafeBarbershop[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const fetchBarbershops = async () => {
    if (!user) return;

    try {
      // SECURE: Use security definer function instead of direct table access
      const { data, error } = await supabase.rpc('get_safe_barbershops_list', {
        user_id_param: user.id
      });

      if (error) throw error;
      setBarbershops(data || []);
    } catch (error) {
      console.error('Error fetching barbershops:', error);
    } finally {
      setLoading(false);
    }
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
    
    setBarbershops(prev => [data, ...prev]);
    return data;
  };

  const checkNameAvailability = async (name: string, excludeId?: string) => {
    const { data: slugData, error: slugError } = await supabase.rpc('generate_slug', {
      name
    });

    if (slugError) throw slugError;

    // SECURE: Use only safe function to check slug availability
    const { data, error } = await supabase.rpc('get_safe_barbershops_list');

    if (error) throw error;

    // Check if slug exists in the returned data
    const conflictingBarbershop = data?.find(b => 
      b.slug === slugData && (!excludeId || b.id !== excludeId)
    );

    return {
      available: !conflictingBarbershop,
      suggestedSlug: slugData,
      conflictingBarbershop
    };
  };

  const updateBarbershop = async (id: string, updates: BarbershopUpdate) => {
    const { data, error } = await supabase
      .from('barbershops')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    setBarbershops(prev => 
      prev.map(shop => shop.id === id ? data : shop)
    );
    return data;
  };

  useEffect(() => {
    fetchBarbershops();
  }, [user]);

  const deleteBarbershop = async (id: string) => {
    const { error } = await supabase
      .from('barbershops')
      .delete()
      .eq('id', id);

    if (error) throw error;

    setBarbershops(prev => prev.filter(shop => shop.id !== id));
  };

  return {
    barbershops,
    loading,
    createBarbershop,
    updateBarbershop,
    deleteBarbershop,
    checkNameAvailability,
    refetch: fetchBarbershops,
  };
};