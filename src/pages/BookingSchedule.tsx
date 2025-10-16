import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { supabasePublic } from '@/integrations/supabase/publicClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import { format, addDays, startOfToday, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import { useNativeClientAuth } from '@/hooks/useNativeClientAuth';
import BookingHeader from '@/components/BookingHeader';
import { CalendarIcon } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';

type TimeSlot = {
  time: string;
  employeeId?: string;
  employeeName?: string;
};

export default function BookingSchedule() {
  const { barbershopSlug } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(startOfToday());
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);

  const { service, barbershop, employee } = location.state || {};
  
  // Get barbershop ID for auth
  const [currentBarbershopId, setCurrentBarbershopId] = useState(barbershop?.id);
  const { clientProfile, isAuthenticated, logout } = useNativeClientAuth(currentBarbershopId);

  // Redirect if missing data
  useEffect(() => {
    if (!service || !barbershop) {
      navigate(`/booking/${barbershopSlug}`);
    }
  }, [service, barbershop, barbershopSlug, navigate]);

  // Generate time slots based on business hours and check availability
  const generateAvailableSlots = async (date: Date) => {
    if (!service || !barbershop) return [];

    const dayOfWeek = date.getDay();
    const dateStr = format(date, 'yyyy-MM-dd');
    const isToday = isSameDay(date, new Date());
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    // Add 30-minute buffer for client to arrive
    const minAvailableMinutes = isToday ? (currentHour * 60 + currentMinute + 30) : 0;
    
    try {
      let employees = [];
      
      if (employee) {
        // Specific employee selected
        employees = [employee];
      } else {
        // Get all employees who can perform this service
        const { data: employeeServices, error } = await supabasePublic
          .from('employee_services')
          .select(`
            employees!inner (
              id,
              name,
              status
            )
          `)
          .eq('service_id', service.id);

        if (error) throw error;

        employees = employeeServices
          ?.map(es => es.employees)
          ?.filter(emp => emp?.status === 'active') || [];
      }

      const allSlots = new Map<string, TimeSlot>();

      // For each employee, get their schedule and available slots
      for (const emp of employees) {
        // Get employee schedule for this day
        const { data: schedule } = await supabasePublic
          .from('employee_schedules')
          .select('*')
          .eq('employee_id', emp.id)
          .eq('day_of_week', dayOfWeek)
          .eq('is_active', true)
          .single();

        if (!schedule) continue;

        // Get existing appointments for this employee on this date using secure function
        const { data: appointments } = await supabasePublic
          .rpc('get_appointment_availability', {
            p_barbershop_id: barbershop.id,
            p_employee_id: emp.id,
            p_date: dateStr
          });

        // Generate 10-minute slots with fixed intervals (00, 10, 20, 30, 40, 50)
        const [startHour, startMinute] = schedule.start_time.split(':').map(Number);
        const [endHour, endMinute] = schedule.end_time.split(':').map(Number);
        
        const startTotalMinutes = startHour * 60 + startMinute;
        const endTotalMinutes = endHour * 60 + endMinute;
        
        // Start from the first fixed 10-minute interval at or after the schedule start time
        const firstSlotMinute = Math.ceil(startTotalMinutes / 10) * 10;
        
        for (let currentMinutes = firstSlotMinute; currentMinutes <= endTotalMinutes - service.duration_minutes; currentMinutes += 10) {
          const slotStartHour = Math.floor(currentMinutes / 60);
          const slotStartMinute = currentMinutes % 60;
          const slotEndMinutes = currentMinutes + service.duration_minutes;
          
          // Skip past time slots on current day
          if (isToday && currentMinutes < minAvailableMinutes) {
            continue;
          }
          
          const timeStr = `${slotStartHour.toString().padStart(2, '0')}:${slotStartMinute.toString().padStart(2, '0')}`;
          
          // Check if this slot conflicts with existing appointments
          const hasConflict = appointments?.some(apt => {
            // Parse appointment times - removing seconds if present
            const aptStartTime = apt.start_time.includes('.') ? apt.start_time.split('.')[0] : apt.start_time;
            const aptEndTime = apt.end_time.includes('.') ? apt.end_time.split('.')[0] : apt.end_time;
            
            const aptStartMinutes = aptStartTime.split(':').slice(0, 2).map(Number).reduce((h, m) => h * 60 + m);
            const aptEndMinutes = aptEndTime.split(':').slice(0, 2).map(Number).reduce((h, m) => h * 60 + m);
            
            // A slot conflicts if it overlaps with an existing appointment
            return currentMinutes < aptEndMinutes && slotEndMinutes > aptStartMinutes;
          });

          if (!hasConflict) {
            allSlots.set(timeStr, {
              time: timeStr,
              employeeId: emp.id,
              employeeName: emp.name,
            });
          }
        }
      }

      // Convert to array and sort by time
      return Array.from(allSlots.values()).sort((a, b) => a.time.localeCompare(b.time));
    } catch (error) {
      console.error('Error generating slots:', error);
      return [];
    }
  };

  // Load slots when date changes
  useEffect(() => {
    const loadSlots = async () => {
      if (!selectedDate) return;
      
      setLoading(true);
      setSelectedSlot(null);
      
      const slots = await generateAvailableSlots(selectedDate);
      setAvailableSlots(slots);
      setLoading(false);
    };

    loadSlots();
  }, [selectedDate, service, employee]);

  const handleDateSelect = (date: Date | undefined) => {
    setSelectedDate(date);
    setCalendarOpen(false);
  };

  const handleSlotSelect = (time: string) => {
    setSelectedSlot(selectedSlot === time ? null : time);
  };

  const handleContinue = () => {
    if (!selectedSlot || !selectedDate) return;

    const slot = availableSlots.find(s => s.time === selectedSlot);
    const finalEmployee = employee || (slot ? { id: slot.employeeId, name: slot.employeeName } : null);

    // Calculate end time based on service duration
    const [hours, minutes] = selectedSlot.split(':').map(Number);
    const startMinutes = hours * 60 + minutes;
    const endMinutes = startMinutes + service.duration_minutes;
    const endHours = Math.floor(endMinutes / 60);
    const endMins = endMinutes % 60;
    const endTime = `${endHours.toString().padStart(2, '0')}:${endMins.toString().padStart(2, '0')}`;

    navigate(`/booking/${barbershopSlug}/confirm`, {
      state: { 
        service,
        barbershop,
        employee: finalEmployee,
        selectedDate,
        selectedSlot: {
          start_time: selectedSlot,
          end_time: endTime
        }
      }
    });
  };

  const today = startOfToday();
  const maxDate = addDays(today, 30);

  return (
    <div className="min-h-screen bg-background">
      <BookingHeader 
        barbershop={barbershop}
        clientProfile={clientProfile}
        isAuthenticated={isAuthenticated}
        onLogout={() => {
          logout();
          toast({
            title: 'Logout realizado',
            description: 'Você foi desconectado com sucesso.'
          });
        }}
      />
      
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Escolher Horário</h1>
          <p className="text-muted-foreground">
            Serviço: {service?.name} • 
            Profissional: {employee ? employee.name : 'Qualquer disponível'}
          </p>
        </div>

        <div className="max-w-4xl mx-auto">
          <div className="grid gap-8 md:grid-cols-2">
            {/* Calendar */}
            <Card>
              <CardHeader>
                <CardTitle>Escolha a data</CardTitle>
              </CardHeader>
              <CardContent>
                <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !selectedDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {selectedDate ? format(selectedDate, 'dd/MM/yyyy', { locale: ptBR }) : "Selecione uma data"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={handleDateSelect}
                      disabled={(date) => date < today || date > maxDate}
                      locale={ptBR}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </CardContent>
            </Card>

            {/* Time Slots */}
            <Card>
              <CardHeader>
                <CardTitle>
                  Horários disponíveis
                  {selectedDate && (
                    <Badge variant="outline" className="ml-2">
                      {format(selectedDate, 'dd/MM/yyyy', { locale: ptBR })}
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {!selectedDate ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">Selecione uma data primeiro</p>
                  </div>
                ) : loading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto mb-2"></div>
                    <p className="text-muted-foreground text-sm">Carregando horários...</p>
                  </div>
                ) : availableSlots.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">
                      Não há horários disponíveis neste dia. Tente escolher outra data.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-2 max-h-96 overflow-y-auto">
                    {availableSlots.map((slot) => (
                      <Button
                        key={slot.time}
                        variant={selectedSlot === slot.time ? "default" : "outline"}
                        className="text-sm"
                        onClick={() => handleSlotSelect(slot.time)}
                      >
                        {slot.time}
                      </Button>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {selectedSlot && selectedDate && (
            <div className="mt-8 text-center">
              <Button onClick={handleContinue} size="lg">
                Continuar com {format(selectedDate, 'dd/MM', { locale: ptBR })} às {selectedSlot}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}