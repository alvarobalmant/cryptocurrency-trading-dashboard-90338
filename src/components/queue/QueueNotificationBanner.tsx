import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle, Clock, Calendar } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface QueueNotificationBannerProps {
  queueEntry: any;
  serviceData: any;
  onConfirm: () => void;
  onCancel: () => void;
}

export function QueueNotificationBanner({ 
  queueEntry, 
  serviceData,
  onConfirm,
  onCancel 
}: QueueNotificationBannerProps) {
  const [timeLeft, setTimeLeft] = useState<number>(0);

  useEffect(() => {
    if (!queueEntry?.notification_expires_at) return;

    const calculateTimeLeft = () => {
      const expiresAt = new Date(queueEntry.notification_expires_at);
      const now = new Date();
      const diff = expiresAt.getTime() - now.getTime();
      return Math.max(0, Math.floor(diff / 1000)); // segundos
    };

    setTimeLeft(calculateTimeLeft());

    const interval = setInterval(() => {
      const newTimeLeft = calculateTimeLeft();
      setTimeLeft(newTimeLeft);
      
      if (newTimeLeft === 0) {
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [queueEntry?.notification_expires_at]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatSlotTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('pt-BR', { 
      hour: '2-digit', 
      minute: '2-digit',
      timeZone: 'America/Sao_Paulo'
    });
  };

  if (queueEntry?.status !== 'notified' || !queueEntry?.reserved_slot_start) {
    return null;
  }

  return (
    <Card className="border-4 border-primary bg-gradient-to-r from-primary/20 to-primary/10 p-6 mb-6 animate-pulse-slow">
      <div className="flex flex-col items-center text-center space-y-4">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-full bg-primary flex items-center justify-center animate-bounce">
            <Clock className="h-6 w-6 text-primary-foreground" />
          </div>
          <h2 className="text-2xl font-bold text-foreground">🔔 Seu Horário Está Disponível!</h2>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-center gap-2 text-lg">
            <Calendar className="h-5 w-5 text-primary" />
            <span className="font-semibold">Horário:</span>
            <span className="text-2xl font-bold text-primary">
              {formatSlotTime(queueEntry.reserved_slot_start)}
            </span>
          </div>

          {serviceData && (
            <div className="text-muted-foreground">
              <span className="font-medium">💈 Serviço:</span> {serviceData.name}
              <span className="mx-2">•</span>
              <span className="font-medium">⏱️ Duração:</span> {serviceData.duration_minutes} min
            </div>
          )}
        </div>

        <div className="bg-destructive/20 border-2 border-destructive rounded-lg p-4 min-w-[200px]">
          <p className="text-sm font-medium text-destructive mb-1">⏳ Tempo para confirmar:</p>
          <p className="text-4xl font-bold text-destructive font-mono">
            {formatTime(timeLeft)}
          </p>
        </div>

        <div className="flex gap-3 w-full max-w-md">
          <Button
            onClick={onConfirm}
            size="lg"
            className="flex-1 bg-green-600 hover:bg-green-700 text-white text-lg h-14"
          >
            <CheckCircle className="h-6 w-6 mr-2" />
            ✅ CONFIRMAR
          </Button>
          
          <Button
            onClick={onCancel}
            size="lg"
            variant="destructive"
            className="flex-1 text-lg h-14"
          >
            <XCircle className="h-6 w-6 mr-2" />
            ❌ CANCELAR
          </Button>
        </div>

        <p className="text-xs text-muted-foreground max-w-md">
          Este é o momento perfeito para você sair! Com base no tempo de deslocamento informado,
          você chegará exatamente no horário.
        </p>
      </div>
    </Card>
  );
}
