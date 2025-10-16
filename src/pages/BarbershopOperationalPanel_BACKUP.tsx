import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useBarbershops } from '@/hooks/useBarbershops';
import { useAppointments } from '@/hooks/useAppointments';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import PaymentPanel from '@/components/PaymentPanel';
import { useToast } from '@/hooks/use-toast';
import { 
  Scissors, 
  LogOut, 
  ArrowLeft, 
  CreditCard, 
  Calendar, 
  BarChart3, 
  Building2,
  Clock,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  DollarSign,
  Users,
  Activity,
  Sparkles
} from 'lucide-react';

const BarbershopOperationalPanel = () => {
  const { barbershopId } = useParams();
  const { user, signOut } = useAuth();
  const { barbershops, loading } = useBarbershops();
  const { appointments, loading: appointmentsLoading, refetch } = useAppointments(barbershopId);
  const [currentBarbershop, setCurrentBarbershop] = useState(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && barbershops.length > 0 && barbershopId) {
      const barbershop = barbershops.find(b => b.id === barbershopId);
      setCurrentBarbershop(barbershop || null);
    }
  }, [loading, barbershops, barbershopId]);

  const handlePaymentCreated = () => {
    refetch();
    toast({
      title: 'Pagamento criado!',
      description: 'O link de pagamento foi aberto em uma nova aba.',
    });
  };

  if (loading || appointmentsLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <div className="text-center">
          <div className="relative">
            <div className="w-16 h-16 mx-auto mb-6 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center">
              <Scissors className="h-8 w-8 text-white animate-pulse" />
            </div>
            <div className="absolute inset-0 w-16 h-16 mx-auto bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl animate-ping opacity-20"></div>
          </div>
          <p className="text-slate-600 font-medium">Carregando painel operacional...</p>
        </div>
      </div>
    );
  }

  if (!currentBarbershop) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <div className="text-center">
          <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-r from-red-500 to-orange-600 rounded-2xl flex items-center justify-center">
            <AlertCircle className="h-10 w-10 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-slate-800 mb-4">Barbearia não encontrada</h2>
          <p className="text-slate-600 mb-6">Esta barbearia não existe ou você não tem acesso a ela.</p>
          <Button 
            onClick={() => navigate('/barbershops')}
            className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar para Minhas Barbearias
          </Button>
        </div>
      </div>
    );
  }

  // Get today's appointments
  const today = new Date().toISOString().split('T')[0];
  const todayAppointments = appointments.filter(apt => 
    apt.appointment_date === today
  );

  // Calculate quick stats
  const pendingAppointments = todayAppointments.filter(apt => apt.status === 'pending').length;
  const confirmedAppointments = todayAppointments.filter(apt => apt.status === 'confirmed').length;
  const completedAppointments = todayAppointments.filter(apt => apt.status === 'completed').length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Modern Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-slate-200/60 sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/barbershops')}
                className="text-slate-600 hover:text-slate-800 hover:bg-slate-100"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Voltar
              </Button>
              
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                  <Scissors className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
                    BarberHive
                  </h1>
                  <p className="text-xs text-slate-500">Painel Operacional</p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="hidden sm:flex items-center gap-3 px-3 py-2 bg-slate-100 rounded-lg">
                <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-medium">
                    {(user?.user_metadata?.full_name || user?.email || 'U').charAt(0).toUpperCase()}
                  </span>
                </div>
                <span className="text-sm text-slate-700 font-medium">
                  {user?.user_metadata?.full_name || user?.email}
                </span>
              </div>
              
              <Button 
                variant="outline" 
                size="sm" 
                onClick={signOut}
                className="border-slate-200 text-slate-600 hover:bg-slate-50"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Sair
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-6 py-8">
        <div className="flex flex-col lg:flex-row items-start justify-between gap-8 mb-8">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center">
                <CreditCard className="h-6 w-6 text-white" />
              </div>
              <div>
                <h2 className="text-4xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
                  Painel Operacional
                </h2>
                <p className="text-slate-600 mt-2 text-lg">
                  Gerencie pagamentos e operações diárias de <span className="font-semibold text-slate-800">{currentBarbershop.name}</span>
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-6 mt-6">
              <div className="flex items-center gap-2 text-slate-600">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-sm font-medium">Sistema ativo</span>
              </div>
              <div className="flex items-center gap-2 text-slate-600">
                <Sparkles className="h-4 w-4 text-yellow-500" />
                <span className="text-sm font-medium">Última atualização: hoje</span>
              </div>
            </div>
          </div>
          
          {/* Quick Stats Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 min-w-fit">
            <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
              <CardContent className="p-4 text-center">
                <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center mx-auto mb-2">
                  <Clock className="h-5 w-5 text-orange-600" />
                </div>
                <p className="text-2xl font-bold text-slate-800">{pendingAppointments}</p>
                <p className="text-xs text-slate-600">Pendentes</p>
              </CardContent>
            </Card>
            
            <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
              <CardContent className="p-4 text-center">
                <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center mx-auto mb-2">
                  <Calendar className="h-5 w-5 text-blue-600" />
                </div>
                <p className="text-2xl font-bold text-slate-800">{confirmedAppointments}</p>
                <p className="text-xs text-slate-600">Confirmados</p>
              </CardContent>
            </Card>
            
            <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
              <CardContent className="p-4 text-center">
                <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center mx-auto mb-2">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                </div>
                <p className="text-2xl font-bold text-slate-800">{completedAppointments}</p>
                <p className="text-xs text-slate-600">Concluídos</p>
              </CardContent>
            </Card>
            
            <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
              <CardContent className="p-4 text-center">
                <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center mx-auto mb-2">
                  <Users className="h-5 w-5 text-purple-600" />
                </div>
                <p className="text-2xl font-bold text-slate-800">{todayAppointments.length}</p>
                <p className="text-xs text-slate-600">Total Hoje</p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Main Tabs */}
        <Tabs defaultValue="payments" className="space-y-8">
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-2 border border-slate-200/60 shadow-lg">
            <TabsList className="grid w-full grid-cols-3 bg-transparent gap-2">
              <TabsTrigger 
                value="payments" 
                className="flex items-center gap-3 data-[state=active]:bg-gradient-to-r data-[state=active]:from-green-500 data-[state=active]:to-emerald-600 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-200 rounded-xl py-3"
              >
                <CreditCard className="h-5 w-5" />
                <span className="font-medium">Pagamentos</span>
              </TabsTrigger>
              <TabsTrigger 
                value="appointments" 
                className="flex items-center gap-3 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-600 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-200 rounded-xl py-3"
              >
                <Calendar className="h-5 w-5" />
                <span className="font-medium">Agendamentos Hoje</span>
              </TabsTrigger>
              <TabsTrigger 
                value="analytics" 
                className="flex items-center gap-3 data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500 data-[state=active]:to-red-600 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-200 rounded-xl py-3"
              >
                <BarChart3 className="h-5 w-5" />
                <span className="font-medium">Análises</span>
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="payments" className="space-y-6">
            <PaymentPanel
              barbershop={currentBarbershop}
              appointments={appointments}
              onPaymentCreated={handlePaymentCreated}
            />
          </TabsContent>

          <TabsContent value="appointments" className="space-y-6">
            <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center">
                      <Calendar className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-xl font-bold text-slate-800">
                        Agendamentos de Hoje
                      </CardTitle>
                      <CardDescription className="text-slate-600">
                        {todayAppointments.length} agendamentos para {new Date().toLocaleDateString('pt-BR', { 
                          weekday: 'long', 
                          year: 'numeric', 
                          month: 'long', 
                          day: 'numeric' 
                        })}
                      </CardDescription>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                      <Activity className="h-3 w-3 mr-1" />
                      {todayAppointments.length} total
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {todayAppointments.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-r from-slate-200 to-slate-300 rounded-3xl flex items-center justify-center">
                        <Calendar className="h-10 w-10 text-slate-400" />
                      </div>
                      <h3 className="text-xl font-semibold text-slate-800 mb-2">Nenhum agendamento para hoje</h3>
                      <p className="text-slate-600 max-w-md mx-auto">
                        Aproveite este tempo livre para organizar a barbearia ou planejar estratégias de marketing.
                      </p>
                    </div>
                  ) : (
                    <div className="grid gap-4">
                      {todayAppointments.map((appointment) => (
                        <Card key={appointment.id} className="border border-slate-200 hover:shadow-md transition-shadow duration-200">
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                              <div className="space-y-2">
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                                    <span className="text-white text-sm font-medium">
                                      {appointment.client_name.charAt(0).toUpperCase()}
                                    </span>
                                  </div>
                                  <div>
                                    <p className="font-semibold text-slate-800">{appointment.client_name}</p>
                                    <p className="text-sm text-slate-600">{appointment.client_phone}</p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-4 text-sm text-slate-600">
                                  <span className="flex items-center gap-1">
                                    <Clock className="h-4 w-4" />
                                    {appointment.start_time}
                                  </span>
                                  {appointment.services && (
                                    <span className="flex items-center gap-1">
                                      <Scissors className="h-4 w-4" />
                                      {appointment.services.name}
                                    </span>
                                  )}
                                  {appointment.employees && (
                                    <span className="flex items-center gap-1">
                                      <Users className="h-4 w-4" />
                                      {appointment.employees.name}
                                    </span>
                                  )}
                                </div>
                              </div>
                              
                              <div className="flex items-center gap-3">
                                {appointment.services?.price && (
                                  <div className="text-right">
                                    <p className="text-lg font-bold text-green-600">
                                      R$ {Number(appointment.services.price).toFixed(2)}
                                    </p>
                                  </div>
                                )}
                                <Badge 
                                  variant={
                                    appointment.status === 'confirmed' ? 'default' : 
                                    appointment.status === 'completed' ? 'secondary' : 
                                    'outline'
                                  }
                                  className={
                                    appointment.status === 'confirmed' ? 'bg-blue-100 text-blue-800 border-blue-200' :
                                    appointment.status === 'completed' ? 'bg-green-100 text-green-800 border-green-200' :
                                    appointment.status === 'pending' ? 'bg-orange-100 text-orange-800 border-orange-200' :
                                    'bg-gray-100 text-gray-800 border-gray-200'
                                  }
                                >
                                  {appointment.status === 'confirmed' && <CheckCircle2 className="h-3 w-3 mr-1" />}
                                  {appointment.status === 'pending' && <Clock className="h-3 w-3 mr-1" />}
                                  {appointment.status === 'completed' && <CheckCircle2 className="h-3 w-3 mr-1" />}
                                  {appointment.status}
                                </Badge>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
              <CardHeader className="pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-r from-orange-500 to-red-600 rounded-2xl flex items-center justify-center">
                    <BarChart3 className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-xl font-bold text-slate-800">
                      Análises de Pagamento
                    </CardTitle>
                    <CardDescription className="text-slate-600">
                      Relatórios e métricas de pagamentos (em desenvolvimento)
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="text-center py-12">
                  <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-r from-orange-100 to-red-100 rounded-3xl flex items-center justify-center">
                    <TrendingUp className="h-10 w-10 text-orange-600" />
                  </div>
                  <h3 className="text-xl font-semibold text-slate-800 mb-2">Análises detalhadas em breve!</h3>
                  <p className="text-slate-600 max-w-2xl mx-auto mb-6">
                    Aqui você poderá ver métricas de receita, métodos de pagamento preferidos, 
                    comissões de funcionários, tendências de crescimento e muito mais.
                  </p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8 max-w-2xl mx-auto">
                    <div className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl border border-blue-200">
                      <DollarSign className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                      <p className="text-sm font-medium text-blue-800">Receita Total</p>
                      <p className="text-xs text-blue-600">Acompanhe ganhos diários</p>
                    </div>
                    
                    <div className="p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-xl border border-green-200">
                      <TrendingUp className="h-8 w-8 text-green-600 mx-auto mb-2" />
                      <p className="text-sm font-medium text-green-800">Crescimento</p>
                      <p className="text-xs text-green-600">Tendências mensais</p>
                    </div>
                    
                    <div className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl border border-purple-200">
                      <BarChart3 className="h-8 w-8 text-purple-600 mx-auto mb-2" />
                      <p className="text-sm font-medium text-purple-800">Relatórios</p>
                      <p className="text-xs text-purple-600">Análises detalhadas</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </section>
    </div>
  );
};

export default BarbershopOperationalPanel;
