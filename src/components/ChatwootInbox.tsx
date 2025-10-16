import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, AlertCircle, ExternalLink } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface ChatwootInboxProps {
  barbershopId: string;
}

export default function ChatwootInbox({ barbershopId }: ChatwootInboxProps) {
  const [inboxData, setInboxData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadInboxData();
  }, [barbershopId]);

  const loadInboxData = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: queryError } = await supabase
        .from('chatwoot_inboxes')
        .select('*')
        .eq('barbershop_id', barbershopId)
        .single();

      if (queryError) {
        throw queryError;
      }

      setInboxData(data);
    } catch (err) {
      console.error('Error loading inbox data:', err);
      setError(
        err instanceof Error 
          ? err.message 
          : 'Erro ao carregar informações do chat.'
      );
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Carregando informações...</p>
        </div>
      </div>
    );
  }

  if (error || !inboxData) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          {error || 'Inbox do Chatwoot não encontrado. Por favor, conecte o WhatsApp primeiro.'}
        </AlertDescription>
      </Alert>
    );
  }

  const chatwootUrl = `https://evolution-chatwoot.w2mn94.easypanel.host/app/accounts/${inboxData.chatwoot_account_id}/inbox/${inboxData.chatwoot_inbox_id}`;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Chatwoot - Gerenciamento de Conversas</CardTitle>
        <CardDescription>
          Acesse o Chatwoot para visualizar e responder mensagens do WhatsApp
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <p className="text-sm font-medium">Inbox: {inboxData.inbox_name}</p>
          <p className="text-sm text-muted-foreground">
            ID do Inbox: {inboxData.chatwoot_inbox_id}
          </p>
        </div>

        <Button 
          onClick={() => window.open(chatwootUrl, '_blank')}
          className="w-full"
        >
          <ExternalLink className="mr-2 h-4 w-4" />
          Abrir Chatwoot
        </Button>

        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            O Chatwoot será aberto em uma nova aba. Faça login com suas credenciais do Chatwoot para acessar as conversas.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}
