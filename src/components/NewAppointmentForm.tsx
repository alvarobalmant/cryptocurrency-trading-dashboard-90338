import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useAppointments } from '@/hooks/useAppointments';
import { useClients } from '@/hooks/useClients';
import { User, Phone, Clock, Star } from 'lucide-react';
import { AppointmentClientSelector } from '@/components/AppointmentClientSelector';

const appointmentSchema = z.object({
  client_type: z.enum(['registered', 'visitor']).optional(),
  client_id: z.string().optional(),
  client_name: z.string().min(1, 'Nome do cliente é obrigatório'),
  client_phone: z.string().min(1, 'Telefone é obrigatório'),
  service_id: z.string().min(1, 'Serviço é obrigatório'),
  employee_id: z.string().min(1, 'Profissional é obrigatório'),
  appointment_date: z.string().min(1, 'Data é obrigatória'),
  start_time: z.string().min(1, 'Horário é obrigatório'),
  end_time: z.string().min(1, 'Horário de fim é obrigatório'),
  notes: z.string().optional(),
  status: z.enum(['pending', 'confirmed']).default('pending')
});

type AppointmentFormData = z.infer<typeof appointmentSchema>;

interface NewAppointmentFormProps {
  selectedTimeSlot?: { time: string; employeeId: string } | null;
  employees: Array<{ id: string; name: string }>;
  services: Array<{ id: string; name: string; price: number; duration_minutes?: number }>;
  barbershopId: string;
  onSuccess: (appointment: any) => void;
  onCancel: () => void;
}

