import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface MaskedCredentials {
  access_token_masked: string;
  public_key_masked: string;
  has_access_token: boolean;
  has_public_key: boolean;
  mercadopago_enabled?: boolean;
}

export const useMercadoPagoCredentials = () => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // SECURE: Get masked credentials via edge function
  const getMaskedCredentials = async (barbershopId: string): Promise<MaskedCredentials> => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('mercadopago-credentials', {
        body: {
          action: 'get_masked',
          barbershopId
        }
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error);

      return data.data;
    } catch (error: any) {
      console.error('Error fetching MercadoPago credentials:', error);
      toast({
        title: 'Erro ao carregar credenciais',
        description: error.message,
        variant: 'destructive',
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // SECURE: Validate credentials via edge function
  const validateCredentials = async (credentials: { accessToken: string; publicKey: string }) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('mercadopago-credentials', {
        body: {
          action: 'validate',
          barbershopId: '', // Not needed for validation
          accessToken: credentials.accessToken,
          publicKey: credentials.publicKey
        }
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error);

      return data;
    } catch (error: any) {
      console.error('Error validating MercadoPago credentials:', error);
      toast({
        title: 'Erro ao validar credenciais',
        description: error.message,
        variant: 'destructive',
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // SECURE: Update credentials via edge function
  const updateCredentials = async (
    barbershopId: string,
    credentials: { accessToken: string; publicKey: string }
  ) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('mercadopago-credentials', {
        body: {
          action: 'update',
          barbershopId,
          accessToken: credentials.accessToken,
          publicKey: credentials.publicKey
        }
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error);

      toast({
        title: 'MercadoPago configurado!',
        description: 'As credenciais foram salvas com sucesso.',
      });

      return true;
    } catch (error: any) {
      console.error('Error updating MercadoPago credentials:', error);
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

  // SECURE: Disable credentials via edge function
  const disableCredentials = async (barbershopId: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('mercadopago-credentials', {
        body: {
          action: 'disable',
          barbershopId
        }
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error);

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

  return {
    loading,
    getMaskedCredentials,
    validateCredentials,
    updateCredentials,
    disableCredentials,
  };
};