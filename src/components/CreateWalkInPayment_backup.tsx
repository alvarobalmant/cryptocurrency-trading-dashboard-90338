import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useMercadoPago } from '@/hooks/useMercadoPago';
import { CreditCard } from 'lucide-react';

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
}

const CreateWalkInPayment = ({ 
  barbershopId, 
  services, 
  employees, 
  selectedAppointment,
  onPaymentCreated 
}: CreateWalkInPaymentProps) => {
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [selectedServiceId, setSelectedServiceId] = useState('');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [customAmount, setCustomAmount] = useState('');
  const [description, setDescription] = useState('');
  const [useCustomAmount, setUseCustomAmount] = useState(false);

  const { createPayment, loading } = useMercadoPago();

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
      alert('Preencha todos os campos obrigatórios');
      return;
    }

    try {
      const serviceDescription = selectedService 
        ? selectedService.name 
        : description || 'Serviço personalizado';

      const result = await createPayment({
        barbershopId,
        appointmentId: selectedAppointment?.id,
        serviceId: selectedServiceId || 'custom',
        employeeId: selectedEmployeeId,
        clientName,
        clientPhone,
        amount: finalAmount,
        description: `${serviceDescription} - ${clientName}`,
        paymentType: selectedAppointment ? 'appointment' : 'walk_in',
      });

      if (result.init_point) {
        window.open(result.init_point, '_blank');
        onPaymentCreated();
        
        // Reset form
        setClientName('');
        setClientPhone('');
        setSelectedServiceId('');
        setSelectedEmployeeId('');
        setCustomAmount('');
        setDescription('');
        setUseCustomAmount(false);
      }
    } catch (error) {
      // Error handled by hook
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="clientName">Nome do Cliente *</Label>
          <Input
            id="clientName"
            value={clientName}
            onChange={(e) => setClientName(e.target.value)}
            placeholder="João Silva"
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
        <Label>Profissional</Label>
        <Select value={selectedEmployeeId} onValueChange={setSelectedEmployeeId}>
          <SelectTrigger>
            <SelectValue placeholder="Selecione um profissional (opcional)" />
          </SelectTrigger>
          <SelectContent>
            {employees.map((employee) => (
              <SelectItem key={employee.id} value={employee.id}>
                {employee.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="useCustomAmount"
            checked={useCustomAmount}
            onChange={(e) => setUseCustomAmount(e.target.checked)}
          />
          <Label htmlFor="useCustomAmount">Valor personalizado</Label>
        </div>
      </div>

      {!useCustomAmount ? (
        <div className="space-y-2">
          <Label>Serviço *</Label>
          <Select value={selectedServiceId} onValueChange={setSelectedServiceId} required>
            <SelectTrigger>
              <SelectValue placeholder="Selecione um serviço" />
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
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="customAmount">Valor (R$) *</Label>
            <Input
              id="customAmount"
              type="number"
              step="0.01"
              min="0"
              value={customAmount}
              onChange={(e) => setCustomAmount(e.target.value)}
              placeholder="0.00"
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="description">Descrição do Serviço *</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descreva o serviço realizado"
              required
            />
          </div>
        </div>
      )}

      {finalAmount > 0 && (
        <div className="bg-muted p-3 rounded-lg">
          <p className="text-sm">
            <strong>Valor total:</strong> R$ {finalAmount.toFixed(2)}
          </p>
        </div>
      )}

      <Button type="submit" disabled={loading} className="w-full">
        <CreditCard className="h-4 w-4 mr-2" />
        {loading ? 'Criando Pagamento...' : 'Gerar Pagamento'}
      </Button>
    </form>
  );
};

export default CreateWalkInPayment;