import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useMercadoPago } from '@/hooks/useMercadoPago';
import { CreditCard, User, DollarSign, RefreshCw, CheckCircle, UserCheck } from 'lucide-react';
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

interface CreateWalkInPaymentProps {
  barbershopId: string;
  services: Service[];
  employees: Employee[];
  selectedAppointment?: any;
  onPaymentCreated: () => void;
  mode?: 'walk_in' | 'payment_link';
}

const CreateWalkInPayment = ({ 
  barbershopId, 
  services, 
  employees, 
  selectedAppointment,
  onPaymentCreated,
  mode = 'walk_in'
}: CreateWalkInPaymentProps) => {
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [selectedServiceId, setSelectedServiceId] = useState('');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('none');
  const [customAmount, setCustomAmount] = useState('');
  const [description, setDescription] = useState('');
  const [useCustomAmount, setUseCustomAmount] = useState(false);
  const [paymentResult, setPaymentResult] = useState<any>(null);

  const { createPayment, loading } = useMercadoPago();
  const { toast } = useToast();

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
  const finalAmount = useCustomAmount 
    ? parseFloat(customAmount) || 0 
    : selectedService?.price || 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!clientName || !clientPhone || (!selectedServiceId && !customAmount)) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Preencha todos os campos necessários.',
        variant: 'destructive',
      });
      return;
    }

    if (finalAmount <= 0) {
      toast({
        title: 'Valor inválido',
        description: 'O valor deve ser maior que zero.',
        variant: 'destructive',
      });
      return;
    }

    try {
      const serviceDescription = selectedService 
        ? selectedService.name 
        : description || 'Serviço personalizado';

      if (mode === 'payment_link') {
        // Para link de pagamento, usar createPayment que gera a preferência
        const result = await createPayment({
          barbershopId,
          appointmentId: selectedAppointment?.id,
          serviceId: selectedServiceId || 'custom',
          employeeId: selectedEmployeeId === 'none' ? null : selectedEmployeeId,
          clientName,
          clientPhone,
          amount: finalAmount,
          description: serviceDescription,
          paymentType: 'appointment',
        });

        console.log('Payment result:', result); // Debug log

        // Se tem init_point, abrir em nova aba
        const paymentLink = result?.preference?.init_point || result?.init_point || result?.payment_url;
        console.log('Payment link found:', paymentLink); // Debug log
        
        if (paymentLink) {
          try {
            window.open(paymentLink, '_blank');
            console.log('Opened payment link:', paymentLink);
          } catch (openError) {
            console.error('Error opening payment link:', openError);
          }
        } else {
          console.warn('No payment link found in result:', result);
        }

        setPaymentResult(result);
        toast({
          title: 'Link gerado',
          description: paymentLink ? 'Link de pagamento gerado e aberto em nova aba.' : 'Link de pagamento gerado com sucesso.',
        });
      } else {
        // Para cliente avulso, manter o comportamento atual
        const result = await createPayment({
          barbershopId,
          appointmentId: selectedAppointment?.id,
          serviceId: selectedServiceId || 'custom',
          employeeId: selectedEmployeeId === 'none' ? null : selectedEmployeeId,
          clientName,
          clientPhone,
          amount: finalAmount,
          description: serviceDescription,
          paymentType: 'walk_in',
        });

        setPaymentResult(result);
        toast({
          title: 'Pagamento registrado',
          description: 'Pagamento de cliente avulso registrado com sucesso.',
        });
      }
    } catch (error) {
      toast({
        title: 'Erro ao processar',
        description: mode === 'payment_link' ? 'Não foi possível gerar o link de pagamento.' : 'Não foi possível registrar o pagamento.',
        variant: 'destructive',
      });
    }
  };

  const resetForm = () => {
    setClientName('');
    setClientPhone('');
    setSelectedServiceId('');
    setSelectedEmployeeId('none');
    setCustomAmount('');
    setDescription('');
    setUseCustomAmount(false);
    setPaymentResult(null);
  };

  if (paymentResult) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 rounded-t-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-green-100">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <h3 className="text-lg font-medium text-gray-900">
                  {mode === 'payment_link' ? 'Link gerado' : 'Pagamento registrado'}
                </h3>
                <p className="text-sm text-gray-500">
                  {mode === 'payment_link' ? 'Link de pagamento criado com sucesso' : 'Cliente avulso atendido com sucesso'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Payment Details */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-gray-500">Valor</p>
                <p className="text-xl font-semibold text-gray-900">R$ {finalAmount.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Cliente</p>
                <p className="text-lg font-medium text-gray-900">{clientName}</p>
              </div>
            </div>
          </div>

          <Alert className="border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              {mode === 'payment_link' 
                ? 'Link de pagamento gerado com sucesso! O link foi aberto em uma nova aba.' 
                : 'Pagamento registrado com sucesso! O atendimento foi finalizado.'}
            </AlertDescription>
          </Alert>

          {/* Show payment link if available */}
          {mode === 'payment_link' && paymentResult && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-sm font-medium text-blue-900 mb-1">Link de Pagamento</p>
                  {(() => {
                    const paymentLink = paymentResult?.preference?.init_point || paymentResult?.init_point || paymentResult?.payment_url;
                    console.log('Displaying payment link:', paymentLink);
                    
                    if (paymentLink) {
                      return (
                        <>
                          <p className="text-xs text-blue-700 break-all mb-2">{paymentLink}</p>
                          <Button 
                            onClick={() => window.open(paymentLink, '_blank')}
                            size="sm"
                            className="bg-blue-600 hover:bg-blue-700 text-white"
                          >
                            Abrir Link
                          </Button>
                        </>
                      );
                    } else {
                      return (
                        <div>
                          <p className="text-xs text-red-700 mb-2">Link não encontrado na resposta da API</p>
                          <details className="mt-2">
                            <summary className="text-xs cursor-pointer">Ver dados completos</summary>
                            <pre className="text-xs mt-1 bg-gray-100 p-2 rounded overflow-auto max-h-32">
                              {JSON.stringify(paymentResult, null, 2)}
                            </pre>
                          </details>
                        </div>
                      );
                    }
                  })()}
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col gap-3 pt-4 border-t border-gray-200 sm:flex-row">
            <Button 
              onClick={resetForm} 
              variant="outline" 
              className="flex-1 border-gray-200 text-gray-700 hover:bg-gray-50"
            >
              {mode === 'payment_link' ? 'Novo link' : 'Novo atendimento'}
            </Button>
            <Button 
              onClick={() => onPaymentCreated()} 
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
          <div className="p-2 bg-orange-100 rounded-full">
            <UserCheck className="h-5 w-5 text-orange-600" />
          </div>
          <div>
            <h3 className="text-lg font-medium text-gray-900">
              {mode === 'payment_link' ? 'Link de Pagamento' : 'Cliente Avulso'}
            </h3>
            <p className="text-sm text-gray-500">
              {mode === 'payment_link' 
                ? 'Gerar link de pagamento para o cliente' 
                : 'Registrar atendimento sem agendamento'}
            </p>
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
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
          </div>

          {/* Service Information */}
          <div>
            <h4 className="text-sm font-medium text-gray-900 mb-4 flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Detalhes do atendimento
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

              <div className="space-y-3">
                <div className="flex flex-col gap-3 sm:flex-row">
                  <Button
                    type="button"
                    variant={!useCustomAmount ? "default" : "outline"}
                    onClick={() => setUseCustomAmount(false)}
                    className="flex-1"
                  >
                    Serviço do menu
                  </Button>
                  <Button
                    type="button"
                    variant={useCustomAmount ? "default" : "outline"}
                    onClick={() => setUseCustomAmount(true)}
                    className="flex-1"
                  >
                    Valor personalizado
                  </Button>
                </div>

                {!useCustomAmount ? (
                  <div>
                    <Label htmlFor="service" className="text-sm font-medium text-gray-700">
                      Selecionar serviço
                    </Label>
                    <Select value={selectedServiceId} onValueChange={setSelectedServiceId}>
                      <SelectTrigger className="mt-1 border-gray-200 focus:border-blue-500">
                        <SelectValue placeholder="Escolher serviço" />
                      </SelectTrigger>
                      <SelectContent>
                        {services.map((service) => (
                          <SelectItem key={service.id} value={service.id}>
                            {service.name} - R$ {service.price.toFixed(2)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
                        required={useCustomAmount}
                        className="mt-1 border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <Label htmlFor="description" className="text-sm font-medium text-gray-700">
                        Descrição *
                      </Label>
                      <Input
                        id="description"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Descrição do serviço"
                        required={useCustomAmount}
                        className="mt-1 border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Summary and Submit */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Total do atendimento</p>
                <p className="text-2xl font-semibold text-gray-900">R$ {finalAmount.toFixed(2)}</p>
              </div>
              <Button 
                type="submit" 
                disabled={loading || !finalAmount} 
                className="bg-orange-600 hover:bg-orange-700 text-white px-8 py-2 min-w-[150px] w-full sm:w-auto"
              >
                  {loading ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      {mode === 'payment_link' ? 'Gerando...' : 'Registrando...'}
                    </>
                  ) : (
                    <>
                      {mode === 'payment_link' ? (
                        <>
                          <CreditCard className="h-4 w-4 mr-2" />
                          Gerar Link
                        </>
                      ) : (
                        <>
                          <UserCheck className="h-4 w-4 mr-2" />
                          Registrar Atendimento
                        </>
                      )}
                    </>
                  )}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateWalkInPayment;
