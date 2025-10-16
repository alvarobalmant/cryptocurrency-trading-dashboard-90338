import { useState, useEffect } from 'react';
import { format, startOfDay, endOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Calendar, 
  Clock, 
  User, 
  Phone, 
  DollarSign, 
  CalendarDays,
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

interface AvailableSlot {
  time: string;
}

interface Props {
  employeeId: string;
  employeeName: string;
  onViewAllAppointments: () => void;
}

export default function TodayAppointments({ employeeId, employeeName, onViewAllAppointments }: Props) {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [availableSlots, setAvailableSlots] = useState<AvailableSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const today = new Date();
  const todayStr = format(today, 'yyyy-MM-dd');
  const dayOfWeek = today.getDay();

  useEffect(() => {
    const fetchTodayData = async () => {
      setLoading(true);
      try {
        // Fetch today's appointments
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
          .eq('appointment_date', todayStr)
          .order('start_time');

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

        // Fetch employee's schedule for today
        const { data: schedule } = await supabase
          .from('employee_schedules')
          .select('*')
          .eq('employee_id', employeeId)
          .eq('day_of_week', dayOfWeek)
          .eq('is_active', true)
          .single();

        if (schedule) {
          // Generate available slots for remaining time today
          const slots = generateAvailableSlots(schedule, appointmentsWithServices);
          setAvailableSlots(slots);
        }

      } catch (error) {
        console.error('Error fetching today data:', error);
        toast({
          title: 'Erro',
          description: 'Não foi possível carregar os agendamentos de hoje.',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    fetchTodayData();
  }, [employeeId, todayStr, dayOfWeek, toast]);

  const generateAvailableSlots = (schedule: any, existingAppointments: Appointment[]) => {
    const slots: AvailableSlot[] = [];
    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();
    
    const [startHour, startMinute] = schedule.start_time.split(':').map(Number);
    const [endHour, endMinute] = schedule.end_time.split(':').map(Number);
    
    const startTotalMinutes = Math.max(startHour * 60 + startMinute, currentTime);
    const endTotalMinutes = endHour * 60 + endMinute;
    
    // Start from the first fixed 10-minute interval at or after the current/start time
    const firstSlotMinute = Math.ceil(startTotalMinutes / 10) * 10;
    
    // Generate 10-minute slots for remaining time with fixed intervals (00, 10, 20, 30, 40, 50)
    for (let currentMinutes = firstSlotMinute; currentMinutes < endTotalMinutes; currentMinutes += 10) {
      const slotHour = Math.floor(currentMinutes / 60);
      const slotMinute = currentMinutes % 60;
      const timeStr = `${slotHour.toString().padStart(2, '0')}:${slotMinute.toString().padStart(2, '0')}`;
      
      // Check if this slot conflicts with existing appointments
      const hasConflict = existingAppointments.some(apt => {
        // Parse appointment times - removing seconds if present
        const aptStartTime = apt.start_time.includes('.') ? apt.start_time.split('.')[0] : apt.start_time;
        const aptEndTime = apt.end_time.includes('.') ? apt.end_time.split('.')[0] : apt.end_time;
        
        const aptStartMinutes = aptStartTime.split(':').slice(0, 2).map(Number).reduce((h, m) => h * 60 + m);
        const aptEndMinutes = aptEndTime.split(':').slice(0, 2).map(Number).reduce((h, m) => h * 60 + m);
        
        return currentMinutes >= aptStartMinutes && currentMinutes < aptEndMinutes;
      });

      if (!hasConflict) {
        slots.push({ time: timeStr });
      }
    }

    return slots;
  };

  const getTotalEarnings = () => {
    return appointments.reduce((total, appointment) => {
      return total + (appointment.services?.price || 0);
    }, 0);
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

  return (
    <div className="space-y-6">
      {/* Header with stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm font-medium">Agendamentos Hoje</p>
                <p className="text-2xl font-bold">{appointments.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm font-medium">Horários Disponíveis</p>
                <p className="text-2xl font-bold">{availableSlots.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm font-medium">Faturamento Hoje</p>
                <p className="text-2xl font-bold">R$ {getTotalEarnings().toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Today's appointments */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Agendamentos de Hoje - {format(today, 'dd/MM/yyyy', { locale: ptBR })}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {appointments.length === 0 ? (
            <div className="text-center py-8">
              <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Nenhum agendamento para hoje.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {appointments.map((appointment, index) => (
                <div key={appointment.id}>
                  <div className="flex items-start justify-between p-4 border rounded-lg">
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
                  {index < appointments.length - 1 && <Separator className="my-2" />}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Available slots */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Horários Disponíveis Restantes
          </CardTitle>
        </CardHeader>
        <CardContent>
          {availableSlots.length === 0 ? (
            <div className="text-center py-6">
              <Clock className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-muted-foreground">Não há mais horários disponíveis hoje.</p>
            </div>
          ) : (
            <div className="grid gap-2 grid-cols-6 md:grid-cols-8 lg:grid-cols-10">
              {availableSlots.map((slot, index) => (
                <Badge key={index} variant="outline" className="justify-center py-1">
                  {slot.time}
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* View all appointments button */}
      <div className="text-center">
        <Button onClick={onViewAllAppointments} variant="outline" size="lg">
          <CalendarDays className="h-4 w-4 mr-2" />
          Ver Todos os Agendamentos
        </Button>
      </div>
    </div>
  );
}