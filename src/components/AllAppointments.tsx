import { useState, useEffect } from 'react';
import { format, parse } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Calendar, 
  Clock, 
  User, 
  Phone, 
  DollarSign, 
  ArrowLeft,
  AlertCircle 
} from 'lucide-react';
import { PaymentStatusBadge } from '@/utils/paymentStatus';
import { useToast } from '@/hooks/use-toast';

interface Appointment {
  id: string;
  client_name: string;
  client_phone: string;
  appointment_date: string;
  start_time: string;
  end_time: string;
  status: string;
  payment_status?: string;
  payment_method?: string;
  is_subscription_appointment?: boolean;
  services: {
    id: string;
    name: string;
    price: number;
    duration_minutes: number;
  };
}

interface Props {
  employeeId: string;
  employeeName: string;
  onBack: () => void;
}

export default function AllAppointments({ employeeId, employeeName, onBack }: Props) {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const fetchAllAppointments = async () => {
      setLoading(true);
      try {
        // Fetch all appointments for this employee
        const { data: appointmentsData, error: appointmentsError } = await supabase
          .from('appointments')
          .select(`
            id,
            client_name,
            client_phone,
            appointment_date,
            start_time,
            end_time,
            status,
            payment_status,
            payment_method,
            service_id,
            is_subscription_appointment
          `)
          .eq('employee_id', employeeId)
          .order('appointment_date', { ascending: false })
          .order('start_time', { ascending: false });

        if (appointmentsError) throw appointmentsError;

        // Fetch service details for each appointment
        const appointmentsWithServices = await Promise.all(
          (appointmentsData || []).map(async (appointment) => {
            const { data: serviceData } = await supabase
              .from('services')
              .select('id, name, price, duration_minutes')
              .eq('id', appointment.service_id)
              .single();

            return {
              ...appointment,
              services: serviceData || { id: '', name: 'Serviço não encontrado', price: 0, duration_minutes: 0 }
            };
          })
        );

        setAppointments(appointmentsWithServices);

      } catch (error) {
        console.error('Error fetching all appointments:', error);
        toast({
          title: 'Erro',
          description: 'Não foi possível carregar os agendamentos.',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    fetchAllAppointments();
  }, [employeeId, toast]);

  const getTotalEarnings = () => {
    return appointments.reduce((total, appointment) => {
      return total + (appointment.services?.price || 0);
    }, 0);
  };

  const groupAppointmentsByDate = () => {
    const grouped: { [key: string]: Appointment[] } = {};
    
    appointments.forEach(appointment => {
      const dateKey = appointment.appointment_date;
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(appointment);
    });

    // Sort appointments within each date by start_time
    Object.keys(grouped).forEach(date => {
      grouped[date].sort((a, b) => a.start_time.localeCompare(b.start_time));
    });

    return grouped;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="flex items-center gap-2">
          <Calendar className="h-6 w-6 animate-pulse text-primary" />
          <p className="text-muted-foreground">Carregando agendamentos...</p>
        </div>
      </div>
    );
  }

  const groupedAppointments = groupAppointmentsByDate();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Todos os Agendamentos</h2>
          <p className="text-muted-foreground">
            Histórico completo de agendamentos de {employeeName}
          </p>
        </div>
        <Button onClick={onBack} variant="outline">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm font-medium">Total de Agendamentos</p>
                <p className="text-2xl font-bold">{appointments.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm font-medium">Faturamento Total</p>
                <p className="text-2xl font-bold">R$ {getTotalEarnings().toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Appointments by date */}
      {Object.keys(groupedAppointments).length === 0 ? (
        <Card>
          <CardContent className="text-center py-8">
            <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Nenhum agendamento encontrado.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedAppointments).map(([date, dayAppointments]) => (
            <Card key={date}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  {format(parse(date, 'yyyy-MM-dd', new Date()), 'dd/MM/yyyy - EEEE', { locale: ptBR })}
                  <Badge variant="outline">{dayAppointments.length} agendamento(s)</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {dayAppointments.map((appointment) => (
                    <div key={appointment.id} className="flex items-start justify-between p-4 border rounded-lg">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-4">
                          <Badge variant="outline" className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {appointment.start_time} - {appointment.end_time}
                          </Badge>
                          <div className="flex gap-1">
                            <Badge 
                              variant={appointment.status === 'confirmed' ? 'default' : 'secondary'}
                            >
                              {appointment.status === 'confirmed' ? 'Feito' : 
                               appointment.status === 'pending' ? 'Marcado' :
                               appointment.status === 'cancelled' ? 'Cancelado' :
                               appointment.status === 'no_show' ? 'Cliente não apareceu' : 
                               appointment.status}
                            </Badge>
                            <PaymentStatusBadge 
                              data={{
                                payment_status: appointment.payment_status,
                                payment_method: appointment.payment_method,
                                status: appointment.status,
                                is_subscription_appointment: appointment.is_subscription_appointment
                              }} 
                            />
                          </div>
                        </div>
                        
                        <div className="grid gap-2 md:grid-cols-2">
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">{appointment.client_name}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Phone className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">{appointment.client_phone}</span>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-4">
                          <span className="font-medium">{appointment.services?.name}</span>
                          <div className="flex items-center gap-1">
                            <DollarSign className="h-4 w-4 text-green-600" />
                            <span className="font-medium text-green-600">
                              R$ {appointment.services?.price?.toFixed(2) || '0,00'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}