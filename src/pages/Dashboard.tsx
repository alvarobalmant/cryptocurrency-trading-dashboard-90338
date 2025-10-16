import barberPlusLogo from '@/assets/barber-plus-logo.png';
import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useBarbershop } from '@/hooks/useBarbershop';
import { useBarbershops } from '@/hooks/useBarbershops';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { PlanUsageCard } from '@/components/PlanUsageCard';
import { EditBarbershopDialog } from '@/components/EditBarbershopDialog';
import { SubscriptionBanner } from '@/components/SubscriptionBanner';
import { Scissors, LogOut, Calendar, Users, UserCheck, Link2, Copy, Store, TrendingUp, ArrowUpDown, DollarSign, History, CreditCard, Settings } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getUserDisplayName } from '@/lib/utils';

const Dashboard = () => {
  const { user, signOut } = useAuth();
  const { barbershop, loading, selectBarbershop } = useBarbershop();
  const { barbershops } = useBarbershops();
  const [showSelector, setShowSelector] = useState(false);
  // Removed useToast line - using sonner toast instead
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect to new barbershop layout if we have a barbershop
    if (barbershop) {
      navigate(`/barbershop/${barbershop.id}/overview`);
    }
  }, [barbershop, navigate]);

  const handleBarbershopChange = (barbershopId: string) => {
    const selectedBarbershop = barbershops.find(b => b.id === barbershopId);
    if (selectedBarbershop) {
      selectBarbershop(selectedBarbershop);
      setShowSelector(false);
    }
  };


  const getPlanColor = (plan: string | null) => {
    switch (plan) {
      case 'basic': return 'secondary';
      case 'premium': return 'default';
      case 'enterprise': return 'destructive';
      default: return 'secondary';
    }
  };

  const getPlanLabel = (plan: string | null) => {
    switch (plan) {
      case 'basic': return 'Básico';
      case 'premium': return 'Premium';
      case 'enterprise': return 'Enterprise';
      default: return 'Básico';
    }
  };

  const copyBookingLink = (slug: string) => {
    const bookingLink = `${window.location.origin}/booking/${slug}`;
    navigator.clipboard.writeText(bookingLink);
    toast.success('Link de agendamento copiado!');
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <Scissors className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!barbershop && barbershops.length > 0) {
    // Se existem barbearias mas nenhuma selecionada, seleciona a primeira
    const firstBarbershop = barbershops[0];
    if (firstBarbershop) {
      selectBarbershop(firstBarbershop);
    }
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <Scissors className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Selecionando barbearia...</p>
        </div>
      </div>
    );
  }

  if (!barbershop) {
    return null; // Will redirect to setup only if no barbershops exist
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src={barberPlusLogo} alt="Barber+" className="h-8 md:h-10 w-auto" />
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">
              Olá, {getUserDisplayName(user)}
            </span>
            <Button variant="outline" size="sm" onClick={signOut}>
              <LogOut className="h-4 w-4 mr-2" />
              Sair
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <SubscriptionBanner />
        
        {/* Multiple Barbershops Banner */}
        {barbershops.length > 1 && (
          <Alert className="mb-6 border-primary/20 bg-primary/5">
            <TrendingUp className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between">
              <span>
                <strong>Seu negócio está crescendo!</strong> Você tem {barbershops.length} barbearias. 
                Gerencie todas elas em um só lugar.
              </span>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => navigate('/barbershops')}
              >
                <Store className="h-4 w-4 mr-2" />
                Ver Todas
              </Button>
            </AlertDescription>
          </Alert>
        )}
        {/* Barbershop Selector */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center gap-4 mb-2">
              <h2 className="text-3xl font-bold">{barbershop.name}</h2>
              {barbershops.length > 1 && (
                <div className="flex items-center gap-2">
                  <Select value={barbershop.id} onValueChange={handleBarbershopChange}>
                    <SelectTrigger className="w-[200px]">
                      <ArrowUpDown className="h-4 w-4 mr-2" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {barbershops.map((shop) => (
                        <SelectItem key={shop.id} value={shop.id}>
                          {shop.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => navigate('/barbershops')}
                  >
                    <Store className="h-4 w-4 mr-2" />
                    Ver Todas
                  </Button>
                </div>
              )}
            </div>
            <p className="text-muted-foreground">
              {barbershop.slogan || 'Gerencie sua barbearia'}
            </p>
          </div>
          
          {barbershops.length === 1 && (
            <Button 
              variant="outline"
              onClick={() => navigate('/barbershops')}
            >
              <Store className="h-4 w-4 mr-2" />
              Adicionar Filial
            </Button>
          )}
        </div>

        {/* Barbershop Info Card */}
        <Card className="mb-8">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <Scissors className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg">{barbershop.name}</CardTitle>
              </div>
              <Badge variant={getPlanColor(barbershop.plan_type)}>
                {getPlanLabel(barbershop.plan_type)}
              </Badge>
            </div>
            {barbershop.slogan && (
              <CardDescription>{barbershop.slogan}</CardDescription>
            )}
          </CardHeader>
          
          <CardContent>
             <div className="space-y-2 text-sm text-muted-foreground">
              {barbershop.address && (
                <p>📍 {barbershop.address}</p>
              )}
              {barbershop.phone && (
                <p>📞 {barbershop.phone}</p>
              )}
              {barbershop.email && (
                <p>✉️ {barbershop.email}</p>
              )}
            </div>
            
            {/* Booking Link */}
            <div className="bg-muted p-3 rounded-lg mt-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Link2 className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">Link de agendamento</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyBookingLink(barbershop.slug)}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Compartilhe com seus clientes para agendamentos online
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Management Options */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          <Button 
            variant="outline" 
            className="h-24 flex-col gap-2"
            onClick={() => navigate(`/barbershop/${barbershop.id}/employees`)}
          >
            <UserCheck className="h-6 w-6" />
            <span>Funcionários</span>
          </Button>
          
          <Button 
            variant="outline" 
            className="h-24 flex-col gap-2"
            onClick={() => navigate(`/barbershop/${barbershop.id}/services`)}
          >
            <Scissors className="h-6 w-6" />
            <span>Serviços</span>
          </Button>
          
          <Button 
            variant="outline" 
            className="h-24 flex-col gap-2"
            onClick={() => navigate(`/barbershop/${barbershop.id}/clients`)}
          >
            <Users className="h-6 w-6" />
            <span>Clientes</span>
          </Button>
          
          <Button 
            variant="outline" 
            className="h-24 flex-col gap-2"
            onClick={() => navigate(`/barbershop/${barbershop.id}/analytics`)}
          >
            <TrendingUp className="h-6 w-6" />
            <span>Análises</span>
          </Button>
          
          <Button 
            variant="outline" 
            className="h-24 flex-col gap-2"
            onClick={() => navigate(`/barbershop/${barbershop.id}/appointments`)}
          >
            <History className="h-6 w-6" />
            <span>Histórico</span>
          </Button>
          
          <Button 
            variant="default" 
            className="h-24 flex-col gap-2"
            onClick={() => navigate(`/barbershop/${barbershop.id}/operational`)}
          >
            <CreditCard className="h-6 w-6" />
            <span>Pagamentos</span>
          </Button>
          
          <Button 
            variant="outline" 
            className="h-24 flex-col gap-2"
            onClick={() => navigate(`/barbershop/${barbershop.id}/agenda`)}
          >
            <Calendar className="h-6 w-6" />
            <span>Agenda</span>
          </Button>
          
          <Button 
            variant="secondary" 
            className="h-24 flex-col gap-2"
            onClick={() => navigate(`/barbershop/${barbershop.id}/settings`)}
          >
            <Settings className="h-6 w-6" />
            <span>Configurações</span>
          </Button>
        </div>

      </main>
    </div>
  );
};

export default Dashboard;