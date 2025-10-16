import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface Payment {
  id: string;
  barbershop_id: string;
  appointment_id?: string;
  employee_id?: string;
  service_id?: string;
  amount: number;
  mercadopago_payment_id?: string;
  mercadopago_preference_id?: string;
  payment_method?: string;
  status: 'pending' | 'processing' | 'paid' | 'failed' | 'cancelled' | 'refunded';
  transaction_amount?: number;
  net_received_amount?: number;
  fee_amount?: number;
  client_name: string;
  client_phone: string;
  description: string;
  external_reference?: string;
  payment_type: 'appointment' | 'walk_in';
  paid_at?: string;
  created_at: string;
  updated_at: string;
}

export const usePayments = (barbershopId?: string) => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPayments = async () => {
    if (!barbershopId) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('payments')
        .select(`
          *,
          appointments(client_name, client_phone, appointment_date, start_time),
          services(name, price),
          employees(name)
        `)
        .eq('barbershop_id', barbershopId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPayments((data as Payment[]) || []);
    } catch (error) {
      console.error('Error fetching payments:', error);
    } finally {
      setLoading(false);
    }
  };

  const getPaymentsByStatus = (status: Payment['status']) => {
    return payments.filter(payment => payment.status === status);
  };

  const getTotalRevenue = (status?: Payment['status']) => {
    const filteredPayments = status 
      ? payments.filter(p => p.status === status)
      : payments.filter(p => p.status === 'paid');
    
    return filteredPayments.reduce((total, payment) => {
      return total + (payment.net_received_amount || payment.amount);
    }, 0);
  };

  const getTotalFees = () => {
    return payments
      .filter(p => p.status === 'paid')
      .reduce((total, payment) => total + (payment.fee_amount || 0), 0);
  };

  const getPaymentsByDateRange = (startDate: Date, endDate: Date) => {
    return payments.filter(payment => {
      const paymentDate = new Date(payment.paid_at || payment.created_at);
      return paymentDate >= startDate && paymentDate <= endDate;
    });
  };

  const getPaymentsByEmployee = (employeeId: string) => {
    return payments.filter(payment => payment.employee_id === employeeId);
  };

  useEffect(() => {
    fetchPayments();
  }, [barbershopId]);

  // Subscribe to real-time updates
  useEffect(() => {
    if (!barbershopId) return;

    const channel = supabase
      .channel('payments-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'payments',
          filter: `barbershop_id=eq.${barbershopId}`
        },
        () => {
          fetchPayments();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [barbershopId]);

  return {
    payments,
    loading,
    refetch: fetchPayments,
    getPaymentsByStatus,
    getTotalRevenue,
    getTotalFees,
    getPaymentsByDateRange,
    getPaymentsByEmployee,
  };
};