import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type NotificationTiming = '30_minutes' | '1_hour' | '1_day';

export interface NotificationSettings {
  id: string;
  barbershop_id: string;
  notification_timing: NotificationTiming;
  is_active: boolean;
  custom_agent_prompt?: string;
  created_at: string;
  updated_at: string;
}

export const useNotificationSettings = (barbershopId?: string) => {
  const queryClient = useQueryClient();

  const { data: settings, isLoading } = useQuery({
    queryKey: ["notification-settings", barbershopId],
    queryFn: async (): Promise<NotificationSettings | null> => {
      if (!barbershopId) return null;

      console.log('🔔 Fetching notification settings for:', barbershopId);

      const { data, error } = await supabase
        .from("appointment_notification_settings")
        .select("*")
        .eq("barbershop_id", barbershopId)
        .maybeSingle();

      if (error) {
        console.error('❌ Error fetching notification settings:', error);
        throw error;
      }

      console.log('✅ Notification settings fetched:', data);
      return data;
    },
    enabled: !!barbershopId,
  });

  const createMutation = useMutation({
    mutationFn: async (params: {
      barbershop_id: string;
      notification_timing: NotificationTiming;
      is_active: boolean;
      custom_agent_prompt?: string;
    }) => {
      console.log('➕ Creating notification settings:', params);

      const { data, error } = await supabase
        .from("appointment_notification_settings")
        .insert([params])
        .select()
        .single();

      if (error) {
        console.error('❌ Error creating notification settings:', error);
        throw error;
      }

      console.log('✅ Notification settings created:', data);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notification-settings", barbershopId] });
      toast.success("Configurações salvas com sucesso!");
    },
    onError: (error) => {
      console.error('❌ Failed to create notification settings:', error);
      toast.error("Erro ao salvar configurações");
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (params: {
      id: string;
      notification_timing?: NotificationTiming;
      is_active?: boolean;
      custom_agent_prompt?: string;
    }) => {
      console.log('📝 Updating notification settings:', params);

      const { id, ...updates } = params;

      const { data, error } = await supabase
        .from("appointment_notification_settings")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) {
        console.error('❌ Error updating notification settings:', error);
        throw error;
      }

      console.log('✅ Notification settings updated:', data);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notification-settings", barbershopId] });
      toast.success("Configurações atualizadas com sucesso!");
    },
    onError: (error) => {
      console.error('❌ Failed to update notification settings:', error);
      toast.error("Erro ao atualizar configurações");
    },
  });

  return {
    settings,
    loading: isLoading,
    createSettings: createMutation.mutateAsync,
    updateSettings: updateMutation.mutateAsync,
  };
};
