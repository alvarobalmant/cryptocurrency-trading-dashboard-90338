import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { Database } from '@/integrations/supabase/types';

export type Service = Database['public']['Tables']['services']['Row'];
type ServiceInsert = Database['public']['Tables']['services']['Insert'];
type ServiceUpdate = Database['public']['Tables']['services']['Update'];

export const useServices = (barbershopId?: string) => {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const fetchServices = async () => {
    if (!user || !barbershopId) return;

    try {
      const { data, error } = await supabase
        .from('services')
        .select(`
          *,
          service_categories (
            id,
            name,
            color
          )
        `)
        .eq('barbershop_id', barbershopId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setServices(data || []);
    } catch (error) {
      console.error('Error fetching services:', error);
    } finally {
      setLoading(false);
    }
  };

  const createService = async (serviceData: Omit<ServiceInsert, 'barbershop_id'>) => {
    if (!user || !barbershopId) throw new Error('User not authenticated or barbershop not selected');

    const { data, error } = await supabase
      .from('services')
      .insert([
        {
          ...serviceData,
          barbershop_id: barbershopId,
        },
      ])
      .select()
      .single();

    if (error) throw error;
    
    setServices(prev => [data, ...prev]);
    return data;
  };

  const updateService = async (id: string, updates: ServiceUpdate) => {
    const { data, error } = await supabase
      .from('services')
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

    setServices(prev => 
      prev.map(service => service.id === id ? data : service)
    );
    return data;
  };

  const deleteService = async (id: string) => {
    const { error } = await supabase
      .from('services')
      .delete()
      .eq('id', id);

    if (error) throw error;

    setServices(prev => prev.filter(service => service.id !== id));
  };

  useEffect(() => {
    fetchServices();

    if (!barbershopId) return;

    const channel = supabase
      .channel('services-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'services',
          filter: `barbershop_id=eq.${barbershopId}`,
        },
        () => {
          fetchServices();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, barbershopId]);

  return {
    services,
    loading,
    createService,
    updateService,
    deleteService,
    refetch: fetchServices,
  };
};