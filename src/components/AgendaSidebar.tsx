import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  CalendarDays, 
  ChevronLeft, 
  ChevronRight, 
  Users, 
  Clock,
  TrendingUp,
  DollarSign,
  CheckCircle2,
  AlertCircle,
  Calendar
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isSameMonth, addMonths, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface AgendaSidebarProps {
  selectedDate: Date;
  onDateSelect: (date: Date) => void;
  appointments: any[];
  employees: any[];
  services: any[];
}

const AgendaSidebar: React.FC<AgendaSidebarProps> = ({
  selectedDate,
  onDateSelect,
  appointments,
  employees,
  services
}) => {
  const [currentMonth, setCurrentMonth] = useState(selectedDate);

  // Generate calendar days with empty cells for proper alignment
  const calendarDays = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    const monthDays = eachDayOfInterval({ start, end });

    // Empty cells at the beginning (based on first day of week)
    const startDayOfWeek = start.getDay(); // 0 = Sunday
    const emptyStartCells = Array(startDayOfWeek).fill(null);

    // Empty cells at the end (to complete the last week)
    const totalCells = emptyStartCells.length + monthDays.length;
    const remainingCells = totalCells % 7 === 0 ? 0 : 7 - (totalCells % 7);
    const emptyEndCells = Array(remainingCells).fill(null);

    return [...emptyStartCells, ...monthDays, ...emptyEndCells];
  }, [currentMonth]);

  // Get appointments for selected date
  const dayAppointments = useMemo(() => {
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    return appointments.filter(apt => apt.appointment_date === dateStr);
  }, [appointments, selectedDate]);

  // Calculate statistics
  const stats = useMemo(() => {
    const total = dayAppointments.length;
    const confirmed = dayAppointments.filter(apt => apt.status === 'confirmed').length;
    const pending = dayAppointments.filter(apt => apt.status === 'pending').length;
    const completed = dayAppointments.filter(apt => apt.status === 'completed').length;
    const cancelled = dayAppointments.filter(apt => apt.status === 'cancelled').length;

    // Calculate revenue
    const revenue = dayAppointments
      .filter(apt => apt.status === 'completed')
      .reduce((sum, apt) => {
        const service = services.find(s => s.id === apt.service_id);
        return sum + (service?.price || 0);
      }, 0);

    return { total, confirmed, pending, completed, cancelled, revenue };
  }, [dayAppointments, services]);

  // Get appointments count for each day in calendar
  const getAppointmentsForDate = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return appointments.filter(apt => apt.appointment_date === dateStr).length;
  };

  // Navigation functions
  const goToPreviousMonth = () => {
    setCurrentMonth(prev => subMonths(prev, 1));
  };

  const goToNextMonth = () => {
    setCurrentMonth(prev => addMonths(prev, 1));
  };

  // Active employees
  const activeEmployees = employees.filter(emp => emp.status === 'active');

  return (
    <div className="w-full lg:w-80 bg-white border-l-0 lg:border-l border-gray-200 p-4 lg:p-6 space-y-4 lg:space-y-6 overflow-y-auto max-h-full">
      {/* Calendar */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <CalendarDays className="h-4 w-4" />
              {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
            </CardTitle>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={goToPreviousMonth}
                className="h-6 w-6 p-0"
              >
                <ChevronLeft className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={goToNextMonth}
                className="h-6 w-6 p-0"
              >
                <ChevronRight className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Calendar Header */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((day, index) => (
              <div key={index} className="text-center text-xs font-medium text-gray-500 p-1">
                {day}
              </div>
            ))}
          </div>
          
          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((day, index) => {
              // Empty cell
              if (!day) {
                return <div key={`empty-${index}`} className="h-10" />;
              }

              const isSelected = isSameDay(day, selectedDate);
              const isToday = isSameDay(day, new Date());
              const appointmentCount = getAppointmentsForDate(day);
              const isCurrentMonth = isSameMonth(day, currentMonth);
              
              return (
                <button
                  key={day.toISOString()}
                  onClick={() => onDateSelect(day)}
                  disabled={!isCurrentMonth}
                  className={`
                    relative p-1 text-sm rounded hover:bg-blue-100 transition-colors min-h-[32px] flex flex-col items-center justify-center
                    ${isSelected ? 'bg-blue-600 text-white hover:bg-blue-700' : ''}
                    ${isToday && !isSelected ? 'bg-blue-100 text-blue-600 font-semibold' : ''}
                    ${!isCurrentMonth ? 'text-gray-300 cursor-not-allowed' : ''}
                  `}
                >
                  <span>{format(day, 'd')}</span>
                  {appointmentCount > 0 && isCurrentMonth && (
                    <div className={`
                      absolute -bottom-0.5 left-1/2 transform -translate-x-1/2 w-1 h-1 rounded-full
                      ${isSelected ? 'bg-white' : 'bg-blue-500'}
                    `} />
                  )}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Statistics */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">
            {format(selectedDate, "dd 'de' MMM", { locale: ptBR })}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Quick Stats */}
          <div className="grid grid-cols-2 gap-3">
            <div className="text-center p-3 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
              <div className="text-xs text-blue-600">Total</div>
            </div>
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{stats.confirmed}</div>
              <div className="text-xs text-green-600">Feitos</div>
            </div>
          </div>

          {/* Revenue */}
          {stats.revenue > 0 && (
            <div className="flex items-center justify-between p-3 bg-emerald-50 rounded-lg">
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-emerald-600" />
                <span className="text-sm font-medium text-emerald-800">Faturamento</span>
              </div>
              <span className="text-sm font-bold text-emerald-600">
                R$ {stats.revenue.toFixed(2)}
              </span>
            </div>
          )}

          {/* Status Breakdown */}
          <div className="space-y-2">
            {stats.pending > 0 && (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="h-3 w-3 text-yellow-500" />
                  <span className="text-xs text-gray-600">Marcados</span>
                </div>
                <Badge variant="outline" className="text-xs bg-yellow-50 text-yellow-700 border-yellow-200">
                  {stats.pending}
                </Badge>
              </div>
            )}
            
            {stats.completed > 0 && (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-3 w-3 text-green-500" />
                  <span className="text-xs text-gray-600">Concluídos</span>
                </div>
                <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                  {stats.completed}
                </Badge>
              </div>
            )}
            
            {stats.cancelled > 0 && (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-3 w-3 text-red-500" />
                  <span className="text-xs text-gray-600">Cancelados</span>
                </div>
                <Badge variant="outline" className="text-xs bg-red-50 text-red-700 border-red-200">
                  {stats.cancelled}
                </Badge>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Professionals */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Users className="h-4 w-4" />
            Profissionais
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {activeEmployees.map((employee) => {
              const employeeAppointments = dayAppointments.filter(apt => apt.employee_id === employee.id);
              const nextAppointment = employeeAppointments
                .filter(apt => apt.status !== 'cancelled')
                .sort((a, b) => a.start_time.localeCompare(b.start_time))
                .find(apt => {
                  const now = new Date();
                  const currentTime = format(now, 'HH:mm');
                  return apt.start_time > currentTime;
                });

              return (
                <div key={employee.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors">
                  <Avatar className="w-8 h-8">
                    <AvatarImage src={employee.avatar_url} />
                    <AvatarFallback className="bg-blue-500 text-white text-xs">
                      {employee.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="text-sm font-medium text-gray-900 truncate">
                        {employee.name}
                      </span>
                    </div>
                    {nextAppointment ? (
                      <div className="text-xs text-gray-500">
                        Próximo: {nextAppointment.start_time}
                      </div>
                    ) : (
                      <div className="text-xs text-gray-400">
                        Disponível
                      </div>
                    )}
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {employeeAppointments.length}
                  </Badge>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      {dayAppointments.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Atividade Recente
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {dayAppointments
                .sort((a, b) => b.start_time.localeCompare(a.start_time))
                .slice(0, 3)
                .map((appointment) => {
                  const service = services.find(s => s.id === appointment.service_id);
                  const employee = employees.find(e => e.id === appointment.employee_id);
                  
                  return (
                    <div key={appointment.id} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                      <Calendar className="h-3 w-3 text-gray-400 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium text-gray-900 truncate">
                          {appointment.client_name}
                        </div>
                        <div className="text-xs text-gray-500 truncate">
                          {service?.name} • {employee?.name}
                        </div>
                      </div>
                      <div className="text-xs text-gray-400 font-mono">
                        {appointment.start_time}
                      </div>
                    </div>
                  );
                })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AgendaSidebar;
