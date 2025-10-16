import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useTabs } from '@/hooks/useTabs';
import { useClients } from '@/hooks/useClients';
import { useAppointments } from '@/hooks/useAppointments';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search } from 'lucide-react';
import { format, parseISO, differenceInMinutes } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import AppointmentSelectorModal from './AppointmentSelectorModal';

const formSchema = z.object({
  client_name: z.string().min(2, 'Nome é obrigatório'),
  client_phone: z.string().optional(),
  client_profile_id: z.string().optional(),
  appointment_id: z.string().optional(),
  notes: z.string().optional(),
});

interface CreateTabDialogProps {
  barbershopId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function CreateTabDialog({
  barbershopId,
  open,
  onOpenChange,
}: CreateTabDialogProps) {
  const { createTab } = useTabs(barbershopId);
  const { clients } = useClients(barbershopId);
  const { appointments } = useAppointments(barbershopId);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      client_name: '',
      client_phone: '',
      client_profile_id: '',
      appointment_id: '',
      notes: '',
    },
  });

  const selectedClientId = form.watch('client_profile_id');
  const clientName = form.watch('client_name');
  const clientPhone = form.watch('client_phone');
  const [showAppointmentModal, setShowAppointmentModal] = useState(false);
  
  // Buscar agendamentos não cancelados ou no-show
  const now = new Date();
  
  const getAvailableAppointments = () => {
    let filtered = appointments.filter((apt) => {
      // Excluir cancelados e no-show
      if (['cancelled', 'no_show'].includes(apt.status)) return false;
      
      // Se tem cliente selecionado, buscar todos os agendamentos dele
      if (selectedClientId && apt.client_profile_id === selectedClientId) {
        return true;
      }
      
      // Buscar por telefone (normalizar números)
      if (clientPhone && apt.client_phone) {
        const normalizedPhone = clientPhone.replace(/\D/g, '');
        const normalizedAptPhone = apt.client_phone.replace(/\D/g, '');
        if (normalizedPhone && normalizedPhone === normalizedAptPhone) {
          return true;
        }
      }
      
      // Buscar por nome (case insensitive, partial match)
      if (clientName && apt.client_name) {
        const searchName = clientName.toLowerCase().trim();
        const aptName = apt.client_name.toLowerCase().trim();
        if (searchName.length >= 3 && aptName.includes(searchName)) {
          return true;
        }
      }
      
      return false;
    });
    
    // Ordenar por proximidade do horário atual (mais próximo primeiro)
    filtered.sort((a, b) => {
      const dateTimeA = parseISO(`${a.appointment_date}T${a.start_time}`);
      const dateTimeB = parseISO(`${b.appointment_date}T${b.start_time}`);
      const diffA = Math.abs(differenceInMinutes(dateTimeA, now));
      const diffB = Math.abs(differenceInMinutes(dateTimeB, now));
      return diffA - diffB;
    });
    
    return filtered;
  };
  
  const availableAppointments = getAvailableAppointments();

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsSubmitting(true);
    try {
      // Limpar strings vazias para evitar erro de UUID inválido
      const cleanedValues = {
        ...values,
        client_profile_id: values.client_profile_id || undefined,
        appointment_id: values.appointment_id || undefined,
        client_phone: values.client_phone || undefined,
        notes: values.notes || undefined,
      };
      
      await createTab(cleanedValues);
      form.reset();
      onOpenChange(false);
    } catch (error) {
      console.error('Error creating tab:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClientSelect = (clientId: string) => {
    const client = clients.find((c) => c.id === clientId);
    if (client) {
      form.setValue('client_profile_id', clientId);
      form.setValue('client_name', client.name);
      form.setValue('client_phone', client.phone);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Nova Comanda</DialogTitle>
          <DialogDescription>
            Crie uma nova comanda para gerenciar os consumos do cliente
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="client_profile_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cliente (Opcional)</FormLabel>
                  <Select
                    onValueChange={handleClientSelect}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um cliente" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {clients.map((client) => (
                        <SelectItem key={client.id} value={client.id}>
                          {client.name} - {client.phone}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="client_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome do Cliente *</FormLabel>
                  <FormControl>
                    <Input placeholder="Nome completo" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="client_phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Telefone</FormLabel>
                  <FormControl>
                    <Input placeholder="(00) 00000-0000" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="appointment_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Vincular Agendamento (Opcional)</FormLabel>
                  {selectedClientId || clientPhone || (clientName && clientName.length >= 3) ? (
                    // Se tem cliente, mostrar dropdown com os agendamentos
                    availableAppointments.length > 0 ? (
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione um agendamento" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="max-h-[300px]">
                          {availableAppointments.map((apt) => {
                            const aptDateTime = parseISO(`${apt.appointment_date}T${apt.start_time}`);
                            const diff = differenceInMinutes(aptDateTime, now);
                            const timeLabel = diff < 0 
                              ? `há ${Math.abs(diff)} min` 
                              : diff < 60 
                              ? `em ${diff} min`
                              : `em ${Math.floor(diff / 60)}h`;
                            
                            return (
                              <SelectItem key={apt.id} value={apt.id}>
                                <div className="flex flex-col">
                                  <span className="font-medium">
                                    {format(parseISO(apt.appointment_date), "dd/MM/yyyy 'às' ", { locale: ptBR })}
                                    {apt.start_time} ({timeLabel})
                                  </span>
                                  <span className="text-sm text-muted-foreground">
                                    {apt.services?.name} - {apt.employees?.name}
                                  </span>
                                </div>
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        Nenhum agendamento encontrado para este cliente
                      </p>
                    )
                  ) : (
                    // Se não tem cliente, botão para abrir modal de busca
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full justify-start"
                      onClick={() => setShowAppointmentModal(true)}
                    >
                      <Search className="mr-2 h-4 w-4" />
                      Buscar agendamento
                    </Button>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Observações</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Observações sobre a comanda..."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Criando...' : 'Criar Comanda'}
              </Button>
            </div>
          </form>
        </Form>

        <AppointmentSelectorModal
          open={showAppointmentModal}
          onOpenChange={setShowAppointmentModal}
          appointments={appointments}
          onSelect={(appointmentId) => {
            form.setValue('appointment_id', appointmentId);
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
