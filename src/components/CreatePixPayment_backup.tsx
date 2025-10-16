import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { pixPaymentSchema } from "@/schemas/payment";
import { z } from "zod";
import { useMercadoPago } from '@/hooks/useMercadoPago';
import { supabase } from '@/integrations/supabase/client';
import { QrCode, Copy, CheckCircle, Clock, AlertCircle, RefreshCw, AlertTriangle } from 'lucide-react';
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

  // Monitorar pagamentos em tempo real
  useEffect(() => {
    if (!pixResult?.payment_id) return;

    // Configurando real-time para pagamento

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

    // Verificar status inicial após alguns segundos
    const initialCheck = setTimeout(() => {
      refreshPaymentStatus();
    }, 3000);

    return () => {
      clearTimeout(initialCheck);
      supabase.removeChannel(channel);
    };
  }, [pixResult?.payment_id, toast]);

  // Aviso ao tentar sair da página com QR code ativo
  useEffect(() => {
    if (!pixResult || paymentStatus === 'paid') return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = 'Você tem um QR Code PIX ativo. Se sair desta tela, o código não aparecerá mais e será necessário gerar um novo PIX.';
      return e.returnValue;
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [pixResult, paymentStatus]);

  // Interceptar mudança de aba
  useEffect(() => {
    const interceptTabChange = (newTab: string) => {
      if (newTab !== 'pix' && pixResult && paymentStatus !== 'paid') {
        handleExitAttempt(() => onTabChange?.(newTab));
        return false;
      }
      return true;
    };

    // Expor função para o PaymentPanel
    (window as any).interceptPixTabChange = interceptTabChange;

    return () => {
      delete (window as any).interceptPixTabChange;
    };
  }, [pixResult, paymentStatus, onTabChange]);

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
    // Previne comportamentos inesperados
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
      
      // Tentar encontrar o pagamento de diferentes formas para garantir compatibilidade
      let payment = null;
      let error = null;
      
      // Primeira tentativa: buscar como string
      const { data: paymentStr, error: errorStr } = await supabase
        .from('payments')
        .select('*')
        .eq('mercadopago_payment_id', paymentId.toString())
        .single();
      
      if (!errorStr && paymentStr) {
        payment = paymentStr;
      } else {
        // Segunda tentativa: buscar como número
        const { data: paymentNum, error: errorNum } = await supabase
          .from('payments')
          .select('*')
          .eq('mercadopago_payment_id', paymentId)
          .single();
          
        if (!errorNum && paymentNum) {
          payment = paymentNum;
        } else {
          error = errorStr || errorNum;
        }
      }
      
      if (error && !payment) {
        // Consulta adicional para debug - listar todos os pagamentos recentes
        const { data: allPayments } = await supabase
          .from('payments')
          .select('id, mercadopago_payment_id, status, created_at')
          .eq('barbershop_id', barbershopId)
          .order('created_at', { ascending: false })
          .limit(5);
          
        console.log('🔍 Últimos 5 pagamentos para debug:', allPayments);
        
        throw error;
      }
      
      console.log('📊 Pagamento encontrado:', { 
        id: payment?.id,
        mercadopago_payment_id: payment?.mercadopago_payment_id,
        status: payment?.status,
        created_at: payment?.created_at
      });
      
      if (payment?.status === 'paid') {
        console.log('✅ Status confirmado: PAGO');
        setPaymentStatus('paid');
        toast({
          title: '✅ Pagamento Confirmado!',
          description: 'O PIX foi pago com sucesso.',
        });
      } else if (payment?.status === 'cancelled') {
        console.log('❌ Status confirmado: CANCELADO');
        setPaymentStatus('cancelled');
        toast({
          title: '❌ Pagamento Cancelado',
          description: 'O PIX foi cancelado.',
          variant: 'destructive',
        });
      } else {
        console.log('⏳ Status atual:', payment?.status);
        toast({
          title: '⏳ Status Verificado',
          description: `Status atual: ${payment?.status || 'pendente'}`,
        });
      }
    } catch (error: any) {
      console.error('❌ Erro ao verificar status:', error);
      toast({
        title: 'Erro ao verificar',
        description: 'Não foi possível verificar o status do pagamento. Verifique o console para mais detalhes.',
        variant: 'destructive',
      });
    } finally {
      console.log('🏁 Finalizando - setRefreshingQR(false)');
      // Delay para mostrar o feedback visual
      setTimeout(() => {
        setRefreshingQR(false);
      }, 800);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      // Validação com Zod
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
      // Não chamar onPaymentCreated aqui - só quando o usuário fechar o QR code
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
      title: 'Copiado!',
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
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5" />
            {paymentStatus === 'paid' ? 'PIX Pago com Sucesso!' : 'PIX Gerado com Sucesso'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Valor: R$ {pixResult.transaction_amount?.toFixed(2)}</p>
              <p className="text-sm text-muted-foreground">Cliente: {clientName}</p>
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
                🎉 Pagamento confirmado! O cliente efetuou o PIX com sucesso.
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
                      onClick={(e) => {
                        console.log('🔘 EVENTO DE CLICK CAPTURADO no botão');
                        refreshPaymentStatus(e);
                      }}
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

              {pixResult.date_of_expiration && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Este PIX expira em: {new Date(pixResult.date_of_expiration).toLocaleString('pt-BR')}
                  </AlertDescription>
                </Alert>
              )}
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
                  onClick={() => handleExitAttempt(() => resetForm())} 
                  variant="outline" 
                  className="flex-1"
                >
                  Gerar Novo PIX
                </Button>
                <Button 
                  onClick={() => handleExitAttempt(() => {
                    resetForm();
                    onPaymentCreated?.();
                  })} 
                  variant="secondary"
                  className="flex-1"
                >
                  Fechar
                </Button>
              </>
            )}
          </div>

          {/* Dialog de Confirmação de Saída */}
          <Dialog open={showExitConfirm} onOpenChange={setShowExitConfirm}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-amber-500" />
                  Confirmar Saída
                </DialogTitle>
                <DialogDescription>
                  Você tem um QR Code PIX ativo. Se sair desta tela, o código não aparecerá mais e será necessário gerar um novo PIX.
                </DialogDescription>
              </DialogHeader>
              <div className="flex gap-2 justify-end">
                <Button 
                  variant="outline" 
                  onClick={cancelExit}
                >
                  Cancelar
                </Button>
                <Button 
                  variant="destructive" 
                  onClick={confirmExit}
                >
                  Sim, Sair
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <QrCode className="h-5 w-5" />
          Gerar PIX Instantâneo
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="clientName">Nome do Cliente *</Label>
              <Input
                id="clientName"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="Nome completo"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="clientPhone">Telefone *</Label>
              <Input
                id="clientPhone"
                value={clientPhone}
                onChange={(e) => setClientPhone(e.target.value)}
                placeholder="(11) 99999-9999"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="clientEmail">Email (opcional)</Label>
            <Input
              id="clientEmail"
              type="email"
              value={clientEmail}
              onChange={(e) => setClientEmail(e.target.value)}
              placeholder="email@exemplo.com"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="clientCpf">CPF (obrigatório em produção)</Label>
            <Input
              id="clientCpf"
              value={clientCpf}
              onChange={(e) => setClientCpf(e.target.value)}
              placeholder="000.000.000-00"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="employee">Funcionário (opcional)</Label>
            <Select value={selectedEmployeeId} onValueChange={setSelectedEmployeeId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecionar funcionário" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nenhum funcionário</SelectItem>
                {employees.map((employee) => (
                  <SelectItem key={employee.id} value={employee.id}>
                    {employee.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="service">Serviço</Label>
            <Select value={selectedServiceId} onValueChange={setSelectedServiceId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecionar serviço ou usar valor personalizado" />
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
              <div className="space-y-2">
                <Label htmlFor="customAmount">Valor (R$) *</Label>
                <Input
                  id="customAmount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={customAmount}
                  onChange={(e) => setCustomAmount(e.target.value)}
                  placeholder="0,00"
                  required={selectedServiceId === 'custom'}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="customDescription">Descrição *</Label>
                <Input
                  id="customDescription"
                  value={customDescription}
                  onChange={(e) => setCustomDescription(e.target.value)}
                  placeholder="Descrição do serviço"
                  required={selectedServiceId === 'custom'}
                />
              </div>
            </div>
          )}

          <div className="flex items-center justify-between pt-4 border-t">
            <div className="text-lg font-semibold">
              Total: R$ {finalAmount.toFixed(2)}
            </div>
            <Button type="submit" disabled={loading} className="min-w-32">
              {loading ? 'Gerando...' : 'Gerar PIX'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}