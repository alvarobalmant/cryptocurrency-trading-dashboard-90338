import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { pixPaymentSchema } from "@/schemas/payment";
import { z } from "zod";
import { useMercadoPago } from '@/hooks/useMercadoPago';
import { supabase } from '@/integrations/supabase/client';
import { QrCode, Copy, CheckCircle, Clock, RefreshCw, X, CreditCard, Smartphone, User, Phone, Mail, DollarSign } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface Service {
  id: string;
  name: string;
  price: number;
  description?: string;
}

interface Employee {
  id: string;
  name: string;
}

interface CreatePixPaymentProps {
  barbershopId: string;
  services: Service[];
  employees: Employee[];
  selectedAppointment?: any;
  onPaymentCreated?: () => void;
  onTabChange?: (tab: string) => void;
  onModalClose?: () => void;
}

export function CreatePixPayment({ barbershopId, services, employees, selectedAppointment, onPaymentCreated, onTabChange, onModalClose }: CreatePixPaymentProps) {
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientCpf, setClientCpf] = useState('');
  const [selectedServiceId, setSelectedServiceId] = useState('');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [customAmount, setCustomAmount] = useState('');
  const [customDescription, setCustomDescription] = useState('');
  const [pixResult, setPixResult] = useState<any>(null);
  const [copied, setCopied] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<string>('pending');
  const [refreshingQR, setRefreshingQR] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [pendingAction, setPendingAction] = useState<() => void>(() => {});
  
  const { createPixPayment, loading } = useMercadoPago();
  const { toast } = useToast();

  const handleExitAttempt = (action: () => void) => {
    if (pixResult && paymentStatus !== 'paid') {
      setPendingAction(() => action);
      setShowExitConfirm(true);
    } else {
      action();
    }
  };

  const confirmExit = () => {
    setShowExitConfirm(false);
    pendingAction();
    resetForm();
  };

  const cancelExit = () => {
    setShowExitConfirm(false);
    setPendingAction(() => {});
  };

  // Polling automático para verificar status do pagamento
  useEffect(() => {
    if (!pixResult?.payment_id) return;
    
    const POLLING_INTERVAL = 12000; // 12 segundos
    const MAX_POLLING_TIME = 180000; // 3 minutos
    const startTime = Date.now();
    
    // Verificação inicial após 3 segundos
    const initialCheck = setTimeout(() => {
      refreshPaymentStatus();
    }, 3000);
    
    // Polling a cada 12 segundos
    const pollingInterval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      
      // Parar polling se:
      // 1. Passou do tempo máximo (3 min)
      // 2. Status já foi atualizado para paid/cancelled/failed
      // 3. QR Code expirou
      if (
        elapsed > MAX_POLLING_TIME || 
        ['paid', 'cancelled', 'failed'].includes(paymentStatus) ||
        (pixResult.date_of_expiration && new Date(pixResult.date_of_expiration) < new Date())
      ) {
        clearInterval(pollingInterval);
        return;
      }
      
      refreshPaymentStatus();
    }, POLLING_INTERVAL);
    
    // Monitor realtime para atualizações instantâneas via webhook
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
          if (payload.new.status === 'paid' || payload.new.status === 'approved') {
            setPaymentStatus('paid');
            clearInterval(pollingInterval);
            toast({
              title: 'Pagamento confirmado! 🎉',
              description: 'O PIX foi pago com sucesso.',
            });
          } else if (payload.new.status === 'cancelled' || payload.new.status === 'refunded') {
            setPaymentStatus('cancelled');
            clearInterval(pollingInterval);
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
      clearTimeout(initialCheck);
      clearInterval(pollingInterval);
      supabase.removeChannel(channel);
    };
  }, [pixResult?.payment_id, paymentStatus, toast]);

  // Preencher dados do agendamento se fornecido
  useEffect(() => {
    if (selectedAppointment) {
      setClientName(selectedAppointment.client_name || '');
      setClientPhone(selectedAppointment.client_phone || '');
      setSelectedServiceId(selectedAppointment.service_id || '');
      setSelectedEmployeeId(selectedAppointment.employee_id || '');
    }
  }, [selectedAppointment]);

  const selectedService = services.find(s => s.id === selectedServiceId);
  const finalAmount = selectedService ? selectedService.price : parseFloat(customAmount) || 0;
  const finalDescription = selectedService ? selectedService.name : customDescription;

  const refreshPaymentStatus = async (event?: React.MouseEvent) => {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    
    if (!pixResult?.payment_id) {
      toast({
        title: 'Erro',
        description: 'ID do pagamento não encontrado',
        variant: 'destructive',
      });
      return;
    }
    
    setRefreshingQR(true);
    
    try {
      const paymentId = pixResult.payment_id;
      
      // Primeiro buscar o registro do payment no banco
      let payment = null;
      
      const { data: paymentStr, error: errorStr } = await supabase
        .from('payments')
        .select('*')
        .eq('mercadopago_payment_id', paymentId.toString())
        .maybeSingle();
      
      if (!errorStr && paymentStr) {
        payment = paymentStr;
      } else {
        const { data: paymentNum, error: errorNum } = await supabase
          .from('payments')
          .select('*')
          .eq('mercadopago_payment_id', paymentId)
          .maybeSingle();
          
        if (!errorNum && paymentNum) {
          payment = paymentNum;
        }
      }
      
      if (!payment) {
        toast({
          title: 'Erro',
          description: 'Pagamento não encontrado no banco de dados',
          variant: 'destructive',
        });
        return;
      }
      
      // Chamar a edge function para verificar com Mercado Pago
      const { data: checkResult, error: checkError } = await supabase.functions.invoke('check-payment-status', {
        body: { paymentId: payment.id }
      });
      
      if (checkError) {
        console.error('Erro ao verificar status com Mercado Pago:', checkError);
        toast({
          title: 'Erro ao verificar',
          description: 'Não foi possível verificar o status com Mercado Pago.',
          variant: 'destructive',
        });
        return;
      }
      
      const newStatus = checkResult?.new_status || payment.status;
      
      if (newStatus === 'paid' || newStatus === 'approved') {
        setPaymentStatus('paid');
        toast({
          title: 'Pagamento confirmado! 🎉',
          description: 'O PIX foi pago com sucesso.',
        });
      } else if (newStatus === 'cancelled' || newStatus === 'refunded') {
        setPaymentStatus('cancelled');
        toast({
          title: 'Pagamento cancelado',
          description: 'O PIX foi cancelado ou estornado.',
          variant: 'destructive',
        });
      } else if (newStatus === 'failed' || newStatus === 'rejected') {
        setPaymentStatus('failed');
        toast({
          title: 'Pagamento falhou',
          description: 'O PIX não foi processado.',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Ainda pendente',
          description: 'Aguardando confirmação do pagamento.',
        });
      }
    } catch (error: any) {
      console.error('Erro ao verificar status:', error);
      toast({
        title: 'Erro ao verificar',
        description: error.message || 'Não foi possível verificar o status do pagamento.',
        variant: 'destructive',
      });
    } finally {
      setTimeout(() => {
        setRefreshingQR(false);
      }, 800);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const validatedData = pixPaymentSchema.parse({
        clientName: clientName.trim(),
        clientPhone: clientPhone.trim(),
        amount: finalAmount,
        description: finalDescription || '',
      });

      const result = await createPixPayment({
        barbershopId,
        appointmentId: selectedAppointment?.id,
        serviceId: selectedServiceId === 'custom' ? null : selectedServiceId,
        employeeId: selectedEmployeeId === 'none' ? null : selectedEmployeeId,
        clientName: validatedData.clientName,
        clientPhone: validatedData.clientPhone,
        clientEmail,
        amount: validatedData.amount,
        description: validatedData.description,
        paymentType: selectedAppointment ? 'appointment' : 'walk_in',
        payerDocType: clientCpf ? 'CPF' : undefined,
        payerDocNumber: clientCpf ? clientCpf.replace(/\D/g, '') : undefined,
      });

      setPixResult(result);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const firstError = error.issues[0];
        toast({
          title: 'Dados inválidos',
          description: firstError.message,
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Erro ao criar PIX',
          description: 'Não foi possível gerar o código PIX. Tente novamente.',
          variant: 'destructive',
        });
      }
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
    setClientName('');
    setClientPhone('');
    setClientEmail('');
    setClientCpf('');
    setSelectedServiceId('');
    setSelectedEmployeeId('');
    setCustomAmount('');
    setCustomDescription('');
    setPixResult(null);
    setCopied(false);
    setPaymentStatus('pending');
  };

  if (pixResult) {
    return (
      <>
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
                    {paymentStatus === 'paid' ? 'Pagamento confirmado' : 'PIX gerado'}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {paymentStatus === 'paid' ? 'Transação concluída com sucesso' : 'Aguardando pagamento do cliente'}
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
                  <p className="text-sm font-medium text-gray-500">Cliente</p>
                  <p className="text-lg font-medium text-gray-900">{clientName}</p>
                </div>
              </div>
            </div>

            {paymentStatus === 'paid' ? (
              <Alert className="border-green-200 bg-green-50">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  Pagamento confirmado! O cliente efetuou o PIX com sucesso.
                </AlertDescription>
              </Alert>
            ) : (
              <div className="space-y-4">
                {/* QR Code */}
                {pixResult.qr_code_base64 && (
                  <div className="text-center">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-sm font-medium text-gray-900">QR Code para pagamento</h4>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={(e) => refreshPaymentStatus(e)}
                        disabled={refreshingQR}
                        className="text-xs"
                      >
                        <RefreshCw className={`h-3 w-3 mr-1 ${refreshingQR ? 'animate-spin' : ''}`} />
                        {refreshingQR ? 'Verificando' : 'Verificar'}
                      </Button>
                    </div>
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

                {/* Expiration */}
                {pixResult.date_of_expiration && (
                  <div className="text-center">
                    <p className="text-xs text-gray-500">
                      Expira em: {new Date(pixResult.date_of_expiration).toLocaleString('pt-BR')}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-4 border-t border-gray-200">
              {paymentStatus === 'paid' ? (
                <Button 
                  onClick={() => {
                    resetForm();
                    onPaymentCreated?.();
                  }} 
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                >
                  Finalizar
                </Button>
              ) : (
                <>
                  <Button 
                    onClick={() => handleExitAttempt(() => resetForm())} 
                    variant="outline" 
                    className="flex-1 border-gray-200 text-gray-700 hover:bg-gray-50"
                  >
                    Gerar novo PIX
                  </Button>
                  <Button 
                    onClick={() => handleExitAttempt(() => {
                      resetForm();
                      onPaymentCreated?.();
                    })} 
                    className="flex-1 bg-gray-600 hover:bg-gray-700 text-white"
                  >
                    Fechar
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Exit Confirmation Dialog */}
        <Dialog open={showExitConfirm} onOpenChange={setShowExitConfirm}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-amber-600" />
                PIX em andamento
              </DialogTitle>
              <DialogDescription>
                Você tem um PIX ativo aguardando pagamento. Se sair agora, será necessário gerar um novo código.
              </DialogDescription>
            </DialogHeader>
            <div className="flex gap-3 mt-6">
              <Button 
                variant="outline" 
                onClick={cancelExit}
                className="flex-1 border-gray-200"
              >
                Continuar aguardando
              </Button>
              <Button 
                onClick={confirmExit}
                className="flex-1 bg-amber-600 hover:bg-amber-700 text-white"
              >
                Sair mesmo assim
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 rounded-t-lg">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 rounded-full">
            <Smartphone className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <h3 className="text-lg font-medium text-gray-900">PIX Instantâneo</h3>
            <p className="text-sm text-gray-500">Gere um código PIX para pagamento imediato</p>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Customer Information */}
          <div>
            <h4 className="text-sm font-medium text-gray-900 mb-4 flex items-center gap-2">
              <User className="h-4 w-4" />
              Informações do cliente
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="clientName" className="text-sm font-medium text-gray-700">
                  Nome completo *
                </Label>
                <Input
                  id="clientName"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="Digite o nome do cliente"
                  required
                  className="mt-1 border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <Label htmlFor="clientPhone" className="text-sm font-medium text-gray-700">
                  Telefone *
                </Label>
                <Input
                  id="clientPhone"
                  value={clientPhone}
                  onChange={(e) => setClientPhone(e.target.value)}
                  placeholder="(11) 99999-9999"
                  required
                  className="mt-1 border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div>
                <Label htmlFor="clientEmail" className="text-sm font-medium text-gray-700">
                  Email (opcional)
                </Label>
                <Input
                  id="clientEmail"
                  type="email"
                  value={clientEmail}
                  onChange={(e) => setClientEmail(e.target.value)}
                  placeholder="email@exemplo.com"
                  className="mt-1 border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                />
              </div>

              <div>
                <Label htmlFor="clientCpf" className="text-sm font-medium text-gray-700">
                  CPF (recomendado)
                </Label>
                <Input
                  id="clientCpf"
                  value={clientCpf}
                  onChange={(e) => setClientCpf(e.target.value)}
                  placeholder="000.000.000-00"
                  className="mt-1 border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Service Information */}
          <div>
            <h4 className="text-sm font-medium text-gray-900 mb-4 flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Detalhes do serviço
            </h4>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="employee" className="text-sm font-medium text-gray-700">
                  Profissional (opcional)
                </Label>
                <Select value={selectedEmployeeId} onValueChange={setSelectedEmployeeId}>
                  <SelectTrigger className="mt-1 border-gray-200 focus:border-blue-500">
                    <SelectValue placeholder="Selecionar profissional" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhum profissional</SelectItem>
                    {employees.map((employee) => (
                      <SelectItem key={employee.id} value={employee.id}>
                        {employee.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="service" className="text-sm font-medium text-gray-700">
                  Serviço
                </Label>
                <Select value={selectedServiceId} onValueChange={setSelectedServiceId}>
                  <SelectTrigger className="mt-1 border-gray-200 focus:border-blue-500">
                    <SelectValue placeholder="Selecionar serviço" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="custom">Valor personalizado</SelectItem>
                    {services.map((service) => (
                      <SelectItem key={service.id} value={service.id}>
                        {service.name} - R$ {service.price.toFixed(2)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedServiceId === 'custom' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="customAmount" className="text-sm font-medium text-gray-700">
                      Valor (R$) *
                    </Label>
                    <Input
                      id="customAmount"
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={customAmount}
                      onChange={(e) => setCustomAmount(e.target.value)}
                      placeholder="0,00"
                      required={selectedServiceId === 'custom'}
                      className="mt-1 border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <Label htmlFor="customDescription" className="text-sm font-medium text-gray-700">
                      Descrição *
                    </Label>
                    <Input
                      id="customDescription"
                      value={customDescription}
                      onChange={(e) => setCustomDescription(e.target.value)}
                      placeholder="Descrição do serviço"
                      required={selectedServiceId === 'custom'}
                      className="mt-1 border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Summary and Submit */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Total a cobrar</p>
                <p className="text-2xl font-semibold text-gray-900">R$ {finalAmount.toFixed(2)}</p>
              </div>
              <Button 
                type="submit" 
                disabled={loading || !finalAmount} 
                className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-2 min-w-32"
              >
                {loading ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Gerando...
                  </>
                ) : (
                  <>
                    <QrCode className="h-4 w-4 mr-2" />
                    Gerar PIX
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
