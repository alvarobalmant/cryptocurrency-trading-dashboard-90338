import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Clock, User, Phone, Trash2, AlertCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

interface QueueEntry {
  id: string;
  client_name: string;
  client_phone: string;
  estimated_arrival_minutes: number;
  created_at: string;
  status: string;
  priority_score: number | null;
  notification_sent_at: string | null;
  notification_expires_at: string | null;
  reserved_slot_start: string | null;
  reserved_slot_end: string | null;
  services: { name: string; duration_minutes: number } | null;
  employees: { name: string } | null;
}

interface Props {
  entries: QueueEntry[];
  title: string;
  emptyMessage: string;
  showActions?: boolean;
}

export function QueueClientList({ entries, title, emptyMessage, showActions = true }: Props) {
  const queryClient = useQueryClient();

  const removeFromQueue = async (entryId: string) => {
    try {
      const { error } = await supabase
        .from('virtual_queue_entries')
        .update({ status: 'cancelled' })
        .eq('id', entryId);

      if (error) throw error;

      toast.success('Cliente removido da fila');
      queryClient.invalidateQueries({ queryKey: ['virtual-queue'] });
    } catch (error) {
      console.error('Error removing client:', error);
      toast.error('Erro ao remover cliente');
    }
  };

  const getStatusBadge = (entry: QueueEntry) => {
    if (entry.status === 'waiting') {
      return <Badge variant="secondary">Aguardando</Badge>;
    }
    if (entry.status === 'notified') {
      const expiresAt = entry.notification_expires_at ? new Date(entry.notification_expires_at) : null;
      const isExpired = expiresAt && expiresAt < new Date();
      return (
        <Badge variant={isExpired ? "destructive" : "default"}>
          {isExpired ? 'Expirado' : 'Notificado'}
        </Badge>
      );
    }
    return <Badge>{entry.status}</Badge>;
  };

  const getPriorityColor = (score: number | null) => {
    if (!score) return 'text-muted-foreground';
    if (score >= 80) return 'text-green-600 dark:text-green-400';
    if (score >= 50) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  if (entries.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <AlertCircle className="h-12 w-12 mb-2 opacity-20" />
            <p>{emptyMessage}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="h-5 w-5" />
          {title}
          <Badge variant="outline" className="ml-auto">{entries.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {entries.map((entry) => (
            <div
              key={entry.id}
              className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-accent/5 transition-colors"
            >
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{entry.client_name}</span>
                  {getStatusBadge(entry)}
                  {entry.priority_score !== null && (
                    <span className={`text-sm font-medium ${getPriorityColor(entry.priority_score)}`}>
                      Prioridade: {Math.round(entry.priority_score)}
                    </span>
                  )}
                </div>
                
                <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Phone className="h-3 w-3" />
                    {entry.client_phone}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Deslocamento: {entry.estimated_arrival_minutes} min
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Na fila há {formatDistanceToNow(new Date(entry.created_at), { locale: ptBR })}
                  </span>
                </div>

                {entry.services && (
                  <div className="text-sm text-muted-foreground">
                    Serviço: {entry.services.name} ({entry.services.duration_minutes} min)
                  </div>
                )}

                {entry.employees && (
                  <div className="text-sm text-muted-foreground">
                    Profissional: {entry.employees.name}
                  </div>
                )}

                {entry.reserved_slot_start && entry.reserved_slot_end && (
                  <div className="text-sm font-medium text-primary">
                    Horário reservado: {new Date(entry.reserved_slot_start).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} - {new Date(entry.reserved_slot_end).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    {entry.notification_expires_at && (
                      <span className="ml-2 text-muted-foreground">
                        (Expira em {formatDistanceToNow(new Date(entry.notification_expires_at), { locale: ptBR })})
                      </span>
                    )}
                  </div>
                )}
              </div>

              {showActions && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeFromQueue(entry.id)}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
