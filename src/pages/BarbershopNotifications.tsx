import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Bell, Clock, Calendar, Loader2, MessageSquare } from "lucide-react";
import { useNotificationSettings, NotificationTiming } from "@/hooks/useNotificationSettings";
import { useParams } from "react-router-dom";
import { Alert, AlertDescription } from "@/components/ui/alert";

const BarbershopNotifications = () => {
  const { barbershopId } = useParams();
  const { settings, loading, createSettings, updateSettings } = useNotificationSettings(barbershopId);
  
  const [timing, setTiming] = useState<NotificationTiming>('1_hour');
  const [isActive, setIsActive] = useState(true);
  const [customMessage, setCustomMessage] = useState('Olá! Este é um lembrete do seu agendamento na nossa barbearia. Aguardamos você no horário marcado! Para confirmar ou remarcar, responda esta mensagem.');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (settings) {
      setTiming(settings.notification_timing);
      setIsActive(settings.is_active);
      if (settings.custom_agent_prompt) {
        setCustomMessage(settings.custom_agent_prompt);
      }
    }
  }, [settings]);

  const handleSave = async () => {
    if (!barbershopId) return;

    setIsSaving(true);
    try {
      if (settings) {
        await updateSettings({
          id: settings.id,
          notification_timing: timing,
          is_active: isActive,
          custom_agent_prompt: customMessage,
        });
      } else {
        await createSettings({
          barbershop_id: barbershopId,
          notification_timing: timing,
          is_active: isActive,
          custom_agent_prompt: customMessage,
        });
      }
    } finally {
      setIsSaving(false);
    }
  };

  const getTimingLabel = (value: NotificationTiming) => {
    switch (value) {
      case '30_minutes':
        return '30 minutos antes';
      case '1_hour':
        return '1 hora antes';
      case '1_day':
        return '1 dia antes';
    }
  };

  const getTimingIcon = (value: NotificationTiming) => {
    switch (value) {
      case '30_minutes':
        return <Clock className="w-5 h-5" />;
      case '1_hour':
        return <Clock className="w-5 h-5" />;
      case '1_day':
        return <Calendar className="w-5 h-5" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-3 bg-primary/10 rounded-lg">
          <Bell className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Notificações de Agendamento</h1>
          <p className="text-muted-foreground">
            Configure quando os clientes receberão avisos de confirmação
          </p>
        </div>
      </div>

      <Alert>
        <Bell className="h-4 w-4" />
        <AlertDescription>
          Os avisos de confirmação serão enviados automaticamente via WhatsApp no horário configurado antes de cada agendamento.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle>Configurações de Aviso</CardTitle>
          <CardDescription>
            Defina quando o aviso de confirmação deve ser enviado aos clientes
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Switch Ativo/Inativo */}
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="space-y-0.5">
              <Label htmlFor="active-switch" className="text-base">
                Envio Automático
              </Label>
              <p className="text-sm text-muted-foreground">
                Ativar ou desativar o envio automático de avisos
              </p>
            </div>
            <Switch
              id="active-switch"
              checked={isActive}
              onCheckedChange={setIsActive}
            />
          </div>

          {/* Radio Group para tempo */}
          <div className="space-y-4">
            <Label className="text-base">Tempo de Antecedência</Label>
            <RadioGroup value={timing} onValueChange={(value) => setTiming(value as NotificationTiming)}>
              <div className="space-y-3">
                <div className="flex items-center space-x-3 p-4 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors">
                  <RadioGroupItem value="30_minutes" id="30_minutes" />
                  <Label 
                    htmlFor="30_minutes" 
                    className="flex items-center gap-3 flex-1 cursor-pointer"
                  >
                    {getTimingIcon('30_minutes')}
                    <div className="flex-1">
                      <div className="font-medium">{getTimingLabel('30_minutes')}</div>
                      <p className="text-sm text-muted-foreground">
                        Enviar aviso 30 minutos antes do horário agendado
                      </p>
                    </div>
                  </Label>
                </div>

                <div className="flex items-center space-x-3 p-4 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors">
                  <RadioGroupItem value="1_hour" id="1_hour" />
                  <Label 
                    htmlFor="1_hour" 
                    className="flex items-center gap-3 flex-1 cursor-pointer"
                  >
                    {getTimingIcon('1_hour')}
                    <div className="flex-1">
                      <div className="font-medium">{getTimingLabel('1_hour')}</div>
                      <p className="text-sm text-muted-foreground">
                        Enviar aviso 1 hora antes do horário agendado
                      </p>
                    </div>
                  </Label>
                </div>

                <div className="flex items-center space-x-3 p-4 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors">
                  <RadioGroupItem value="1_day" id="1_day" />
                  <Label 
                    htmlFor="1_day" 
                    className="flex items-center gap-3 flex-1 cursor-pointer"
                  >
                    {getTimingIcon('1_day')}
                    <div className="flex-1">
                      <div className="font-medium">{getTimingLabel('1_day')}</div>
                      <p className="text-sm text-muted-foreground">
                        Enviar aviso 1 dia antes do horário agendado
                      </p>
                    </div>
                  </Label>
                </div>
              </div>
            </RadioGroup>
          </div>

          {/* Configuração de mensagem personalizada */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-primary" />
              <Label className="text-base">Personalize seu Atendente Virtual</Label>
            </div>
            <Textarea
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              placeholder="Ex: Você é a Maria, atendente da Barbearia Classic. Seja cordial, use emojis, e sempre confirme os detalhes do agendamento..."
              className="min-h-[120px] resize-none"
              maxLength={500}
            />
            <p className="text-xs text-muted-foreground">
              Configure o nome, tom de voz e comportamento do seu atendente virtual do WhatsApp para enviar os avisos de confirmação.
            </p>
          </div>

          {/* Botão Salvar */}
          <Button 
            onClick={handleSave} 
            disabled={isSaving}
            className="w-full"
            size="lg"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Bell className="w-4 h-4 mr-2" />
                Salvar Configurações
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default BarbershopNotifications;
