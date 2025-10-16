import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useMercadoPago } from '@/hooks/useMercadoPago';
import { CreditCard, CheckCircle, Clock, Wifi, User, DollarSign, RefreshCw } from 'lucide-react';
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

interface CreatePointPaymentProps {
  barbershopId: string;
  services: Service[];
  employees: Employee[];
  selectedAppointment?: any;
  onPaymentCreated?: () => void;
}

export function CreatePointPayment({ barbershopId, services, employees, selectedAppointment, onPaymentCreated }: CreatePointPaymentProps) {
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [selectedServiceId, setSelectedServiceId] = useState('');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [customAmount, setCustomAmount] = useState('');
  const [customDescription, setCustomDescription] = useState('');
  const [pointResult, setPointResult] = useState<any>(null);
  
  const { createPointPayment, loading } = useMercadoPago();
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
  const finalAmount = selectedService ? selectedService.price : parseFloat(customAmount) || 0;
  const finalDescription = selectedService ? selectedService.name : customDescription;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!clientName || !clientPhone || (selectedServiceId === 'custom' && (!customAmount || !customDescription))) {
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
      const result = await createPointPayment({
        barbershopId,
        appointmentId: selectedAppointment?.id,
        serviceId: selectedServiceId === 'custom' ? null : selectedServiceId,
        employeeId: selectedEmployeeId === 'none' ? null : selectedEmployeeId,
        clientName,
        clientPhone,
        amount: finalAmount,
        description: finalDescription,
        paymentType: selectedAppointment ? 'appointment' : 'walk_in',
      });

      setPointResult(result);
      onPaymentCreated?.();
      
      toast({
        title: 'Pagamento enviado',
        description: 'O pagamento foi enviado para a maquininha.',
      });
    } catch (error) {
      toast({
        title: 'Erro ao processar',
        description: 'Não foi possível enviar o pagamento para a maquininha.',
        variant: 'destructive',
      });
    }
  };

  const resetForm = () => {
    setClientName('');
    setClientPhone('');
    setSelectedServiceId('');
    setSelectedEmployeeId('');
    setCustomAmount('');
    setCustomDescription('');
    setPointResult(null);
  };

  if (pointResult) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 rounded-t-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-blue-100">
                <CreditCard className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h3 className="text-lg font-medium text-gray-900">Pagamento enviado</h3>
                <p className="text-sm text-gray-500">Aguardando finalização na maquininha</p>
              </div>
            </div>
            <Badge className="bg-blue-100 text-blue-800 border-blue-200 font-medium">
              <Clock className="h-3 w-3 mr-1" />
              Processando
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
                <p className="text-xl font-semibold text-gray-900">R$ {finalAmount.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Cliente</p>
                <p className="text-lg font-medium text-gray-900">{clientName}</p>
              </div>
            </div>
          </div>

          <Alert className="border-blue-200 bg-blue-50">
            <Wifi className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-800">
              O pagamento foi enviado para a maquininha Point. Aguarde o cliente inserir o cartão e finalizar a transação.
            </AlertDescription>
          </Alert>

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t border-gray-200">
            <Button 
              onClick={resetForm} 
              variant="outline" 
              className="flex-1 border-gray-200 text-gray-700 hover:bg-gray-50"
            >
              Novo pagamento
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
          <div className="p-2 bg-blue-100 rounded-full">
            <CreditCard className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <h3 className="text-lg font-medium text-gray-900">Maquininha Point</h3>
            <p className="text-sm text-gray-500">Processar pagamento via cartão de crédito/débito</p>
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
                    Enviando...
                  </>
                ) : (
                  <>
                    <CreditCard className="h-4 w-4 mr-2" />
                    Enviar para Point
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
