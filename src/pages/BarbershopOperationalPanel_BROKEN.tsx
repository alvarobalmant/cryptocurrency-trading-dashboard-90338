import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useBarbershops } from '@/hooks/useBarbershops';
import { useAppointments } from '@/hooks/useAppointments';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import PaymentPanel from '@/components/PaymentPanel';
import AgendaView from '@/components/AgendaView';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
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
  Sparkles,
  RefreshCw,
  Maximize,
  Minimize
} from 'lucide-react';

const BarbershopOperationalPanel = () => {
  const { barbershopId } = useParams();
  const { user, signOut } = useAuth();
  const { barbershops, loading } = useBarbershops();
  const { appointments, loading: appointmentsLoading, refetch } = useAppointments(barbershopId);
  const [currentBarbershop, setCurrentBarbershop] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [activeTab, setActiveTab] = useState('payments');
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && barbershops.length > 0 && barbershopId) {
      const barbershop = barbershops.find(b => b.id === barbershopId);
      setCurrentBarbershop(barbershop || null);
    }
  }, [loading, barbershops, barbershopId]);

  // Handle ESC key to exit fullscreen
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
      }
    };

    if (isFullscreen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isFullscreen]);

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
    <div className={`${isFullscreen ? 'fixed inset-0 z-50 bg-white' : 'min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50'}`}>
      {/* Header */}
      {!isFullscreen && (
        <div className="bg-white/80 backdrop-blur-sm border-b border-slate-200/60 shadow-sm sticky top-0 z-40">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16 lg:h-20">
              <div className="flex items-center gap-3 lg:gap-4 min-w-0 flex-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate('/barbershops')}
                  className="text-slate-600 hover:text-slate-800 hover:bg-slate-100 p-2 lg:p-3 flex-shrink-0"
                >
                  <ArrowLeft className="h-4 w-4 lg:h-5 lg:w-5" />
                </Button>
                
                <div className="w-10 h-10 lg:w-12 lg:h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center flex-shrink-0">
                  <Building2 className="h-5 w-5 lg:h-6 lg:w-6 text-white" />
                </div>
                
                <div className="min-w-0 flex-1">
                  <h1 className="text-lg lg:text-2xl font-bold text-slate-800 truncate">
                    Painel Operacional
                  </h1>
                  <p className="text-xs lg:text-sm text-slate-600 truncate">
                    Gerencie pagamentos e operações diárias de {currentBarbershop.name}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 lg:gap-3 flex-shrink-0">
                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 hidden sm:flex">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
                  Sistema ativo
                </Badge>
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => refetch()}
                  className="text-slate-600 hover:text-slate-800 hover:bg-slate-100 p-2 lg:p-3"
                >
                  <RefreshCw className="h-4 w-4 lg:h-5 lg:w-5" />
                </Button>
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={signOut}
                  className="text-slate-600 hover:text-slate-800 hover:bg-slate-100 p-2 lg:p-3"
                >
                  <LogOut className="h-4 w-4 lg:h-5 lg:w-5" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className={`${isFullscreen ? 'h-full' : 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8'}`}>
        {/* Quick Stats */}
        {!isFullscreen && (
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 lg:gap-6 mb-6 lg:mb-8">
            <div className="flex items-center gap-3 lg:gap-4 min-w-0 flex-1">
              <div className="w-12 h-12 lg:w-16 lg:h-16 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-2xl lg:rounded-3xl flex items-center justify-center flex-shrink-0">
                <Sparkles className="h-6 w-6 lg:h-8 lg:w-8 text-white" />
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-xl lg:text-3xl font-bold text-slate-800 truncate">
                  Olá, {user?.user_metadata?.full_name || 'Usuário'}! 👋
                </h2>
                <p className="text-sm lg:text-base text-slate-600 truncate">
                  Última atualização: hoje
                </p>
              </div>
            </div>
            
            <div className="w-full lg:w-auto">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 lg:min-w-fit">
                <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-shadow duration-200">
                  <CardContent className="p-3 lg:p-4 text-center">
                    <div className="w-8 h-8 lg:w-10 lg:h-10 bg-orange-100 rounded-xl flex items-center justify-center mx-auto mb-2">
                      <Clock className="h-4 w-4 lg:h-5 lg:w-5 text-orange-600" />
                    </div>
                    <p className="text-xl lg:text-2xl font-bold text-slate-800">{pendingAppointments}</p>
                    <p className="text-xs text-slate-600">Marcados</p>
                  </CardContent>
                </Card>
                
                <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-shadow duration-200">
                  <CardContent className="p-3 lg:p-4 text-center">
                    <div className="w-8 h-8 lg:w-10 lg:h-10 bg-blue-100 rounded-xl flex items-center justify-center mx-auto mb-2">
                      <Calendar className="h-4 w-4 lg:h-5 lg:w-5 text-blue-600" />
                    </div>
                    <p className="text-xl lg:text-2xl font-bold text-slate-800">{confirmedAppointments}</p>
                    <p className="text-xs text-slate-600">Feitos</p>
                  </CardContent>
                </Card>
                
                <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-shadow duration-200">
                  <CardContent className="p-3 lg:p-4 text-center">
                    <div className="w-8 h-8 lg:w-10 lg:h-10 bg-green-100 rounded-xl flex items-center justify-center mx-auto mb-2">
                      <CheckCircle2 className="h-4 w-4 lg:h-5 lg:w-5 text-green-600" />
                    </div>
                    <p className="text-xl lg:text-2xl font-bold text-slate-800">{completedAppointments}</p>
                    <p className="text-xs text-slate-600">Concluídos</p>
                  </CardContent>
                </Card>
                
                <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-shadow duration-200">
                  <CardContent className="p-3 lg:p-4 text-center">
                    <div className="w-8 h-8 lg:w-10 lg:h-10 bg-purple-100 rounded-xl flex items-center justify-center mx-auto mb-2">
                      <Users className="h-4 w-4 lg:h-5 lg:w-5 text-purple-600" />
                    </div>
                    <p className="text-xl lg:text-2xl font-bold text-slate-800">{todayAppointments.length}</p>
                    <p className="text-xs text-slate-600">Total Hoje</p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        )}

        {/* Main Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6 lg:space-y-8">
          {/* Show tabs only when not in fullscreen */}
          {!isFullscreen && (
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-2 border border-slate-200/60 shadow-lg">
              <div className="flex items-center justify-between">
                <TabsList className="grid grid-cols-3 bg-transparent gap-1 sm:gap-2 h-auto flex-1">
                  <TabsTrigger 
                    value="payments" 
                    className="flex items-center justify-center gap-1 sm:gap-2 lg:gap-3 data-[state=active]:bg-gradient-to-r data-[state=active]:from-green-500 data-[state=active]:to-emerald-600 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-200 rounded-xl py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm lg:text-base"
                  >
                    <CreditCard className="h-3 w-3 sm:h-4 sm:w-4 lg:h-5 lg:w-5 flex-shrink-0" />
                    <span className="font-medium truncate">Pagamentos</span>
                  </TabsTrigger>
                  <TabsTrigger 
                    value="agenda" 
                    className="flex items-center justify-center gap-1 sm:gap-2 lg:gap-3 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-600 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-200 rounded-xl py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm lg:text-base"
                  >
                    <Calendar className="h-3 w-3 sm:h-4 sm:w-4 lg:h-5 lg:w-5 flex-shrink-0" />
                    <span className="font-medium truncate">Agenda</span>
                  </TabsTrigger>
                  <TabsTrigger 
                    value="analytics" 
                    className="flex items-center justify-center gap-1 sm:gap-2 lg:gap-3 data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500 data-[state=active]:to-red-600 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-200 rounded-xl py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm lg:text-base"
                  >
                    <BarChart3 className="h-3 w-3 sm:h-4 sm:w-4 lg:h-5 lg:w-5 flex-shrink-0" />
                    <span className="font-medium truncate">Análises</span>
                  </TabsTrigger>
                </TabsList>
                
                {/* Fullscreen button - only show when agenda tab is active */}
                {activeTab === 'agenda' && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setIsFullscreen(!isFullscreen)}
                    className="flex items-center gap-2 ml-2"
                    title={isFullscreen ? "Sair da tela cheia" : "Tela cheia"}
                  >
                    {isFullscreen ? (
                      <Minimize className="h-4 w-4" />
                    ) : (
                      <Maximize className="h-4 w-4" />
                    )}
                    <span className="hidden sm:inline">
                      {isFullscreen ? "Sair" : "Tela cheia"}
                    </span>
                  </Button>
                )}
              </div>
            </div>
          )}
          
          {/* Fullscreen exit button - only show when in fullscreen */}
          {isFullscreen && (
            <div className="fixed top-4 right-4 z-50">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setIsFullscreen(false)}
                className="flex items-center gap-2 bg-white shadow-lg border-gray-300"
                title="Sair da tela cheia"
              >
                <Minimize className="h-4 w-4" />
                <span>Sair</span>
              </Button>
            </div>
          )}

          <TabsContent value="payments" className="space-y-6">
            <PaymentPanel
              barbershop={currentBarbershop}
              appointments={appointments}
              onPaymentCreated={handlePaymentCreated}
            />
          </TabsContent>

          <TabsContent value="agenda" className={`${isFullscreen ? 'h-screen' : 'space-y-6'}`}>
            <div className={`${isFullscreen ? 'h-full bg-white' : 'bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200/60 shadow-lg overflow-hidden'}`}>
              <AgendaView
                barbershopId={barbershopId}
                appointments={appointments}
                onAppointmentCreate={refetch}
                onAppointmentUpdate={refetch}
              />
            </div>
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
                  <h3 className="text-xl font-semibold text-slate-800 mb-4">Análises em Desenvolvimento</h3>
                  <p className="text-slate-600 max-w-md mx-auto">
                    Em breve você terá acesso a relatórios detalhados, gráficos de performance e métricas avançadas de pagamentos.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default BarbershopOperationalPanel;