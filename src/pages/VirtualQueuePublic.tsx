import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { supabasePublic } from '@/integrations/supabase/publicClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Clock, Users, CheckCircle, XCircle, Loader2, Phone, User, Calendar, Scissors } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { QueueNotificationBanner } from '@/components/queue/QueueNotificationBanner';

const queueEntrySchema = z.object({
  clientName: z.string().trim().min(3, 'Nome deve ter no mínimo 3 caracteres').max(100),
  clientPhone: z.string().trim().min(10, 'Telefone inválido').max(20),
  serviceId: z.string().uuid('Selecione um serviço'),
  travelTimeMinutes: z.number().min(1, 'Tempo de deslocamento inválido').max(180, 'Tempo de deslocamento muito longo')
});

export default function VirtualQueuePublic() {
  const { barbershopSlug } = useParams();
  const queryClient = useQueryClient();
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [serviceId, setServiceId] = useState('');
  const [travelTimeMinutes, setTravelTimeMinutes] = useState(30);
  const [entryId, setEntryId] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Fetch barbershop info using the safe public function
  const { data: barbershop, isLoading: loadingBarbershop, error: barbershopError } = useQuery({
    queryKey: ['barbershop-public', barbershopSlug],
    queryFn: async () => {
      const { data, error } = await supabasePublic.rpc('get_barbershop_for_booking', {
        barbershop_identifier: barbershopSlug || ''
      });

      if (error) {
        console.error('Error fetching barbershop:', error);
        throw error;
      }
      
      if (!data || data.length === 0) {
        throw new Error('Barbearia não encontrada');
      }

      return data[0];
    },
    enabled: !!barbershopSlug,
    retry: 1
  });

  // Fetch services
  const { data: services, isLoading: loadingServices } = useQuery({
    queryKey: ['services-public', barbershop?.id],
    queryFn: async () => {
      if (!barbershop?.id) return [];

      const { data, error } = await supabasePublic
        .from('services')
        .select('id, name, description, price, duration_minutes')
        .eq('barbershop_id', barbershop.id)
        .eq('active', true)
        .order('name');

      if (error) throw error;
      return data || [];
    },
    enabled: !!barbershop?.id
  });

  // Fetch queue settings
  const { data: queueSettings } = useQuery({
    queryKey: ['queue-settings-public', barbershop?.id],
    queryFn: async () => {
      if (!barbershop?.id) return null;

      const { data, error } = await supabasePublic
        .from('virtual_queue_settings')
        .select('*')
        .eq('barbershop_id', barbershop.id)
        .eq('enabled', true)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;
      return data;
    },
    enabled: !!barbershop?.id
  });

  // Fetch current queue position if user has an entry
  const { data: queueEntry, refetch: refetchEntry } = useQuery({
    queryKey: ['queue-entry', entryId],
    queryFn: async () => {
      if (!entryId) return null;

      const { data, error } = await supabasePublic
        .from('virtual_queue_entries')
        .select('*')
        .eq('id', entryId)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!entryId,
    refetchInterval: 30000
  });

  // Get queue position
  const { data: queuePosition } = useQuery({
    queryKey: ['queue-position', queueEntry?.id],
    queryFn: async () => {
      if (!queueEntry || !barbershop?.id) return null;

      const { data, error } = await supabasePublic
        .from('virtual_queue_entries')
        .select('id')
        .eq('barbershop_id', barbershop.id)
        .eq('status', 'waiting')
        .lt('created_at', queueEntry.created_at)
        .order('created_at');

      if (error) throw error;
      return (data?.length || 0) + 1;
    },
    enabled: !!queueEntry && queueEntry.status === 'waiting',
    refetchInterval: 10000,
  });

  // Join queue mutation
  const joinQueueMutation = useMutation({
    mutationFn: async () => {
      // Validate form
      const validation = queueEntrySchema.safeParse({
        clientName,
        clientPhone,
        serviceId,
        travelTimeMinutes
      });

      if (!validation.success) {
        const fieldErrors: Record<string, string> = {};
        validation.error.errors.forEach(err => {
          if (err.path[0]) {
            fieldErrors[err.path[0] as string] = err.message;
          }
        });
        setErrors(fieldErrors);
        throw new Error('Por favor, preencha todos os campos corretamente');
      }

      setErrors({});

      if (!barbershop?.id) throw new Error('Barbearia não encontrada');

      const { data, error } = await supabase.functions.invoke('virtual-queue-join', {
        body: {
          barbershopId: barbershop.id,
          clientName: clientName.trim(),
          clientPhone: clientPhone.trim(),
          serviceId,
          travelTimeMinutes
        }
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);
      
      return data;
    },
    onSuccess: (data) => {
      if (data.entryId) {
        setEntryId(data.entryId);
        localStorage.setItem(`queue_entry_${barbershop?.id}`, data.entryId);
        toast.success('Você entrou na fila virtual!');
        queryClient.invalidateQueries({ queryKey: ['queue-entry'] });
      }
    },
    onError: (error: any) => {
      console.error('Erro ao entrar na fila:', error);
      toast.error(error.message || 'Erro ao entrar na fila');
    }
  });

  // Setup realtime subscription for queue entry updates
  useEffect(() => {
    if (!entryId) return;

    console.log('📡 Configurando realtime para entry:', entryId);

    const channel = supabasePublic
      .channel(`queue-entry-${entryId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'virtual_queue_entries',
          filter: `id=eq.${entryId}`
        },
        (payload) => {
          console.log('🔄 Atualização em tempo real:', payload);
          queryClient.invalidateQueries({ queryKey: ['queue-entry'] });
          
          if (payload.new.status === 'notified') {
            toast.success('🔔 Seu horário está disponível!');
          }
        }
      )
      .subscribe();

    return () => {
      console.log('🔕 Limpando subscription realtime');
      supabasePublic.removeChannel(channel);
    };
  }, [entryId, queryClient]);

  // Check if user already has an entry in localStorage
  useEffect(() => {
    if (barbershop?.id) {
      const savedEntryId = localStorage.getItem(`queue_entry_${barbershop.id}`);
      if (savedEntryId) {
        setEntryId(savedEntryId);
      }
    }
  }, [barbershop?.id]);

  // Set default travel time
  useEffect(() => {
    // Default: 30 minutes travel time
  }, []);

  const handleJoinQueue = (e: React.FormEvent) => {
    e.preventDefault();
    joinQueueMutation.mutate();
  };

  const handleLeaveQueue = () => {
    if (barbershop?.id) {
      localStorage.removeItem(`queue_entry_${barbershop.id}`);
      setEntryId(null);
      toast.success('Você saiu da fila');
    }
  };

  // Confirmar notificação - atualizar appointment provisório
  const confirmNotificationMutation = useMutation({
    mutationFn: async () => {
      if (!queueEntry) {
        throw new Error('Entrada não encontrada');
      }

      console.log('🎯 Confirmando notificação para entry:', queueEntry.id);

      // Atualizar appointment de queue_reserved para pending
      const { error: appointmentError } = await supabasePublic
        .from('appointments')
        .update({ status: 'pending' })
        .eq('virtual_queue_entry_id', queueEntry.id)
        .eq('status', 'queue_reserved');

      if (appointmentError) {
        console.error('❌ Erro ao atualizar appointment:', appointmentError);
        throw appointmentError;
      }

      console.log('✅ Appointment atualizado para pending');

      // Atualizar entrada da fila
      const { error: updateError } = await supabasePublic
        .from('virtual_queue_entries')
        .update({ status: 'confirmed' })
        .eq('id', queueEntry.id);

      if (updateError) {
        console.error('❌ Erro ao atualizar queue entry:', updateError);
        throw updateError;
      }

      console.log('✅ Queue entry atualizado para confirmed');
    },
    onSuccess: () => {
      toast.success('✅ Agendamento confirmado com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['queue-entry'] });
    },
    onError: (error: any) => {
      console.error('Erro ao confirmar:', error);
      toast.error('Erro ao confirmar agendamento');
    }
  });

  // Cancelar notificação - deletar appointment provisório
  const cancelNotificationMutation = useMutation({
    mutationFn: async () => {
      if (!queueEntry) throw new Error('Entrada não encontrada');

      // Deletar appointment provisório
      const { error: deleteError } = await supabasePublic
        .from('appointments')
        .delete()
        .eq('virtual_queue_entry_id', queueEntry.id)
        .eq('status', 'queue_reserved');

      if (deleteError) throw deleteError;

      // Atualizar entrada da fila
      const { error } = await supabasePublic
        .from('virtual_queue_entries')
        .update({ status: 'cancelled' })
        .eq('id', queueEntry.id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.info('Notificação cancelada');
      if (barbershop?.id) {
        localStorage.removeItem(`queue_entry_${barbershop.id}`);
      }
      setEntryId(null);
      queryClient.invalidateQueries({ queryKey: ['queue-entry'] });
    },
    onError: (error: any) => {
      console.error('Erro ao cancelar:', error);
      toast.error('Erro ao cancelar');
    }
  });

  if (loadingBarbershop) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-background to-muted p-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Carregando informações...</p>
      </div>
    );
  }

  if (barbershopError || !barbershop) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
        <Card className="w-full max-w-md border-destructive">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <XCircle className="h-5 w-5" />
              Barbearia não encontrada
            </CardTitle>
            <CardDescription>
              O link que você acessou não corresponde a nenhuma barbearia cadastrada ou a fila virtual está desativada.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (!queueSettings?.enabled) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-warning" />
              Fila Virtual Desativada
            </CardTitle>
            <CardDescription>
              A fila virtual da <strong>{barbershop.name}</strong> está temporariamente desativada. Entre em contato diretamente com a barbearia.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (queueEntry) {
    const getStatusBadge = () => {
      switch (queueEntry.status) {
        case 'waiting':
          return <Badge variant="default">Aguardando</Badge>;
        case 'notified':
          return <Badge variant="secondary" className="bg-blue-500 text-white">Notificado</Badge>;
        case 'confirmed':
          return <Badge variant="secondary" className="bg-green-500 text-white">Confirmado</Badge>;
        case 'cancelled':
          return <Badge variant="destructive">Cancelado</Badge>;
        default:
          return <Badge variant="outline">{queueEntry.status}</Badge>;
      }
    };

    // Buscar dados do serviço para exibir no banner
    const { data: serviceData } = useQuery({
      queryKey: ['service-data', queueEntry?.service_id],
      queryFn: async () => {
        if (!queueEntry?.service_id) return null;
        
        const { data, error } = await supabasePublic
          .from('services')
          .select('name, duration_minutes')
          .eq('id', queueEntry.service_id)
          .single();
        
        if (error) throw error;
        return data;
      },
      enabled: !!queueEntry?.service_id
    });

    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted p-4">
        <div className="max-w-2xl mx-auto mt-8 space-y-4">
          {/* Header */}
          <div className="text-center mb-6">
            <h1 className="text-3xl font-bold text-foreground mb-2">{barbershop.name}</h1>
            <p className="text-muted-foreground">Fila Virtual</p>
          </div>

          {/* Banner de Notificação em Tempo Real */}
          {queueEntry.status === 'notified' && (
            <QueueNotificationBanner
              queueEntry={queueEntry}
              serviceData={serviceData}
              onConfirm={() => confirmNotificationMutation.mutate()}
              onCancel={() => cancelNotificationMutation.mutate()}
            />
          )}

          <Card className="border-2 border-primary">
            <CardHeader className="bg-primary/5">
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-6 w-6 text-green-500" />
                Você está na fila!
              </CardTitle>
              <CardDescription>Acompanhe seu status abaixo</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
              {/* Status */}
              <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                <div className="flex items-center gap-3">
                  <Clock className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium text-foreground">Status</p>
                    <p className="text-xs text-muted-foreground">Atualizado agora</p>
                  </div>
                </div>
                {getStatusBadge()}
              </div>

              {/* Queue Position */}
              {queueEntry.status === 'waiting' && queuePosition && (
                <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-1">
                        Sua Posição na Fila
                      </p>
                      <p className="text-xs text-blue-700 dark:text-blue-300">
                        {queuePosition === 1 ? 'Você é o próximo!' : `${queuePosition - 1} pessoa(s) à sua frente`}
                      </p>
                    </div>
                    <div className="text-4xl font-bold text-blue-600 dark:text-blue-400">
                      {queuePosition}º
                    </div>
                  </div>
                </div>
              )}

              {/* Priority Score */}
              {queueEntry.priority_score && (
                <div className="p-4 bg-primary/10 rounded-lg border border-primary/20">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-foreground mb-1">Pontuação de Prioridade</p>
                      <p className="text-xs text-muted-foreground">Quanto maior, mais próximo da sua vez</p>
                    </div>
                    <div className="text-3xl font-bold text-primary">
                      {queueEntry.priority_score.toFixed(1)}
                    </div>
                  </div>
                </div>
              )}

              {/* Travel Time Info */}
              {queueEntry.estimated_arrival_minutes && (
                <div className="p-4 bg-muted rounded-lg">
                  <div className="flex items-center gap-3 mb-2">
                    <Calendar className="h-5 w-5 text-primary" />
                    <p className="text-sm font-medium text-foreground">Tempo de deslocamento informado</p>
                  </div>
                  <p className="text-2xl font-bold text-foreground">
                    {queueEntry.estimated_arrival_minutes} minutos
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Você será notificado quando faltar esse tempo para um horário disponível
                  </p>
                </div>
              )}

              {/* Info */}
              <div className="pt-4 border-t">
                <div className="flex items-start gap-2 text-sm text-muted-foreground mb-4">
                  <Phone className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <p>
                    Você receberá uma notificação via WhatsApp quando for sua vez. 
                    Mantenha seu telefone por perto!
                  </p>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => refetchEntry()}
                  >
                    <Clock className="h-4 w-4 mr-2" />
                    Atualizar Status
                  </Button>
                  
                  <Button
                    variant="destructive"
                    onClick={handleLeaveQueue}
                  >
                    Sair da Fila
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted p-4">
      <div className="max-w-2xl mx-auto mt-8 space-y-6">
        {/* Header */}
        <div className="text-center mb-8">
          {barbershop.avatar_url && (
            <div className="flex justify-center mb-4">
              <img 
                src={barbershop.avatar_url} 
                alt={barbershop.name}
                className="h-20 w-20 rounded-full object-cover border-4 border-primary"
              />
            </div>
          )}
          <h1 className="text-4xl font-bold text-foreground mb-2">{barbershop.name}</h1>
          {barbershop.slogan && (
            <p className="text-lg text-muted-foreground">{barbershop.slogan}</p>
          )}
          <div className="flex items-center justify-center gap-2 mt-4">
            <Users className="h-5 w-5 text-primary" />
            <span className="text-sm font-medium text-primary">Fila Virtual</span>
          </div>
        </div>

        {/* Form Card */}
        <Card className="border-2">
          <CardHeader>
            <CardTitle>Entre na Fila Virtual</CardTitle>
            <CardDescription>
              Preencha seus dados e aguarde ser chamado pelo WhatsApp
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleJoinQueue} className="space-y-5">
              {/* Name */}
              <div className="space-y-2">
                <Label htmlFor="name" className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Nome completo
                </Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="Digite seu nome completo"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  className={errors.clientName ? 'border-destructive' : ''}
                />
                {errors.clientName && (
                  <p className="text-sm text-destructive">{errors.clientName}</p>
                )}
              </div>

              {/* Phone */}
              <div className="space-y-2">
                <Label htmlFor="phone" className="flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  WhatsApp
                </Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="(00) 00000-0000"
                  value={clientPhone}
                  onChange={(e) => setClientPhone(e.target.value)}
                  className={errors.clientPhone ? 'border-destructive' : ''}
                />
                <p className="text-xs text-muted-foreground">
                  Você receberá notificações via WhatsApp
                </p>
                {errors.clientPhone && (
                  <p className="text-sm text-destructive">{errors.clientPhone}</p>
                )}
              </div>

              {/* Service Selection */}
              <div className="space-y-2">
                <Label htmlFor="service" className="flex items-center gap-2">
                  <Scissors className="h-4 w-4" />
                  Serviço desejado
                </Label>
                {loadingServices ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Carregando serviços...
                  </div>
                ) : (
                  <>
                    <Select value={serviceId} onValueChange={setServiceId}>
                      <SelectTrigger className={errors.serviceId ? 'border-destructive' : ''}>
                        <SelectValue placeholder="Selecione um serviço" />
                      </SelectTrigger>
                      <SelectContent>
                        {services?.map((service) => (
                          <SelectItem key={service.id} value={service.id}>
                            <div className="flex flex-col">
                              <span className="font-medium">{service.name}</span>
                              <span className="text-xs text-muted-foreground">
                                R$ {service.price.toFixed(2)} • {service.duration_minutes} min
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.serviceId && (
                      <p className="text-sm text-destructive">{errors.serviceId}</p>
                    )}
                  </>
                )}
              </div>

              {/* Travel Time */}
              <div className="space-y-2">
                <Label htmlFor="travel-time" className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Tempo de deslocamento até a barbearia
                </Label>
                <Select 
                  value={travelTimeMinutes.toString()} 
                  onValueChange={(val) => setTravelTimeMinutes(parseInt(val))}
                >
                  <SelectTrigger className={errors.travelTimeMinutes ? 'border-destructive' : ''}>
                    <SelectValue placeholder="Selecione o tempo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">5 minutos</SelectItem>
                    <SelectItem value="10">10 minutos</SelectItem>
                    <SelectItem value="15">15 minutos</SelectItem>
                    <SelectItem value="20">20 minutos</SelectItem>
                    <SelectItem value="30">30 minutos</SelectItem>
                    <SelectItem value="45">45 minutos</SelectItem>
                    <SelectItem value="60">1 hora</SelectItem>
                    <SelectItem value="90">1 hora e 30 minutos</SelectItem>
                    <SelectItem value="120">2 horas</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Informe quanto tempo você leva para chegar na barbearia
                </p>
                {errors.travelTimeMinutes && (
                  <p className="text-sm text-destructive">{errors.travelTimeMinutes}</p>
                )}
              </div>

              {/* Queue Info */}
              <div className="p-4 bg-muted rounded-lg border">
                <div className="flex items-center gap-2 mb-2">
                  <Users className="h-4 w-4 text-primary" />
                  <p className="text-sm font-medium">Informações da Fila</p>
                </div>
                <div className="space-y-1 text-sm text-muted-foreground">
                  <p>• Capacidade máxima: <strong>{queueSettings.max_queue_size} pessoas</strong></p>
                  <p>• Notificação com <strong>{queueSettings.notification_minutes} minutos</strong> de antecedência</p>
                  <p>• Priorização inteligente baseada em tempo de deslocamento</p>
                </div>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                className="w-full h-12 text-lg"
                disabled={joinQueueMutation.isPending || loadingServices}
              >
                {joinQueueMutation.isPending ? (
                  <>
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    Entrando na fila...
                  </>
                ) : (
                  <>
                    <Users className="h-5 w-5 mr-2" />
                    Entrar na Fila Virtual
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
