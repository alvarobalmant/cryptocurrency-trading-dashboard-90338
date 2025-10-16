import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { 
  CreditCard, 
  Calendar, 
  Clock, 
  DollarSign, 
  Receipt, 
  User, 
  Phone, 
  FileText, 
  ExternalLink,
  Loader2,
  RefreshCw
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { PaymentStatusBadge } from '@/utils/paymentStatus';

interface PaymentDetails {
  id: string;
  amount: number;
  status: string;
  payment_method?: string;
  payment_type?: string;
  mercadopago_payment_id?: string;
  mercadopago_preference_id?: string;
  transaction_amount?: number;
  net_received_amount?: number;
  fee_amount?: number;
  client_name?: string;
  client_phone?: string;
  description?: string;
  external_reference?: string;
  paid_at?: string;
  created_at: string;
  updated_at: string;
  barbershop_id: string;
  appointment_id?: string;
  employee_id?: string;
  service_id?: string;
}

interface AppointmentDetails {
  id: string;
  client_name: string;
  client_phone?: string;
  appointment_date: string;
  start_time: string;
  end_time: string;
  notes?: string;
}

interface ServiceDetails {
  id: string;
  name: string;
  duration_minutes: number;
  price: number;
  description?: string;
}

interface EmployeeDetails {
  id: string;
  name: string;
  email?: string;
  phone?: string;
}

interface BarbershopDetails {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
}

interface PaymentDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  appointmentId?: string;
  paymentId?: string;
  paymentStatus?: string;
  paymentMethod?: string;
}

