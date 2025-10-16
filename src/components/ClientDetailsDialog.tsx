import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { User, Phone, Calendar, CreditCard, Crown, Clock, DollarSign, CheckCircle, XCircle, TrendingUp, BarChart3, AlertCircle, Users, Timer, Activity } from "lucide-react";
import { format, isFuture, isPast, isToday, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useClientAppointments } from "@/hooks/useClientAppointments";
import { useClientPayments } from "@/hooks/useClientPayments";
import { useClientSubscriptions } from "@/hooks/useClientSubscriptions";
import { useClientStats } from "@/hooks/useClientStats";
import { Client } from "@/hooks/useClients";

interface ClientDetailsDialogProps {
  client: Client | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function ClientDetailsDialog({ client, isOpen, onClose }: ClientDetailsDialogProps) {
  if (!client) return null;

  const { appointments, loading: appointmentsLoading } = useClientAppointments(client.id, client.barbershop_id);
  const { payments, loading: paymentsLoading } = useClientPayments(client.id, client.barbershop_id);
  const { subscriptions, loading: subscriptionsLoading } = useClientSubscriptions(client.id);
  const { stats, loading: statsLoading } = useClientStats(client.id, client.barbershop_id);

  const activeSubscription = subscriptions.find(sub => sub.status === 'active' && sub.end_date && new Date(sub.end_date) > new Date());
  
  const upcomingAppointments = appointments.filter(a => 
    a.status === 'pending' && isFuture(new Date(a.appointment_date))
  );
  
  const pastAppointments = appointments.filter(a => 
    isPast(new Date(a.appointment_date)) || a.status !== 'pending'
  );

  const formatPrice = (price: number) => {
    return price.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': case 'paid': case 'active': return 'bg-green-500';
      case 'pending': return 'bg-yellow-500';
      case 'cancelled': case 'failed': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'confirmed': return 'Concluído';
      case 'pending': return 'Agendado';
      case 'cancelled': return 'Cancelado';
      case 'no_show': return 'Não compareceu';
      case 'paid': case 'approved': return 'Pago';
      case 'pending_payment': return 'Pendente';
      case 'failed': return 'Falhou';
      case 'active': return 'Ativa';
      case 'paused': return 'Pausada';
      case 'expired': return 'Expirada';
      default: return status;
    }
  };

