import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useBarbershops } from '@/hooks/useBarbershops';
import { useAppointments } from '@/hooks/useAppointments';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import PaymentPanel from '@/components/PaymentPanel';
import { useToast } from '@/hooks/use-toast';
import { getUserDisplayName } from '@/lib/utils';
import { 
  LogOut,
  ArrowLeft, 
  Building2,
  Clock,
  CheckCircle2,
  AlertCircle,
  Users,
  Activity,
  Sparkles,
  RefreshCw
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
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-3xl flex items-center justify-center mx-auto mb-4">
            <RefreshCw className="h-8 w-8 text-white animate-spin" />
          </div>
          <h2 className="text-xl font-semibold text-slate-800 mb-2">Carregando painel...</h2>
          <p className="text-slate-600">Aguarde enquanto carregamos suas informações</p>
        </div>
      </div>
    );
  }

  if (!currentBarbershop) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-r from-red-500 to-pink-600 rounded-3xl flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="h-8 w-8 text-white" />
          </div>
          <h2 className="text-xl font-semibold text-slate-800 mb-2">Barbearia não encontrada</h2>
          <p className="text-slate-600 mb-4">A barbearia solicitada não foi encontrada ou você não tem acesso a ela.</p>
          <Button onClick={() => navigate('/barbershops')} className="bg-blue-600 hover:bg-blue-700">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar para Barbearias
          </Button>
        </div>
      </div>
    );
  }

  // Get today's date in YYYY-MM-DD format
  const today = new Date().toISOString().split('T')[0];
  
  // Filter appointments for today
  const todayAppointments = appointments.filter(apt => 
    apt.appointment_date === today
  );

  // Calculate quick stats
  const pendingAppointments = todayAppointments.filter(apt => apt.status === 'pending').length;
  const confirmedAppointments = todayAppointments.filter(apt => apt.status === 'confirmed').length;
  const completedAppointments = todayAppointments.filter(apt => apt.status === 'completed').length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Header */}
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
                <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-green-50 rounded-xl border border-green-200">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-xs font-medium text-green-700">Sistema ativo</span>
                </div>
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => refetch()}
                  className="text-slate-600 hover:text-slate-800 hover:bg-slate-100 p-2 lg:p-3"
                  title="Atualizar dados"
                >
                  <RefreshCw className="h-4 w-4 lg:h-5 lg:w-5" />
                </Button>
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={signOut}
                  className="text-slate-600 hover:text-slate-800 hover:bg-slate-100 p-2 lg:p-3"
                  title="Sair"
                >
                  <LogOut className="h-4 w-4 lg:h-5 lg:w-5" />
                </Button>
              </div>
            </div>
          </div>
        </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
        {/* Quick Stats */}
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 lg:gap-6 mb-6 lg:mb-8">
            <div className="flex items-center gap-3 lg:gap-4 min-w-0 flex-1">
              <div className="w-12 h-12 lg:w-16 lg:h-16 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-2xl lg:rounded-3xl flex items-center justify-center flex-shrink-0">
                <Sparkles className="h-6 w-6 lg:h-8 lg:w-8 text-white" />
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-xl lg:text-3xl font-bold text-slate-800 truncate">
                  Olá, {getUserDisplayName(user)}! 👋
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
                    <p className="text-xs text-slate-600">Pendentes</p>
                  </CardContent>
                </Card>
                
                <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-shadow duration-200">
                  <CardContent className="p-3 lg:p-4 text-center">
                    <div className="w-8 h-8 lg:w-10 lg:h-10 bg-green-100 rounded-xl flex items-center justify-center mx-auto mb-2">
                      <CheckCircle2 className="h-4 w-4 lg:h-5 lg:w-5 text-green-600" />
                    </div>
                    <p className="text-xl lg:text-2xl font-bold text-slate-800">{confirmedAppointments}</p>
                    <p className="text-xs text-slate-600">Confirmados</p>
                  </CardContent>
                </Card>
                
                <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-shadow duration-200">
                  <CardContent className="p-3 lg:p-4 text-center">
                    <div className="w-8 h-8 lg:w-10 lg:h-10 bg-blue-100 rounded-xl flex items-center justify-center mx-auto mb-2">
                      <Activity className="h-4 w-4 lg:h-5 lg:w-5 text-blue-600" />
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

        {/* Payment Panel */}
        <div className="space-y-6">
          <PaymentPanel
            barbershop={currentBarbershop}
            appointments={appointments}
            onPaymentCreated={handlePaymentCreated}
          />
        </div>
      </div>
    </div>
  );
};

export default BarbershopOperationalPanel;
