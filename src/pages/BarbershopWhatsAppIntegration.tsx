import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Copy, Check, Loader2, Smartphone, Wifi, WifiOff, QrCode, CheckCircle2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useBarbershop } from '@/hooks/useBarbershop';
import { useWhatsAppConnection } from '@/hooks/useWhatsAppConnection';
import ChatwootInbox from '@/components/ChatwootInbox';

export default function BarbershopWhatsAppIntegration() {
  const navigate = useNavigate();
  const { barbershop, loading: barbershopLoading } = useBarbershop();
  const { connection, loading: connectionLoading, generating, generateQR, disconnect } = useWhatsAppConnection(barbershop?.id);
  const [copied, setCopied] = useState(false);

  // Normalize barbershop name for instance_name
  const normalizeString = (str: string) => {
    return str
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, '')
      .toLowerCase();
  };

  const instanceName = barbershop?.name ? normalizeString(barbershop.name) : '';
  const webhookUrl = `https://webhook.servicosemautomacoes.shop/webhook/${instanceName}`;

  const loading = barbershopLoading || connectionLoading;

  const copyToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Determine status based on verificador field
  const getStatusConfig = () => {
    console.log('📊 [DEBUG] getStatusConfig - verificador:', connection?.verificador);
    
    // verificador = true → WhatsApp verificado e funcionando
    if (connection?.verificador === true) {
      return {
        variant: 'default' as const,
        icon: <CheckCircle2 className="h-5 w-5" />,
        text: 'WhatsApp Verificado',
        color: 'text-green-600',
        showQR: false,
        showSuccess: true,
        showError: false,
      };
    }
    
    // verificador = false → Erro na conexão
    if (connection?.verificador === false) {
      return {
        variant: 'destructive' as const,
        icon: <XCircle className="h-5 w-5" />,
        text: 'Erro na Conexão',
        color: 'text-red-600',
        showQR: false,
        showSuccess: false,
        showError: true,
      };
    }
    
    // verificador = null → Aguardando verificação (mostra QR code)
    return {
      variant: 'secondary' as const,
      icon: <QrCode className="h-4 w-4 animate-pulse" />,
      text: 'Aguardando Verificação',
      color: 'text-yellow-600',
      showQR: true,
      showSuccess: false,
      showError: false,
    };
  };

  const statusConfig = getStatusConfig();

  if (loading || !barbershop) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigate(`/barbershop/${barbershop?.id}/settings`)}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Integração WhatsApp Business</h1>
            <p className="text-muted-foreground">
              Conecte sua barbearia ao WhatsApp via Evolution API
            </p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Smartphone className="h-5 w-5" />
              Status da Conexão
            </CardTitle>
            <CardDescription>
              Conexão atual do WhatsApp Business
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {statusConfig.icon}
                <div>
                  <p className="font-medium">{statusConfig.text}</p>
                  {connection?.connected_phone && (
                    <p className="text-sm text-muted-foreground">
                      {connection.connected_phone}
                    </p>
                  )}
                </div>
              </div>
              <Badge variant={statusConfig.variant} className={statusConfig.color}>
                {statusConfig.text}
              </Badge>
            </div>

            {/* verificador = null → Mostra QR Code (tentando conectar) */}
            {statusConfig.showQR && connection?.qr_code_base64 && (
              <div className="mt-6 p-6 bg-slate-50 dark:bg-slate-900 rounded-lg border-2 border-dashed">
                <p className="text-sm text-center mb-4 font-medium">
                  📱 Escaneie este QR Code com o WhatsApp:
                </p>
                <div className="flex justify-center">
                  <img 
                    src={connection.qr_code_base64} 
                    alt="QR Code WhatsApp"
                    className="w-64 h-64 bg-white p-2 rounded-lg shadow-lg"
                  />
                </div>
                <p className="text-xs text-center text-muted-foreground mt-4">
                  O QR Code expira em 60 segundos. Se expirar, clique em "Reconectar" para gerar um novo.
                </p>
              </div>
            )}

            {/* verificador = true → Mostra selo de verificado */}
            {statusConfig.showSuccess && (
              <div className="mt-6 p-8 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950 dark:to-emerald-950 rounded-lg border-2 border-green-200 dark:border-green-800">
                <div className="flex flex-col items-center gap-4">
                  <div className="rounded-full bg-green-100 dark:bg-green-900 p-6">
                    <CheckCircle2 className="h-16 w-16 text-green-600 dark:text-green-400" />
                  </div>
                  <div className="text-center space-y-2">
                    <h3 className="text-xl font-bold text-green-900 dark:text-green-100">
                      ✅ WhatsApp Verificado!
                    </h3>
                    <p className="text-green-700 dark:text-green-300 max-w-md">
                      Seu WhatsApp está conectado e funcionando perfeitamente. 
                      O sistema está pronto para receber e enviar mensagens automaticamente.
                    </p>
                  </div>
                  {connection?.connected_phone && (
                    <Badge variant="outline" className="mt-2 px-4 py-1 bg-white dark:bg-slate-800">
                      📱 {connection.connected_phone}
                    </Badge>
                  )}
                </div>
              </div>
            )}

            {/* verificador = false → Mostra erro na conexão */}
            {statusConfig.showError && (
              <Alert className="mt-6 bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800">
                <XCircle className="h-5 w-5 text-red-600" />
                <AlertDescription className="text-red-900 dark:text-red-100">
                  <div className="space-y-2">
                    <p className="font-semibold">❌ Erro na Conexão do WhatsApp</p>
                    <p className="text-sm">
                      Não foi possível estabelecer a conexão. Clique em "Reconectar" para tentar novamente.
                    </p>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            <div className="flex gap-2">
              <Button 
                onClick={generateQR}
                disabled={generating}
                className="flex-1"
                variant={statusConfig.showSuccess ? 'outline' : 'default'}
              >
                {generating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processando...
                  </>
                ) : statusConfig.showSuccess ? (
                  <>
                    <QrCode className="mr-2 h-4 w-4" />
                    Reconectar
                  </>
                ) : (
                  <>
                    <Smartphone className="mr-2 h-4 w-4" />
                    Conectar WhatsApp
                  </>
                )}
              </Button>

              {statusConfig.showSuccess && (
                <Button 
                  onClick={disconnect}
                  disabled={generating}
                  variant="destructive"
                  className="flex-1"
                >
                  {generating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Desconectando...
                    </>
                  ) : (
                    <>
                      <WifiOff className="mr-2 h-4 w-4" />
                      Desconectar
                    </>
                  )}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {statusConfig.showSuccess && barbershop && (
          <Card>
            <CardHeader>
              <CardTitle>Mensagens WhatsApp</CardTitle>
              <CardDescription>
                Gerencie conversas do WhatsApp diretamente no painel
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="chat" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="chat">Chat</TabsTrigger>
                  <TabsTrigger value="info">Informações</TabsTrigger>
                </TabsList>
                <TabsContent value="chat" className="mt-4">
                  <ChatwootInbox barbershopId={barbershop.id} />
                </TabsContent>
                <TabsContent value="info" className="mt-4">
                  <div className="space-y-4">
                    <Alert className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
                      <AlertDescription className="text-blue-900 dark:text-blue-100 text-sm">
                        💬 <strong>Chat Integrado:</strong> Todas as mensagens do WhatsApp aparecem aqui em tempo real. 
                        Você pode responder diretamente pelo painel sem sair da aplicação.
                      </AlertDescription>
                    </Alert>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Informações Técnicas</CardTitle>
            <CardDescription>
              Dados para configuração no N8n (se necessário)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Nome da Instância</Label>
              <div className="flex gap-2">
                <Input
                  value={instanceName}
                  readOnly
                  className="font-mono text-sm bg-slate-50 dark:bg-slate-900"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => copyToClipboard(instanceName, 'Nome da Instância')}
                >
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Identificador único da sua instância WhatsApp
              </p>
            </div>

            <div className="space-y-2">
              <Label>Webhook URL (N8n)</Label>
              <div className="flex gap-2">
                <Input
                  value={webhookUrl}
                  readOnly
                  className="font-mono text-sm bg-slate-50 dark:bg-slate-900"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => copyToClipboard(webhookUrl, 'Webhook URL')}
                >
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                URL base para receber comandos do sistema
              </p>
            </div>

            {connection?.evolution_instance_id && (
              <div className="space-y-2">
                <Label>Evolution Instance ID</Label>
                <Input
                  value={connection.evolution_instance_id}
                  readOnly
                  className="font-mono text-sm bg-slate-50 dark:bg-slate-900"
                />
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Como Funciona</CardTitle>
            <CardDescription>
              Processo simples em 2 passos
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-4">
              <div className="flex gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">
                  1
                </div>
                <div className="space-y-1">
                  <h4 className="font-medium">Clique em "Conectar WhatsApp"</h4>
                  <p className="text-sm text-muted-foreground">
                    O sistema gerará um QR Code único para sua barbearia
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">
                  2
                </div>
                <div className="space-y-1">
                  <h4 className="font-medium">Escaneie o QR Code</h4>
                  <p className="text-sm text-muted-foreground">
                    Abra o WhatsApp → Menu (três pontinhos) → Aparelhos conectados → Conectar aparelho → Escaneie o QR Code
                  </p>
                </div>
              </div>
            </div>

            <Alert className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
              <AlertDescription className="text-blue-900 dark:text-blue-100 text-sm">
                💡 <strong>Dica:</strong> O QR Code expira em 60 segundos. Se não conseguir escanear a tempo, 
                clique em "Reconectar" para gerar um novo código.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
