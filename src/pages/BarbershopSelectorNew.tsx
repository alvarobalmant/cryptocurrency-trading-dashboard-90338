import barberPlusLogo from '@/assets/barber-plus-logo.png';
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useBarbershop } from '@/hooks/useBarbershop';
import { useBarbershops } from '@/hooks/useBarbershops';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Scissors, LogOut, Plus, Store } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getUserDisplayName } from '@/lib/utils';

const BarbershopSelectorNew = () => {
  const { user, signOut } = useAuth();
  const { selectBarbershop } = useBarbershop();
  const { barbershops, loading, createBarbershop } = useBarbershops();
  const [isCreating, setIsCreating] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const navigate = useNavigate();

  const handleSelectBarbershop = (barbershop: any) => {
    selectBarbershop(barbershop);
    navigate(`/barbershop/${barbershop.id}/overview`);
  };

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
      const newBarbershop = await createBarbershop(barbershopData);
      toast.success('Barbearia criada com sucesso!');
      setShowCreateDialog(false);
      (e.target as HTMLFormElement).reset();
      
      // Automatically select and navigate to the new barbershop
      if (newBarbershop) {
        selectBarbershop(newBarbershop);
        navigate(`/barbershop/${newBarbershop.id}/overview`);
      }
    } catch (error: any) {
      toast.error('Erro ao criar barbearia: ' + error.message);
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

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <Scissors className="h-8 w-8 animate-spin mx-auto mb-4 text-foreground" />
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
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
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-3xl font-bold text-foreground">Selecione uma Barbearia</h2>
            <p className="text-muted-foreground">
              Escolha uma barbearia para gerenciar ou crie uma nova
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
                <DialogTitle>Criar Nova Barbearia</DialogTitle>
                <DialogDescription>
                  Configure os dados da nova barbearia
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
                    placeholder="Ex: A melhor barbearia da cidade"
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
            <Card 
              key={barbershop.id} 
              className="hover:shadow-md transition-shadow cursor-pointer border-border"
              onClick={() => handleSelectBarbershop(barbershop)}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <Store className="h-5 w-5 text-foreground" />
                    <CardTitle className="text-lg text-foreground">{barbershop.name}</CardTitle>
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
                </div>
                
                <Button 
                  className="w-full mt-4" 
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSelectBarbershop(barbershop);
                  }}
                >
                  Selecionar Barbearia
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {barbershops.length === 0 && (
          <div className="text-center py-12">
            <Store className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2 text-foreground">Nenhuma barbearia encontrada</h3>
            <p className="text-muted-foreground mb-4">
              Comece criando sua primeira barbearia
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

export default BarbershopSelectorNew;