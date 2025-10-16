import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  User, 
  Calendar, 
  Clock, 
  Phone, 
  Plus,
  ArrowLeft,
  Building2,
  Filter,
  X,
  XCircle
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useClientData } from '@/hooks/useClientData';
import { useToast } from '@/hooks/use-toast';

export default function ClientArea() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { profiles, appointments, loading, error, cancelAppointment } = useClientData();
  const { toast } = useToast();
  const [selectedBarbershop, setSelectedBarbershop] = useState<string | null>(null);
  const [showBarbershopSelector, setShowBarbershopSelector] = useState(false);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getStatusBadge = (status: string) => {
    const statusMap = {
      pending: { label: 'Pendente', variant: 'secondary' as const },
      confirmed: { label: 'Confirmado', variant: 'default' as const },
      completed: { label: 'Concluído', variant: 'default' as const },
      cancelled: { label: 'Cancelado', variant: 'destructive' as const },
    };
    
    return statusMap[status as keyof typeof statusMap] || { label: status, variant: 'secondary' as const };
  };

  const getPaymentStatusBadge = (status: string) => {
    const statusMap = {
      pending: { label: 'Pendente', variant: 'outline' as const },
      paid: { label: 'Pago', variant: 'default' as const },
      failed: { label: 'Falhou', variant: 'destructive' as const },
    };
    
    return statusMap[status as keyof typeof statusMap] || { label: status, variant: 'outline' as const };
  };

  const handleLogout = async () => {
    await signOut();
    toast({
      title: 'Logout realizado',
      description: 'Você foi desconectado com sucesso.'
    });
  };

  const handleNewBooking = (barbershopId?: string) => {
    if (barbershopId) {
      // Buscar slug da barbearia selecionada
      const selectedProfile = profiles.find(p => p.barbershop_id === barbershopId);
      if (selectedProfile) {
        navigate('/');
      }
    } else {
      setShowBarbershopSelector(true);
    }
  };

  const handleBarbershopSelection = (barbershopId: string) => {
    setShowBarbershopSelector(false);
    handleNewBooking(barbershopId);
  };

  const handleCancelAppointment = async (appointmentId: string) => {
    const result = await cancelAppointment(appointmentId);
    
    if (result.success) {
      toast({
        title: 'Agendamento cancelado',
        description: 'Seu agendamento foi cancelado com sucesso.',
      });
    } else {
      toast({
        title: 'Erro ao cancelar',
        description: result.error || 'Não foi possível cancelar o agendamento.',
        variant: 'destructive',
      });
    }
  };

  // Agrupar agendamentos por barbearia
  const appointmentsByBarbershop = React.useMemo(() => {
    const grouped: Record<string, typeof appointments> = {};
    
    appointments.forEach(appointment => {
      const barbershopName = appointment.barbershop_name || 'Barbearia sem nome';
      if (!grouped[barbershopName]) {
        grouped[barbershopName] = [];
      }
      grouped[barbershopName].push(appointment);
    });
    
    return grouped;
  }, [appointments]);

  // Filtrar agendamentos por barbearia selecionada
  const filteredAppointmentsByBarbershop = React.useMemo(() => {
    if (!selectedBarbershop) return appointmentsByBarbershop;
    
    return Object.fromEntries(
      Object.entries(appointmentsByBarbershop).filter(([barbershopName]) => 
        barbershopName === selectedBarbershop
      )
    );
  }, [appointmentsByBarbershop, selectedBarbershop]);

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <p className="text-muted-foreground mb-4">
              Você precisa fazer login para acessar a área do cliente.
            </p>
            <Button onClick={() => navigate('/')}>
              Ir para Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando seus dados...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <p className="text-destructive mb-4">Erro ao carregar dados: {error}</p>
            <Button onClick={() => navigate('/')}>
              Voltar para Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => navigate('/')}
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold">Área do Cliente</h1>
                <p className="text-sm text-muted-foreground">
                  Gerencie seus agendamentos e dados
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <Dialog open={showBarbershopSelector} onOpenChange={setShowBarbershopSelector}>
                <DialogTrigger asChild>
                  <Button className="gap-2">
                    <Plus className="h-4 w-4" />
                    Novo Agendamento
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Escolha uma Barbearia</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-3">
                    {profiles.map((profile) => (
                      <Button
                        key={profile.id}
                        variant="outline"
                        className="w-full justify-start gap-3 h-auto p-4"
                        onClick={() => handleBarbershopSelection(profile.barbershop_id)}
                      >
                        <Building2 className="h-5 w-5" />
                        <div className="text-left">
                          <p className="font-medium">{profile.barbershop_name}</p>
                          <p className="text-sm text-muted-foreground">
                            Como: {profile.name} • {profile.phone}
                          </p>
                        </div>
                      </Button>
                    ))}
                  </div>
                </DialogContent>
              </Dialog>
              <Button variant="outline" onClick={handleLogout}>
                Sair
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-6 py-8">
        <div className="grid gap-8 lg:grid-cols-3">
          {/* Profile Overview */}
          <div className="lg:col-span-1 space-y-6">
            {/* User Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Perfil do Usuário
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <Avatar className="h-12 w-12">
                    <AvatarFallback>
                      {getInitials(user.email?.split('@')[0] || 'U')}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{user.email}</p>
                    <p className="text-sm text-muted-foreground">
                      Cliente desde {format(parseISO(user.created_at), 'MMM yyyy', { locale: ptBR })}
                    </p>
                  </div>
                </div>
                
                <Separator />
                
                <div className="space-y-2">
                  <p className="text-sm font-medium">Estatísticas</p>
                  <div className="grid grid-cols-2 gap-4 text-center">
                    <div className="bg-muted/50 rounded-lg p-3">
                      <p className="text-2xl font-bold text-primary">{profiles.length}</p>
                      <p className="text-xs text-muted-foreground">Barbearias</p>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-3">
                      <p className="text-2xl font-bold text-primary">{appointments.length}</p>
                      <p className="text-xs text-muted-foreground">Agendamentos</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Barbershops */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Suas Barbearias
                </CardTitle>
              </CardHeader>
              <CardContent>
                {profiles.length === 0 ? (
                  <div className="text-center py-6">
                    <p className="text-muted-foreground mb-4">
                      Você ainda não tem perfil em nenhuma barbearia.
                    </p>
                    <Button onClick={() => setShowBarbershopSelector(true)} size="sm">
                      Fazer Primeiro Agendamento
                    </Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {profiles.map((profile) => (
                      <Card 
                        key={profile.id} 
                        className={`cursor-pointer transition-all hover:shadow-md ${
                          selectedBarbershop === profile.barbershop_name 
                            ? 'ring-2 ring-primary bg-primary/5' 
                            : 'hover:bg-muted/30'
                        }`}
                        onClick={() => 
                          setSelectedBarbershop(
                            selectedBarbershop === profile.barbershop_name 
                              ? null 
                              : profile.barbershop_name
                          )
                        }
                      >
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between mb-2">
                            <Building2 className="h-5 w-5 text-primary" />
                            <Badge variant="outline" className="text-xs">
                              Ativo
                            </Badge>
                          </div>
                          <h3 className="font-medium text-sm mb-1">{profile.barbershop_name}</h3>
                          <p className="text-xs text-muted-foreground mb-1">
                            Como: {profile.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Tel: {profile.phone}
                          </p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Appointments History */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Histórico de Agendamentos
                  </CardTitle>
                  {selectedBarbershop && (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setSelectedBarbershop(null)}
                      className="gap-2"
                    >
                      <X className="h-4 w-4" />
                      Ver Todas
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {appointments.length === 0 ? (
                  <div className="text-center py-12">
                    <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground mb-4">
                      Você ainda não tem agendamentos.
                    </p>
                    <Button onClick={() => setShowBarbershopSelector(true)}>
                      Fazer Primeiro Agendamento
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {Object.entries(filteredAppointmentsByBarbershop).map(([barbershopName, barbershopAppointments]) => (
                      <div key={barbershopName} className="space-y-4">
                        {/* Header da Barbearia */}
                        <div className="flex items-center gap-3 pb-3 border-b border-border">
                          <div className="bg-primary/10 rounded-lg p-2">
                            <Building2 className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <h3 className="text-lg font-semibold">{barbershopName}</h3>
                            <p className="text-sm text-muted-foreground">
                              {barbershopAppointments.length} agendamento{barbershopAppointments.length !== 1 ? 's' : ''}
                            </p>
                          </div>
                        </div>

                        {/* Lista de Agendamentos da Barbearia */}
                        <div className="space-y-3">
                          {barbershopAppointments.map((appointment) => (
                            <div 
                              key={appointment.id}
                              className="border border-border rounded-lg p-4 hover:bg-muted/30 transition-colors"
                            >
                              <div className="flex items-start justify-between mb-3">
                                <div className="flex items-center gap-3">
                                  <div className="bg-primary/10 rounded-lg p-2">
                                    <Calendar className="h-4 w-4 text-primary" />
                                  </div>
                                  <div>
                                    <p className="font-semibold">Agendamento</p>
                                    <p className="text-sm text-muted-foreground">
                                      {format(parseISO(appointment.appointment_date), 'dd/MM/yyyy', { locale: ptBR })} às {appointment.start_time}
                                    </p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <div className="flex gap-2">
                                    <Badge {...getStatusBadge(appointment.status)}>
                                      {getStatusBadge(appointment.status).label}
                                    </Badge>
                                    <Badge {...getPaymentStatusBadge(appointment.payment_status)}>
                                      {getPaymentStatusBadge(appointment.payment_status).label}
                                    </Badge>
                                  </div>
                                  {appointment.status === 'pending' && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleCancelAppointment(appointment.id)}
                                      className="gap-1 text-destructive hover:bg-destructive/10"
                                    >
                                      <XCircle className="h-3 w-3" />
                                      Cancelar
                                    </Button>
                                  )}
                                </div>
                              </div>
                              
                              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                                <div className="flex items-center gap-2">
                                  <Clock className="h-4 w-4 text-muted-foreground" />
                                  <span>{appointment.start_time} - {appointment.end_time}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <User className="h-4 w-4 text-muted-foreground" />
                                  <span>{appointment.client_name}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Phone className="h-4 w-4 text-muted-foreground" />
                                  <span>{appointment.client_phone}</span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}