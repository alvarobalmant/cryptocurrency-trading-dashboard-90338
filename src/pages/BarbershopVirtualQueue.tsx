import React, { useState } from 'react';
import { useBarbershop } from '@/hooks/useBarbershop';
import { useVirtualQueue, useVirtualQueueStats } from '@/hooks/useVirtualQueue';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Clock, Users, Settings, Save, Copy, ExternalLink, PlayCircle } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { QueueClientList } from '@/components/queue/QueueClientList';
import { QueueStats } from '@/components/queue/QueueStats';

export default function BarbershopVirtualQueue() {
  const { barbershop } = useBarbershop();
  const queryClient = useQueryClient();
  const { data: queueEntries = [] } = useVirtualQueue(barbershop?.id);
  const { data: stats } = useVirtualQueueStats(barbershop?.id);

  // Fetch queue settings
  const { data: queueSettings, isLoading } = useQuery({
    queryKey: ['virtual-queue-settings', barbershop?.id],
    queryFn: async () => {
      if (!barbershop?.id) return null;
      
      const { data, error } = await supabase
        .from('virtual_queue_settings')
        .select('*')
        .eq('barbershop_id', barbershop.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;
      
      // Return defaults if no settings exist
      return data || {
        enabled: false,
        buffer_percentage: 33,
        notification_minutes: 30,
        max_queue_size: 50,
        eta_weight: 0.60,
        position_weight: 0.40,
        wait_time_bonus: 0.20
      };
    },
    enabled: !!barbershop?.id
  });

  const [formData, setFormData] = useState({
    enabled: queueSettings?.enabled || false,
    buffer_percentage: queueSettings?.buffer_percentage || 33,
    notification_minutes: queueSettings?.notification_minutes || 30,
    max_queue_size: queueSettings?.max_queue_size || 50,
    eta_weight: queueSettings?.eta_weight || 0.60,
    position_weight: queueSettings?.position_weight || 0.40,
    wait_time_bonus: queueSettings?.wait_time_bonus || 0.20
  });

  React.useEffect(() => {
    if (queueSettings) {
      setFormData({
        enabled: queueSettings.enabled,
        buffer_percentage: queueSettings.buffer_percentage,
        notification_minutes: queueSettings.notification_minutes,
        max_queue_size: queueSettings.max_queue_size,
        eta_weight: queueSettings.eta_weight,
        position_weight: queueSettings.position_weight,
        wait_time_bonus: queueSettings.wait_time_bonus
      });
    }
  }, [queueSettings]);

  const saveSettingsMutation = useMutation({
    mutationFn: async (settings: typeof formData) => {
      if (!barbershop?.id) throw new Error('Barbearia não encontrada');

      const { error } = await supabase
        .from('virtual_queue_settings')
        .upsert({
          barbershop_id: barbershop.id,
          ...settings
        }, {
          onConflict: 'barbershop_id'
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['virtual-queue-settings'] });
      toast.success('Configurações salvas com sucesso!');
    },
    onError: (error) => {
      console.error('Erro ao salvar:', error);
      toast.error('Erro ao salvar configurações');
    }
  });

  const processQueueMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('virtual-queue-monitor');
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success('Fila processada com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['virtual-queue'] });
      queryClient.invalidateQueries({ queryKey: ['virtual-queue-stats'] });
    },
    onError: (error) => {
      console.error('Error processing queue:', error);
      toast.error('Erro ao processar fila');
    }
  });

  const handleSave = () => {
    saveSettingsMutation.mutate(formData);
  };

  const handleProcessQueue = () => {
    processQueueMutation.mutate();
  };

  const copyQueueLink = () => {
    const link = `${window.location.origin}/queue/${barbershop?.slug || barbershop?.id}`;
    navigator.clipboard.writeText(link);
    toast.success('Link da fila virtual copiado!');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Clock className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const waitingEntries = queueEntries.filter(e => e.status === 'waiting');
  const notifiedEntries = queueEntries.filter(e => e.status === 'notified');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Fila Virtual</h1>
          <p className="text-muted-foreground mt-1">
            Configure e gerencie a fila virtual da sua barbearia
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={handleProcessQueue} 
            disabled={processQueueMutation.isPending}
            variant="outline"
          >
            <PlayCircle className="h-4 w-4 mr-2" />
            Processar Fila Agora
          </Button>
          <Button onClick={handleSave} disabled={saveSettingsMutation.isPending}>
            <Save className="h-4 w-4 mr-2" />
            Salvar Configurações
          </Button>
        </div>
      </div>

      {/* Statistics */}
      {stats && <QueueStats stats={stats} />}

      {/* Queue Lists */}
      <div className="grid gap-6 md:grid-cols-2">
        <QueueClientList
          entries={waitingEntries}
          title="Clientes Aguardando"
          emptyMessage="Nenhum cliente aguardando na fila"
        />
        <QueueClientList
          entries={notifiedEntries}
          title="Aguardando Confirmação"
          emptyMessage="Nenhum cliente aguardando confirmação"
        />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Ativação da Fila */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Ativação
            </CardTitle>
            <CardDescription>
              Ative ou desative a fila virtual para sua barbearia
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="enabled">Fila Virtual Ativa</Label>
                <p className="text-sm text-muted-foreground">
                  Permite que clientes entrem na fila virtual
                </p>
              </div>
              <Switch
                id="enabled"
                checked={formData.enabled}
                onCheckedChange={(checked) => setFormData({ ...formData, enabled: checked })}
              />
            </div>

            {formData.enabled && (
              <div className="pt-4 border-t">
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={copyQueueLink}
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copiar Link da Fila
                </Button>
                <Button 
                  variant="ghost" 
                  className="w-full mt-2"
                  onClick={() => window.open(`/queue/${barbershop?.slug || barbershop?.id}`, '_blank')}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Abrir Página da Fila
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Configurações Básicas */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Configurações Básicas
            </CardTitle>
            <CardDescription>
              Ajuste as configurações gerais da fila
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="max_queue_size">Tamanho Máximo da Fila</Label>
              <Input
                id="max_queue_size"
                type="number"
                value={formData.max_queue_size}
                onChange={(e) => setFormData({ ...formData, max_queue_size: parseInt(e.target.value) || 50 })}
              />
              <p className="text-xs text-muted-foreground">
                Número máximo de clientes na fila
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notification_minutes">Antecedência de Notificação (minutos)</Label>
              <Input
                id="notification_minutes"
                type="number"
                value={formData.notification_minutes}
                onChange={(e) => setFormData({ ...formData, notification_minutes: parseInt(e.target.value) || 30 })}
              />
              <p className="text-xs text-muted-foreground">
                Com quantos minutos de antecedência notificar o cliente
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="buffer_percentage">Margem de Erro (%)</Label>
              <div className="flex items-center gap-4">
                <Slider
                  id="buffer_percentage"
                  value={[formData.buffer_percentage]}
                  onValueChange={(value) => setFormData({ ...formData, buffer_percentage: value[0] })}
                  max={50}
                  step={5}
                  className="flex-1"
                />
                <span className="text-sm font-medium w-12 text-center">
                  {formData.buffer_percentage}%
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Permite encaixes em serviços que podem terminar mais cedo
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Algoritmo de Priorização */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Algoritmo de Priorização
            </CardTitle>
            <CardDescription>
              Configure os pesos para o cálculo de prioridade na fila
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="eta_weight">Peso do Tempo de Chegada (ETA)</Label>
                <span className="text-sm font-medium">{(formData.eta_weight * 100).toFixed(0)}%</span>
              </div>
              <Slider
                id="eta_weight"
                value={[formData.eta_weight * 100]}
                onValueChange={(value) => setFormData({ ...formData, eta_weight: value[0] / 100 })}
                max={100}
                step={5}
              />
              <p className="text-xs text-muted-foreground">
                Prioriza clientes com tempo de chegada compatível com horários disponíveis
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="position_weight">Peso da Posição na Fila</Label>
                <span className="text-sm font-medium">{(formData.position_weight * 100).toFixed(0)}%</span>
              </div>
              <Slider
                id="position_weight"
                value={[formData.position_weight * 100]}
                onValueChange={(value) => setFormData({ ...formData, position_weight: value[0] / 100 })}
                max={100}
                step={5}
              />
              <p className="text-xs text-muted-foreground">
                Prioriza clientes que chegaram primeiro na fila
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="wait_time_bonus">Bônus por Tempo de Espera</Label>
                <span className="text-sm font-medium">{(formData.wait_time_bonus * 100).toFixed(0)}%</span>
              </div>
              <Slider
                id="wait_time_bonus"
                value={[formData.wait_time_bonus * 100]}
                onValueChange={(value) => setFormData({ ...formData, wait_time_bonus: value[0] / 100 })}
                max={100}
                step={5}
              />
              <p className="text-xs text-muted-foreground">
                Bônus adicional para clientes esperando há mais tempo
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}