export const PaymentDetailsModal = ({ 
  isOpen, 
  onClose, 
  appointmentId,
  paymentId, 
  paymentStatus, 
  paymentMethod 
}: PaymentDetailsModalProps) => {
  const [payment, setPayment] = useState<PaymentDetails | null>(null);
  const [appointment, setAppointment] = useState<AppointmentDetails | null>(null);
  const [service, setService] = useState<ServiceDetails | null>(null);
  const [employee, setEmployee] = useState<EmployeeDetails | null>(null);
  const [barbershop, setBarbershop] = useState<BarbershopDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen && (appointmentId || paymentId)) {
      fetchPaymentDetails();
    }
  }, [isOpen, appointmentId, paymentId]);

  const fetchPaymentDetails = async () => {
    setLoading(true);
    try {
      let paymentData = null;
      let paymentError = null;

      // Buscar dados do pagamento por ID específico ou por appointment_id
      if (paymentId) {
        const result = await supabase
          .from('payments')
          .select('*')
          .eq('id', paymentId)
          .maybeSingle();
        paymentData = result.data;
        paymentError = result.error;
      } else if (appointmentId) {
        const result = await supabase
          .from('payments')
          .select('*')
          .eq('appointment_id', appointmentId)
          .maybeSingle();
        paymentData = result.data;
        paymentError = result.error;
      }

      if (paymentError) {
        // Error handled silently - no sensitive data logged
      } else {
        setPayment(paymentData);
      }

      // Buscar dados do agendamento (se existir)
      let appointmentData = null;
      let appointmentError = null;
      
      if (appointmentId) {
        const result = await supabase
          .from('appointments')
          .select('*')
          .eq('id', appointmentId)
          .maybeSingle();
        appointmentData = result.data;
        appointmentError = result.error;
      } else if (paymentData?.appointment_id) {
        const result = await supabase
          .from('appointments')
          .select('*')
          .eq('id', paymentData.appointment_id)
          .maybeSingle();
        appointmentData = result.data;
        appointmentError = result.error;
      }

      if (appointmentError) {
        console.error('Error fetching appointment details:', appointmentError);
      } else {
        setAppointment(appointmentData);

        // Se temos agendamento, buscar dados relacionados
        if (appointmentData) {
          // Buscar serviço
          if (appointmentData.service_id) {
            const { data: serviceData } = await supabase
              .from('services')
              .select('*')
              .eq('id', appointmentData.service_id)
              .maybeSingle();
            setService(serviceData);
          }

          // Buscar funcionário
          if (appointmentData.employee_id) {
            const { data: employeeData } = await supabase
              .from('employees')
              .select('*')
              .eq('id', appointmentData.employee_id)
              .maybeSingle();
            setEmployee(employeeData);
          }

          // SECURE: Use security definer function instead of direct table access
          const { data: barbershopData } = await supabase.rpc('get_safe_barbershop_data', {
            barbershop_id_param: appointmentData.barbershop_id
          });
          
          if (barbershopData && barbershopData.length > 0) {
            setBarbershop(barbershopData[0]);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching details:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value?: number) => {
    if (value === undefined || value === null) return 'N/A';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    try {
      return format(new Date(dateString), 'dd/MM/yyyy HH:mm', { locale: ptBR });
    } catch {
      return 'Data inválida';
    }
  };

  const getPaymentMethodLabel = (method?: string) => {
    const methods: Record<string, string> = {
      'credit_card': 'Cartão de Crédito',
      'debit_card': 'Cartão de Débito',
      'pix': 'PIX',
      'boleto': 'Boleto',
      'manual': 'Manual',
      'cash': 'Dinheiro',
      'card': 'Cartão'
    };
    return methods[method || ''] || method || 'Não informado';
  };

  const getPaymentTypeLabel = (type?: string) => {
    const types: Record<string, string> = {
      'appointment': 'Agendamento',
      'walk_in': 'Atendimento Avulso'
    };
    return types[type || ''] || type || 'Não informado';
  };

  const isManualPayment = (payment: PaymentDetails) => {
    // Pagamento é manual se:
    // 1. Tem descrição indicando pagamento manual OU
    // 2. Não tem mercadopago_payment_id E não tem external_reference (indicando que não passou pelo fluxo MercadoPago)
    return payment.description?.includes('Pagamento Manual') || 
           (!payment.mercadopago_payment_id && !payment.external_reference);
  };

  const getProcessingPlatform = (payment: PaymentDetails) => {
    if (payment.mercadopago_payment_id) {
      // Tem ID do MercadoPago = processado automaticamente
      return 'MercadoPago (Automático)';
    }
    
    if (isManualPayment(payment)) {
      // Pagamento marcado manualmente pelo usuário
      return 'Sistema Interno (Manual)';
    }
    
    // Fallback para outros casos
    return 'Sistema Interno';
  };

  const checkPaymentStatus = async () => {
    if (!payment?.id) return;
    
    setChecking(true);
    try {
      const { data, error } = await supabase.functions.invoke('check-payment-status', {
        body: { paymentId: payment.id }
      });

      if (error) throw error;

      if (data.success) {
        toast({
          title: 'Status atualizado!',
          description: `Status: ${data.old_status} → ${data.new_status}`,
        });
        
        // Recarregar detalhes
        await fetchPaymentDetails();
      }
    } catch (error: any) {
      console.error('Error checking payment status:', error);
      toast({
        title: 'Erro ao verificar status',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setChecking(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Detalhes do Pagamento
          </DialogTitle>
          <DialogDescription>
            Informações completas sobre a transação
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span className="ml-2">Carregando detalhes...</span>
          </div>
        ) : !payment && !appointment ? (
          <div className="text-center py-8">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              Nenhuma informação encontrada para este agendamento.
            </p>
          </div>
        ) : !payment ? (
          <div className="text-center py-8">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              Nenhuma informação de pagamento encontrada.
            </p>
            {appointment?.client_name && (
              <div className="mt-4 p-4 bg-muted rounded-lg text-left max-w-md mx-auto">
                <p className="font-medium">{appointment.client_name}</p>
                <p className="text-sm text-muted-foreground">
                  {format(new Date(`${appointment.appointment_date}T${appointment.start_time}`), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                </p>
                {service && <p className="text-sm text-muted-foreground">{service.name}</p>}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            {/* Identificação da Transação */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Receipt className="h-4 w-4" />
                  Identificação da Transação
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium">ID Interno</p>
                    <p className="text-sm text-muted-foreground font-mono">
                      {payment.id}
                    </p>
                  </div>
                  {payment.mercadopago_payment_id ? (
                    <div>
                      <p className="text-sm font-medium">ID da Transação (MercadoPago)</p>
                      <p className="text-sm text-muted-foreground font-mono">
                        {payment.mercadopago_payment_id}
                      </p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-sm font-medium">ID da Transação</p>
                      <p className="text-sm text-muted-foreground">
                        {isManualPayment(payment) ? 'N/A (Pagamento Manual)' : 'Não disponível'}
                      </p>
                    </div>
                  )}
                </div>
                {payment.external_reference && (
                  <div>
                    <p className="text-sm font-medium">Referência Externa</p>
                    <p className="text-sm text-muted-foreground font-mono">
                      {payment.external_reference}
                    </p>
                  </div>
                )}
                {isManualPayment(payment) && (
                  <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <p className="text-sm font-medium text-amber-800">ℹ️ Pagamento Manual</p>
                    <p className="text-xs text-amber-700 mt-1">
                      Este pagamento foi marcado manualmente como pago no sistema, não passou pelo processamento automático do MercadoPago.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Status e Plataforma */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4" />
                  Status e Plataforma
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <PaymentStatusBadge 
                      data={{
                        payment_status: payment.status,
                        payment_method: payment.payment_method,
                        status: 'confirmed'
                      }} 
                    />
                    {payment.mercadopago_payment_id && (payment.status === 'pending' || payment.status === 'processing') && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={checkPaymentStatus}
                        disabled={checking}
                      >
                        {checking ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Verificando...
                          </>
                        ) : (
                          <>
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Verificar Status
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium">Método de Pagamento</p>
                      <p className="text-sm text-muted-foreground">
                        {getPaymentMethodLabel(payment.payment_method)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Plataforma de Processamento</p>
                      <p className="text-sm text-muted-foreground">
                        {getProcessingPlatform(payment)}
                      </p>
                      {isManualPayment(payment) && (
                        <p className="text-xs text-amber-600 mt-1">
                          ⚠️ Pagamento marcado manualmente pelo usuário
                        </p>
                      )}
                      {payment.mercadopago_payment_id && (
                        <p className="text-xs text-green-600 mt-1">
                          ✅ Processado automaticamente via webhook
                        </p>
                      )}
                    </div>
                  </div>
                   <div>
                     <p className="text-sm font-medium">Tipo de Pagamento</p>
                     <p className="text-sm text-muted-foreground">
                       {getPaymentTypeLabel(payment.payment_type)}
                       {payment.payment_type === 'walk_in' && (
                         <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                           Novo Pagamento
                         </span>
                       )}
                     </p>
                   </div>
                </div>
              </CardContent>
            </Card>

            {/* Valores */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Informações Financeiras
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium">Valor Original</p>
                    <p className="text-lg font-bold text-primary">
                      {formatCurrency(payment.amount)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Valor da Transação</p>
                    <p className="text-lg">
                      {formatCurrency(payment.transaction_amount || payment.amount)}
                    </p>
                  </div>
                </div>
                
                {payment.net_received_amount && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium">Valor Líquido Recebido</p>
                      <p className="text-lg text-green-600">
                        {formatCurrency(payment.net_received_amount)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Taxa Cobrada</p>
                      <p className="text-lg text-red-600">
                        {formatCurrency(payment.fee_amount || 0)}
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Detalhes do Cliente (para pagamentos walk-in sem agendamento) */}
            {payment && !appointment && payment.payment_type === 'walk_in' && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Detalhes do Cliente (Novo Pagamento)
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium">Cliente</p>
                      <p className="text-sm text-muted-foreground">{payment.client_name || 'Não informado'}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Telefone</p>
                      <p className="text-sm text-muted-foreground">{payment.client_phone || 'Não informado'}</p>
                    </div>
                  </div>
                  
                  {payment.description && (
                    <div className="pt-2 border-t">
                      <p className="text-sm font-medium">Descrição do Serviço</p>
                      <p className="text-sm text-muted-foreground">{payment.description}</p>
                    </div>
                  )}

                  <div className="pt-2 border-t bg-blue-50 p-3 rounded-lg">
                    <p className="text-sm font-medium text-blue-800">ℹ️ Informação</p>
                    <p className="text-xs text-blue-700 mt-1">
                      Este pagamento foi criado através do fluxo "Novo Pagamento" e não está associado a um agendamento específico.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Detalhes do Agendamento */}
            {appointment && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Detalhes do Agendamento
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium">Cliente</p>
                      <p className="text-sm text-muted-foreground">{appointment.client_name}</p>
                      {appointment.client_phone && (
                        <p className="text-xs text-muted-foreground">{appointment.client_phone}</p>
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium">Data e Hora</p>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(`${appointment.appointment_date}T${appointment.start_time}`), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                      </p>
                    </div>
                  </div>
                  
                  {service && (
                    <div className="pt-2 border-t">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <p className="text-sm font-medium">Serviço</p>
                          <p className="text-sm text-muted-foreground">{service.name}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium">Duração</p>
                          <p className="text-sm text-muted-foreground">{service.duration_minutes} min</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium">Valor do Serviço</p>
                          <p className="text-sm text-muted-foreground">{formatCurrency(service.price)}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {employee && (
                    <div className="pt-2 border-t">
                      <p className="text-sm font-medium">Profissional</p>
                      <p className="text-sm text-muted-foreground">{employee.name}</p>
                      {employee.phone && (
                        <p className="text-xs text-muted-foreground">{employee.phone}</p>
                      )}
                    </div>
                  )}

                  {barbershop && (
                    <div className="pt-2 border-t">
                      <p className="text-sm font-medium">Estabelecimento</p>
                      <p className="text-sm text-muted-foreground">{barbershop.name}</p>
                      {barbershop.address && (
                        <p className="text-xs text-muted-foreground">{barbershop.address}</p>
                      )}
                      {barbershop.phone && (
                        <p className="text-xs text-muted-foreground">{barbershop.phone}</p>
                      )}
                    </div>
                  )}

                  {appointment.notes && (
                    <div className="pt-2 border-t">
                      <p className="text-sm font-medium">Observações do Agendamento</p>
                      <p className="text-sm text-muted-foreground">{appointment.notes}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Histórico da Transação */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Histórico da Transação
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Transação Criada</p>
                    <p className="text-sm text-muted-foreground">
                      {formatDate(payment.created_at)}
                    </p>
                  </div>
                </div>
                
                {payment.paid_at && (
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-green-600" />
                    <div>
                      <p className="text-sm font-medium">Pagamento Confirmado</p>
                      <p className="text-sm text-muted-foreground">
                        {formatDate(payment.paid_at)}
                      </p>
                    </div>
                  </div>
                )}

                {payment.updated_at !== payment.created_at && (
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Última Atualização</p>
                      <p className="text-sm text-muted-foreground">
                        {formatDate(payment.updated_at)}
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Detalhes Técnicos e Rastreabilidade */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ExternalLink className="h-4 w-4" />
                  Rastreabilidade e Detalhes Técnicos
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 gap-3">
                  <div>
                    <p className="text-sm font-medium">ID Interno do Pagamento</p>
                    <p className="text-xs text-muted-foreground font-mono bg-muted p-2 rounded">
                      {payment.id}
                    </p>
                  </div>
                  
                  {appointment && (
                    <div>
                      <p className="text-sm font-medium">ID do Agendamento</p>
                      <p className="text-xs text-muted-foreground font-mono bg-muted p-2 rounded">
                        {appointment.id}
                      </p>
                    </div>
                  )}

                  {payment.mercadopago_payment_id && (
                    <div>
                      <p className="text-sm font-medium">ID da Transação (MercadoPago)</p>
                      <p className="text-xs text-muted-foreground font-mono bg-muted p-2 rounded">
                        {payment.mercadopago_payment_id}
                      </p>
                    </div>
                  )}

                  {payment.mercadopago_preference_id && (
                    <div>
                      <p className="text-sm font-medium">ID da Preferência (MercadoPago)</p>
                      <p className="text-xs text-muted-foreground font-mono bg-muted p-2 rounded">
                        {payment.mercadopago_preference_id}
                      </p>
                    </div>
                  )}

                  {payment.external_reference && (
                    <div>
                      <p className="text-sm font-medium">Referência Externa</p>
                      <p className="text-xs text-muted-foreground font-mono bg-muted p-2 rounded">
                        {payment.external_reference}
                      </p>
                    </div>
                  )}
                </div>

                {/* Explicações técnicas */}
                <div className="pt-3 border-t">
                  <p className="text-xs font-medium text-muted-foreground mb-2">Glossário:</p>
                  <div className="space-y-1 text-xs text-muted-foreground">
                    <p>• <strong>ID Interno:</strong> Identificador único no sistema da barbearia</p>
                    {payment.mercadopago_payment_id && (
                      <p>• <strong>ID da Transação:</strong> Identificador do pagamento processado no MercadoPago</p>
                    )}
                    {payment.mercadopago_preference_id && (
                      <p>• <strong>ID da Preferência:</strong> Identificador da intenção de pagamento no MercadoPago</p>
                    )}
                    {isManualPayment(payment) && (
                      <p>• <strong>Pagamento Manual:</strong> Marcado como pago manualmente pelo usuário (não processado online)</p>
                    )}
                    {payment.mercadopago_payment_id && (
                      <p>• <strong>Processamento Automático:</strong> Pagamento processado automaticamente pelo MercadoPago via webhook</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Observações */}
            {payment.description && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Observações
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm">{payment.description}</p>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        <div className="flex justify-end pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};