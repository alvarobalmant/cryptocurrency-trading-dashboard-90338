import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CreditCard, QrCode, Wifi, User, Calendar, DollarSign, Copy, CheckCircle, Clock, RefreshCw, UserPlus } from 'lucide-react';
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
              title: 'Pagamento confirmado',
              description: 'O PIX foi pago com sucesso.',
            });
          } else if (payload.new.status === 'cancelled') {
            setPaymentStatus('cancelled');
            toast({
              title: 'Pagamento cancelado',
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

  const calculateTotalAmount = () => {
    if (!selectedPlan || !selectedPlan.price) return 0;
    const monthlyPrice = selectedPlan.price;
    let discount = 0;
    
    if (durationMonths === 6) discount = 0.1; // 10% desconto
    if (durationMonths === 12) discount = 0.2; // 20% desconto
    
    const totalBeforeDiscount = monthlyPrice * durationMonths;
    return totalBeforeDiscount * (1 - discount);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedPlanId) {
      toast({
        title: 'Plano obrigatório',
        description: 'Selecione um plano de assinatura.',
        variant: 'destructive',
      });
      return;
    }

    let clientId = selectedClientId;

    // Criar cliente se necessário
    if (isCreatingClient) {
      if (!customClientName || !customClientPhone) {
        toast({
          title: 'Dados do cliente',
          description: 'Nome e telefone são obrigatórios para criar um novo cliente.',
          variant: 'destructive',
        });
        return;
      }

      try {
        const newClient = await createClient({
          name: customClientName,
          phone: customClientPhone,
          email: customClientEmail,
        });
        clientId = newClient.id;
      } catch (error) {
        toast({
          title: 'Erro ao criar cliente',
          description: 'Não foi possível criar o cliente.',
          variant: 'destructive',
        });
        return;
      }
    }

    if (!clientId) {
      toast({
        title: 'Cliente obrigatório',
        description: 'Selecione um cliente ou crie um novo.',
        variant: 'destructive',
      });
      return;
    }

    const totalAmount = calculateTotalAmount();

    try {
      if (paymentMethod === 'pix') {
        const result = await createPixPayment({
          barbershopId,
          clientId,
          amount: totalAmount,
          description: `Assinatura ${selectedPlan?.name} - ${durationMonths} mês(es)`,
          paymentType: 'subscription',
          payerDocType: clientCpf ? 'CPF' : undefined,
          payerDocNumber: clientCpf ? clientCpf.replace(/\D/g, '') : undefined,
        });
        setPixResult(result);
      } else {
        const result = await createSubscriptionPayment({
          barbershopId,
          clientId,
          planId: selectedPlanId,
          durationMonths,
          paymentMethod,
          totalAmount,
        });

        toast({
          title: 'Assinatura criada',
          description: `Assinatura de ${durationMonths} mês(es) criada com sucesso.`,
        });
        
        onPaymentCreated?.();
      }
    } catch (error) {
      toast({
        title: 'Erro ao processar',
        description: 'Não foi possível processar a assinatura.',
        variant: 'destructive',
      });
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast({
      title: 'Copiado',
      description: 'Código PIX copiado para a área de transferência.',
    });
    setTimeout(() => setCopied(false), 2000);
  };

  const resetForm = () => {
    setSelectedClientId('');
    setSelectedPlanId('');
    setDurationMonths(1);
    setPaymentMethod('card');
    setCustomClientName('');
    setCustomClientPhone('');
    setCustomClientEmail('');
    setIsCreatingClient(false);
    setClientCpf('');
    setPixResult(null);
    setCopied(false);
    setPaymentStatus('pending');
  };

  if (pixResult && paymentMethod === 'pix') {
    return (
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 rounded-t-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-full ${paymentStatus === 'paid' ? 'bg-green-100' : 'bg-blue-100'}`}>
                {paymentStatus === 'paid' ? (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                ) : (
                  <QrCode className="h-5 w-5 text-blue-600" />
                )}
              </div>
              <div>
                <h3 className="text-lg font-medium text-gray-900">
                  {paymentStatus === 'paid' ? 'Assinatura ativada' : 'PIX gerado para assinatura'}
                </h3>
                <p className="text-sm text-gray-500">
                  {paymentStatus === 'paid' ? 'Pagamento confirmado com sucesso' : 'Aguardando pagamento do cliente'}
                </p>
              </div>
            </div>
            <Badge 
              variant={paymentStatus === 'paid' ? 'default' : 'secondary'} 
              className={`${paymentStatus === 'paid' ? 'bg-green-100 text-green-800 border-green-200' : 'bg-yellow-100 text-yellow-800 border-yellow-200'} font-medium`}
            >
              {paymentStatus === 'paid' ? 'Pago' : 'Pendente'}
            </Badge>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Payment Details */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-gray-500">Valor</p>
                <p className="text-xl font-semibold text-gray-900">R$ {pixResult.transaction_amount?.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Plano</p>
                <p className="text-lg font-medium text-gray-900">{selectedPlan?.name} - {durationMonths} mês(es)</p>
              </div>
            </div>
          </div>

          {paymentStatus === 'paid' ? (
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                Assinatura ativada! O cliente agora tem acesso aos benefícios do plano.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-4">
              {/* QR Code */}
              {pixResult.qr_code_base64 && (
                <div className="text-center">
                  <h4 className="text-sm font-medium text-gray-900 mb-3">QR Code para pagamento</h4>
                  <div className="inline-block p-4 bg-white border border-gray-200 rounded-lg">
                    <img 
                      src={`data:image/png;base64,${pixResult.qr_code_base64}`}
                      alt="QR Code PIX"
                      className="w-48 h-48 mx-auto"
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Escaneie com o app do seu banco
                  </p>
                </div>
              )}

              {/* PIX Code */}
              {pixResult.qr_code && (
                <div>
                  <Label className="text-sm font-medium text-gray-900 mb-2 block">
                    Ou copie o código PIX
                  </Label>
                  <div className="flex gap-2">
                    <Input 
                      value={pixResult.qr_code} 
                      readOnly 
                      className="font-mono text-xs bg-gray-50 border-gray-200"
                    />
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => copyToClipboard(pixResult.qr_code)}
                      className="shrink-0 border-gray-200"
                    >
                      {copied ? <CheckCircle className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t border-gray-200">
            <Button 
              onClick={resetForm} 
              variant="outline" 
              className="flex-1 border-gray-200 text-gray-700 hover:bg-gray-50"
            >
              Nova assinatura
            </Button>
            <Button 
              onClick={() => onPaymentCreated?.()} 
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
            >
              Finalizar
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 rounded-t-lg">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-100 rounded-full">
            <Calendar className="h-5 w-5 text-purple-600" />
          </div>
          <div>
            <h3 className="text-lg font-medium text-gray-900">Nova Assinatura</h3>
            <p className="text-sm text-gray-500">Criar plano de assinatura para cliente</p>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Client Selection */}
          <div>
            <h4 className="text-sm font-medium text-gray-900 mb-4 flex items-center gap-2">
              <User className="h-4 w-4" />
              Cliente
            </h4>
            
            <div className="space-y-4">
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant={!isCreatingClient ? "default" : "outline"}
                  onClick={() => setIsCreatingClient(false)}
                  className="flex-1"
                >
                  Cliente existente
                </Button>
                <Button
                  type="button"
                  variant={isCreatingClient ? "default" : "outline"}
                  onClick={() => setIsCreatingClient(true)}
                  className="flex-1"
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  Novo cliente
                </Button>
              </div>

              {!isCreatingClient ? (
                <div>
                  <Label className="text-sm font-medium text-gray-700">
                    Selecionar cliente
                  </Label>
                  <Select value={selectedClientId} onValueChange={setSelectedClientId}>
                    <SelectTrigger className="mt-1 border-gray-200 focus:border-blue-500">
                      <SelectValue placeholder="Escolher cliente" />
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
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-gray-700">
                      Nome completo *
                    </Label>
                    <Input
                      value={customClientName}
                      onChange={(e) => setCustomClientName(e.target.value)}
                      placeholder="Nome do cliente"
                      className="mt-1 border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-700">
                      Telefone *
                    </Label>
                    <Input
                      value={customClientPhone}
                      onChange={(e) => setCustomClientPhone(e.target.value)}
                      placeholder="(11) 99999-9999"
                      className="mt-1 border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-700">
                      Email (opcional)
                    </Label>
                    <Input
                      type="email"
                      value={customClientEmail}
                      onChange={(e) => setCustomClientEmail(e.target.value)}
                      placeholder="email@exemplo.com"
                      className="mt-1 border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-700">
                      CPF (recomendado)
                    </Label>
                    <Input
                      value={clientCpf}
                      onChange={(e) => setClientCpf(e.target.value)}
                      placeholder="000.000.000-00"
                      className="mt-1 border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Plan Selection */}
          <div>
            <h4 className="text-sm font-medium text-gray-900 mb-4 flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Plano de assinatura
            </h4>
            
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium text-gray-700">
                  Selecionar plano
                </Label>
                <Select value={selectedPlanId} onValueChange={setSelectedPlanId}>
                  <SelectTrigger className="mt-1 border-gray-200 focus:border-blue-500">
                    <SelectValue placeholder="Escolher plano" />
                  </SelectTrigger>
                  <SelectContent>
                    {activeSubscriptionPlans.map((plan) => (
                      <SelectItem key={plan.id} value={plan.id}>
                        {plan.name} - R$ {plan.price ? plan.price.toFixed(2) : '0.00'}/mês
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-sm font-medium text-gray-700">
                  Duração
                </Label>
                <Select value={durationMonths.toString()} onValueChange={(value) => setDurationMonths(parseInt(value) as 1 | 6 | 12)}>
                  <SelectTrigger className="mt-1 border-gray-200 focus:border-blue-500">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 mês</SelectItem>
                    <SelectItem value="6">6 meses (10% desconto)</SelectItem>
                    <SelectItem value="12">12 meses (20% desconto)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Payment Method */}
          <div>
            <h4 className="text-sm font-medium text-gray-900 mb-4">Forma de pagamento</h4>
            <Tabs value={paymentMethod} onValueChange={(value) => setPaymentMethod(value as 'card' | 'pix' | 'point')}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="card" className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4" />
                  Cartão
                </TabsTrigger>
                <TabsTrigger value="pix" className="flex items-center gap-2">
                  <QrCode className="h-4 w-4" />
                  PIX
                </TabsTrigger>
                <TabsTrigger value="point" className="flex items-center gap-2">
                  <Wifi className="h-4 w-4" />
                  Point
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* Summary and Submit */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Total da assinatura</p>
                <p className="text-2xl font-semibold text-gray-900">R$ {calculateTotalAmount().toFixed(2)}</p>
                {durationMonths > 1 && (
                  <p className="text-xs text-green-600">
                    Desconto de {durationMonths === 6 ? '10%' : '20%'} aplicado
                  </p>
                )}
              </div>
              <Button 
                type="submit" 
                disabled={loading || !selectedPlanId || (!selectedClientId && !isCreatingClient)} 
                className="bg-purple-600 hover:bg-purple-700 text-white px-8 py-2 min-w-32"
              >
                {loading ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Processando...
                  </>
                ) : (
                  <>
                    <Calendar className="h-4 w-4 mr-2" />
                    Criar Assinatura
                  </>
                )}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
