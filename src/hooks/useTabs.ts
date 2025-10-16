import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface Tab {
  id: string;
  barbershop_id: string;
  tab_number: string;
  client_profile_id?: string;
  client_name: string;
  client_phone?: string;
  status: 'open' | 'closed' | 'cancelled';
  appointment_id?: string;
  subtotal: number;
  discount: number;
  total: number;
  payment_status: 'pending' | 'paid' | 'partially_paid';
  paid_amount: number;
  notes?: string;
  opened_at: string;
  closed_at?: string;
  created_by_user_id?: string;
  created_at: string;
  updated_at: string;
}

export const useTabs = (barbershopId?: string) => {
  const [tabs, setTabs] = useState<Tab[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchTabs = async () => {
    if (!barbershopId) return;

    try {
      const { data, error } = await supabase
        .from('tabs')
        .select('*')
        .eq('barbershop_id', barbershopId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTabs(data || []);
    } catch (error: any) {
      console.error('Error fetching tabs:', error);
      toast({
        title: 'Erro ao carregar comandas',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const createTab = async (tabData: {
    client_name: string;
    client_phone?: string;
    client_profile_id?: string;
    appointment_id?: string;
    notes?: string;
  }) => {
    if (!barbershopId) throw new Error('Barbershop ID is required');

    try {
      // Generate tab number
      const { data: tabNumber, error: numberError } = await supabase
        .rpc('generate_tab_number', { p_barbershop_id: barbershopId });

      if (numberError) throw numberError;

      const { data, error } = await supabase
        .from('tabs')
        .insert({
          barbershop_id: barbershopId,
          tab_number: tabNumber,
          ...tabData,
          status: 'open',
          payment_status: 'pending',
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: 'Comanda criada',
        description: `Comanda ${tabNumber} criada com sucesso`,
      });

      await fetchTabs();
      return data;
    } catch (error: any) {
      console.error('Error creating tab:', error);
      toast({
        title: 'Erro ao criar comanda',
        description: error.message,
        variant: 'destructive',
      });
      throw error;
    }
  };

  const updateTab = async (tabId: string, updates: Partial<Tab>) => {
    try {
      const { error } = await supabase
        .from('tabs')
        .update(updates)
        .eq('id', tabId);

      if (error) throw error;

      toast({
        title: 'Comanda atualizada',
        description: 'Comanda atualizada com sucesso',
      });

      await fetchTabs();
    } catch (error: any) {
      console.error('Error updating tab:', error);
      toast({
        title: 'Erro ao atualizar comanda',
        description: error.message,
        variant: 'destructive',
      });
      throw error;
    }
  };

  const closeTab = async (tabId: string) => {
    try {
      const { error } = await supabase
        .from('tabs')
        .update({
          status: 'closed',
          closed_at: new Date().toISOString(),
        })
        .eq('id', tabId);

      if (error) throw error;

      toast({
        title: 'Comanda fechada',
        description: 'Comanda fechada com sucesso',
      });

      await fetchTabs();
    } catch (error: any) {
      console.error('Error closing tab:', error);
      toast({
        title: 'Erro ao fechar comanda',
        description: error.message,
        variant: 'destructive',
      });
      throw error;
    }
  };

  const cancelTab = async (tabId: string) => {
    try {
      const { error } = await supabase
        .from('tabs')
        .update({
          status: 'cancelled',
          closed_at: new Date().toISOString(),
        })
        .eq('id', tabId);

      if (error) throw error;

      toast({
        title: 'Comanda cancelada',
        description: 'Comanda cancelada com sucesso',
      });

      await fetchTabs();
    } catch (error: any) {
      console.error('Error cancelling tab:', error);
      toast({
        title: 'Erro ao cancelar comanda',
        description: error.message,
        variant: 'destructive',
      });
      throw error;
    }
  };

  const getOpenTabs = () => tabs.filter(t => t.status === 'open');
  const getClosedTabs = () => tabs.filter(t => t.status === 'closed');
  const getTabsByClient = (clientId: string) => 
    tabs.filter(t => t.client_profile_id === clientId);

  useEffect(() => {
    fetchTabs();

    if (!barbershopId) return;

    const channel = supabase
      .channel('tabs-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tabs',
          filter: `barbershop_id=eq.${barbershopId}`,
        },
        () => {
          fetchTabs();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [barbershopId]);

  return {
    tabs,
    loading,
    fetchTabs,
    createTab,
    updateTab,
    closeTab,
    cancelTab,
    getOpenTabs,
    getClosedTabs,
    getTabsByClient,
  };
};
