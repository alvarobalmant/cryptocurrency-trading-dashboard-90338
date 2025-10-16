import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useServices } from '@/hooks/useServices';
import { useEmployees } from '@/hooks/useEmployees';
import { usePayments } from '@/hooks/usePayments';
import CreateWalkInPayment from '@/components/CreateWalkInPayment';
import { CreatePixPayment } from '@/components/CreatePixPayment';
import { CreatePointPayment } from '@/components/CreatePointPayment';
import { CreateSubscriptionPayment } from '@/components/CreateSubscriptionPayment';
import { PaymentHistoryDetailsModal } from '@/components/PaymentHistoryDetailsModal';
import { PaymentStatusBadge } from '@/utils/paymentStatus';
import { 
  CreditCard, 
  QrCode, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Wifi, 
  Eye, 
  Calendar, 
  DollarSign, 
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  Loader2,
  Scissors,
  User,
  Phone
} from 'lucide-react';

interface Appointment {
  id: string;
  client_name: string;
  client_phone: string;
  appointment_date: string;
  start_time: string;
  status: string;
  payment_status?: string;
  payment_method?: string;
  payment_link?: string;
  service_id: string;
  employee_id: string;
  services?: {
    name: string;
    price: number;
    id: string;
  };
  employees?: {
    name: string;
    id: string;
  };
}

interface PaymentPanelProps {
  barbershop: {
    id: string;
    name: string;
    mercadopago_enabled?: boolean;
  };
  appointments: Appointment[];
  onPaymentCreated: () => void;
}

