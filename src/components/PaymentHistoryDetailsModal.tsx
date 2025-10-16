import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
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
  QrCode,
  Copy,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Info
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { PaymentStatusBadge } from '@/utils/paymentStatus';
import { useToast } from '@/hooks/use-toast';

interface PaymentHistoryDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: any;
  type: 'appointment' | 'payment';
}

export const PaymentHistoryDetailsModal = ({ 
  isOpen, 
  onClose, 
  data,
  type
}: PaymentHistoryDetailsModalProps) => {
  const [relatedPayment, setRelatedPayment] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen && type === 'appointment' && data?.id) {
      fetchRelatedPayment();
    }
  }, [isOpen, type, data]);

  const fetchRelatedPayment = async () => {
    setLoading(true);
    try {
      const { data: paymentData, error } = await supabase
        .from('payments')
        .select('*')
        .eq('appointment_id', data.id)
        .maybeSingle();
      
      if (!error && paymentData) {
        setRelatedPayment(paymentData);
      }
    } catch (error) {
      console.error('Error fetching payment:', error);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: 'Copiado!',
      description: `${label} copiado para a área de transferência.`,
    });
  };

  const openPaymentLink = (url: string) => {
    window.open(url, '_blank');
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

  const getStatusInfo = (status: string) => {
    const statusMap = {
      'pending': { label: 'Pendente', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
      'paid': { label: 'Pago', color: 'bg-green-100 text-green-800', icon: CheckCircle },
      'processing': { label: 'Processando', color: 'bg-blue-100 text-blue-800', icon: Loader2 },
      'cancelled': { label: 'Cancelado', color: 'bg-red-100 text-red-800', icon: XCircle },
      'expired': { label: 'Expirado', color: 'bg-gray-100 text-gray-800', icon: AlertTriangle },
    };
    return statusMap[status as keyof typeof statusMap] || { label: status, color: 'bg-gray-100 text-gray-800', icon: Info };
  };

  const getPaymentMethodInfo = (method?: string) => {
    const methodMap = {
      'pix': { label: 'PIX', icon: QrCode, color: 'text-blue-600' },
      'credit_card': { label: 'Cartão de Crédito', icon: CreditCard, color: 'text-green-600' },
      'point': { label: 'Maquininha Point', icon: CreditCard, color: 'text-purple-600' },
    };
    return methodMap[method as keyof typeof methodMap] || { label: method || 'Link/Cartão', icon: ExternalLink, color: 'text-gray-600' };
  };

  // Determinar qual objeto usar (appointment ou payment direto)
  const currentData = type === 'payment' ? data : (relatedPayment || data);
  const isAppointment = type === 'appointment';
  const hasPayment = type === 'payment' || relatedPayment;

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Detalhes do {isAppointment ? 'Agendamento' : 'Pagamento'}
          </DialogTitle>
          <DialogDescription>
            Informações completas sobre {isAppointment ? 'o agendamento e pagamento' : 'a transação'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Informações do Cliente */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-4 w-4" />
                Informações do Cliente
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium">Nome</p>
                  <p className="text-sm text-muted-foreground">{currentData?.client_name || 'Não informado'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Telefone</p>
                  <div className="flex items-center gap-2">
                    <p className="text-sm text-muted-foreground">{currentData?.client_phone || 'Não informado'}</p>
                    {currentData?.client_phone && (
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => copyToClipboard(currentData.client_phone, 'Telefone')}
                        className="h-6 w-6 p-0"
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Agendamento (se for appointment) */}
          {isAppointment && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Detalhes do Agendamento
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium">Data e Horário</p>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(`${data.appointment_date}T${data.start_time}`), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Status do Agendamento</p>
                    <Badge variant="outline" className="mt-1">
                      {data.status === 'pending' && 'Pendente'}
                      {data.status === 'confirmed' && 'Confirmado'}
                      {data.status === 'completed' && 'Concluído'}
                      {data.status === 'cancelled' && 'Cancelado'}
                      {data.status === 'no_show' && 'Não Compareceu'}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Informações de Pagamento */}
          {(loading && isAppointment) ? (
            <Card>
              <CardContent className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin mr-2" />
                <span>Carregando informações de pagamento...</span>
              </CardContent>
            </Card>
          ) : hasPayment ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Informações de Pagamento
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3 mb-4">
                  <PaymentStatusBadge 
                    data={{
                      payment_status: currentData?.status,
                      payment_method: currentData?.payment_method,
                      status: isAppointment ? data?.status : 'confirmed'
                    }} 
                  />
                  {currentData?.payment_method && (
                    <Badge variant="outline" className="flex items-center gap-1">
                      {(() => {
                        const methodInfo = getPaymentMethodInfo(currentData.payment_method);
                        const Icon = methodInfo.icon;
                        return (
                          <>
                            <Icon className="h-3 w-3" />
                            {methodInfo.label}
                          </>
                        );
                      })()}
                    </Badge>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium">Valor</p>
                    <p className="text-lg font-bold text-primary">
                      {formatCurrency(currentData?.amount)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Criado em</p>
                    <p className="text-sm text-muted-foreground">
                      {formatDate(currentData?.created_at)}
                    </p>
                  </div>
                </div>

                {currentData?.paid_at && (
                  <div>
                    <p className="text-sm font-medium">Pago em</p>
                    <p className="text-sm text-muted-foreground">
                      {formatDate(currentData.paid_at)}
                    </p>
                  </div>
                )}

                {currentData?.description && (
                  <div>
                    <p className="text-sm font-medium">Descrição</p>
                    <p className="text-sm text-muted-foreground">
                      {currentData.description}
                    </p>
                  </div>
                )}

                {/* Link de Pagamento */}
                {currentData?.mercadopago_preference_id && currentData?.status === 'pending' && (
                  <Alert>
                    <ExternalLink className="h-4 w-4" />
                    <AlertDescription>
                      <div className="flex flex-col gap-2">
                        <p className="font-medium">Link de pagamento disponível</p>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => {
                              const paymentLink = `https://www.mercadopago.com.br/checkout/v1/redirect?pref_id=${currentData.mercadopago_preference_id}`;
                              openPaymentLink(paymentLink);
                            }}
                          >
                            <ExternalLink className="h-3 w-3 mr-1" />
                            Abrir Link
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const paymentLink = `https://www.mercadopago.com.br/checkout/v1/redirect?pref_id=${currentData.mercadopago_preference_id}`;
                              copyToClipboard(paymentLink, 'Link de pagamento');
                            }}
                          >
                            <Copy className="h-3 w-3 mr-1" />
                            Copiar
                          </Button>
                        </div>
                      </div>
                    </AlertDescription>
                  </Alert>
                )}

                {/* QR Code PIX Salvo */}
                {currentData?.payment_method === 'pix' && (currentData?.qr_code_base64 || currentData?.qr_code) && (
                  <div className="space-y-4 pt-4 border-t">
                    <p className="text-sm font-medium flex items-center gap-2">
                      <QrCode className="h-4 w-4" />
                      QR Code PIX
                    </p>
                    
                    {/* QR Code Image */}
                    {currentData?.qr_code_base64 && (
                      <div className="text-center">
                        <div className="inline-block p-3 bg-white border border-gray-200 rounded-lg">
                          <img 
                            src={`data:image/png;base64,${currentData.qr_code_base64}`}
                            alt="QR Code PIX"
                            className="w-32 h-32 mx-auto"
                          />
                        </div>
                        <p className="text-xs text-muted-foreground mt-2">
                          Escaneie com o app do seu banco
                        </p>
                      </div>
                    )}
                    
                    {/* PIX Code */}
                    {currentData?.qr_code && (
                      <div className="space-y-2">
                        <p className="text-xs text-muted-foreground">Código PIX:</p>
                        <div className="flex gap-2">
                          <div className="flex-1 p-2 bg-muted rounded text-xs font-mono overflow-x-auto">
                            {currentData.qr_code}
                          </div>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => copyToClipboard(currentData.qr_code, 'Código PIX')}
                            className="shrink-0"
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* IDs de Referência */}
                {(currentData?.mercadopago_payment_id || currentData?.mercadopago_preference_id) && (
                  <div className="space-y-2 pt-2 border-t">
                    <p className="text-sm font-medium">Referências</p>
                    {currentData?.mercadopago_payment_id && (
                      <div className="flex items-center gap-2">
                        <p className="text-xs text-muted-foreground">ID Pagamento:</p>
                        <code className="text-xs bg-muted px-2 py-1 rounded">{currentData.mercadopago_payment_id}</code>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => copyToClipboard(currentData.mercadopago_payment_id, 'ID do Pagamento')}
                          className="h-6 w-6 p-0"
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                    {currentData?.mercadopago_preference_id && (
                      <div className="flex items-center gap-2">
                        <p className="text-xs text-muted-foreground">ID Preferência:</p>
                        <code className="text-xs bg-muted px-2 py-1 rounded">{currentData.mercadopago_preference_id}</code>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => copyToClipboard(currentData.mercadopago_preference_id, 'ID da Preferência')}
                          className="h-6 w-6 p-0"
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ) : isAppointment && !loading && (
            <Card>
              <CardContent className="text-center py-8">
                <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  Nenhuma informação de pagamento encontrada para este agendamento.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};