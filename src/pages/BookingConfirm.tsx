import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { CheckCircle, Clock, DollarSign, User, Calendar, Phone, UserCheck } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import { useAppointments } from '@/hooks/useAppointments';
import { useNativeClientAuth } from '@/hooks/useNativeClientAuth';
import BookingAuthOptions from '@/components/BookingAuthOptions';
import BookingHeader from '@/components/BookingHeader';
import { supabasePublic } from '@/integrations/supabase/publicClient';
import { z } from 'zod';

const confirmationSchema = z.object({
  clientName: z.string().trim().min(2, 'Nome deve ter pelo menos 2 caracteres').max(100, 'Nome muito longo'),
  clientPhone: z.string().trim().min(10, 'Telefone deve ter pelo menos 10 dígitos').max(15, 'Telefone muito longo'),
});

export default function BookingConfirm() {
  const { barbershopSlug } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [showGuestForm, setShowGuestForm] = useState(false);
  const [forceAuthCheck, setForceAuthCheck] = useState(0);

  const { service, barbershop, employee, selectedDate, selectedSlot } = location.state || {};
  // Get barbershopId from URL params if not in location.state
  const [currentBarbershopId, setCurrentBarbershopId] = useState(barbershop?.id);
  
  const { createAppointment } = useAppointments(currentBarbershopId);
  
  useEffect(() => {
    const fetchBarbershopId = async () => {
      if (!barbershop?.id && barbershopSlug) {
        try {
          // SECURE: Use security definer function for public booking access
          const { data } = await supabasePublic.rpc('get_barbershop_for_booking', {
            barbershop_identifier: barbershopSlug
          });
          
          if (data && data.length > 0 && data[0]?.id) {
            setCurrentBarbershopId(data[0].id);
          }
        } catch (error) {
          console.error('Error fetching barbershop ID:', error);
        }
      }
    };
    
    fetchBarbershopId();
  }, [barbershop?.id, barbershopSlug]);

  const { clientProfile, isAuthenticated, loading: authLoading, refreshAuth, logout } = useNativeClientAuth(currentBarbershopId);
  
  // Loading timeout adicional para BookingConfirm
  const [loadingTimeout, setLoadingTimeout] = useState(false);
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (authLoading) {
        console.warn('⚠️ BookingConfirm auth loading timeout');
        setLoadingTimeout(true);
      }
    }, 5000); // 5 segundos
    
    return () => clearTimeout(timeout);
  }, [authLoading]);

  console.log('🎯 BookingConfirm Debug:', { 
    authLoading, 
    isAuthenticated, 
    barbershopId: currentBarbershopId,
    hasLocationData: !!service && !!barbershop,
    loadingTimeout,
    userExists: !!clientProfile,
    hasUser: !!useNativeClientAuth(currentBarbershopId).user
  });
  
  // Force re-check authentication state when requested
  useEffect(() => {
    if (forceAuthCheck > 0) {
      refreshAuth();
    }
  }, [forceAuthCheck, refreshAuth]);

  useEffect(() => {
    if (isAuthenticated && clientProfile) {
      setClientName(clientProfile.name || '');
      setClientPhone(clientProfile.phone);
    }
  }, [isAuthenticated, clientProfile]);

  const handleConfirm = async () => {
    try {
      const validatedData = confirmationSchema.parse({
        clientName,
        clientPhone,
      });

      setLoading(true);

      const appointmentData = {
        employee_id: employee.id,
        service_id: service.id,
        client_name: validatedData.clientName,
        client_phone: validatedData.clientPhone,
        appointment_date: format(selectedDate, 'yyyy-MM-dd'),
        start_time: selectedSlot.start_time,
        end_time: selectedSlot.end_time,
      };

      await createAppointment(appointmentData);
      setConfirmed(true);

      toast({
        title: 'Agendamento confirmado!',
        description: 'Você receberá uma confirmação via SMS em breve.',
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        const firstError = error.issues[0];
        toast({
          title: 'Erro de validação',
          description: firstError.message,
          variant: 'destructive',
        });
      } else {
        console.error('Error creating appointment:', error);
        toast({
          title: 'Erro',
          description: 'Não foi possível confirmar o agendamento. Tente novamente.',
          variant: 'destructive',
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleContinueWithoutLogin = () => {
    setShowAuth(false);
    setShowGuestForm(true);
  };

  const handleAuthSuccess = (clientData: any) => {
    setShowAuth(false);
    setShowGuestForm(false);
    
    // Pequeno delay para garantir que o localStorage foi atualizado
    setTimeout(() => {
      setForceAuthCheck(prev => prev + 1);
    }, 100);
    
    toast({ 
      title: 'Login realizado com sucesso!', 
      description: 'Agora é só confirmar seu agendamento.' 
    });
  };

  console.log('🎯 BookingConfirm Debug:', { 
    authLoading, 
    isAuthenticated, 
    barbershopId: currentBarbershopId,
    hasLocationData: !!service && !!barbershop,
    loadingTimeout,
    userExists: !!clientProfile,
    sessionExists: !!useNativeClientAuth(currentBarbershopId).session,
    currentPath: location.pathname
  });

  // Se timeout foi atingido, mostrar erro ao invés de loading infinito
  if (loadingTimeout) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Erro no carregamento da autenticação</p>
          <Button onClick={() => window.location.reload()}>
            Recarregar Página
          </Button>
        </div>
      </div>
    );
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando autenticação...</p>
          <p className="text-xs text-muted-foreground mt-2">
            ID da Barbearia: {currentBarbershopId || 'Carregando...'}
          </p>
        </div>
      </div>
    );
  }

  if (!service || !barbershop || !employee || !selectedDate || !selectedSlot) {
    navigate(`/booking/${barbershopSlug}`);
    return null;
  }

  // Show auth options if not authenticated and guest form not shown
  if (!isAuthenticated && !showGuestForm) {
    return (
      <div className="min-h-screen bg-background p-4 flex items-center justify-center">
        <div className="w-full max-w-2xl">
          <div className="text-center mb-8">
            <div className="flex items-center justify-center mb-4">
              {barbershop?.avatar_url ? (
                <img 
                  src={barbershop.avatar_url} 
                  alt={barbershop.name}
                  className="w-16 h-16 rounded-full object-cover"
                />
              ) : (
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <CheckCircle className="h-8 w-8 text-primary" />
                </div>
              )}
            </div>
            <h1 className="text-3xl font-bold mb-2">Finalizar Agendamento</h1>
            <h2 className="text-xl font-semibold mb-1">{barbershop.name}</h2>
            {barbershop?.slogan && (
              <p className="text-muted-foreground">{barbershop.slogan}</p>
            )}
          </div>
          
          <BookingAuthOptions
            barbershopId={barbershop.id}
            barbershopName={barbershop.name}
            onContinueWithoutLogin={handleContinueWithoutLogin}
            onAuthSuccess={handleAuthSuccess}
          />
        </div>
      </div>
    );
  }

  if (confirmed) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4">
              <CheckCircle className="h-16 w-16 text-green-500" />
            </div>
            <CardTitle className="text-2xl text-green-600">Agendamento Confirmado!</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-muted-foreground">
              Seu agendamento foi realizado com sucesso. Você receberá uma confirmação via SMS!
            </p>
            
            <div className="bg-muted p-4 rounded-lg text-left space-y-2">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                <span className="font-medium">
                  {format(selectedDate, 'dd/MM/yyyy', { locale: ptBR })} às {selectedSlot.start_time}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <User className="h-4 w-4" />
                <span>{employee.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-medium">{service.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4" />
                <span>{clientPhone}</span>
              </div>
            </div>

            <Alert>
              <Phone className="h-4 w-4" />
              <AlertDescription>
                Você receberá confirmação e lembretes via SMS no número {clientPhone}
              </AlertDescription>
            </Alert>

            <p className="text-sm text-muted-foreground">
              Em caso de dúvidas ou necessidade de reagendar, entre em contato com a barbearia.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <BookingHeader 
        barbershop={barbershop}
        clientProfile={clientProfile}
        isAuthenticated={isAuthenticated}
        onLogout={() => {
          logout();
          toast({
            title: 'Logout realizado',
            description: 'Você foi desconectado com sucesso.'
          });
        }}
      />
      
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Finalizar Agendamento</h1>
        </div>

        <div className="max-w-2xl mx-auto space-y-6">
          {/* Booking Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Resumo do Agendamento</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Serviço:</span>
                <span className="font-medium">{service.name}</span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Profissional:</span>
                <span className="font-medium">{employee.name}</span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Data:</span>
                <Badge variant="outline">
                  {format(selectedDate, 'dd/MM/yyyy', { locale: ptBR })}
                </Badge>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Horário:</span>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  <span className="font-medium">{selectedSlot.start_time} - {selectedSlot.end_time}</span>
                </div>
              </div>
              
              <Separator />
              
              <div className="flex items-center justify-between text-lg font-semibold">
                <span>Total:</span>
                <div className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  <span>R$ {service.price.toFixed(2)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Client Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                Seus Dados
                {isAuthenticated && (
                  <Badge variant="secondary" className="ml-2">
                    <UserCheck className="w-3 h-3 mr-1" />
                    Verificado
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {isAuthenticated ? (
                <div className="bg-muted p-4 rounded-lg space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Nome:</span>
                    <span className="font-medium">{clientProfile?.name}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">WhatsApp:</span>
                    <span className="font-medium">{clientProfile?.phone}</span>
                  </div>
                  {clientProfile && (
                    <div className="flex items-center text-green-600 text-sm">
                      <CheckCircle className="w-4 h-4 mr-1" />
                      Número verificado via WhatsApp
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="clientName">Nome completo</Label>
                    <Input
                      id="clientName"
                      type="text"
                      placeholder="Digite seu nome completo"
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="clientPhone">Telefone</Label>
                    <Input
                      id="clientPhone"
                      type="tel"
                      placeholder="(11) 99999-9999"
                      value={clientPhone}
                      onChange={(e) => setClientPhone(e.target.value)}
                      required
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Confirm Button */}
          <div className="text-center">
            <Button 
              onClick={handleConfirm}
              disabled={loading || (!isAuthenticated && (!clientName.trim() || !clientPhone.trim()))}
              size="lg"
              className="w-full md:w-auto px-8"
            >
              {loading 
                ? 'Confirmando...' 
                : 'Confirmar Agendamento'
              }
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}