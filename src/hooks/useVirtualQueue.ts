import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useVirtualQueue(barbershopId: string | undefined) {
  return useQuery({
    queryKey: ['virtual-queue', barbershopId],
    queryFn: async () => {
      if (!barbershopId) return null;

      const { data, error } = await supabase
        .from('virtual_queue_entries')
        .select(`
          *,
          services:service_id (
            name,
            duration_minutes
          ),
          employees:employee_id (
            name
          )
        `)
        .eq('barbershop_id', barbershopId)
        .in('status', ['waiting', 'notified'])
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data || [];
    },
    enabled: !!barbershopId,
    refetchInterval: 30000, // Refresh every 30 seconds
  });
}

export function useVirtualQueueStats(barbershopId: string | undefined) {
  return useQuery({
    queryKey: ['virtual-queue-stats', barbershopId],
    queryFn: async () => {
      if (!barbershopId) return null;

      const { data: entries } = await supabase
        .from('virtual_queue_entries')
        .select('*')
        .eq('barbershop_id', barbershopId);

      const waiting = entries?.filter(e => e.status === 'waiting').length || 0;
      const notified = entries?.filter(e => e.status === 'notified').length || 0;
      const confirmed = entries?.filter(e => e.status === 'confirmed').length || 0;
      const expired = entries?.filter(e => e.status === 'expired').length || 0;

      // Calculate average wait time for confirmed entries
      const confirmedEntries = entries?.filter(e => e.status === 'confirmed') || [];
      const avgWaitTime = confirmedEntries.length > 0
        ? confirmedEntries.reduce((acc, entry) => {
            const waitMs = new Date(entry.notification_sent_at || entry.created_at).getTime() - new Date(entry.created_at).getTime();
            return acc + waitMs;
          }, 0) / confirmedEntries.length / 60000 // Convert to minutes
        : 0;

      const confirmationRate = (confirmed + notified > 0) ? (confirmed / (confirmed + expired + notified)) * 100 : 0;

      return {
        waiting,
        notified,
        confirmed,
        expired,
        avgWaitTime: Math.round(avgWaitTime),
        confirmationRate: Math.round(confirmationRate),
      };
    },
    enabled: !!barbershopId,
    refetchInterval: 30000,
  });
}
