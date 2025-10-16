import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Calendar, 
  Clock, 
  DollarSign, 
  TrendingUp, 
  Users, 
  Star,
  Activity,
  ArrowRight,
  CalendarCheck,
  Timer
} from 'lucide-react';

interface Employee {
  id: string;
  name: string;
  email: string;
}

interface Barbershop {
  id: string;
  name: string;
}

interface Service {
  id: string;
  name: string;
  price: number;
  duration_minutes: number;
}

interface Appointment {
  id: string;
  client_name: string;
  client_phone: string;
  start_time: string;
  end_time: string;
  status: string;
  services: Service;
}

interface DashboardOverviewProps {
  employee: Employee;
  barbershop: Barbershop;
  employeeServices: string[];
  availableServices: Service[];
}

export default function DashboardOverview({ 
  employee, 
  barbershop, 
  employeeServices, 
  availableServices 
}: DashboardOverviewProps) {
  const [todayAppointments, setTodayAppointments] = useState<Appointment[]>([]);
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    todayEarnings: 0,
    totalAppointments: 0,
    availableHours: 0,
    completionRate: 0
  });

  const today = format(new Date(), 'yyyy-MM-dd');

  useEffect(() => {
    loadDashboardData();
  }, [employee.id]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);

      // Buscar agendamentos de hoje
      const { data: appointmentsData, error: appointmentsError } = await supabase
        .from('appointments')
        .select(`
          id,
          client_name,
          client_phone,
          start_time,
          end_time,
          status,
          service_id
        `)
        .eq('employee_id', employee.id)
        .eq('appointment_date', today)
        .order('start_time');

      if (appointmentsError) throw appointmentsError;

      // Buscar detalhes dos serviços
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

      setTodayAppointments(appointmentsWithServices);

      // Calcular estatísticas
      const todayEarnings = appointmentsWithServices.reduce((total, apt) => 
        total + (apt.services?.price || 0), 0
      );

      // Simular outros dados (em uma implementação real, viriam do backend)
      setStats({
        todayEarnings,
        totalAppointments: appointmentsWithServices.length,
        availableHours: 8, // Simulado
        completionRate: 95 // Simulado
      });

      // Simular horários disponíveis
      setAvailableSlots(['11:00', '11:10', '14:30', '15:00', '16:20', '17:00']);

    } catch (error) {
      console.error('Erro ao carregar dados do dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const MetricCard = ({ 
    title, 
    value, 
    icon: Icon, 
    gradient, 
    trend, 
    trendValue 
  }: {
    title: string;
    value: string | number;
    icon: React.ElementType;
    gradient: string;
    trend?: 'up' | 'down';
    trendValue?: string;
  }) => (
    <Card className="relative overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
      <div className={`absolute inset-0 bg-gradient-to-br ${gradient}`} />
      <CardContent className="relative p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-white/80 text-sm font-medium">{title}</p>
            <p className="text-2xl font-bold mt-1">{value}</p>
            {trend && trendValue && (
              <div className="flex items-center mt-2 text-white/90 text-xs">
                <TrendingUp className="w-3 h-3 mr-1" />
                <span>{trendValue}</span>
              </div>
            )}
          </div>
          <div className="text-white/80">
            <Icon className="w-8 h-8" />
          </div>
        </div>
        
        {/* Elemento decorativo */}
        <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/10 rounded-full" />
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 bg-slate-200 rounded-xl animate-pulse" />
          ))}
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="h-64 bg-slate-200 rounded-xl animate-pulse" />
          <div className="h-64 bg-slate-200 rounded-xl animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Saudação */}
      <div className="bg-blue-500 rounded-2xl p-8 text-white" style={{ background: 'linear-gradient(to right, #3b82f6, #2563eb)' }}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2 text-white">
              Olá, {employee.name.split(' ')[0]}! 👋
            </h1>
            <p className="text-blue-100 text-lg">
              Bem-vindo ao seu painel. Hoje é {format(new Date(), "dd 'de' MMMM", { locale: ptBR })}.
            </p>
          </div>
          <div className="hidden md:block">
            <div className="w-24 h-24 bg-white bg-opacity-10 rounded-full flex items-center justify-center">
              <Activity className="w-12 h-12 text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* Métricas Principais */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Agendamentos Hoje"
          value={stats.totalAppointments}
          icon={CalendarCheck}
          gradient="from-blue-500 to-blue-600"
          trend="up"
          trendValue="+12% vs ontem"
        />
        
        <MetricCard
          title="Faturamento Hoje"
          value={`R$ ${stats.todayEarnings.toFixed(2)}`}
          icon={DollarSign}
          gradient="from-green-500 to-green-600"
          trend="up"
          trendValue="+8% vs ontem"
        />
        
        <MetricCard
          title="Horários Disponíveis"
          value={availableSlots.length}
          icon={Clock}
          gradient="from-purple-500 to-purple-600"
        />
        
        <MetricCard
          title="Taxa de Conclusão"
          value={`${stats.completionRate}%`}
          icon={Star}
          gradient="from-orange-500 to-orange-600"
          trend="up"
          trendValue="+2% vs semana"
        />
      </div>

      {/* Conteúdo Principal */}
      <div className="grid gap-8 lg:grid-cols-2">
        {/* Próximos Agendamentos */}
        <Card className="shadow-lg border-0">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Calendar className="w-5 h-5 text-primary-600" />
                <span>Próximos Agendamentos</span>
              </div>
              <Button variant="ghost" size="sm">
                Ver todos
                <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {todayAppointments.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                <Calendar className="w-12 h-12 mx-auto mb-4 text-slate-300" />
                <p>Nenhum agendamento para hoje</p>
              </div>
            ) : (
              todayAppointments.slice(0, 3).map((appointment, index) => (
                <div key={appointment.id} className="relative">
                  {/* Linha da timeline */}
                  {index < todayAppointments.length - 1 && (
                    <div className="absolute left-6 top-12 w-0.5 h-16 bg-slate-200" />
                  )}
                  
                  <div className="flex items-start space-x-4">
                    <div className="flex-shrink-0 w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center">
                      <Clock className="w-5 h-5 text-primary-600" />
                    </div>
                    
                    <div className="flex-1 bg-slate-50 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-slate-900">{appointment.client_name}</span>
                        <Badge variant={appointment.status === 'confirmed' ? 'default' : 'secondary'}>
                          {appointment.status === 'confirmed' ? 'Feito' : 
                           appointment.status === 'pending' ? 'Marcado' :
                           appointment.status === 'cancelled' ? 'Cancelado' :
                           appointment.status === 'no_show' ? 'Cliente não apareceu' : 
                           appointment.status}
                        </Badge>
                      </div>
                      
                      <div className="text-sm text-slate-600 space-y-1">
                        <p className="flex items-center">
                          <Timer className="w-3 h-3 mr-1" />
                          {appointment.start_time} - {appointment.end_time}
                        </p>
                        <p className="flex items-center">
                          <span className="mr-1">✂️</span>
                          {appointment.services?.name}
                        </p>
                        <p className="flex items-center font-medium text-green-600">
                          <DollarSign className="w-3 h-3 mr-1" />
                          R$ {appointment.services?.price?.toFixed(2)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Horários Disponíveis e Estatísticas */}
        <div className="space-y-6">
          {/* Horários Disponíveis */}
          <Card className="shadow-lg border-0">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center space-x-2">
                <Clock className="w-5 h-5 text-green-600" />
                <span>Horários Livres Hoje</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {availableSlots.length === 0 ? (
                <div className="text-center py-6 text-slate-500">
                  <Clock className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                  <p className="text-sm">Não há horários disponíveis</p>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  {availableSlots.map((slot, index) => (
                    <Badge 
                      key={index} 
                      variant="outline" 
                      className="justify-center py-2 bg-green-50 text-green-700 border-green-200 hover:bg-green-100"
                    >
                      {slot}
                    </Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Resumo dos Serviços */}
          <Card className="shadow-lg border-0">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center space-x-2">
                <Users className="w-5 h-5 text-purple-600" />
                <span>Meus Serviços</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">Serviços Ativos</span>
                  <Badge variant="default">{employeeServices.length}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">Total Disponível</span>
                  <Badge variant="outline">{availableServices.length}</Badge>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-2">
                  <div 
                    className="bg-gradient-to-r from-primary-500 to-primary-600 h-2 rounded-full transition-all duration-300"
                    style={{ 
                      width: `${(employeeServices.length / availableServices.length) * 100}%` 
                    }}
                  />
                </div>
                <p className="text-xs text-slate-500 text-center">
                  {Math.round((employeeServices.length / availableServices.length) * 100)}% dos serviços ativados
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
