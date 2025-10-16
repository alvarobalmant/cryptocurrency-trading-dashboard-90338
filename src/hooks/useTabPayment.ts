import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const useTabPayment = () => {
  const [processing, setProcessing] = useState(false);
  const { toast } = useToast();

  const processPayment = async (
    tabId: string,
    barbershopId: string,
    paymentData: {
      amount: number;
      payment_method: string;
      payment_type?: string;
      mercadopago_payment_id?: string;
      mercadopago_preference_id?: string;
    }
  ) => {
    setProcessing(true);
    try {
      // Get tab details
      const { data: tab, error: tabError } = await supabase
        .from('tabs')
        .select('*, appointment_id')
        .eq('id', tabId)
        .single();

      if (tabError) throw tabError;

      // Create payment record
      const { data: payment, error: paymentError } = await supabase
        .from('payments')
        .insert({
          barbershop_id: barbershopId,
          tab_id: tabId,
          appointment_id: tab.appointment_id,
          amount: paymentData.amount,
          payment_method: paymentData.payment_method,
          payment_type: paymentData.payment_type || 'walk_in',
          payment_source: 'tab',
          status: 'paid',
          client_name: tab.client_name,
          client_phone: tab.client_phone,
          description: `Pagamento da comanda ${tab.tab_number}`,
          paid_at: new Date().toISOString(),
          net_received_amount: paymentData.amount,
          mercadopago_payment_id: paymentData.mercadopago_payment_id,
          mercadopago_preference_id: paymentData.mercadopago_preference_id,
        })
        .select()
        .single();

      if (paymentError) throw paymentError;

      // Update tab payment status
      const newPaidAmount = Number(tab.paid_amount) + paymentData.amount;
      const isFullyPaid = newPaidAmount >= Number(tab.total);

      const { error: updateTabError } = await supabase
        .from('tabs')
        .update({
          paid_amount: newPaidAmount,
          payment_status: isFullyPaid ? 'paid' : 'partially_paid',
          status: isFullyPaid ? 'closed' : 'open',
          closed_at: isFullyPaid ? new Date().toISOString() : null,
        })
        .eq('id', tabId);

      if (updateTabError) throw updateTabError;

      // If tab has appointment, update appointment payment status
      if (tab.appointment_id && isFullyPaid) {
        const { error: appointmentError } = await supabase
          .from('appointments')
          .update({
            payment_status: 'paid',
            payment_method: paymentData.payment_method,
            status: 'confirmed',
          })
          .eq('id', tab.appointment_id);

        if (appointmentError) throw appointmentError;
      }

      toast({
        title: 'Pagamento processado',
        description: isFullyPaid 
          ? 'Comanda paga e fechada com sucesso' 
          : 'Pagamento parcial registrado',
      });

      return payment;
    } catch (error: any) {
      console.error('Error processing payment:', error);
      toast({
        title: 'Erro ao processar pagamento',
        description: error.message,
        variant: 'destructive',
      });
      throw error;
    } finally {
      setProcessing(false);
    }
  };

  return {
    processPayment,
    processing,
  };
};
