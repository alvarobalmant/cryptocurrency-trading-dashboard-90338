import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface CommissionPeriod {
  id: string;
  barbershop_id: string;
  employee_id: string;
  period_type: 'individual' | 'weekly' | 'monthly' | 'custom';
  period_start: string;
  period_end: string;
  status: 'draft' | 'pending_signature' | 'signed' | 'paid' | 'cancelled';
  total_services_value: number;
  total_commission_value: number;
  total_deductions: number;
  net_amount: number;
  generated_at: string;
  signed_at: string | null;
  paid_at: string | null;
  payment_method: string | null;
  payment_notes: string | null;
  payment_receipt_urls: string[] | null;
  pdf_url: string | null;
  created_at: string;
  updated_at: string;
  employee?: {
    name: string;
    avatar_url: string | null;
  };
}

export const useCommissionPeriods = (barbershopId: string, employeeId?: string, status?: string) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const { data: periods, isLoading } = useQuery({
    queryKey: ['commission-periods', barbershopId, employeeId, status],
    queryFn: async (): Promise<CommissionPeriod[]> => {
      let query = supabase
        .from('commission_periods')
        .select(`
          *,
          employee:employees(name, avatar_url),
          items:commission_period_items(
            commission_transaction:commissions_transactions(
              commission_value,
              service_value,
              status
            )
          )
        `)
        .eq('barbershop_id', barbershopId)
        .order('created_at', { ascending: false });
      
      if (employeeId) {
        query = query.eq('employee_id', employeeId);
      }

      if (status) {
        query = query.eq('status', status);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      
      // Calcular valores dinamicamente
      const periodsWithTotals = (data || []).map(period => ({
        ...period,
        total_services_value: period.items?.reduce((sum: number, item: any) => 
          sum + (item.commission_transaction?.service_value || 0), 0) || 0,
        total_commission_value: period.items?.reduce((sum: number, item: any) => 
          sum + (item.commission_transaction?.commission_value || 0), 0) || 0,
        total_deductions: 0,
        net_amount: period.items?.reduce((sum: number, item: any) => 
          sum + (item.commission_transaction?.commission_value || 0), 0) || 0,
      }));
      
      return periodsWithTotals as CommissionPeriod[];
    },
    enabled: !!barbershopId
  });

  const payPeriodMutation = useMutation({
    mutationFn: async ({ 
      periodId, 
      paymentMethod, 
      paymentNotes,
      paymentReceiptUrls 
    }: { 
      periodId: string; 
      paymentMethod?: string; 
      paymentNotes?: string;
      paymentReceiptUrls?: string[];
    }) => {
      // 1. Buscar IDs das comissões vinculadas
      const { data: items, error: itemsError } = await supabase
        .from('commission_period_items')
        .select('commission_transaction_id')
        .eq('period_id', periodId);
      
      if (itemsError) throw itemsError;
      
      const commissionIds = items?.map(i => i.commission_transaction_id) || [];
      
      // 2. Atualizar período
      const { error: periodError } = await supabase
        .from('commission_periods')
        .update({
          status: 'paid',
          paid_at: new Date().toISOString(),
          payment_method: paymentMethod,
          payment_notes: paymentNotes,
          payment_receipt_urls: paymentReceiptUrls,
          updated_at: new Date().toISOString()
        })
        .eq('id', periodId);
      
      if (periodError) throw periodError;
      
      // 3. Atualizar comissões individuais
      if (commissionIds.length > 0) {
        const { error: commissionError } = await supabase
          .from('commissions_transactions')
          .update({
            status: 'paid',
            paid_at: new Date().toISOString(),
            payment_method: paymentMethod,
            payment_notes: paymentNotes
          })
          .in('id', commissionIds);
        
        if (commissionError) throw commissionError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['commission-periods'] });
      queryClient.invalidateQueries({ queryKey: ['commission-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['commission-summary'] });
      toast({
        title: "Período pago!",
        description: "O período foi marcado como pago com sucesso.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao pagar período",
        description: error instanceof Error ? error.message : "Ocorreu um erro ao processar o pagamento.",
        variant: "destructive",
      });
    }
  });

  const cancelPeriodMutation = useMutation({
    mutationFn: async (periodId: string) => {
      const { error } = await supabase.rpc('cancel_commission_period', {
        period_id_param: periodId
      });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['commission-periods'] });
      toast({
        title: "Período cancelado!",
        description: "O período foi cancelado com sucesso.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao cancelar período",
        description: error instanceof Error ? error.message : "Ocorreu um erro ao cancelar o período.",
        variant: "destructive",
      });
    }
  });
  
  return {
    periods: periods || [],
    isLoading,
    payPeriod: payPeriodMutation.mutate,
    isPaying: payPeriodMutation.isPending,
    cancelPeriod: cancelPeriodMutation.mutate,
    isCancelling: cancelPeriodMutation.isPending
  };
};
