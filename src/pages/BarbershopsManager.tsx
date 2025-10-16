import barberPlusLogo from '@/assets/barber-plus-logo.png';
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
import { Scissors, LogOut, Plus, Store, Link2, Copy, Settings, Users, Calendar, UserCheck, TrendingUp, DollarSign, History, CreditCard, Crown, Building2, MapPin, Phone, Mail, ExternalLink, Sparkles, FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getUserDisplayName } from '@/lib/utils';

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

  const getPlanConfig = (plan: string | null) => {
    switch (plan) {
      case 'basic': 
        return { 
          color: 'bg-blue-50 text-blue-700 border-blue-200', 
          label: 'Básico',
          gradient: 'from-blue-500 to-blue-600'
        };
      case 'premium': 
        return { 
          color: 'bg-purple-50 text-purple-700 border-purple-200', 
          label: 'Premium',
          gradient: 'from-purple-500 to-purple-600'
        };
      case 'enterprise': 
        return { 
          color: 'bg-orange-50 text-orange-700 border-orange-200', 
          label: 'Enterprise',
          gradient: 'from-orange-500 to-orange-600'
        };
      default: 
        return { 
          color: 'bg-gray-50 text-gray-700 border-gray-200', 
          label: 'Básico',
          gradient: 'from-gray-500 to-gray-600'
        };
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
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="text-center">
          <div className="relative">
            <div className="w-16 h-16 mx-auto mb-6 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center">
              <Scissors className="h-8 w-8 text-white animate-pulse" />
            </div>
            <div className="absolute inset-0 w-16 h-16 mx-auto bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl animate-ping opacity-20"></div>
          </div>
          <p className="text-slate-600 font-medium">Carregando suas barbearias...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Modern Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-slate-200/60 sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                <Scissors className="h-5 w-5 text-white" />
              </div>
              <div>
                <img src={barberPlusLogo} alt="Barber+" className="h-7 md:h-8 w-auto" />
                <p className="text-xs text-slate-500">Gestão Inteligente</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => navigate('/dashboard')}
                className="text-slate-600 hover:text-slate-800 hover:bg-slate-100"
              >
                <Building2 className="h-4 w-4 mr-2" />
                Dashboard Principal
              </Button>
              
              <div className="hidden sm:flex items-center gap-3 px-3 py-2 bg-slate-100 rounded-lg">
                <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-medium">
                    {getUserDisplayName(user).charAt(0).toUpperCase()}
                  </span>
                </div>
                <span className="text-sm text-slate-700 font-medium">
                  {getUserDisplayName(user)}
                </span>
              </div>
              
              <Button 
                variant="outline" 
                size="sm" 
                onClick={signOut}
                className="border-slate-200 text-slate-600 hover:bg-slate-50"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Sair
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-6 py-12">
        <div className="flex flex-col lg:flex-row items-start justify-between gap-8 mb-12">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center">
                <Store className="h-6 w-6 text-white" />
              </div>
              <div>
                <h2 className="text-4xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
                  Minhas Barbearias
                </h2>
                <p className="text-slate-600 mt-2 text-lg">
                  Gerencie todas as suas filiais em um só lugar com facilidade
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-6 mt-6">
              <div className="flex items-center gap-2 text-slate-600">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-sm font-medium">{barbershops.length} {barbershops.length === 1 ? 'barbearia ativa' : 'barbearias ativas'}</span>
              </div>
              <div className="flex items-center gap-2 text-slate-600">
                <Sparkles className="h-4 w-4 text-yellow-500" />
                <span className="text-sm font-medium">Sistema atualizado</span>
              </div>
            </div>
          </div>
          
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button size="lg" className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all duration-200">
                <Plus className="h-5 w-5 mr-2" />
                Nova Barbearia
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md bg-white">
              <DialogHeader>
                <DialogTitle className="text-xl font-semibold text-slate-800">Adicionar Nova Barbearia</DialogTitle>
                <DialogDescription className="text-slate-600">
                  Configure os dados da nova filial para começar
                </DialogDescription>
              </DialogHeader>
              
              <form onSubmit={handleCreateBarbershop} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-sm font-medium text-slate-700">Nome da Barbearia *</Label>
                  <Input
                    id="name"
                    name="name"
                    placeholder="Ex: Barbearia Centro"
                    required
                    className="border-slate-200 focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="slogan" className="text-sm font-medium text-slate-700">Slogan</Label>
                  <Input
                    id="slogan"
                    name="slogan"
                    placeholder="Ex: A melhor barbearia da região"
                    className="border-slate-200 focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="address" className="text-sm font-medium text-slate-700">Endereço</Label>
                  <Input
                    id="address"
                    name="address"
                    placeholder="Rua, número, bairro, cidade"
                    className="border-slate-200 focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="phone" className="text-sm font-medium text-slate-700">Telefone</Label>
                    <Input
                      id="phone"
                      name="phone"
                      placeholder="(11) 99999-9999"
                      className="border-slate-200 focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-sm font-medium text-slate-700">Email</Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      placeholder="contato@barbearia.com"
                      className="border-slate-200 focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="plan_type" className="text-sm font-medium text-slate-700">Plano</Label>
                  <Select name="plan_type" defaultValue="basic">
                    <SelectTrigger className="border-slate-200 focus:border-blue-500 focus:ring-blue-500">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="basic">Básico - Grátis</SelectItem>
                      <SelectItem value="premium">Premium - R$ 49/mês</SelectItem>
                      <SelectItem value="enterprise">Enterprise - R$ 99/mês</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <DialogFooter className="gap-3">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setShowCreateDialog(false)}
                    className="border-slate-200 text-slate-600 hover:bg-slate-50"
                  >
                    Cancelar
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={isCreating}
                    className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white"
                  >
                    {isCreating ? 'Criando...' : 'Criar Barbearia'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Barbershops Grid */}
        {barbershops.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-8">
            {barbershops.map((barbershop) => {
              const planConfig = getPlanConfig(barbershop.plan_type);
              
              return (
                <Card key={barbershop.id} className="group hover:shadow-2xl transition-all duration-300 border-0 bg-white/80 backdrop-blur-sm overflow-hidden">
                  {/* Card Header with Gradient */}
                  <div className={`h-2 bg-gradient-to-r ${planConfig.gradient}`}></div>
                  
                  <CardHeader className="pb-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-12 h-12 bg-gradient-to-r ${planConfig.gradient} rounded-xl flex items-center justify-center`}>
                          <Store className="h-6 w-6 text-white" />
                        </div>
                        <div>
                          <CardTitle className="text-xl font-bold text-slate-800 group-hover:text-slate-900 transition-colors">
                            {barbershop.name}
                          </CardTitle>
                          {barbershop.slogan && (
                            <CardDescription className="text-slate-600 mt-1">
                              {barbershop.slogan}
                            </CardDescription>
                          )}
                        </div>
                      </div>
                      <div className={`px-3 py-1 rounded-full text-xs font-medium border ${planConfig.color}`}>
                        {planConfig.label}
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="space-y-6">
                    {/* Contact Info */}
                    {(barbershop.address || barbershop.phone) && (
                      <div className="space-y-2">
                        {barbershop.address && (
                          <div className="flex items-center gap-2 text-sm text-slate-600">
                            <MapPin className="h-4 w-4 text-slate-400" />
                            <span>{barbershop.address}</span>
                          </div>
                        )}
                        {barbershop.phone && (
                          <div className="flex items-center gap-2 text-sm text-slate-600">
                            <Phone className="h-4 w-4 text-slate-400" />
                            <span>{barbershop.phone}</span>
                          </div>
                        )}
                      </div>
                    )}
                    
                    {/* Booking Link */}
                    <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-4 rounded-xl border border-blue-100">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <ExternalLink className="h-4 w-4 text-blue-600" />
                          <span className="text-sm font-medium text-slate-700">Link de Agendamento</span>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyBookingLink(barbershop.slug)}
                          className="h-8 w-8 p-0 hover:bg-blue-100"
                        >
                          <Copy className="h-4 w-4 text-blue-600" />
                        </Button>
                      </div>
                      <p className="text-xs text-slate-500 font-mono bg-white/60 px-2 py-1 rounded">
                        barberplus.com/booking/{barbershop.slug}
                      </p>
                    </div>

                    {/* Management Actions */}
                    <div className="grid grid-cols-2 gap-3">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`/barbershop/${barbershop.id}/employees`)}
                        className="justify-start border-slate-200 hover:bg-slate-50 hover:border-slate-300"
                      >
                        <UserCheck className="h-4 w-4 mr-2 text-slate-500" />
                        Funcionários
                      </Button>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`/barbershop/${barbershop.id}/services`)}
                        className="justify-start border-slate-200 hover:bg-slate-50 hover:border-slate-300"
                      >
                        <Scissors className="h-4 w-4 mr-2 text-slate-500" />
                        Serviços
                      </Button>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`/barbershop/${barbershop.id}/clients`)}
                        className="justify-start border-slate-200 hover:bg-slate-50 hover:border-slate-300"
                      >
                        <Users className="h-4 w-4 mr-2 text-slate-500" />
                        Clientes
                      </Button>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`/barbershop/${barbershop.id}/analytics`)}
                        className="justify-start border-slate-200 hover:bg-slate-50 hover:border-slate-300"
                      >
                        <TrendingUp className="h-4 w-4 mr-2 text-slate-500" />
                        Análises
                      </Button>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`/barbershop/${barbershop.id}/subscriptions`)}
                        className="justify-start border-slate-200 hover:bg-slate-50 hover:border-slate-300"
                      >
                        <Crown className="h-4 w-4 mr-2 text-slate-500" />
                        Assinaturas
                      </Button>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`/barbershop/${barbershop.id}/appointments`)}
                        className="justify-start border-slate-200 hover:bg-slate-50 hover:border-slate-300"
                      >
                        <History className="h-4 w-4 mr-2 text-slate-500" />
                        Histórico
                      </Button>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`/barbershop/${barbershop.id}/tabs`)}
                        className="justify-start border-slate-200 hover:bg-slate-50 hover:border-slate-300"
                      >
                        <FileText className="h-4 w-4 mr-2 text-slate-500" />
                        Comandas
                      </Button>
                      
                      <Button
                        size="sm"
                        onClick={() => navigate(`/barbershop/${barbershop.id}/operational`)}
                        className="justify-start bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white border-0"
                      >
                        <CreditCard className="h-4 w-4 mr-2" />
                        Pagamentos
                      </Button>
                    </div>

                    {/* Settings Button */}
                    <Button
                      variant="secondary"
                      size="sm"
                      className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 border-0"
                      onClick={() => navigate(`/barbershop/${barbershop.id}/settings`)}
                    >
                      <Settings className="h-4 w-4 mr-2" />
                      Configurações da Barbearia
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          /* Empty State */
          <div className="text-center py-20">
            <div className="relative mb-8">
              <div className="w-24 h-24 mx-auto bg-gradient-to-r from-slate-200 to-slate-300 rounded-3xl flex items-center justify-center">
                <Store className="h-12 w-12 text-slate-400" />
              </div>
              <div className="absolute inset-0 w-24 h-24 mx-auto bg-gradient-to-r from-blue-500 to-purple-600 rounded-3xl animate-ping opacity-10"></div>
            </div>
            
            <h3 className="text-2xl font-bold text-slate-800 mb-3">Nenhuma barbearia encontrada</h3>
            <p className="text-slate-600 mb-8 max-w-md mx-auto">
              Comece sua jornada criando sua primeira barbearia e desbloqueie todo o potencial do Barber+
            </p>
            
            <Button 
              onClick={() => setShowCreateDialog(true)}
              size="lg"
              className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all duration-200"
            >
              <Plus className="h-5 w-5 mr-2" />
              Criar Primeira Barbearia
            </Button>
          </div>
        )}
      </section>
    </div>
  );
};

export default BarbershopsManager;
