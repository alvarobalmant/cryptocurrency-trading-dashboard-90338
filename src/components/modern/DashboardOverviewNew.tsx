import React, { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { useBarbershops } from '@/hooks/useBarbershops';
import { useAnalytics } from '@/hooks/useAnalytics';
import { useAppointments } from '@/hooks/useAppointments';
import { useActiveClients } from '@/hooks/useActiveClients';
import { useSubscription } from '@/hooks/useSubscription';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { EditBarbershopDialog } from '@/components/EditBarbershopDialog';
import { BarbershopSubscriptionCard } from '@/components/BarbershopSubscriptionCard';
import { DollarSign, Users, Calendar, Clock, MapPin, Phone, Mail, Edit, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const DashboardOverviewNew = () => {
  // Get barbershopId from URL - this is the source of truth
  const { barbershopId } = useParams<{ barbershopId: string }>();
  const { barbershops } = useBarbershops();
  const queryClient = useQueryClient();
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  
  // Find the barbershop from the list using URL ID
  const barbershop = barbershops.find(b => b.id === barbershopId);
  
  // Invalidate all queries when barbershopId from URL changes
  useEffect(() => {
    if (barbershopId) {
      console.log('🔄 URL barbershopId changed, invalidating queries for:', barbershopId);
      queryClient.invalidateQueries({ queryKey: ["today-appointments", barbershopId] });
      queryClient.invalidateQueries({ queryKey: ["active-clients", barbershopId] });
      queryClient.invalidateQueries({ queryKey: ["analytics", barbershopId] });
    }
  }, [barbershopId, queryClient]);
  
  // Use barbershopId from URL for all data fetching
  const { analytics, loading: analyticsLoading } = useAnalytics(barbershopId);
  const { appointments: allAppointments, loading: appointmentsLoading } = useAppointments(barbershopId);
  const { activeClientsCount, loading: clientsLoading } = useActiveClients(barbershopId);

  // Filter appointments for today (same logic as BarbershopOperationalPanel)
  const today = new Date().toISOString().split('T')[0];
  const appointments = allAppointments.filter(apt => apt.appointment_date === today);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'confirmed':
        return <Badge variant="default" className="bg-green-500">Confirmado</Badge>;
      case 'pending':
        return <Badge variant="secondary">Pendente</Badge>;
      case 'cancelled':
        return <Badge variant="destructive">Cancelado</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (!barbershop) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <h3 className="text-lg font-semibold mb-2">Nenhuma barbearia selecionada</h3>
          <p className="text-muted-foreground">
            Selecione uma barbearia para ver as informações
          </p>
        </div>
      </div>
    );
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Barbershop Info Card with Edit */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle className="text-2xl mb-2">{barbershop.name}</CardTitle>
              {barbershop.slogan && (
                <CardDescription className="text-base">{barbershop.slogan}</CardDescription>
              )}
            </div>
            <Button variant="outline" size="sm" onClick={() => setEditDialogOpen(true)}>
              <Edit className="h-4 w-4 mr-2" />
              Editar
            </Button>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            {barbershop.address && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <MapPin className="h-4 w-4" />
                <span>{barbershop.address}</span>
              </div>
            )}
            {barbershop.phone && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Phone className="h-4 w-4" />
                <span>{barbershop.phone}</span>
              </div>
            )}
            {barbershop.email && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Mail className="h-4 w-4" />
                <span>{barbershop.email}</span>
              </div>
            )}
          </div>

        </CardContent>
      </Card>

      {/* Subscription Card */}
      {barbershopId && <BarbershopSubscriptionCard barbershopId={barbershopId} />}

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Receita do Mês</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analyticsLoading ? '...' : formatCurrency(analytics?.receivedRevenue || 0)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Dinheiro recebido
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Agendamentos Hoje</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {appointmentsLoading ? '...' : appointments.length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {appointments.filter(a => a.status === 'confirmed').length} confirmados
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Clientes Ativos</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {clientsLoading ? '...' : activeClientsCount}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Últimos 30 dias
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Today's Appointments */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Agendamentos de Hoje</CardTitle>
              <CardDescription>
                {format(new Date(), "EEEE, dd 'de' MMMM", { locale: ptBR })}
              </CardDescription>
            </div>
            <Badge variant="outline">
              {appointments.length} agendamento{appointments.length !== 1 ? 's' : ''}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {appointmentsLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              Carregando agendamentos...
            </div>
          ) : appointments.length === 0 ? (
            <div className="text-center py-8">
              <AlertCircle className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
              <p className="text-muted-foreground">Nenhum agendamento para hoje</p>
            </div>
          ) : (
            <div className="space-y-3">
              {appointments.map((appointment) => (
                <div
                  key={appointment.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-center gap-4 flex-1">
                    <div className="flex items-center gap-2 min-w-[100px]">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{appointment.start_time}</span>
                    </div>
                    <Separator orientation="vertical" className="h-8" />
                    <div className="flex-1">
                      <p className="font-medium">{appointment.client_name}</p>
                      <p className="text-sm text-muted-foreground">
                        {appointment.services?.name || 'Serviço'} • {appointment.employees?.name || 'Profissional'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-sm">
                      {formatCurrency(appointment.services?.price || 0)}
                    </span>
                    {getStatusBadge(appointment.status)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <EditBarbershopDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        barbershop={barbershop}
      />
    </div>
  );
};

export default DashboardOverviewNew;