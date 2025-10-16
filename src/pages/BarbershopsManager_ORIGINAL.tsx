import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useBarbershops } from '@/hooks/useBarbershops';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Scissors, LogOut, Plus, Store, Link2, Copy, Settings, Users, Calendar, UserCheck, TrendingUp, DollarSign, History, CreditCard, Crown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const BarbershopsManager = () => {
  const { user, signOut } = useAuth();
  const { barbershops, loading, createBarbershop } = useBarbershops();
  const [isCreating, setIsCreating] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleCreateBarbershop = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsCreating(true);

    const formData = new FormData(e.currentTarget);
    const barbershopData = {
      name: formData.get('name') as string,
      slogan: formData.get('slogan') as string,
      address: formData.get('address') as string,
      phone: formData.get('phone') as string,
      email: formData.get('email') as string,
      plan_type: formData.get('plan_type') as string,
    };

    try {
      await createBarbershop(barbershopData);
      toast({
        title: 'Barbearia criada com sucesso!',
        description: 'Nova filial adicionada ao seu negócio.',
      });
      setShowCreateDialog(false);
      // Reset form
      (e.target as HTMLFormElement).reset();
    } catch (error: any) {
      toast({
        title: 'Erro ao criar barbearia',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsCreating(false);
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
    toast({
      title: 'Link copiado!',
      description: 'Link de agendamento copiado para a área de transferência.',
    });
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

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Scissors className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-bold">BarberHive</h1>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard')}>
              Dashboard Principal
            </Button>
            <span className="text-sm text-muted-foreground">
              Olá, {user?.user_metadata?.full_name || user?.email}
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
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-3xl font-bold">Minhas Barbearias</h2>
            <p className="text-muted-foreground">
              Gerencie todas as suas filiais em um só lugar
            </p>
          </div>
          
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Nova Barbearia
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Adicionar Nova Barbearia</DialogTitle>
                <DialogDescription>
                  Configure os dados da nova filial
                </DialogDescription>
              </DialogHeader>
              
              <form onSubmit={handleCreateBarbershop} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome da Barbearia *</Label>
                  <Input
                    id="name"
                    name="name"
                    placeholder="Ex: Barbearia Centro"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="slogan">Slogan</Label>
                  <Input
                    id="slogan"
                    name="slogan"
                    placeholder="Ex: A filial do centro"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="address">Endereço</Label>
                  <Input
                    id="address"
                    name="address"
                    placeholder="Rua, número, bairro, cidade"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="phone">Telefone</Label>
                    <Input
                      id="phone"
                      name="phone"
                      placeholder="(11) 99999-9999"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      placeholder="contato@barbearia.com"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="plan_type">Plano</Label>
                  <Select name="plan_type" defaultValue="basic">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="basic">Básico - Grátis</SelectItem>
                      <SelectItem value="premium">Premium - R$ 49/mês</SelectItem>
                      <SelectItem value="enterprise">Enterprise - R$ 99/mês</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setShowCreateDialog(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={isCreating}>
                    {isCreating ? 'Criando...' : 'Criar Barbearia'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Barbershops Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {barbershops.map((barbershop) => (
            <Card key={barbershop.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <Store className="h-5 w-5 text-primary" />
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
                <div className="space-y-2 text-sm text-muted-foreground mb-4">
                  {barbershop.address && (
                    <p>📍 {barbershop.address}</p>
                  )}
                  {barbershop.phone && (
                    <p>📞 {barbershop.phone}</p>
                  )}
                </div>
                
                {/* Booking Link */}
                <div className="bg-muted p-3 rounded-lg mb-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Link2 className="h-4 w-4 text-primary" />
                      <span className="text-sm font-medium">Link próprio</span>
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
                    barberhive.com/booking/{barbershop.slug}
                  </p>
                </div>

                 {/* Management Buttons */}
                 <div className="grid grid-cols-2 gap-2 mb-3">
                   <Button
                     variant="outline"
                     size="sm"
                     onClick={() => navigate(`/barbershop/${barbershop.id}/employees`)}
                   >
                     <UserCheck className="h-4 w-4 mr-1" />
                     Funcionários
                   </Button>
                   <Button
                     variant="outline"
                     size="sm"
                     onClick={() => navigate(`/barbershop/${barbershop.id}/services`)}
                   >
                     <Scissors className="h-4 w-4 mr-1" />
                     Serviços
                   </Button>
                   <Button
                     variant="outline"
                     size="sm"
                     onClick={() => navigate(`/barbershop/${barbershop.id}/clients`)}
                   >
                     <Users className="h-4 w-4 mr-1" />
                     Clientes
                   </Button>
                   <Button
                     variant="outline"
                     size="sm"
                     onClick={() => navigate(`/barbershop/${barbershop.id}/analytics`)}
                   >
                     <TrendingUp className="h-4 w-4 mr-1" />
                     Análises
                   </Button>
                   <Button
                     variant="outline"
                     size="sm"
                     onClick={() => navigate(`/barbershop/${barbershop.id}/commissions`)}
                   >
                     <DollarSign className="h-4 w-4 mr-1" />
                     Comissões
                   </Button>
                   <Button
                     variant="outline"
                     size="sm"
                     onClick={() => navigate(`/barbershop/${barbershop.id}/subscriptions`)}
                   >
                     <Crown className="h-4 w-4 mr-1" />
                     Assinaturas
                   </Button>
                   <Button
                     variant="outline"
                     size="sm"
                     onClick={() => navigate(`/barbershop/${barbershop.id}/appointments`)}
                   >
                     <History className="h-4 w-4 mr-1" />
                     Histórico
                   </Button>
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => navigate(`/barbershop/${barbershop.id}/operational`)}
                    >
                      <CreditCard className="h-4 w-4 mr-1" />
                      Pagamentos
                    </Button>
                 </div>

                {/* Settings Button */}
                <Button
                  variant="secondary"
                  size="sm"
                  className="w-full"
                  onClick={() => navigate(`/barbershop/${barbershop.id}/settings`)}
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Configurações da Barbearia
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {barbershops.length === 0 && (
          <div className="text-center py-12">
            <Store className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhuma barbearia encontrada</h3>
            <p className="text-muted-foreground mb-4">
              Comece adicionando sua primeira barbearia
            </p>
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Criar Primeira Barbearia
            </Button>
          </div>
        )}
      </main>
    </div>
  );
};

export default BarbershopsManager;