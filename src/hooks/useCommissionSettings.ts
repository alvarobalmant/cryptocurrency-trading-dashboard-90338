import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface CommissionSettings {
  id: string;
  barbershop_id: string;
  default_period_type: 'individual' | 'weekly' | 'monthly';
  auto_generate_periods: boolean;
  weekly_close_day: number | null;
  monthly_close_day: number | null;
  require_signature: boolean;
  created_at: string;
  updated_at: string;
}

export const useCommissionSettings = (barbershopId: string) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const { data: settings, isLoading } = useQuery({
    queryKey: ['commission-settings', barbershopId],
    queryFn: async (): Promise<CommissionSettings | null> => {
      const { data, error } = await supabase
        .from('barbershop_commission_settings')
        .select('*')
        .eq('barbershop_id', barbershopId)
        .maybeSingle();
      
      if (error) throw error;
      return data as CommissionSettings | null;
    },
    enabled: !!barbershopId
  });

  const updateSettingsMutation = useMutation({
    mutationFn: async (updates: Partial<CommissionSettings>) => {
      const { error } = await supabase
        .from('barbershop_commission_settings')
        .upsert({
          barbershop_id: barbershopId,
          ...updates,
          updated_at: new Date().toISOString()
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['commission-settings'] });
      toast({
        title: "Configurações atualizadas!",
        description: "As configurações de comissões foram salvas.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao salvar configurações",
        description: error instanceof Error ? error.message : "Ocorreu um erro.",
        variant: "destructive",
      });
    }
  });

  const generatePeriodsNowMutation = useMutation({
    mutationFn: async () => {
      // Gerar períodos manualmente para cada funcionário
      const { data: employees, error: empError } = await supabase
        .from('employees')
        .select('id, name, commission_percentage')
        .eq('barbershop_id', barbershopId)
        .eq('status', 'active')
        .gt('commission_percentage', 0);
      
      if (empError) throw empError;
      
    const endDate = new Date();
    endDate.setHours(0, 0, 0, 0);
    const startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - (settings?.default_period_type === 'monthly' ? 30 : 7));
      
      const results = { created: 0, skipped: 0, errors: [] as string[] };
      
      for (const emp of employees || []) {
        console.log(`🔍 Processando funcionário: ${emp.name}`);
        
        // ✅ 1. Verificar se período já existe
        const { data: existingPeriod } = await supabase
          .from('commission_periods')
          .select('id')
          .eq('employee_id', emp.id)
          .eq('period_start', startDate.toISOString().split('T')[0])
          .eq('period_end', endDate.toISOString().split('T')[0])
          .maybeSingle();
        
        if (existingPeriod) {
          console.log(`⏭️ Período já existe para ${emp.name}`);
          results.skipped++;
          continue;
        }
        
        // ✅ 2. Buscar comissões no intervalo (USANDO APPOINTMENT_DATE)
        const { data: commissions, error: commError } = await supabase
          .from('commissions_transactions')
          .select(`
            id,
            commission_value,
            service_value,
            appointment:appointments!inner(
              appointment_date,
              start_time
            )
          `)
          .eq('employee_id', emp.id)
          .eq('barbershop_id', barbershopId)
        .eq('status', 'pending')
        .gte('appointment.appointment_date', startDate.toISOString().split('T')[0])
        .lt('appointment.appointment_date', endDate.toISOString().split('T')[0]);
        
        if (commError) {
          console.error(`❌ Erro ao buscar comissões para ${emp.name}:`, commError);
          results.errors.push(`${emp.name}: ${commError.message}`);
          continue;
        }
        
        // ✅ 3. Não criar se não houver comissões
        if (!commissions || commissions.length === 0) {
          console.log(`⏭️ Sem comissões para ${emp.name} no período`);
          results.skipped++;
          continue;
        }
        
        const totalCommission = commissions.reduce((sum, c) => sum + (c.commission_value || 0), 0);
        const totalServices = commissions.reduce((sum, c) => sum + (c.service_value || 0), 0);
        
        console.log(`💰 ${emp.name}: ${commissions.length} comissões = R$ ${totalCommission.toFixed(2)}`);
        
        // ✅ 4. Criar período (sem campos de valores, serão calculados dinamicamente)
        const { data: period, error: periodError } = await supabase
          .from('commission_periods')
          .insert({
            barbershop_id: barbershopId,
            employee_id: emp.id,
            period_type: settings?.default_period_type || 'weekly',
            period_start: startDate.toISOString().split('T')[0],
            period_end: endDate.toISOString().split('T')[0],
            status: 'pending_signature'
          })
          .select()
          .single();
        
        if (periodError) {
          console.error(`❌ Erro ao criar período para ${emp.name}:`, periodError);
          results.errors.push(`${emp.name}: ${periodError.message}`);
          continue;
        }
        
        // ✅ 5. Vincular comissões ao período
        const { error: linkError } = await supabase
          .from('commission_period_items')
          .insert(
            commissions.map(c => ({
              period_id: period.id,
              commission_transaction_id: c.id
            }))
          );
        
        if (linkError) {
          console.error(`❌ Erro ao vincular comissões para ${emp.name}:`, linkError);
          results.errors.push(`${emp.name}: ${linkError.message}`);
          continue;
        }
        
        results.created++;
        console.log(`✅ Período criado para ${emp.name}`);
      }
      
      return results;
    },
    onSuccess: (results) => {
      queryClient.invalidateQueries({ queryKey: ['commission-periods'] });
      queryClient.invalidateQueries({ queryKey: ['commission-transactions'] });
      
      const messages = [];
      if (results.created > 0) messages.push(`${results.created} criado(s)`);
      if (results.skipped > 0) messages.push(`${results.skipped} pulado(s)`);
      if (results.errors.length > 0) messages.push(`${results.errors.length} erro(s)`);
      
      toast({
        title: results.created > 0 ? "Períodos gerados!" : "Nenhum período criado",
        description: messages.join(', '),
        variant: results.errors.length > 0 ? "destructive" : "default",
      });
      
      if (results.errors.length > 0) {
        console.error('Erros ao gerar períodos:', results.errors);
      }
    },
    onError: (error) => {
      toast({
        title: "Erro ao gerar períodos",
        description: error instanceof Error ? error.message : "Ocorreu um erro.",
        variant: "destructive",
      });
    }
  });
  
  return {
    settings,
    isLoading,
    updateSettings: updateSettingsMutation.mutate,
    isUpdating: updateSettingsMutation.isPending,
    generatePeriodsNow: generatePeriodsNowMutation.mutate,
    isGenerating: generatePeriodsNowMutation.isPending
  };
};