  const getPaymentTypeText = (type: string) => {
    switch (type) {
      case 'appointment': return 'Agendamento';
      case 'walk_in': return 'Walk-in';
      case 'subscription': return 'Assinatura';
      default: return type;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            Detalhes do Cliente
          </DialogTitle>
        </DialogHeader>

        {/* Client Info Header */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <h2 className="text-2xl font-bold">{client.name}</h2>
                <div className="flex items-center gap-4 text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Phone className="w-4 h-4" />
                    {client.phone}
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    Cliente desde {format(new Date(client.created_at), "dd/MM/yyyy", { locale: ptBR })}
                  </div>
                </div>
                {client.notes && (
                  <p className="text-sm text-muted-foreground mt-2 max-w-md">
                    {client.notes}
                  </p>
                )}
              </div>
              <div className="flex flex-col gap-2">
                {client.phone_verified && (
                  <Badge variant="secondary" className="self-end">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Verificado
                  </Badge>
                )}
                {activeSubscription && (
                  <Badge variant="default" className="self-end">
                    <Crown className="w-3 h-3 mr-1" />
                    Assinante
                  </Badge>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Panorama</TabsTrigger>
            <TabsTrigger value="appointments">Agendamentos</TabsTrigger>
            <TabsTrigger value="payments">Pagamentos</TabsTrigger>
            <TabsTrigger value="subscription">Assinatura</TabsTrigger>
          </TabsList>

          {/* OVERVIEW TAB */}
          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Total Gasto</p>
                      <p className="text-2xl font-bold">{formatPrice(stats.totalSpent)}</p>
                    </div>
                    <DollarSign className="w-8 h-8 text-green-500" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Visitas Concluídas</p>
                      <p className="text-2xl font-bold">{stats.totalCompleted}</p>
                    </div>
                    <CheckCircle className="w-8 h-8 text-blue-500" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Agendados</p>
                      <p className="text-2xl font-bold">{stats.totalScheduled}</p>
                    </div>
                    <Calendar className="w-8 h-8 text-orange-500" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Cancelamentos</p>
                      <p className="text-2xl font-bold">{stats.totalCancelled}</p>
                    </div>
                    <XCircle className="w-8 h-8 text-red-500" />
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    Preferências
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {stats.favoriteBarber ? (
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Barbeiro Favorito</p>
                      <div className="flex items-center justify-between">
                        <p className="font-medium">{stats.favoriteBarber}</p>
                        <Badge variant="secondary">{stats.favoriteBarberCount} visitas</Badge>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">Nenhuma preferência identificada ainda</p>
                  )}
                  
                  {stats.averageDaysBetweenVisits && (
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Frequência Média</p>
                      <div className="flex items-center gap-2">
                        <Timer className="w-4 h-4" />
                        <p className="font-medium">A cada {stats.averageDaysBetweenVisits} dias</p>
                      </div>
                    </div>
                  )}

                  {stats.subscriptionMonths > 0 && (
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Tempo de Assinatura</p>
                      <div className="flex items-center gap-2">
                        <Crown className="w-4 h-4 text-primary" />
                        <p className="font-medium">{stats.subscriptionMonths} {stats.subscriptionMonths === 1 ? 'mês' : 'meses'}</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="w-5 h-5" />
                    Histórico de Comportamento
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between py-2 border-b">
                    <span className="text-sm text-muted-foreground">Taxa de Comparecimento</span>
                    <span className="font-medium">
                      {stats.totalCompleted + stats.totalNoShow > 0
                        ? `${Math.round((stats.totalCompleted / (stats.totalCompleted + stats.totalNoShow)) * 100)}%`
                        : 'N/A'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b">
                    <span className="text-sm text-muted-foreground">Não Comparecimentos</span>
                    <Badge variant="destructive">{stats.totalNoShow}</Badge>
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <span className="text-sm text-muted-foreground">Total de Visitas</span>
                    <span className="font-medium">{stats.totalVisits}</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* APPOINTMENTS TAB */}
          <TabsContent value="appointments" className="space-y-4">
            {appointmentsLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                <p className="text-muted-foreground mt-2">Carregando agendamentos...</p>
              </div>
            ) : (
              <>
                {/* Upcoming Appointments */}
                {upcomingAppointments.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-blue-500" />
                        Próximos Agendamentos
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {upcomingAppointments.map((appointment) => (
                        <div key={appointment.id} className="border rounded-lg p-4 bg-blue-50/50">
                          <div className="flex items-start justify-between">
                            <div className="space-y-2 flex-1">
                              <div className="flex items-center gap-2">
                                <h4 className="font-semibold">{appointment.service_name}</h4>
                                <Badge variant="outline" className="bg-blue-500 text-white border-transparent">
                                  {isToday(new Date(appointment.appointment_date)) ? 'HOJE' : getStatusText(appointment.status)}
                                </Badge>
                              </div>
                              <div className="grid grid-cols-2 gap-2 text-sm">
                                <div className="flex items-center gap-1 text-muted-foreground">
                                  <Calendar className="w-3 h-3" />
                                  {format(new Date(appointment.appointment_date), "dd/MM/yyyy", { locale: ptBR })}
                                </div>
                                <div className="flex items-center gap-1 text-muted-foreground">
                                  <Clock className="w-3 h-3" />
                                  {appointment.start_time} - {appointment.end_time}
                                </div>
                                <div className="flex items-center gap-1 text-muted-foreground">
                                  <User className="w-3 h-3" />
                                  {appointment.employee_name}
                                </div>
                                {appointment.service_price && (
                                  <div className="flex items-center gap-1 text-muted-foreground">
                                    <DollarSign className="w-3 h-3" />
                                    {formatPrice(appointment.service_price)}
                                  </div>
                                )}
                              </div>
                              {appointment.is_subscription_appointment && (
                                <Badge variant="secondary" className="mt-2">
                                  <Crown className="w-3 h-3 mr-1" />
                                  Agendamento de Assinatura
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}

                {/* Past Appointments */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Clock className="w-5 h-5" />
                      Histórico de Agendamentos
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {pastAppointments.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <AlertCircle className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
                        <p>Nenhum agendamento anterior encontrado.</p>
                      </div>
                    ) : (
                      <div className="space-y-3 max-h-96 overflow-y-auto">
                        {pastAppointments.map((appointment) => (
                          <div key={appointment.id} className="border rounded-lg p-4">
                            <div className="flex items-start justify-between">
                              <div className="space-y-2 flex-1">
                                <div className="flex items-center gap-2">
                                  <h4 className="font-medium">{appointment.service_name}</h4>
                                  <Badge 
                                    variant="outline" 
                                    className={`${getStatusColor(appointment.status)} text-white border-transparent`}
                                  >
                                    {getStatusText(appointment.status)}
                                  </Badge>
                                </div>
                                <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
                                  <div>{format(new Date(appointment.appointment_date), "dd/MM/yyyy", { locale: ptBR })}</div>
                                  <div>{appointment.start_time} - {appointment.end_time}</div>
                                  <div>{appointment.employee_name}</div>
                                  {appointment.service_price && (
                                    <div>{formatPrice(appointment.service_price)}</div>
                                  )}
                                </div>
                                {appointment.is_subscription_appointment && (
                                  <Badge variant="secondary" className="text-xs">
                                    <Crown className="w-3 h-3 mr-1" />
                                    Assinatura
                                  </Badge>
                                )}
                              </div>
                              <Badge 
                                variant="outline"
                                className={`${getStatusColor(appointment.payment_status || 'pending')} text-white border-transparent ml-2`}
                              >
                                {appointment.payment_status === 'paid' ? 'Pago' : 'Pendente'}
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>

          {/* PAYMENTS TAB */}
          <TabsContent value="payments" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="w-5 h-5" />
                  Todas as Tentativas de Pagamento
                </CardTitle>
              </CardHeader>
              <CardContent>
                {paymentsLoading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                    <p className="text-muted-foreground mt-2">Carregando pagamentos...</p>
                  </div>
                ) : payments.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <CreditCard className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
                    <p>Nenhum pagamento encontrado.</p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {payments.map((payment) => (
                      <div key={payment.id} className="border rounded-lg p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="space-y-2 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="font-medium">{payment.description || 'Pagamento'}</h4>
                              <Badge 
                                variant="outline" 
                                className={`${getStatusColor(payment.status)} text-white border-transparent`}
                              >
                                {getStatusText(payment.status)}
                              </Badge>
                              <Badge variant="secondary">
                                {getPaymentTypeText(payment.payment_type || 'walk_in')}
                              </Badge>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
                              <div>
                                <span className="font-medium">Método: </span>
                                {payment.payment_method || 'Não informado'}
                              </div>
                              <div>
                                <span className="font-medium">Criado: </span>
                                {format(new Date(payment.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                              </div>
                              {payment.paid_at && (
                                <div>
                                  <span className="font-medium">Pago: </span>
                                  {format(new Date(payment.paid_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                                </div>
                              )}
                              {payment.transaction_amount && payment.transaction_amount !== payment.amount && (
                                <div>
                                  <span className="font-medium">Transação: </span>
                                  {formatPrice(payment.transaction_amount)}
                                </div>
                              )}
                            </div>

                            {payment.fee_amount && payment.fee_amount > 0 && (
                              <div className="flex items-center gap-2 text-sm">
                                <AlertCircle className="w-4 h-4 text-orange-500" />
                                <span className="text-muted-foreground">
                                  Taxa cobrada: {formatPrice(payment.fee_amount)}
                                </span>
                              </div>
                            )}
                          </div>
                          
                          <div className="text-right">
                            <div className="font-bold text-lg">
                              {formatPrice(payment.amount)}
                            </div>
                            {payment.net_received_amount && payment.net_received_amount !== payment.amount && (
                              <div className="text-sm text-muted-foreground">
                                Líquido: {formatPrice(payment.net_received_amount)}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Payment Summary */}
            {payments.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="w-5 h-5" />
                    Resumo de Pagamentos
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Total Pago</p>
                    <p className="text-xl font-bold text-green-600">
                      {formatPrice(payments.filter(p => p.status === 'paid' || p.status === 'approved').reduce((sum, p) => sum + p.amount, 0))}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Pendente</p>
                    <p className="text-xl font-bold text-orange-500">
                      {formatPrice(payments.filter(p => p.status === 'pending' || p.status === 'pending_payment').reduce((sum, p) => sum + p.amount, 0))}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Falhou</p>
                    <p className="text-xl font-bold text-red-500">
                      {formatPrice(payments.filter(p => p.status === 'failed').reduce((sum, p) => sum + p.amount, 0))}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Total Tentativas</p>
                    <p className="text-xl font-bold">{payments.length}</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* SUBSCRIPTION TAB */}
          <TabsContent value="subscription" className="space-y-4">
            {subscriptionsLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                <p className="text-muted-foreground mt-2">Carregando assinaturas...</p>
              </div>
            ) : !activeSubscription && subscriptions.length === 0 ? (
              <Card>
                <CardContent className="py-12">
                  <div className="text-center text-muted-foreground">
                    <XCircle className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
                    <p>Cliente não possui assinatura ativa.</p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <>
                {/* Active Subscription */}
                {activeSubscription && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Crown className="w-5 h-5 text-primary" />
                        Assinatura Ativa
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Card className="border-2 border-primary/20">
                          <CardContent className="p-4">
                            <div className="flex items-center gap-2 mb-2">
                              <Crown className="w-4 h-4 text-primary" />
                              <h3 className="font-medium">Plano</h3>
                            </div>
                            <p className="text-lg font-bold">{activeSubscription.plan_name}</p>
                            <Badge className="mt-2 bg-green-500">
                              {getStatusText(activeSubscription.status)}
                            </Badge>
                          </CardContent>
                        </Card>

                        <Card>
                          <CardContent className="p-4">
                            <div className="flex items-center gap-2 mb-2">
                              <DollarSign className="w-4 h-4 text-green-500" />
                              <h3 className="font-medium">Valor Investido</h3>
                            </div>
                            <p className="text-lg font-bold">{formatPrice(activeSubscription.amount_paid)}</p>
                            <p className="text-sm text-muted-foreground">{activeSubscription.duration_months} {activeSubscription.duration_months === 1 ? 'mês' : 'meses'}</p>
                          </CardContent>
                        </Card>

                        <Card>
                          <CardContent className="p-4">
                            <div className="flex items-center gap-2 mb-2">
                              <Calendar className="w-4 h-4 text-blue-500" />
                              <h3 className="font-medium">Período</h3>
                            </div>
                            <div className="space-y-1 text-sm">
                              <p>Início: {activeSubscription.start_date ? format(new Date(activeSubscription.start_date), "dd/MM/yyyy", { locale: ptBR }) : 'N/A'}</p>
                              <p>Término: {activeSubscription.end_date ? format(new Date(activeSubscription.end_date), "dd/MM/yyyy", { locale: ptBR }) : 'N/A'}</p>
                            </div>
                          </CardContent>
                        </Card>

                        <Card>
                          <CardContent className="p-4">
                            <div className="flex items-center gap-2 mb-2">
                              <Clock className="w-4 h-4 text-orange-500" />
                              <h3 className="font-medium">Tempo Restante</h3>
                            </div>
                            {activeSubscription.end_date ? (
                              <p className="text-lg font-bold">
                                {differenceInDays(new Date(activeSubscription.end_date), new Date())} dias
                              </p>
                            ) : (
                              <p className="text-sm text-muted-foreground">N/A</p>
                            )}
                          </CardContent>
                        </Card>
                      </div>

                      {activeSubscription.auto_renewal !== undefined && (
                        <>
                          <Separator />
                          <div className="flex items-center justify-between p-4 border rounded-lg">
                            <div>
                              <p className="font-medium">Renovação Automática</p>
                              <p className="text-sm text-muted-foreground">
                                {activeSubscription.auto_renewal ? 'Ativada - A assinatura renovará automaticamente' : 'Desativada'}
                              </p>
                            </div>
                            <Badge variant={activeSubscription.auto_renewal ? "default" : "secondary"}>
                              {activeSubscription.auto_renewal ? 'Ativa' : 'Inativa'}
                            </Badge>
                          </div>
                        </>
                      )}

                      {activeSubscription.description && (
                        <>
                          <Separator />
                          <div>
                            <h3 className="font-medium mb-2">Descrição do Plano</h3>
                            <p className="text-sm text-muted-foreground p-4 bg-muted rounded-lg">
                              {activeSubscription.description}
                            </p>
                          </div>
                        </>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Historical Subscriptions */}
                {subscriptions.length > (activeSubscription ? 1 : 0) && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Clock className="w-5 h-5" />
                        Histórico de Assinaturas
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 max-h-96 overflow-y-auto">
                      {subscriptions
                        .filter(sub => sub.id !== activeSubscription?.id)
                        .map((subscription) => (
                          <div key={subscription.id} className="border rounded-lg p-4">
                            <div className="flex items-start justify-between">
                              <div className="space-y-2 flex-1">
                                <div className="flex items-center gap-2">
                                  <h4 className="font-medium">{subscription.plan_name}</h4>
                                  <Badge 
                                    variant="outline" 
                                    className={`${getStatusColor(subscription.status)} text-white border-transparent`}
                                  >
                                    {getStatusText(subscription.status)}
                                  </Badge>
                                </div>
                                <div className="text-sm text-muted-foreground space-y-1">
                                  <div>Duração: {subscription.duration_months} {subscription.duration_months === 1 ? 'mês' : 'meses'}</div>
                                  {subscription.start_date && subscription.end_date && (
                                    <div>
                                      {format(new Date(subscription.start_date), "dd/MM/yyyy", { locale: ptBR })} - {format(new Date(subscription.end_date), "dd/MM/yyyy", { locale: ptBR })}
                                    </div>
                                  )}
                                </div>
                              </div>
                              <div className="text-right ml-4">
                                <p className="font-bold">{formatPrice(subscription.amount_paid)}</p>
                              </div>
                            </div>
                          </div>
                        ))}
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}