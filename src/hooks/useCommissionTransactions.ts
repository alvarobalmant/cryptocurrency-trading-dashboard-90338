import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface CommissionTransaction {
  id: string;
  barbershop_id: string;
  employee_id: string;
  appointment_id: string;
  service_id: string;
  service_value: number;
  commission_percentage: number;
  commission_value: number;
  status: 'pending' | 'paid';
  created_at: string;
  paid_at: string | null;
  payment_method: string | null;
  payment_notes: string | null;
  employee?: {
    name: string;
    avatar_url: string | null;
  };
  service?: {
    name: string;
  };
  appointment?: {
    appointment_date: string;
    client_name: string;
  };
}

export const useCommissionTransactions = (barbershopId: string, employeeId?: string, status?: 'pending' | 'paid') => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const { data: transactions, isLoading } = useQuery({
    queryKey: ['commission-transactions', barbershopId, employeeId, status],
    queryFn: async (): Promise<CommissionTransaction[]> => {
      let query = supabase
        .from('commissions_transactions')
        .select(`
          *,
          employee:employees(name, avatar_url),
          service:services(name),
          appointment:appointments(appointment_date, client_name)
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
      return data as CommissionTransaction[];
    },
    enabled: !!barbershopId
  });
  
  const markAsPaidMutation = useMutation({
    mutationFn: async ({ 
      transactionId, 
      paymentMethod, 
      paymentNotes 
    }: { 
      transactionId: string; 
      paymentMethod?: string; 
      paymentNotes?: string; 
    }) => {
      const { error } = await supabase.rpc('mark_commission_as_paid', {
        p_transaction_id: transactionId,
        p_payment_method: paymentMethod,
        p_payment_notes: paymentNotes
      });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['commission-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['commission-summary'] });
      toast({
        title: "Comissão paga!",
        description: "A comissão foi marcada como paga com sucesso.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao pagar comissão",
        description: error instanceof Error ? error.message : "Ocorreu um erro ao processar o pagamento.",
        variant: "destructive",
      });
    }
  });
  
  return {
    transactions: transactions || [],
    isLoading,
    markAsPaid: markAsPaidMutation.mutate,
    isMarkingAsPaid: markAsPaidMutation.isPending
  };
};