const PaymentPanel = ({ barbershop, appointments, onPaymentCreated }: PaymentPanelProps) => {
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [currentTab, setCurrentTab] = useState('card');
  const [paymentDetailsOpen, setPaymentDetailsOpen] = useState(false);
  const [selectedPaymentDetails, setSelectedPaymentDetails] = useState<any>(null);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const { services } = useServices(barbershop.id);
  const { employees } = useEmployees(barbershop.id);
  const { payments, loading } = usePayments(barbershop.id);

  const findServiceById = (id?: string) => services?.find((s: any) => s.id === id);
  const findEmployeeById = (id?: string) => employees?.find((e: any) => e.id === id);

  // Calcular estatísticas de pagamentos
  const paymentStats = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const todayPayments = payments.filter(p => {
      const paymentDate = new Date(p.paid_at || p.created_at);
      paymentDate.setHours(0, 0, 0, 0);
      return paymentDate.getTime() === today.getTime();
    });

    const paidPayments = payments.filter(p => p.status === 'paid');
    const pendingPayments = payments.filter(p => p.status === 'pending');
    
    const totalRevenue = paidPayments.reduce((sum, p) => sum + (p.net_received_amount || p.amount), 0);
    const todayRevenue = todayPayments
      .filter(p => p.status === 'paid')
      .reduce((sum, p) => sum + (p.net_received_amount || p.amount), 0);

    return {
      total: payments.length,
      paid: paidPayments.length,
      pending: pendingPayments.length,
      totalRevenue,
      todayRevenue,
      todayCount: todayPayments.length
    };
  }, [payments]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusInfo = (status: string) => {
    const statusMap: Record<string, { label: string; color: string; icon: any }> = {
      paid: { label: 'Pago', color: 'bg-emerald-100 text-emerald-700 border-emerald-300', icon: CheckCircle2 },
      pending: { label: 'Pendente', color: 'bg-amber-100 text-amber-700 border-amber-300', icon: Clock },
      processing: { label: 'Processando', color: 'bg-blue-100 text-blue-700 border-blue-300', icon: Loader2 },
      failed: { label: 'Falhou', color: 'bg-red-100 text-red-700 border-red-300', icon: XCircle },
      cancelled: { label: 'Cancelado', color: 'bg-gray-100 text-gray-700 border-gray-300', icon: XCircle },
    };
    return statusMap[status] || statusMap.pending;
  };

  const getPaymentMethodInfo = (method?: string) => {
    const methodMap: Record<string, { label: string; icon: any; color: string }> = {
      credit_card: { label: 'Cartão de Crédito', icon: CreditCard, color: 'text-blue-600' },
      debit_card: { label: 'Cartão de Débito', icon: CreditCard, color: 'text-purple-600' },
      pix: { label: 'PIX', icon: QrCode, color: 'text-teal-600' },
      point: { label: 'Maquininha', icon: Wifi, color: 'text-indigo-600' },
    };
    return methodMap[method || ''] || { label: 'N/A', icon: DollarSign, color: 'text-gray-600' };
  };

  if (!barbershop.mercadopago_enabled) {
    return (
      <Card className="border-0 shadow-xl bg-gradient-to-br from-white to-blue-50">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg">
              <CreditCard className="h-7 w-7 text-white" />
            </div>
            <div>
              <CardTitle className="text-2xl font-bold text-slate-800">Painel de Pagamentos</CardTitle>
              <CardDescription className="text-slate-600 text-base">
                Configure o MercadoPago para aceitar pagamentos
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Alert className="border-amber-200 bg-gradient-to-r from-amber-50 to-yellow-50 shadow-md">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
            <AlertDescription className="text-amber-800 font-medium">
              Configure sua integração com o MercadoPago nas configurações da barbearia 
              para começar a aceitar pagamentos online e presenciais.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  const handleTabChange = (newTab: string) => {
    if (currentTab === 'pix' && (window as any).interceptPixTabChange) {
      const canChange = (window as any).interceptPixTabChange(newTab);
      if (!canChange) return;
    }
    setCurrentTab(newTab);
  };

  const handleOpenPaymentDetails = (payment: any) => {
    setSelectedPaymentDetails({ ...payment, type: 'payment' });
    setPaymentDetailsOpen(true);
  };

  const handleModalClose = (open: boolean) => {
    if (!open && currentTab === 'pix' && (window as any).interceptPixTabChange) {
      const canClose = (window as any).interceptPixTabChange('close');
      if (!canClose) return;
    }
    setPaymentDialogOpen(open);
  };

  const handlePaymentCreated = () => {
    setPaymentDialogOpen(false);
    setSelectedAppointment(null);
    onPaymentCreated();
  };

  const handleOpenPaymentDialog = (appointment?: Appointment) => {
    setSelectedAppointment(appointment || null);
    setPaymentDialogOpen(true);
  };

  // Filtra agendamentos pendentes do dia de hoje, em ordem cronológica
  const today = new Date().toISOString().split('T')[0];
  
  const pendingAppointments = appointments
    .filter(apt => {
      const service = findServiceById(apt.service_id);
      const hasPrice = service && Number(service.price) > 0;
      
      return (
        apt.status === 'pending' && 
        apt.appointment_date === today &&
        hasPrice
      );
    })
    .sort((a, b) => a.start_time.localeCompare(b.start_time));

  const getPaymentStatusBadge = (appointment: Appointment) => {
    return (
      <PaymentStatusBadge 
        data={{
          payment_status: appointment.payment_status,
          payment_method: appointment.payment_method,
          status: appointment.status
        }}
        onClick={() => {
          handleOpenPaymentDialog(appointment);
        }}
      />
    );
  };

  const recentPayments = payments
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 10);

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-0 shadow-lg bg-gradient-to-br from-emerald-500 to-teal-600 text-white overflow-hidden relative">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/10 rounded-full blur-2xl" />
          <CardContent className="p-6 relative z-10">
            <div className="flex items-center justify-between mb-3">
              <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-white" />
              </div>
              <TrendingUp className="h-5 w-5 text-emerald-100" />
            </div>
            <p className="text-emerald-100 text-sm font-medium mb-1">Receita Total</p>
            <p className="text-3xl font-bold mb-1">{formatCurrency(paymentStats.totalRevenue)}</p>
            <p className="text-emerald-100 text-xs">{paymentStats.paid} pagamentos confirmados</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-500 to-indigo-600 text-white overflow-hidden relative">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/10 rounded-full blur-2xl" />
          <CardContent className="p-6 relative z-10">
            <div className="flex items-center justify-between mb-3">
              <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
                <CheckCircle2 className="h-6 w-6 text-white" />
              </div>
              <ArrowUpRight className="h-5 w-5 text-blue-100" />
            </div>
            <p className="text-blue-100 text-sm font-medium mb-1">Hoje</p>
            <p className="text-3xl font-bold mb-1">{formatCurrency(paymentStats.todayRevenue)}</p>
            <p className="text-blue-100 text-xs">{paymentStats.todayCount} pagamentos</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-gradient-to-br from-amber-500 to-orange-600 text-white overflow-hidden relative">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/10 rounded-full blur-2xl" />
          <CardContent className="p-6 relative z-10">
            <div className="flex items-center justify-between mb-3">
              <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
                <Clock className="h-6 w-6 text-white" />
              </div>
              <ArrowDownRight className="h-5 w-5 text-amber-100" />
            </div>
            <p className="text-amber-100 text-sm font-medium mb-1">Agendamentos Hoje</p>
            <p className="text-3xl font-bold mb-1">{pendingAppointments.length}</p>
            <p className="text-amber-100 text-xs">Aguardando pagamento</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-gradient-to-br from-purple-500 to-pink-600 text-white overflow-hidden relative">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/10 rounded-full blur-2xl" />
          <CardContent className="p-6 relative z-10">
            <div className="flex items-center justify-between mb-3">
              <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
                <CreditCard className="h-6 w-6 text-white" />
              </div>
            </div>
            <p className="text-purple-100 text-sm font-medium mb-1">Pagamentos Pendentes</p>
            <p className="text-3xl font-bold mb-1">{paymentStats.pending}</p>
            <p className="text-purple-100 text-xs">Processando ou aguardando</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Payment Panel */}
      <Card className="border-0 shadow-xl bg-gradient-to-br from-white to-slate-50">
        <CardHeader className="pb-4 border-b border-slate-200">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg">
                <CreditCard className="h-7 w-7 text-white" />
              </div>
              <div>
                <CardTitle className="text-2xl font-bold text-slate-800">Gerenciar Pagamentos</CardTitle>
                <CardDescription className="text-slate-600 text-base">
                  Processe pagamentos de agendamentos e vendas avulsas
                </CardDescription>
              </div>
            </div>
            <Dialog open={paymentDialogOpen} onOpenChange={handleModalClose}>
              <DialogTrigger asChild>
                <Button 
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl transition-all"
                  size="lg"
                >
                  <CreditCard className="h-5 w-5 mr-2" />
                  Novo Pagamento
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="text-2xl">Criar Novo Pagamento</DialogTitle>
                  <DialogDescription className="text-base">
                    Escolha o método de pagamento que deseja processar
                  </DialogDescription>
                </DialogHeader>
                <Tabs value={currentTab} onValueChange={handleTabChange} className="w-full">
                  <TabsList className="grid w-full grid-cols-4 h-auto p-1 bg-slate-100">
                    <TabsTrigger value="card" className="flex flex-col items-center gap-1.5 py-3 data-[state=active]:bg-white data-[state=active]:shadow-md">
                      <CreditCard className="h-5 w-5" />
                      <span className="text-xs font-medium">Cartão/Link</span>
                    </TabsTrigger>
                    <TabsTrigger value="pix" className="flex flex-col items-center gap-1.5 py-3 data-[state=active]:bg-white data-[state=active]:shadow-md">
                      <QrCode className="h-5 w-5" />
                      <span className="text-xs font-medium">PIX</span>
                    </TabsTrigger>
                    <TabsTrigger value="point" className="flex flex-col items-center gap-1.5 py-3 data-[state=active]:bg-white data-[state=active]:shadow-md">
                      <Wifi className="h-5 w-5" />
                      <span className="text-xs font-medium">Maquininha</span>
                    </TabsTrigger>
                    <TabsTrigger value="subscription" className="flex flex-col items-center gap-1.5 py-3 data-[state=active]:bg-white data-[state=active]:shadow-md">
                      <Calendar className="h-5 w-5" />
                      <span className="text-xs font-medium">Assinatura</span>
                    </TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="card" className="mt-6">
                    <CreateWalkInPayment
                      barbershopId={barbershop.id}
                      services={services}
                      employees={employees}
                      selectedAppointment={selectedAppointment}
                      onPaymentCreated={handlePaymentCreated}
                      mode="payment_link"
                    />
                  </TabsContent>
                  
                  <TabsContent value="pix" className="mt-6">
                    <CreatePixPayment
                      barbershopId={barbershop.id}
                      services={services}
                      employees={employees}
                      selectedAppointment={selectedAppointment}
                      onPaymentCreated={handlePaymentCreated}
                      onTabChange={setCurrentTab}
                      onModalClose={() => setPaymentDialogOpen(false)}
                    />
                  </TabsContent>
                  
                  <TabsContent value="point" className="mt-6">
                    <CreatePointPayment
                      barbershopId={barbershop.id}
                      services={services}
                      employees={employees}
                      selectedAppointment={selectedAppointment}
                      onPaymentCreated={handlePaymentCreated}
                    />
                  </TabsContent>
                  
                  <TabsContent value="subscription" className="mt-6">
                    <CreateSubscriptionPayment
                      barbershopId={barbershop.id}
                      onPaymentCreated={handlePaymentCreated}
                    />
                  </TabsContent>
                </Tabs>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>

        <CardContent className="p-6">
          {/* Agendamentos Pendentes do Dia */}
          {pendingAppointments.length > 0 && (
            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl flex items-center justify-center">
                    <Clock className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-800">Agendamentos de Hoje</h3>
                    <p className="text-sm text-slate-600">{pendingAppointments.length} aguardando pagamento</p>
                  </div>
                </div>
                <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200 text-sm px-3 py-1">
                  {new Date().toLocaleDateString('pt-BR')}
                </Badge>
              </div>
              
              <div className="space-y-3">
                {pendingAppointments.map((appointment) => {
                  const service: any = findServiceById(appointment.service_id);
                  const employee: any = findEmployeeById(appointment.employee_id);
                  const price = Number(service?.price || 0);

                  return (
                    <Card
                      key={appointment.id}
                      className="border-2 border-orange-200 hover:border-orange-400 hover:shadow-lg transition-all bg-gradient-to-r from-white to-orange-50/30"
                    >
                      <CardContent className="p-5">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center gap-4 flex-1">
                            <div className="w-14 h-14 bg-gradient-to-br from-orange-500 to-red-600 rounded-2xl flex items-center justify-center text-white font-bold text-xl shadow-lg">
                              {appointment.client_name.charAt(0).toUpperCase()}
                            </div>
                            <div className="flex-1">
                              <h4 className="text-lg font-bold text-slate-800 mb-1">{appointment.client_name}</h4>
                              <div className="flex items-center gap-2 text-slate-600 text-sm">
                                <Phone className="h-4 w-4" />
                                <span>{appointment.client_phone}</span>
                              </div>
                            </div>
                          </div>
                          {getPaymentStatusBadge(appointment)}
                        </div>

                        <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-slate-200 shadow-sm">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                                <Clock className="h-5 w-5 text-blue-600" />
                              </div>
                              <div>
                                <p className="text-xs text-slate-500 font-medium uppercase">Horário</p>
                                <p className="text-base font-bold text-slate-800">{appointment.start_time}</p>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                                <Scissors className="h-5 w-5 text-purple-600" />
                              </div>
                              <div>
                                <p className="text-xs text-slate-500 font-medium uppercase">Serviço</p>
                                <p className="text-base font-bold text-slate-800">{service?.name}</p>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                                <User className="h-5 w-5 text-green-600" />
                              </div>
                              <div>
                                <p className="text-xs text-slate-500 font-medium uppercase">Profissional</p>
                                <p className="text-base font-bold text-slate-800">{employee?.name}</p>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-200">
                          <div>
                            <p className="text-xs text-slate-500 font-medium uppercase mb-1">Valor</p>
                            <p className="text-2xl font-bold text-slate-800">{formatCurrency(price)}</p>
                          </div>
                          <Button
                            onClick={() => handleOpenPaymentDialog(appointment)}
                            className="bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white shadow-lg hover:shadow-xl transition-all"
                            size="lg"
                          >
                            <CreditCard className="h-5 w-5 mr-2" />
                            Processar Pagamento
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          {/* Separador */}
          {pendingAppointments.length > 0 && recentPayments.length > 0 && (
            <div className="relative my-8">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-300"></div>
              </div>
              <div className="relative flex justify-center">
                <span className="bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-600 rounded-full border border-slate-300">
                  Histórico de Pagamentos
                </span>
              </div>
            </div>
          )}

          {/* Lista de Pagamentos Recentes */}
          {loading ? (
            <div className="text-center py-12">
              <Loader2 className="h-12 w-12 text-blue-600 animate-spin mx-auto mb-4" />
              <p className="text-slate-600 font-medium">Carregando pagamentos...</p>
            </div>
          ) : recentPayments.length === 0 && pendingAppointments.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-slate-100 to-slate-200 rounded-3xl flex items-center justify-center">
                <CreditCard className="h-10 w-10 text-slate-400" />
              </div>
              <h3 className="text-xl font-semibold text-slate-800 mb-2">Nenhum pagamento ainda</h3>
              <p className="text-slate-600 max-w-md mx-auto mb-6">
                Comece criando seu primeiro pagamento usando o botão acima
              </p>
            </div>
          ) : recentPayments.length > 0 ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-slate-800">Pagamentos Recentes</h3>
                <Badge variant="outline" className="text-sm">
                  {recentPayments.length} registros
                </Badge>
              </div>
              
              {recentPayments.map((payment) => {
                const statusInfo = getStatusInfo(payment.status);
                const methodInfo = getPaymentMethodInfo(payment.payment_method);
                const StatusIcon = statusInfo.icon;
                const MethodIcon = methodInfo.icon;

                return (
                  <Card
                    key={payment.id}
                    className="border border-slate-200 hover:border-blue-300 hover:shadow-md transition-all cursor-pointer group"
                    onClick={() => handleOpenPaymentDetails(payment)}
                  >
                    <CardContent className="p-5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4 flex-1 min-w-0">
                          <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-xl flex items-center justify-center flex-shrink-0">
                            <MethodIcon className={`h-6 w-6 ${methodInfo.color}`} />
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3 mb-1">
                              <h4 className="font-semibold text-slate-800 truncate">
                                {payment.client_name}
                              </h4>
                              <Badge className={`${statusInfo.color} border text-xs`}>
                                <StatusIcon className="h-3 w-3 mr-1" />
                                {statusInfo.label}
                              </Badge>
                            </div>
                            
                            <div className="flex items-center gap-4 text-sm text-slate-600">
                              <div className="flex items-center gap-1.5">
                                <MethodIcon className="h-4 w-4" />
                                <span>{methodInfo.label}</span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <Clock className="h-4 w-4" />
                                <span>{formatDate(payment.paid_at || payment.created_at)}</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-4 flex-shrink-0">
                          <div className="text-right">
                            <p className="text-xl font-bold text-slate-800">
                              {formatCurrency(payment.net_received_amount || payment.amount)}
                            </p>
                            {payment.description && (
                              <p className="text-xs text-slate-500 truncate max-w-[200px]">
                                {payment.description}
                              </p>
                            )}
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : null}
        </CardContent>
      </Card>

      {/* Payment Details Modal */}
      <PaymentHistoryDetailsModal
        isOpen={paymentDetailsOpen}
        onClose={() => setPaymentDetailsOpen(false)}
        data={selectedPaymentDetails}
        type="payment"
      />
    </div>
  );
};

export default PaymentPanel;