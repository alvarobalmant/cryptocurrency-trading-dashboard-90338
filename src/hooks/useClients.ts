import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useEffect } from "react";

export interface Client {
  id: string;
  barbershop_id: string;
  user_id?: string;
  name: string;
  phone: string;
  notes?: string;
  phone_verified?: boolean;
  created_at: string;
  updated_at: string;
}

export interface ClientInsert {
  barbershop_id: string;
  name: string;
  phone: string;
  notes?: string;
}

export interface ClientUpdate {
  name?: string;
  phone?: string;
  notes?: string;
  phone_verified?: boolean;
}

export const useClients = (barbershopId?: string) => {
  const queryClient = useQueryClient();

  const { data: clients, isLoading } = useQuery({
    queryKey: ["clients", barbershopId],
    queryFn: async () => {
      if (!barbershopId) return [];
      
      const { data, error } = await supabase
        .from("client_profiles")
        .select("*")
        .eq("barbershop_id", barbershopId)
        .order("name");

      if (error) throw error;
      return data as Client[];
    },
    enabled: !!barbershopId,
  });

  const createClient = useMutation({
    mutationFn: async (clientData: ClientInsert) => {
      const { data, error } = await supabase
        .from("client_profiles")
        .insert(clientData)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      toast.success("Cliente cadastrado com sucesso!");
    },
    onError: (error: any) => {
      console.error("Erro ao criar cliente:", error);
      if (error.code === "23505") {
        toast.error("Já existe um cliente com este telefone nesta barbearia.");
      } else {
        toast.error("Erro ao cadastrar cliente. Tente novamente.");
      }
    },
  });

  const updateClient = useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & ClientUpdate) => {
      const { data, error } = await supabase
        .from("client_profiles")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      toast.success("Cliente atualizado com sucesso!");
    },
    onError: (error: any) => {
      console.error("Erro ao atualizar cliente:", error);
      if (error.code === "23505") {
        toast.error("Já existe um cliente com este telefone nesta barbearia.");
      } else {
        toast.error("Erro ao atualizar cliente. Tente novamente.");
      }
    },
  });

  const deleteClient = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("client_profiles")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      toast.success("Cliente removido com sucesso!");
    },
    onError: (error: any) => {
      console.error("Erro ao deletar cliente:", error);
      toast.error("Erro ao remover cliente. Tente novamente.");
    },
  });

  const searchClientByPhone = useMutation({
    mutationFn: async ({ barbershopId, phone }: { barbershopId: string; phone: string }) => {
      const { data, error } = await supabase
        .from("client_profiles")
        .select("*")
        .eq("barbershop_id", barbershopId)
        .eq("phone", phone)
        .maybeSingle();

      if (error) throw error;
      return data as Client | null;
    },
  });

  // Realtime subscription
  useEffect(() => {
    if (!barbershopId) return;

    const channel = supabase
      .channel('client-profiles-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'client_profiles',
          filter: `barbershop_id=eq.${barbershopId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["clients", barbershopId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [barbershopId, queryClient]);

  return {
    clients: clients || [],
    isLoading,
    createClient,
    updateClient,
    deleteClient,
    searchClientByPhone,
  };
};