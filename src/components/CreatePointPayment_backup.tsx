import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useMercadoPago } from '@/hooks/useMercadoPago';
import { CreditCard, CheckCircle, Clock, Wifi } from 'lucide-react';
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
        title: 'Pagamento enviado!',
        description: 'O pagamento foi enviado para a maquininha. Aguarde o cliente finalizar.',
      });
    } catch (error) {
        toast({
          title: 'Erro',
          description: 'Erro ao enviar para maquininha. Tente novamente.',
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
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Pagamento Enviado para Maquininha
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Valor: R$ {pointResult.amount?.toFixed(2)}</p>
              <p className="text-sm text-muted-foreground">Cliente: {clientName}</p>
              <p className="text-xs text-muted-foreground">Device ID: {pointResult.device_id}</p>
            </div>
            <Badge variant="secondary">
              <Wifi className="h-3 w-3 mr-1" />
              Enviado
            </Badge>
          </div>

          <Alert>
            <Clock className="h-4 w-4" />
            <AlertDescription>
              {pointResult.message || 'Aguarde o cliente finalizar o pagamento na maquininha.'}
            </AlertDescription>
          </Alert>

          <div className="bg-muted/50 p-4 rounded-lg">
            <h4 className="font-medium mb-2">Status do Pagamento</h4>
            <div className="flex items-center gap-2 text-sm">
              <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
              <span>Aguardando interação na maquininha...</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              O status será atualizado automaticamente quando o pagamento for processado.
            </p>
          </div>

          <div className="flex gap-2">
            <Button onClick={resetForm} variant="outline" className="flex-1">
              Novo Pagamento
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          Pagamento na Maquininha
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

          <Alert>
            <Wifi className="h-4 w-4" />
            <AlertDescription>
              Certifique-se de que sua maquininha Point está ligada e conectada à internet.
            </AlertDescription>
          </Alert>

          <div className="flex items-center justify-between pt-4 border-t">
            <div className="text-lg font-semibold">
              Total: R$ {finalAmount.toFixed(2)}
            </div>
            <Button type="submit" disabled={loading} className="min-w-32">
              {loading ? 'Enviando...' : 'Enviar para Maquininha'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}