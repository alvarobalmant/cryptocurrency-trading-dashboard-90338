import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface MercadoPagoCredentials {
  accessToken: string;
  publicKey: string;
}

export interface PaymentData {
  barbershopId: string;
  appointmentId?: string;
  serviceId: string;
  employeeId?: string;
  clientName: string;
  clientPhone: string;
  amount: number;
  description: string;
  paymentType: 'appointment' | 'walk_in';
}

export const useMercadoPago = () => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const validateCredentials = async (credentials: MercadoPagoCredentials) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('validate-mercadopago-credentials', {
        body: credentials
      });

      if (error) throw error;
      
      if (!data.success) {
        throw new Error(data.error);
      }

      return data.user;
    } catch (error: any) {
      console.error('Error validating credentials:', error);
      throw new Error(error.message || 'Erro ao validar credenciais');
    } finally {
      setLoading(false);
    }
  };

  const saveBarbershopCredentials = async (barbershopId: string, credentials: MercadoPagoCredentials) => {
    setLoading(true);
    try {
      // First validate credentials
      await validateCredentials(credentials);

      // Save to database
      const { error } = await supabase
        .from('barbershops')
        .update({
          mercadopago_access_token: credentials.accessToken,
          mercadopago_public_key: credentials.publicKey,
          mercadopago_enabled: true
        })
        .eq('id', barbershopId);

      if (error) throw error;

      toast({
        title: 'MercadoPago configurado!',
        description: 'As credenciais foram salvas com sucesso.',
      });

      return true;
    } catch (error: any) {
      console.error('Error saving credentials:', error);
      toast({
        title: 'Erro ao configurar MercadoPago',
        description: error.message,
        variant: 'destructive',
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const createPayment = async (paymentData: PaymentData) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-mercadopago-preference', {
        body: paymentData
      });

      if (error) throw error;
      
      if (!data.success) {
        throw new Error(data.error);
      }

      return data;
    } catch (error: any) {
      console.error('Error creating payment:', error);
      toast({
        title: 'Erro ao criar pagamento',
        description: error.message,
        variant: 'destructive',
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const createPixPayment = async (paymentData: PaymentData & { clientEmail?: string; payerDocType?: string; payerDocNumber?: string }) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-pix-payment', {
        body: paymentData
      });

      if (error) throw error;
      
      if (!data.success) {
        throw new Error(data.error);
      }

      return data;
    } catch (error: any) {
      console.error('Error creating PIX payment:', error);
      toast({
        title: 'Erro ao criar pagamento PIX',
        description: error.message,
        variant: 'destructive',
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const disableMercadoPago = async (barbershopId: string) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('barbershops')
        .update({
          mercadopago_enabled: false,
          mercadopago_access_token: null,
          mercadopago_public_key: null
        })
        .eq('id', barbershopId);

      if (error) throw error;

      toast({
        title: 'MercadoPago desabilitado',
        description: 'A integração foi removida com sucesso.',
      });

      return true;
    } catch (error: any) {
      console.error('Error disabling MercadoPago:', error);
      toast({
        title: 'Erro ao desabilitar MercadoPago',
        description: error.message,
        variant: 'destructive',
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const createPointPayment = async (paymentData: PaymentData & { deviceId?: string }) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-point-payment', {
        body: paymentData
      });

      if (error) throw error;
      
      if (!data.success) {
        throw new Error(data.error);
      }

      return data;
    } catch (error: any) {
      console.error('Error creating Point payment:', error);
      toast({
        title: 'Erro ao enviar para maquininha',
        description: error.message,
        variant: 'destructive',
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const createSubscriptionPayment = async (subscriptionData: {
    barbershopId: string;
    clientProfileId: string;
    subscriptionPlanId: string;
    durationMonths: number;
    amount: number;
    description: string;
    paymentMethod: 'card' | 'pix' | 'point';
    clientEmail?: string;
    payerDocType?: string;
    payerDocNumber?: string;
  }) => {
    setLoading(true);
    try {
      let result;
      
      switch (subscriptionData.paymentMethod) {
        case 'card':
          result = await supabase.functions.invoke('create-mercadopago-preference', {
            body: {
              barbershopId: subscriptionData.barbershopId,
              clientName: '', // Will be filled by the function
              clientPhone: '', // Will be filled by the function
              amount: subscriptionData.amount,
              description: subscriptionData.description,
              paymentType: 'subscription',
              subscriptionData: {
                clientProfileId: subscriptionData.clientProfileId,
                subscriptionPlanId: subscriptionData.subscriptionPlanId,
                durationMonths: subscriptionData.durationMonths,
              }
            }
          });
          break;
          
        case 'pix':
          result = await supabase.functions.invoke('create-pix-payment', {
            body: {
              barbershopId: subscriptionData.barbershopId,
              clientName: '', // Will be filled by the function
              clientPhone: '', // Will be filled by the function
              clientEmail: subscriptionData.clientEmail,
              amount: subscriptionData.amount,
              description: subscriptionData.description,
              paymentType: 'subscription',
              payerDocType: subscriptionData.payerDocType,
              payerDocNumber: subscriptionData.payerDocNumber,
              subscriptionData: {
                clientProfileId: subscriptionData.clientProfileId,
                subscriptionPlanId: subscriptionData.subscriptionPlanId,
                durationMonths: subscriptionData.durationMonths,
              }
            }
          });
          break;
          
        case 'point':
          result = await supabase.functions.invoke('create-point-payment', {
            body: {
              barbershopId: subscriptionData.barbershopId,
              clientName: '', // Will be filled by the function
              clientPhone: '', // Will be filled by the function
              amount: subscriptionData.amount,
              description: subscriptionData.description,
              paymentType: 'subscription',
              subscriptionData: {
                clientProfileId: subscriptionData.clientProfileId,
                subscriptionPlanId: subscriptionData.subscriptionPlanId,
                durationMonths: subscriptionData.durationMonths,
              }
            }
          });
          break;
          
        default:
          throw new Error('Método de pagamento inválido');
      }

      if (result.error) throw result.error;
      
      if (!result.data?.success) {
        throw new Error(result.data?.error || 'Erro ao criar pagamento de assinatura');
      }

      toast({
        title: 'Pagamento criado!',
        description: 'Pagamento de assinatura criado com sucesso.',
      });

      return result.data;
    } catch (error: any) {
      console.error('Error creating subscription payment:', error);
      toast({
        title: 'Erro ao criar pagamento de assinatura',
        description: error.message,
        variant: 'destructive',
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    validateCredentials,
    saveBarbershopCredentials,
    createPayment,
    createPixPayment,
    createPointPayment,
    createSubscriptionPayment,
    disableMercadoPago,
  };
};