export default function NewAppointmentForm({
  selectedTimeSlot,
  employees,
  services,
  barbershopId,
  onSuccess,
  onCancel
}: NewAppointmentFormProps) {
  const [showClientSelector, setShowClientSelector] = useState(false);
  const [showClientTypeSelection, setShowClientTypeSelection] = useState(true);
  const [isVisitorClient, setIsVisitorClient] = useState(false);
  const [clientDetails, setClientDetails] = useState<any>(null);
  const [availableSlots, setAvailableSlots] = useState<Array<{ start_time: string; end_time: string }>>([]);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);

  const { createAppointment, getAvailableSlots } = useAppointments(barbershopId);
  const { clients, isLoading: isLoadingClients } = useClients(barbershopId);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting }
  } = useForm<AppointmentFormData>({
    resolver: zodResolver(appointmentSchema),
    defaultValues: {
      appointment_date: new Date().toISOString().split('T')[0],
      employee_id: selectedTimeSlot?.employeeId || '',
      start_time: selectedTimeSlot?.time || '',
      status: 'pending'
    }
  });

  const watchedServiceId = watch('service_id');
  const watchedEmployeeId = watch('employee_id');
  const watchedDate = watch('appointment_date');
  const watchedClientType = watch('client_type');

  
  // Initialize available slots if we have a selected time slot
  useEffect(() => {
    if (selectedTimeSlot && services.length > 0) {
      // Add the selected time slot to available slots immediately
      const defaultService = services[0];
      const duration = defaultService?.duration_minutes || 60;
      const endTime = new Date(`2000-01-01T${selectedTimeSlot.time}`);
      endTime.setMinutes(endTime.getMinutes() + duration);
      const endTimeStr = endTime.toTimeString().slice(0, 5);
      
      setAvailableSlots([{
        start_time: selectedTimeSlot.time,
        end_time: endTimeStr
      }]);
    }
  }, [selectedTimeSlot, services]);

  // Load available slots when service, employee or date changes
  useEffect(() => {
    const loadAvailableSlots = async () => {
      if (watchedServiceId && watchedEmployeeId && watchedDate) {
        setIsLoadingSlots(true);
        try {
          const service = services.find(s => s.id === watchedServiceId);
          const duration = service?.duration_minutes || 60;
          
          const slots = await getAvailableSlots(watchedEmployeeId, watchedDate, duration);
          
          // If we have a selected time slot, always include it in available slots
          if (selectedTimeSlot && !slots.find(slot => slot.start_time === selectedTimeSlot.time)) {
            const service = services.find(s => s.id === watchedServiceId);
            const duration = service?.duration_minutes || 60;
            const endTime = new Date(`2000-01-01T${selectedTimeSlot.time}`);
            endTime.setMinutes(endTime.getMinutes() + duration);
            const endTimeStr = endTime.toTimeString().slice(0, 5);
            
            slots.unshift({
              start_time: selectedTimeSlot.time,
              end_time: endTimeStr
            });
          }
          
          setAvailableSlots(slots);
        } catch (error) {
          console.error('Error loading available slots:', error);
        } finally {
          setIsLoadingSlots(false);
        }
      }
    };

    loadAvailableSlots();
  }, [watchedServiceId, watchedEmployeeId, watchedDate, getAvailableSlots, services, selectedTimeSlot]);

  // Update end time when start time or service changes
  useEffect(() => {
    const startTime = watch('start_time');
    const serviceId = watch('service_id');
    
    if (startTime && serviceId) {
      const slot = availableSlots.find(s => s.start_time === startTime);
      if (slot) {
        setValue('end_time', slot.end_time);
      }
    }
  }, [watch('start_time'), watch('service_id'), availableSlots, setValue]);

  const handleClientSelect = (client: any) => {
    setClientDetails(client);
    setValue('client_id', client.id);
    setValue('client_name', client.name);
    setValue('client_phone', client.phone);
    setValue('client_type', 'registered');
    setShowClientTypeSelection(false);
    setIsVisitorClient(false);
    // Fechar o modal após seleção
    setShowClientSelector(false);
  };

  const handleSubmitForm = async (data: AppointmentFormData) => {
    try {
      const appointmentData = {
        client_name: data.client_name,
        client_phone: data.client_phone,
        service_id: data.service_id,
        employee_id: data.employee_id,
        appointment_date: data.appointment_date,
        start_time: data.start_time,
        end_time: data.end_time,
        notes: data.notes || '',
        status: data.status
      };

      const result = await createAppointment(appointmentData);
      onSuccess(result);
    } catch (error) {
      console.error('Error creating appointment:', error);
    }
  };

  return (
    <>
      <form onSubmit={handleSubmit(handleSubmitForm)} className="space-y-6">
        {/* Pre-selected time slot info */}
        {selectedTimeSlot && (
          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-center gap-2 text-blue-800">
              <Clock className="h-4 w-4" />
              <span className="font-medium">Horário Selecionado</span>
            </div>
            <div className="mt-2 space-y-1 text-sm text-blue-700">
              <p><strong>Horário:</strong> {selectedTimeSlot.time}</p>
              <p><strong>Profissional:</strong> {employees.find(emp => emp.id === selectedTimeSlot.employeeId)?.name}</p>
            </div>
          </div>
        )}

        {/* Client Information Section */}
        <div className="bg-gray-50 rounded-lg p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-gray-900">Informações do Cliente</h3>
          </div>

          {showClientTypeSelection ? (
            <div className="space-y-4">
              <h4 className="font-medium text-gray-900">Tipo de Cliente</h4>
              <div className="grid grid-cols-1 gap-3">
                <Button
                  type="button"
                  variant="outline"
                  className="h-auto p-4 text-left justify-start"
                  onClick={() => {
                    setShowClientTypeSelection(false);
                    setShowClientSelector(true);
                  }}
                >
                  <div>
                    <div className="font-medium">Selecionar/cadastrar cliente no sistema</div>
                    <div className="text-sm text-gray-600">Cliente com cadastro e histórico</div>
                  </div>
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="h-auto p-4 text-left justify-start"
                  onClick={() => {
                    setShowClientTypeSelection(false);
                    setIsVisitorClient(true);
                    setValue('client_type', 'visitor');
                  }}
                >
                  <div>
                    <div className="font-medium">Cliente visitante</div>
                    <div className="text-sm text-gray-600">Cliente sem cadastro no sistema</div>
                  </div>
                </Button>
              </div>
            </div>
          ) : clientDetails && !isVisitorClient ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Avatar className="w-12 h-12">
                    <AvatarFallback className="bg-blue-100 text-blue-600">
                      {clientDetails.name?.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-gray-900">{clientDetails.name}</h3>
                      <Badge variant="outline" className="text-xs">
                        Cadastrado
                      </Badge>
                    </div>
                    <div className="flex items-center gap-1 text-sm text-gray-600">
                      <Phone className="h-3 w-3" />
                      {clientDetails.phone}
                    </div>
                  </div>
                </div>
                <Button 
                  type="button"
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    setShowClientTypeSelection(true);
                    setClientDetails(null);
                    setValue('client_type', undefined);
                  }}
                  className="flex items-center gap-2"
                >
                  <User className="h-4 w-4" />
                  Alterar Cliente
                </Button>
              </div>

              {clientDetails.hasActiveSubscription && (
                <div className="flex items-center gap-2 p-2 bg-yellow-50 rounded-md">
                  <Star className="h-4 w-4 text-yellow-600" />
                  <span className="text-sm text-yellow-800 font-medium">Assinatura Ativa</span>
                </div>
              )}
            </div>
          ) : isVisitorClient ? (
            <div className="space-y-4 p-4 bg-orange-50 rounded-lg border border-orange-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Avatar className="w-12 h-12">
                    <AvatarFallback className="bg-orange-100 text-orange-600">
                      <User className="h-6 w-6" />
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-gray-900">Cliente Visitante</h3>
                      <Badge variant="secondary" className="text-xs bg-orange-100 text-orange-800 border-orange-300">
                        Visitante
                      </Badge>
                    </div>
                  </div>
                </div>
                <Button 
                  type="button"
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    setShowClientTypeSelection(true);
                    setIsVisitorClient(false);
                    setValue('client_type', undefined);
                    setValue('client_name', '');
                    setValue('client_phone', '');
                  }}
                  className="flex items-center gap-2"
                >
                  <User className="h-4 w-4" />
                  Alterar Cliente
                </Button>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="client_name" className="text-sm font-medium text-gray-700">Nome do Cliente</Label>
                  <Input
                    id="client_name"
                    {...register('client_name')}
                    placeholder="Nome do cliente"
                    className={`mt-1 bg-white ${errors.client_name ? 'border-red-500' : ''}`}
                  />
                  {errors.client_name && (
                    <p className="text-sm text-red-500 mt-1">{errors.client_name.message}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="client_phone" className="text-sm font-medium text-gray-700">Telefone</Label>
                  <Input
                    id="client_phone"
                    {...register('client_phone')}
                    placeholder="(11) 99999-9999"
                    className={`mt-1 bg-white ${errors.client_phone ? 'border-red-500' : ''}`}
                  />
                  {errors.client_phone && (
                    <p className="text-sm text-red-500 mt-1">{errors.client_phone.message}</p>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="text-center py-4 text-gray-500">
                Selecione um tipo de cliente para continuar
              </div>
              <div className="grid grid-cols-1 gap-3">
                <Button
                  type="button"
                  variant="outline"
                  className="h-auto p-4 text-left justify-start"
                  onClick={() => {
                    setShowClientTypeSelection(false);
                    setShowClientSelector(true);
                  }}
                >
                  <div>
                    <div className="font-medium">Selecionar/cadastrar cliente no sistema</div>
                    <div className="text-sm text-gray-600">Cliente com cadastro e histórico</div>
                  </div>
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="h-auto p-4 text-left justify-start"
                  onClick={() => {
                    setShowClientTypeSelection(false);
                    setIsVisitorClient(true);
                    setValue('client_type', 'visitor');
                  }}
                >
                  <div>
                    <div className="font-medium">Cliente visitante</div>
                    <div className="text-sm text-gray-600">Cliente sem cadastro no sistema</div>
                  </div>
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Service and Employee Selection */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="service_id">Serviço</Label>
            <Select 
              value={watch('service_id')} 
              onValueChange={(value) => setValue('service_id', value)}
            >
              <SelectTrigger className={errors.service_id ? 'border-red-500' : ''}>
                <SelectValue placeholder="Selecione o serviço" />
              </SelectTrigger>
              <SelectContent>
                {services.map((service) => (
                  <SelectItem key={service.id} value={service.id}>
                    {service.name} - R$ {service.price.toFixed(2)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.service_id && (
              <p className="text-sm text-red-500">{errors.service_id.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="employee_id">Profissional</Label>
            <Select 
              value={watch('employee_id')} 
              onValueChange={(value) => setValue('employee_id', value)}
            >
              <SelectTrigger className={errors.employee_id ? 'border-red-500' : ''}>
                <SelectValue placeholder="Selecione o profissional" />
              </SelectTrigger>
              <SelectContent>
                {employees.map((employee) => (
                  <SelectItem key={employee.id} value={employee.id}>
                    {employee.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.employee_id && (
              <p className="text-sm text-red-500">{errors.employee_id.message}</p>
            )}
          </div>
        </div>

        {/* Date and Time Selection */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="appointment_date">Data</Label>
            <Input
              id="appointment_date"
              type="date"
              {...register('appointment_date')}
              className={errors.appointment_date ? 'border-red-500' : ''}
            />
            {errors.appointment_date && (
              <p className="text-sm text-red-500">{errors.appointment_date.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="start_time">Horário</Label>
            <Select 
              value={watch('start_time')} 
              onValueChange={(value) => setValue('start_time', value)}
              disabled={isLoadingSlots || availableSlots.length === 0}
            >
              <SelectTrigger className={errors.start_time ? 'border-red-500' : ''}>
                <SelectValue placeholder={
                  isLoadingSlots ? "Carregando..." : 
                  availableSlots.length === 0 ? "Nenhum horário disponível" : 
                  "Selecione o horário"
                } />
              </SelectTrigger>
              <SelectContent>
                {availableSlots.map((slot) => (
                  <SelectItem key={slot.start_time} value={slot.start_time}>
                    {slot.start_time} - {slot.end_time}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.start_time && (
              <p className="text-sm text-red-500">{errors.start_time.message}</p>
            )}
          </div>
        </div>

        {/* Notes */}
        <div className="space-y-2">
          <Label htmlFor="notes">Observações (opcional)</Label>
          <Textarea
            id="notes"
            {...register('notes')}
            placeholder="Observações sobre o agendamento..."
            rows={3}
          />
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
          <Button 
            type="submit" 
            disabled={
              isSubmitting || 
              showClientTypeSelection ||
              (!clientDetails && !isVisitorClient) ||
              !watch('client_name') || 
              !watch('client_phone') || 
              !watch('service_id') || 
              !watch('employee_id') || 
              !watch('start_time')
            }
          >
            {isSubmitting ? 'Criando...' : 'Criar Agendamento'}
          </Button>
        </div>
      </form>

      {/* Client Selector Modal */}
        <AppointmentClientSelector
          open={showClientSelector}
          onOpenChange={setShowClientSelector}
          onClientSelect={handleClientSelect}
          clients={clients || []}
          isLoading={isLoadingClients}
        />
    </>
  );
}
