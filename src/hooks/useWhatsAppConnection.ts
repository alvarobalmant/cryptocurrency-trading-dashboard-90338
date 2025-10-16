import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface WhatsAppConnection {
  id: string;
  barbershop_id: string;
  instance_name: string;
  qr_code_base64: string | null;
  connection_status: 'disconnected' | 'waiting_scan' | 'connected';
  connected_phone: string | null;
  evolution_instance_id: string | null;
  last_qr_generated_at: string | null;
  connected_at: string | null;
  created_at: string;
  updated_at: string;
  verificador: boolean | null;
}

export const useWhatsAppConnection = (barbershopId: string | undefined) => {
  const [connection, setConnection] = useState<WhatsAppConnection | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  const fetchConnection = async () => {
    if (!barbershopId) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('whatsapp_connections')
        .select('*')
        .eq('barbershop_id', barbershopId)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching connection:', error);
        throw error;
      }

      // Try to get QR code and verificador status from qrcodewhatsapp table
      console.log('🔍 Buscando QR code para instância:', data.instance_name);
      
      const { data: qrData, error: qrError } = await supabase
        .from('qrcodewhatsapp')
        .select('base64, verificador')
        .eq('instancia', data.instance_name)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      console.log('📊 [DEBUG] Resultado da busca QR:', { 
        found: !!qrData, 
        hasBase64: !!qrData?.base64,
        verificador: qrData?.verificador,
        error: qrError 
      });

      if (qrData) {
        // Update the connection data with QR info
        if (qrData.base64) {
          data.qr_code_base64 = qrData.base64;
          console.log('✅ QR Code atualizado no connection state');
        }
        data.verificador = qrData.verificador;
        console.log('✅ [DEBUG] Verificador status:', qrData.verificador);
      } else {
        console.log('❌ QR Code não encontrado ou inválido');
        data.verificador = null;
      }

      setConnection(data);
    } catch (error) {
      console.error('Error:', error);
      toast.error('Erro ao buscar conexão WhatsApp');
    } finally {
      setLoading(false);
    }
  };

  const generateQR = async () => {
    if (!barbershopId) return;

    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-whatsapp-qr', {
        body: { barbershopId },
      });

      if (error) throw error;

      if (data.success) {
        toast.success('Gerando QR Code... Aguarde alguns segundos');
        // Refetch to get updated status
        setTimeout(() => fetchConnection(), 2000);
      } else {
        throw new Error(data.message || 'Erro ao gerar QR Code');
      }
    } catch (error: any) {
      console.error('Error generating QR:', error);
      toast.error(error.message || 'Erro ao gerar QR Code');
    } finally {
      setGenerating(false);
    }
  };

  const disconnect = async () => {
    if (!barbershopId) return;

    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('disconnect-whatsapp', {
        body: { barbershopId },
      });

      if (error) throw error;

      if (data.success) {
        toast.success('WhatsApp desconectado com sucesso');
        // Refetch to get updated status
        setTimeout(() => fetchConnection(), 1000);
      } else {
        throw new Error(data.message || 'Erro ao desconectar WhatsApp');
      }
    } catch (error: any) {
      console.error('Error disconnecting:', error);
      toast.error(error.message || 'Erro ao desconectar WhatsApp');
    } finally {
      setGenerating(false);
    }
  };

  useEffect(() => {
    fetchConnection();
  }, [barbershopId]);

  // Setup realtime subscription for whatsapp_connections
  useEffect(() => {
    if (!barbershopId) return;

    const channel = supabase
      .channel(`whatsapp-connection-${barbershopId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'whatsapp_connections',
          filter: `barbershop_id=eq.${barbershopId}`,
        },
        async (payload) => {
          console.log('Realtime update whatsapp_connections:', payload);
          
          if (payload.eventType === 'DELETE') {
            setConnection(null);
          } else {
            const newConnection = payload.new as WhatsAppConnection;
            
            // Fetch QR code and verificador from qrcodewhatsapp table
            console.log('🔄 Realtime: Buscando QR code para:', newConnection.instance_name);
            
            const { data: qrData, error: qrError } = await supabase
              .from('qrcodewhatsapp')
              .select('base64, verificador')
              .eq('instancia', newConnection.instance_name)
              .order('created_at', { ascending: false })
              .limit(1)
              .maybeSingle();

            console.log('📊 [DEBUG] Realtime: Resultado busca QR:', { 
              found: !!qrData, 
              hasBase64: !!qrData?.base64,
              verificador: qrData?.verificador,
              error: qrError 
            });

            if (qrData) {
              if (qrData.base64) {
                newConnection.qr_code_base64 = qrData.base64;
                console.log('✅ Realtime: QR Code atualizado');
              }
              newConnection.verificador = qrData.verificador;
              console.log('✅ [DEBUG] Realtime: Verificador status:', qrData.verificador);
            }
            
            setConnection(newConnection);
          }

          // Show toast for connection status changes
          if (payload.eventType === 'UPDATE' && payload.new) {
            const newStatus = (payload.new as WhatsAppConnection).connection_status;
            const oldStatus = (payload.old as WhatsAppConnection)?.connection_status;

            if (newStatus === 'connected' && oldStatus !== 'connected') {
              toast.success('WhatsApp conectado com sucesso! 🎉');
            } else if (newStatus === 'waiting_scan' && oldStatus !== 'waiting_scan') {
              toast.info('QR Code gerado! Escaneie com seu WhatsApp');
            } else if (newStatus === 'disconnected' && oldStatus === 'connected') {
              toast.warning('WhatsApp desconectado');
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [barbershopId]);

  // Setup realtime subscription for qrcodewhatsapp table
  useEffect(() => {
    if (!barbershopId || !connection?.instance_name) return;
    if (connection.connection_status !== 'waiting_scan') return;

    const qrChannel = supabase
      .channel(`qrcode-whatsapp-${connection.instance_name}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'qrcodewhatsapp',
          filter: `instancia=eq.${connection.instance_name}`,
        },
        (payload) => {
          console.log('📡 [DEBUG] Realtime QR Code update:', payload);
          
          const newData = payload.new as any;
          console.log('📊 [DEBUG] New QR data:', {
            hasBase64: !!newData?.base64,
            verificador: newData?.verificador
          });
          
          // Update connection with new QR code and verificador
          setConnection(prev => prev ? {
            ...prev,
            qr_code_base64: newData?.base64 || prev.qr_code_base64,
            verificador: newData?.verificador ?? prev.verificador
          } : null);
          
          if (newData?.base64) {
            toast.success('QR Code atualizado!');
          }
          if (newData?.verificador === true) {
            toast.success('WhatsApp verificado com sucesso! ✅');
          } else if (newData?.verificador === false) {
            toast.error('Erro na conexão do WhatsApp');
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(qrChannel);
    };
  }, [barbershopId, connection?.instance_name, connection?.connection_status]);

  return {
    connection,
    loading,
    generating,
    refetch: fetchConnection,
    generateQR,
    disconnect,
  };
};
