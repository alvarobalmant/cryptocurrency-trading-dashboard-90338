import React, { useState, useEffect } from 'react';
import { format, parse, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  Calendar, 
  Clock, 
  User, 
  Phone, 
  DollarSign, 
  Search,
  Filter,
  CalendarDays,
  TrendingUp,
  AlertCircle
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Appointment {
  id: string;
  client_name: string;
  client_phone: string;
  appointment_date: string;
  start_time: string;
  end_time: string;
  status: string;
  services: {
    id: string;
    name: string;
    price: number;
    duration_minutes: number;
  };
}

interface ModernAppointmentsProps {
  employeeId: string;
  employeeName: string;
}

type FilterPeriod = 'today' | 'week' | 'month' | 'all';

export default function ModernAppointments({ employeeId, employeeName }: ModernAppointmentsProps) {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [filteredAppointments, setFilteredAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPeriod, setFilterPeriod] = useState<FilterPeriod>('today');
  const { toast } = useToast();

  useEffect(() => {
    loadAppointments();
  }, [employeeId]);

  useEffect(() => {
    filterAppointments();
  }, [appointments, searchTerm, filterPeriod]);

  const loadAppointments = async () => {
    try {
      setLoading(true);

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
          service_id
        `)
        .eq('employee_id', employeeId)
        .order('appointment_date', { ascending: false })
        .order('start_time', { ascending: false });

      if (appointmentsError) throw appointmentsError;

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
      console.error('Erro ao carregar agendamentos:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os agendamentos.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const filterAppointments = () => {
    let filtered = [...appointments];

    // Filtro por período
    const today = new Date();
    const todayStr = format(today, 'yyyy-MM-dd');

    switch (filterPeriod) {
      case 'today':
        filtered = filtered.filter(apt => apt.appointment_date === todayStr);
        break;
      case 'week':
        const weekStart = format(startOfWeek(today), 'yyyy-MM-dd');
        const weekEnd = format(endOfWeek(today), 'yyyy-MM-dd');
        filtered = filtered.filter(apt => 
          apt.appointment_date >= weekStart && apt.appointment_date <= weekEnd
        );
        break;
      case 'month':
        const monthStart = format(startOfMonth(today), 'yyyy-MM-dd');
        const monthEnd = format(endOfMonth(today), 'yyyy-MM-dd');
        filtered = filtered.filter(apt => 
          apt.appointment_date >= monthStart && apt.appointment_date <= monthEnd
        );
        break;
      case 'all':
      default:
        // Não filtra por período
        break;
    }

    // Filtro por busca
    if (searchTerm) {
      filtered = filtered.filter(apt =>
        apt.client_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        apt.client_phone.includes(searchTerm) ||
        apt.services.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredAppointments(filtered);
  };

  const groupAppointmentsByDate = () => {
    const grouped: { [key: string]: Appointment[] } = {};
    
    filteredAppointments.forEach(appointment => {
      const dateKey = appointment.appointment_date;
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(appointment);
    });

    Object.keys(grouped).forEach(date => {
      grouped[date].sort((a, b) => a.start_time.localeCompare(b.start_time));
    });

    return grouped;
  };

  const getTotalEarnings = () => {
    return filteredAppointments.reduce((total, appointment) => {
      return total + (appointment.services?.price || 0);
    }, 0);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'cancelled':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'no_show':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'Feito';
      case 'pending':
        return 'Marcado';
      case 'cancelled':
        return 'Cancelado';
      case 'no_show':
        return 'Cliente não apareceu';
      default:
        return status;
    }
  };

  const filterButtons = [
    { id: 'today' as FilterPeriod, label: 'Hoje', icon: Calendar },
    { id: 'week' as FilterPeriod, label: 'Esta Semana', icon: CalendarDays },
    { id: 'month' as FilterPeriod, label: 'Este Mês', icon: TrendingUp },
    { id: 'all' as FilterPeriod, label: 'Todos', icon: Filter },
  ];

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-20 bg-slate-200 rounded-xl animate-pulse" />
        <div className="grid gap-4 md:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-24 bg-slate-200 rounded-xl animate-pulse" />
          ))}
        </div>
        <div className="h-64 bg-slate-200 rounded-xl animate-pulse" />
      </div>
    );
  }

  const groupedAppointments = groupAppointmentsByDate();

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-2xl p-8 text-white">
        <h1 className="text-3xl font-bold mb-2">Agendamentos</h1>
        <p className="text-blue-100 text-lg">
          Gerencie todos os seus agendamentos de forma organizada
        </p>
      </div>

      {/* Filtros e Busca */}
      <Card className="shadow-lg border-0">
        <CardContent className="p-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
            {/* Filtros de Período */}
            <div className="flex flex-wrap gap-2">
              {filterButtons.map((button) => {
                const Icon = button.icon;
                return (
                  <Button
                    key={button.id}
                    variant={filterPeriod === button.id ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFilterPeriod(button.id)}
                    className="flex items-center space-x-2"
                  >
                    <Icon className="w-4 h-4" />
                    <span>{button.label}</span>
                  </Button>
                );
              })}
            </div>

            {/* Busca */}
            <div className="relative w-full lg:w-80">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
              <Input
                placeholder="Buscar por cliente, telefone ou serviço..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Estatísticas */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card className="shadow-lg border-0 bg-gradient-to-br from-green-500 to-green-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-sm font-medium">Total de Agendamentos</p>
                <p className="text-3xl font-bold">{filteredAppointments.length}</p>
              </div>
              <CalendarDays className="w-8 h-8 text-green-200" />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-lg border-0 bg-gradient-to-br from-blue-500 to-blue-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm font-medium">Faturamento Total</p>
                <p className="text-3xl font-bold">R$ {getTotalEarnings().toFixed(2)}</p>
              </div>
              <DollarSign className="w-8 h-8 text-blue-200" />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-lg border-0 bg-gradient-to-br from-purple-500 to-purple-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-sm font-medium">Ticket Médio</p>
                <p className="text-3xl font-bold">
                  R$ {filteredAppointments.length > 0 ? (getTotalEarnings() / filteredAppointments.length).toFixed(2) : '0.00'}
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-purple-200" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lista de Agendamentos */}
      {Object.keys(groupedAppointments).length === 0 ? (
        <Card className="shadow-lg border-0">
          <CardContent className="text-center py-12">
            <AlertCircle className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-900 mb-2">Nenhum agendamento encontrado</h3>
            <p className="text-slate-500">
              {searchTerm 
                ? 'Tente ajustar os filtros ou termo de busca.' 
                : 'Não há agendamentos para o período selecionado.'
              }
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedAppointments).map(([date, dayAppointments]) => (
            <Card key={date} className="shadow-lg border-0">
              <CardHeader className="bg-slate-50 border-b">
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Calendar className="w-5 h-5 text-primary-600" />
                    <span className="text-lg">
                      {format(parse(date, 'yyyy-MM-dd', new Date()), 'dd/MM/yyyy - EEEE', { locale: ptBR })}
                    </span>
                  </div>
                  <Badge variant="outline" className="bg-white">
                    {dayAppointments.length} agendamento{dayAppointments.length !== 1 ? 's' : ''}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  {dayAppointments.map((appointment) => (
                    <div 
                      key={appointment.id} 
                      className="bg-white border border-slate-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                            <User className="w-5 h-5 text-primary-600" />
                          </div>
                          <div>
                            <h4 className="font-medium text-slate-900">{appointment.client_name}</h4>
                            <p className="text-sm text-slate-500 flex items-center">
                              <Phone className="w-3 h-3 mr-1" />
                              {appointment.client_phone}
                            </p>
                          </div>
                        </div>
                        
                        <Badge className={getStatusColor(appointment.status)}>
                          {getStatusLabel(appointment.status)}
                        </Badge>
                      </div>

                      <div className="grid gap-3 md:grid-cols-3">
                        <div className="flex items-center space-x-2 text-sm text-slate-600">
                          <Clock className="w-4 h-4" />
                          <span>{appointment.start_time} - {appointment.end_time}</span>
                        </div>
                        
                        <div className="flex items-center space-x-2 text-sm text-slate-600">
                          <span>✂️</span>
                          <span>{appointment.services?.name}</span>
                        </div>
                        
                        <div className="flex items-center space-x-2 text-sm font-medium text-green-600">
                          <DollarSign className="w-4 h-4" />
                          <span>R$ {appointment.services?.price?.toFixed(2) || '0,00'}</span>
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
