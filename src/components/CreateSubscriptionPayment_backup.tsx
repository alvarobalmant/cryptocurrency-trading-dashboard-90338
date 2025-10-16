import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CreditCard, QrCode, Wifi, User, Calendar, DollarSign, Copy, CheckCircle, Clock, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useClients } from '@/hooks/useClients';
import { useSubscriptions, type SubscriptionPlan } from '@/hooks/useSubscriptions';
import { useMercadoPago } from '@/hooks/useMercadoPago';
import { supabase } from '@/integrations/supabase/client';

interface Client {
  id: string;
  name: string;
  phone: string;
}

interface CreateSubscriptionPaymentProps {
  barbershopId: string;
  onPaymentCreated?: () => void;
}

export function CreateSubscriptionPayment({ barbershopId, onPaymentCreated }: CreateSubscriptionPaymentProps) {
  const [selectedClientId, setSelectedClientId] = useState('');
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [durationMonths, setDurationMonths] = useState<1 | 6 | 12>(1);
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'pix' | 'point'>('card');
  const [customClientName, setCustomClientName] = useState('');
  const [customClientPhone, setCustomClientPhone] = useState('');
  const [customClientEmail, setCustomClientEmail] = useState('');
  const [isCreatingClient, setIsCreatingClient] = useState(false);
  const [clientCpf, setClientCpf] = useState('');
  const [pixResult, setPixResult] = useState<any>(null);
  const [copied, setCopied] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<string>('pending');
  const [refreshingQR, setRefreshingQR] = useState(false);

  const { toast } = useToast();
  const { clients, createClient, searchClientByPhone } = useClients(barbershopId);
  const { subscriptionPlans } = useSubscriptions(barbershopId);
  const { createSubscriptionPayment, createPixPayment, loading } = useMercadoPago();

  const activeSubscriptionPlans = subscriptionPlans.filter(plan => plan.active);
  const selectedPlan = activeSubscriptionPlans.find(plan => plan.id === selectedPlanId);
  const selectedClient = clients.find(client => client.id === selectedClientId);

  // Monitorar pagamentos PIX em tempo real
  useEffect(() => {
    if (!pixResult?.payment_id || paymentMethod !== 'pix') return;

    const channel = supabase
      .channel(`payment-${pixResult.payment_id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'payments',
          filter: `mercadopago_payment_id=eq.${pixResult.payment_id.toString()}`
        },
        (payload) => {
          if (payload.new.status === 'paid') {
            setPaymentStatus('paid');
            toast({
              title: '🎉 Pagamento Confirmado!',
              description: 'O PIX foi pago com sucesso.',
            });
          } else if (payload.new.status === 'cancelled') {
            setPaymentStatus('cancelled');
            toast({
              title: '❌ Pagamento Cancelado',
              description: 'O PIX foi cancelado.',
              variant: 'destructive',
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [pixResult?.payment_id, paymentMethod, toast]);

  const getPlanPrice = (plan: SubscriptionPlan, duration: 1 | 6 | 12) => {
    switch (duration) {
      case 1: return plan.price_1_month;
      case 6: return plan.price_6_months;
      case 12: return plan.price_12_months;
      default: return plan.price_1_month;
    }
  };

  const getDurationText = (months: number) => {
    switch (months) {
      case 1: return '1 mês';
      case 6: return '6 meses';
      case 12: return '12 meses';
      default: return `${months} meses`;
    }
  };

  const refreshPaymentStatus = async () => {
    if (!pixResult?.payment_id) return;
    
    setRefreshingQR(true);
    
    try {
      const { data: payment, error } = await supabase
        .from('payments')
        .select('*')
        .eq('mercadopago_payment_id', pixResult.payment_id.toString())
        .single();
      
      if (error) throw error;
      
      if (payment?.status === 'paid') {
        setPaymentStatus('paid');
        toast({
          title: '✅ Pagamento Confirmado!',
          description: 'O PIX foi pago com sucesso.',
        });
      } else if (payment?.status === 'cancelled') {
        setPaymentStatus('cancelled');
        toast({
          title: '❌ Pagamento Cancelado',
          description: 'O PIX foi cancelado.',
          variant: 'destructive',
        });
      } else {
        toast({
          title: '⏳ Status Verificado',
          description: `Status atual: ${payment?.status || 'pendente'}`,
        });
      }
    } catch (error: any) {
      console.error('❌ Erro ao verificar status:', error);
      toast({
        title: 'Erro ao verificar',
        description: 'Não foi possível verificar o status do pagamento.',
        variant: 'destructive',
      });
    } finally {
      setTimeout(() => {
        setRefreshingQR(false);
      }, 800);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast({
      title: 'Copiado!',
      description: 'Código PIX copiado para a área de transferência.',
    });
    setTimeout(() => setCopied(false), 2000);
  };

  const resetForm = () => {
    setSelectedClientId('');
    setSelectedPlanId('');
    setDurationMonths(1);
    setCustomClientEmail('');
    setClientCpf('');
    setPixResult(null);
    setCopied(false);
    setPaymentStatus('pending');
  };

  const handleSearchClientByPhone = async () => {
    if (!customClientPhone.trim()) return;

    try {
      const existingClient = await searchClientByPhone.mutateAsync({
        barbershopId,
        phone: customClientPhone
      });

      if (existingClient) {
        setSelectedClientId(existingClient.id);
        setCustomClientName('');
        setCustomClientPhone('');
        setIsCreatingClient(false);
        toast({
          title: "Cliente encontrado",
          description: `Cliente ${existingClient.name} selecionado`,
        });
      } else {
        setIsCreatingClient(true);
      }
    } catch (error) {
      console.error('Error searching client:', error);
      toast({
        title: "Erro",
        description: "Erro ao buscar cliente",
        variant: "destructive",
      });
    }
  };

  const handleCreateClient = async () => {
    if (!customClientName.trim() || !customClientPhone.trim() || !customClientEmail.trim()) {
      toast({
        title: "Erro",
        description: "Nome, telefone e email são obrigatórios",
        variant: "destructive",
      });
      return;
    }

    try {
      const newClient = await createClient.mutateAsync({
        barbershop_id: barbershopId,
        name: customClientName.trim(),
        phone: customClientPhone.trim(),
      });

      setSelectedClientId(newClient.id);
      setCustomClientName('');
      setCustomClientPhone('');
      setCustomClientEmail('');
      setIsCreatingClient(false);
      
      toast({
        title: "Sucesso",
        description: "Cliente cadastrado e selecionado",
      });
    } catch (error) {
      console.error('Error creating client:', error);
    }
  };

  const handleCreatePayment = async () => {
    if (!selectedClientId || !selectedPlanId) {
      toast({
        title: "Erro",
        description: "Selecione um cliente e um plano de assinatura",
        variant: "destructive",
      });
      return;
    }

    if (!selectedPlan) return;

    try {
      const finalAmount = getPlanPrice(selectedPlan, durationMonths);
      const description = `Assinatura ${selectedPlan.name} - ${getDurationText(durationMonths)}`;

      if (paymentMethod === 'pix') {
        // Para PIX, usar função direta da edge function ao invés do createPixPayment do hook
        const result = await supabase.functions.invoke('create-pix-payment', {
          body: {
            barbershopId,
            clientName: selectedClient?.name || '',
            clientPhone: selectedClient?.phone || '',
            clientEmail: customClientEmail.trim() || `cliente${selectedClient?.phone?.replace(/\D/g, '')}@temp.com`,
            amount: finalAmount,
            description,
            paymentType: 'subscription',
            payerDocType: 'CPF',
            payerDocNumber: clientCpf,
            subscriptionData: {
              clientProfileId: selectedClientId,
              subscriptionPlanId: selectedPlanId,
              durationMonths,
            }
          }
        });

        if (result.error) throw result.error;
        if (!result.data?.success) {
          throw new Error(result.data?.error || 'Erro ao criar PIX de assinatura');
        }

        setPixResult(result.data);
      } else {
        // Para cartão e point, usar a lógica original
        const additionalData = {
          clientEmail: customClientEmail.trim() || `cliente${selectedClient?.phone?.replace(/\D/g, '')}@temp.com`,
        };

        const result = await createSubscriptionPayment({
          barbershopId,
          clientProfileId: selectedClientId,
          subscriptionPlanId: selectedPlanId,
          durationMonths,
          amount: finalAmount,
          description,
          paymentMethod,
          ...additionalData,
        });

        if (result.success) {
          if (paymentMethod === 'card' && result.init_point) {
            window.open(result.init_point, '_blank');
            toast({
              title: "Link aberto!",
              description: "O link de pagamento foi aberto em uma nova guia",
            });
          } else if (paymentMethod === 'point') {
            toast({
              title: "Sucesso!",
              description: "Pagamento enviado para a maquininha",
            });
          }
          
          resetForm();
          
          if (onPaymentCreated) {
            onPaymentCreated();
          }
        }
      }
    } catch (error) {
      console.error('Error creating subscription payment:', error);
    }
  };

  if (activeSubscriptionPlans.length === 0) {
    return (
      <Alert>
        <AlertDescription>
          Nenhum plano de assinatura ativo encontrado. Crie planos de assinatura primeiro.
        </AlertDescription>
      </Alert>
    );
  }

  // Se PIX foi gerado, mostrar interface do QR Code
  if (pixResult && paymentMethod === 'pix') {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5" />
            {paymentStatus === 'paid' ? 'PIX Pago com Sucesso!' : 'PIX de Assinatura Gerado'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Valor: R$ {pixResult.transaction_amount?.toFixed(2)}</p>
              <p className="text-sm text-muted-foreground">Cliente: {selectedClient?.name}</p>
              <p className="text-sm text-muted-foreground">Plano: {selectedPlan?.name} - {getDurationText(durationMonths)}</p>
            </div>
            <Badge variant={paymentStatus === 'paid' ? 'default' : 'secondary'} className={paymentStatus === 'paid' ? 'bg-green-100 text-green-800' : ''}>
              {paymentStatus === 'paid' ? (
                <>
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Pago
                </>
              ) : (
                <>
                  <Clock className="h-3 w-3 mr-1" />
                  Aguardando
                </>
              )}
            </Badge>
          </div>

          {paymentStatus === 'paid' ? (
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                🎉 Pagamento de assinatura confirmado! O cliente agora tem acesso ao plano.
              </AlertDescription>
            </Alert>
          ) : (
            <>
              {pixResult.qr_code_base64 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>QR Code PIX</Label>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={refreshPaymentStatus}
                      disabled={refreshingQR}
                    >
                      <RefreshCw className={`h-4 w-4 mr-2 transition-transform duration-500 ${refreshingQR ? 'animate-spin text-blue-600' : ''}`} />
                      {refreshingQR ? 'Verificando...' : 'Verificar Status'}
                    </Button>
                  </div>
                  <div className="flex justify-center">
                    <img 
                      src={`data:image/png;base64,${pixResult.qr_code_base64}`}
                      alt="QR Code PIX"
                      className="max-w-64 h-auto border rounded"
                    />
                  </div>
                </div>
              )}

              {pixResult.qr_code && (
                <div className="space-y-2">
                  <Label>Código PIX (Copia e Cola)</Label>
                  <div className="flex gap-2">
                    <Input 
                      value={pixResult.qr_code} 
                      readOnly 
                      className="font-mono text-xs"
                    />
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => copyToClipboard(pixResult.qr_code)}
                      className="shrink-0"
                    >
                      {copied ? <CheckCircle className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              )}

              <Alert>
                <AlertDescription>
                  <strong>PIX:</strong> Pagamento único que ativa a assinatura pelo período escolhido. Não há renovação automática.
                </AlertDescription>
              </Alert>
            </>
          )}

          <div className="flex gap-2">
            {paymentStatus === 'paid' ? (
              <Button 
                onClick={() => {
                  resetForm();
                  onPaymentCreated?.();
                }} 
                className="flex-1"
              >
                ✅ Finalizar
              </Button>
            ) : (
              <>
                <Button 
                  onClick={resetForm} 
                  variant="outline" 
                  className="flex-1"
                >
                  Gerar Novo PIX
                </Button>
                <Button 
                  onClick={() => {
                    resetForm();
                    onPaymentCreated?.();
                  }} 
                  variant="secondary"
                  className="flex-1"
                >
                  Fechar
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Seleção do Cliente */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-4 w-4" />
            Selecionar Cliente
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="client-select">Cliente Existente</Label>
            <Select
              value={selectedClientId}
              onValueChange={(value) => {
                setSelectedClientId(value);
                if (value) {
                  setIsCreatingClient(false);
                  setCustomClientName('');
                  setCustomClientPhone('');
                  setCustomClientEmail('');
                }
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione um cliente" />
              </SelectTrigger>
              <SelectContent>
                {clients.map((client) => (
                  <SelectItem key={client.id} value={client.id}>
                    {client.name} - {client.phone}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="text-center text-sm text-muted-foreground">ou</div>

          <div className="space-y-4">
            <div>
              <Label htmlFor="phone-search">Buscar por Telefone</Label>
              <div className="flex gap-2">
                <Input
                  id="phone-search"
                  placeholder="(27) 99999-9999"
                  value={customClientPhone}
                  onChange={(e) => setCustomClientPhone(e.target.value)}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleSearchClientByPhone}
                  disabled={!customClientPhone.trim()}
                >
                  Buscar
                </Button>
              </div>
            </div>

            {isCreatingClient && (
              <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
                <div>
                  <Label htmlFor="new-client-name">Nome do Novo Cliente</Label>
                  <Input
                    id="new-client-name"
                    placeholder="Nome completo"
                    value={customClientName}
                    onChange={(e) => setCustomClientName(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="new-client-email">Email do Cliente</Label>
                  <Input
                    id="new-client-email"
                    type="email"
                    placeholder="cliente@example.com"
                    value={customClientEmail}
                    onChange={(e) => setCustomClientEmail(e.target.value)}
                  />
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleCreateClient} disabled={!customClientName.trim() || !customClientEmail.trim()}>
                    Cadastrar Cliente
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsCreatingClient(false);
                      setCustomClientName('');
                      setCustomClientPhone('');
                      setCustomClientEmail('');
                    }}
                  >
                    Cancelar
                  </Button>
                </div>
              </div>
            )}
          </div>

          {selectedClient && (
            <div className="p-3 bg-primary/10 rounded-lg">
              <p className="font-medium">Cliente Selecionado:</p>
              <p className="text-sm">{selectedClient.name} - {selectedClient.phone}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Seleção do Plano */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Plano de Assinatura
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="plan-select">Plano</Label>
            <Select value={selectedPlanId} onValueChange={setSelectedPlanId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione um plano" />
              </SelectTrigger>
              <SelectContent>
                {activeSubscriptionPlans.map((plan) => (
                  <SelectItem key={plan.id} value={plan.id}>
                    {plan.name} {plan.description && `- ${plan.description}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedPlan && (
            <div>
              <Label htmlFor="duration-select">Duração</Label>
              <Select
                value={durationMonths.toString()}
                onValueChange={(value) => setDurationMonths(parseInt(value) as 1 | 6 | 12)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">
                    1 mês - R$ {selectedPlan.price_1_month.toFixed(2)}
                  </SelectItem>
                  <SelectItem value="6">
                    6 meses - R$ {selectedPlan.price_6_months.toFixed(2)}
                  </SelectItem>
                  <SelectItem value="12">
                    12 meses - R$ {selectedPlan.price_12_months.toFixed(2)}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {selectedPlan && (
            <div className="p-3 bg-primary/10 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{selectedPlan.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {getDurationText(durationMonths)}
                  </p>
                </div>
                <Badge variant="secondary" className="text-lg">
                  R$ {getPlanPrice(selectedPlan, durationMonths).toFixed(2)}
                </Badge>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Método de Pagamento */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            Método de Pagamento
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={paymentMethod} onValueChange={(value) => setPaymentMethod(value as 'card' | 'pix' | 'point')}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="card" className="flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                Cartão/Link
              </TabsTrigger>
              <TabsTrigger value="pix" className="flex items-center gap-2">
                <QrCode className="h-4 w-4" />
                PIX
              </TabsTrigger>
              <TabsTrigger value="point" className="flex items-center gap-2">
                <Wifi className="h-4 w-4" />
                Maquininha
              </TabsTrigger>
            </TabsList>

            <TabsContent value="card" className="mt-4">
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Será gerado um link de pagamento para cartão de crédito/débito
                </p>
                <div>
                  <Label htmlFor="client-email-card">Email do Cliente (obrigatório para Cartão)</Label>
                  <Input
                    id="client-email-card"
                    type="email"
                    placeholder="cliente@example.com"
                    value={customClientEmail}
                    onChange={(e) => setCustomClientEmail(e.target.value)}
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="pix" className="mt-4">
              <div className="space-y-4">
                <Alert>
                  <AlertDescription>
                    <strong>PIX:</strong> Pagamento único que ativa a assinatura pelo período escolhido. Não há renovação automática.
                  </AlertDescription>
                </Alert>
                <p className="text-sm text-muted-foreground">
                  Será gerado um QR Code PIX para pagamento instantâneo
                </p>
                <div>
                  <Label htmlFor="client-email-pix">Email do Cliente (obrigatório para PIX)</Label>
                  <Input
                    id="client-email-pix"
                    type="email"
                    placeholder="cliente@example.com"
                    value={customClientEmail}
                    onChange={(e) => setCustomClientEmail(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="client-cpf">CPF do Cliente (obrigatório para PIX)</Label>
                  <Input
                    id="client-cpf"
                    placeholder="000.000.000-00"
                    value={clientCpf}
                    onChange={(e) => setClientCpf(e.target.value)}
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="point" className="mt-4">
              <p className="text-sm text-muted-foreground">
                Pagamento será processado na maquininha Point
              </p>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Resumo e Ação */}
      <div className="flex justify-end">
        <Button
          onClick={handleCreatePayment}
          disabled={
            !selectedClientId || 
            !selectedPlanId || 
            loading ||
            (paymentMethod === 'card' && !customClientEmail.trim()) ||
            (isCreatingClient && !customClientEmail.trim()) ||
            (paymentMethod === 'pix' && (!clientCpf.trim() || !customClientEmail.trim()))
          }
          size="lg"
          className="min-w-[200px]"
        >
          {loading ? 'Processando...' : `Gerar Pagamento - R$ ${selectedPlan ? getPlanPrice(selectedPlan, durationMonths).toFixed(2) : '0,00'}`}
        </Button>
      </div>
    </div>
  );
}