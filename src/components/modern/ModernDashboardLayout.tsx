import barberPlusLogo from '@/assets/barber-plus-logo.png';
import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useBarbershop } from '@/hooks/useBarbershop';
import { useBarbershops } from '@/hooks/useBarbershops';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { 
  Scissors, 
  LogOut, 
  Calendar, 
  Users, 
  UserCheck, 
  Link2, 
  Copy, 
  Store, 
  TrendingUp, 
  ArrowUpDown, 
  DollarSign, 
  History, 
  CreditCard, 
  Settings,
  Crown,
  Menu,
  X,
  MessageCircle,
  Clock,
  Package,
  Bell,
  FileText,
  Plus,
  Sparkles,
  ArrowLeft,
  ArrowRight,
  Check,
  MapPin,
  Phone,
  Mail,
  MessageSquare
} from 'lucide-react';
import { useNavigate, useParams, Outlet, useLocation } from 'react-router-dom';
import { cn, getUserDisplayName } from '@/lib/utils';
import ModernSidebar from './ModernSidebar';
import { BarbershopChatbot } from '@/components/BarbershopChatbot';

interface SidebarItem {
  id: string;
  label: string;
  icon: any;
  badge: string | null;
  route: string;
}

const ModernDashboardLayout = () => {
  const { user, signOut } = useAuth();
  const { barbershop, loading, selectBarbershop } = useBarbershop();
  const { barbershops, createBarbershop } = useBarbershops();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [chatbotOpen, setChatbotOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    name: '',
    slogan: '',
    address: '',
    phone: '',
    email: '',
  });
  const navigate = useNavigate();
  const params = useParams();
  const location = useLocation();

  const currentBarbershopId = params.barbershopId || barbershop?.id;

  // Auto-select barbershop based on URL parameter
  React.useEffect(() => {
    if (params.barbershopId && barbershops.length > 0 && (!barbershop || barbershop.id !== params.barbershopId)) {
      const urlBarbershop = barbershops.find(b => b.id === params.barbershopId);
      if (urlBarbershop) {
        selectBarbershop(urlBarbershop);
      }
    }
  }, [params.barbershopId, barbershops, barbershop, selectBarbershop]);

  const handleBarbershopChange = (value: string) => {
    if (value === '__create_new__') {
      setCreateDialogOpen(true);
      return;
    }
    
    const selectedBarbershop = barbershops.find(b => b.id === value);
    if (selectedBarbershop) {
      selectBarbershop(selectedBarbershop);
      const currentSection = location.pathname.split('/').pop();
      navigate(`/barbershop/${value}/${currentSection}`);
    }
  };

  const totalSteps = 3;

  const updateFormData = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleNext = () => {
    if (currentStep === 1 && !formData.name.trim()) {
      toast.error('Por favor, preencha o nome da barbearia.');
      return;
    }
    
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleCreateBarbershop = async () => {
    if (!formData.name.trim()) {
      toast.error('Por favor, preencha o nome da barbearia.');
      return;
    }

    setIsCreating(true);
    try {
      const newBarbershop = await createBarbershop({
        name: formData.name.trim(),
        slogan: formData.slogan || null,
        address: formData.address || null,
        phone: formData.phone || null,
        email: formData.email || null,
        active: true,
      });
      
      toast.success('Barbearia criada com sucesso! 🎉');
      setCreateDialogOpen(false);
      setFormData({ name: '', slogan: '', address: '', phone: '', email: '' });
      setCurrentStep(1);
      selectBarbershop(newBarbershop);
      
      const currentSection = location.pathname.split('/').pop();
      navigate(`/barbershop/${newBarbershop.id}/${currentSection}`);
    } catch (error) {
      console.error('Error creating barbershop:', error);
      toast.error('Erro ao criar barbearia');
    } finally {
      setIsCreating(false);
    }
  };

  const copyBookingLink = (slug: string) => {
    const bookingLink = `${window.location.origin}/booking/${slug}`;
    navigator.clipboard.writeText(bookingLink);
    toast.success('Link de agendamento copiado!');
  };

  const sidebarItems: SidebarItem[] = [
    {
      id: 'overview',
      label: 'Visão Geral',
      icon: Store,
      badge: null,
      route: `/barbershop/${currentBarbershopId}/overview`
    },
    {
      id: 'employees',
      label: 'Funcionários',
      icon: UserCheck,
      badge: null,
      route: `/barbershop/${currentBarbershopId}/employees`
    },
    {
      id: 'services',
      label: 'Serviços',
      icon: Scissors,
      badge: null,
      route: `/barbershop/${currentBarbershopId}/services`
    },
    {
      id: 'clients',
      label: 'Clientes',
      icon: Users,
      badge: null,
      route: `/barbershop/${currentBarbershopId}/clients`
    },
    {
      id: 'virtual-queue',
      label: 'Fila Virtual',
      icon: Clock,
      badge: null,
      route: `/barbershop/${currentBarbershopId}/virtual-queue`
    },
    {
      id: 'analytics',
      label: 'Análises',
      icon: TrendingUp,
      badge: null,
      route: `/barbershop/${currentBarbershopId}/analytics`
    },
    {
      id: 'products',
      label: 'Produtos',
      icon: Package,
      badge: 'Novo',
      route: `/barbershop/${currentBarbershopId}/products`
    },
    {
      id: 'subscriptions',
      label: 'Assinaturas',
      icon: Crown,
      badge: null,
      route: `/barbershop/${currentBarbershopId}/subscriptions`
    },
    {
      id: 'appointments',
      label: 'Histórico',
      icon: History,
      badge: null,
      route: `/barbershop/${currentBarbershopId}/appointments`
    },
    {
      id: 'operational',
      label: 'Pagamentos',
      icon: CreditCard,
      badge: null,
      route: `/barbershop/${currentBarbershopId}/operational`
    },
    {
      id: 'commissions',
      label: 'Comissões',
      icon: DollarSign,
      badge: null,
      route: `/barbershop/${currentBarbershopId}/commissions`
    },
    {
      id: 'commissions-periods',
      label: 'Comissões 2',
      icon: Calendar,
      badge: 'Beta',
      route: `/barbershop/${currentBarbershopId}/commissions-periods`
    },
    {
      id: 'tabs',
      label: 'Comandas',
      icon: FileText,
      badge: null,
      route: `/barbershop/${currentBarbershopId}/tabs`
    },
    {
      id: 'agenda',
      label: 'Agenda',
      icon: Calendar,
      badge: null,
      route: `/barbershop/${currentBarbershopId}/agenda`
    },
    {
      id: 'settings',
      label: 'Configurações',
      icon: Settings,
      badge: null,
      route: `/barbershop/${currentBarbershopId}/settings`
    },
    {
      id: 'notifications',
      label: 'Avisos',
      icon: Bell,
      badge: null,
      route: `/barbershop/${currentBarbershopId}/notifications`
    },
    {
      id: 'whatsapp',
      label: 'Chatbot IA',
      icon: MessageCircle,
      badge: 'Novo',
      route: `/barbershop/${currentBarbershopId}/whatsapp`
    }
  ];

  const getCurrentSection = () => {
    const pathSegments = location.pathname.split('/');
    const lastSegment = pathSegments[pathSegments.length - 1];
    return lastSegment || 'overview';
  };

  const handleSectionChange = (sectionId: string) => {
    const item = sidebarItems.find(i => i.id === sectionId);
    if (item && item.route) {
      navigate(item.route);
    }
    setSidebarOpen(false);
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

  if (!barbershop) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <Store className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">Selecione uma barbearia</h3>
          <p className="text-muted-foreground mb-4">
            Você precisa selecionar uma barbearia para continuar
          </p>
          <Button onClick={() => navigate('/barbershops')}>
            Selecionar Barbearia
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar Desktop */}
      <aside className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-40 lg:w-64 lg:flex lg:flex-col lg:h-screen border-r border-border">
        <div className="flex flex-col h-full bg-card">
          {/* Header da Sidebar */}
          <div className="flex items-center justify-between p-6 border-b border-border">
            <div className="flex items-center gap-2">
                <img src={barberPlusLogo} alt="Barber+" className="h-7 w-auto" />
            </div>
          </div>

          {/* Seletor de Barbearia */}
          <div className="p-4 border-b border-border">
            <div className="space-y-2">
              <div className="text-sm font-medium text-foreground">{barbershop.name}</div>
              <Select value={barbershop.id} onValueChange={handleBarbershopChange}>
                <SelectTrigger className="w-full">
                  <ArrowUpDown className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {barbershops.map((shop) => (
                    <SelectItem key={shop.id} value={shop.id}>
                      {shop.name}
                    </SelectItem>
                  ))}
                  <SelectItem 
                    value="__create_new__" 
                    className="border-t border-border mt-1 pt-2 hover:bg-blue-50 dark:hover:bg-blue-950/30"
                  >
                    <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 font-medium">
                      <Plus className="h-4 w-4" />
                      <span>Criar nova barbearia</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Link de Agendamento */}
          <div className="p-4 border-b border-border">
            <div className="bg-muted p-3 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Link2 className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium text-foreground">Link de agendamento</span>
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
                barberplus.com/booking/{barbershop.slug}
              </p>
            </div>
          </div>

          {/* Menu Items */}
          <div className="flex-1 min-h-0 p-4 space-y-2 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-slate-100">
            {sidebarItems.map((item) => {
              const Icon = item.icon;
              const isActive = getCurrentSection() === item.id;
              
              return (
                <button
                  key={item.id}
                  onClick={() => handleSectionChange(item.id)}
                  className={cn(
                    "w-full flex items-center justify-between px-3 py-2 text-left rounded-md transition-all duration-200",
                    isActive
                      ? "bg-foreground text-background"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <div className="flex items-center space-x-3">
                    <Icon className="w-4 h-4" />
                    <span className="text-sm font-medium">{item.label}</span>
                  </div>
                  
                  {item.badge && (
                    <Badge variant="secondary" className="text-xs">
                      {item.badge}
                    </Badge>
                  )}
                </button>
              );
            })}
          </div>

          {/* Footer da Sidebar */}
          <div className="p-4 border-t border-border">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="text-sm font-medium text-foreground">
                  {getUserDisplayName(user)}
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={signOut}>
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50 bg-background/80 backdrop-blur-sm">
          <div className="fixed inset-y-0 left-0 w-64 bg-card border-r border-border">
            <div className="flex items-center justify-between p-6 border-b border-border">
              <div className="flex items-center gap-2">
                <img src={barberPlusLogo} alt="Barber+" className="h-7 w-auto" />
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSidebarOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="p-4 space-y-2">
              {sidebarItems.map((item) => {
                const Icon = item.icon;
                const isActive = getCurrentSection() === item.id;
                
                return (
                  <button
                    key={item.id}
                    onClick={() => handleSectionChange(item.id)}
                    className={cn(
                      "w-full flex items-center space-x-3 px-3 py-2 text-left rounded-md transition-all duration-200",
                      isActive
                        ? "bg-foreground text-background"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="text-sm font-medium">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 lg:ml-64">
        {/* Header Mobile */}
        <header className="lg:hidden border-b border-border bg-card">
          <div className="flex items-center justify-between p-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </Button>
            <div className="text-sm font-medium text-foreground">{barbershop.name}</div>
            <Button variant="ghost" size="sm" onClick={signOut}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1">
          <Outlet />
        </main>
      </div>

      {/* Chatbot */}
      {barbershop && (
        <BarbershopChatbot 
          barbershopId={barbershop.id} 
          isOpen={chatbotOpen}
          onOpenChange={setChatbotOpen}
        />
      )}

      {/* Create Barbershop Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={(open) => {
        setCreateDialogOpen(open);
        if (!open) {
          setFormData({ name: '', slogan: '', address: '', phone: '', email: '' });
          setCurrentStep(1);
          setIsCreating(false);
        }
      }}>
        <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Vamos configurar sua barbearia! ✂️</DialogTitle>
            <DialogDescription>
              Preencha as informações básicas
            </DialogDescription>
          </DialogHeader>

          {/* Progress Bar */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-foreground">
                Passo {currentStep} de {totalSteps}
              </span>
              <span className="text-sm text-muted-foreground">
                {Math.round((currentStep / totalSteps) * 100)}% completo
              </span>
            </div>
            <Progress value={(currentStep / totalSteps) * 100} />
          </div>

          {/* Step 1: Informações Básicas */}
          {currentStep === 1 && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="text-center space-y-2 pb-4">
                <div className="flex justify-center mb-3">
                  <div className="flex items-center justify-center w-12 h-12 bg-primary/10 rounded-xl">
                    <Store className="w-6 h-6 text-primary" />
                  </div>
                </div>
                <h2 className="text-2xl font-bold text-foreground">
                  Informações Básicas
                </h2>
                <p className="text-sm text-muted-foreground">
                  Como sua barbearia será conhecida no sistema?
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="name" className="text-sm font-medium">
                  Nome da Barbearia *
                </Label>
                <div className="relative">
                  <Store className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => updateFormData('name', e.target.value)}
                    placeholder="Ex: Barbearia Elegance"
                    className="pl-10 h-12"
                    autoFocus
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Este nome aparecerá para seus clientes e na agenda
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="slogan" className="text-sm font-medium">
                  Slogan <span className="text-muted-foreground">(opcional)</span>
                </Label>
                <div className="relative">
                  <Sparkles className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    id="slogan"
                    value={formData.slogan}
                    onChange={(e) => updateFormData('slogan', e.target.value)}
                    placeholder="Ex: Estilo e tradição em cada corte"
                    className="pl-10 h-12"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Localização */}
          {currentStep === 2 && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="text-center space-y-2 pb-4">
                <div className="flex justify-center mb-3">
                  <div className="flex items-center justify-center w-12 h-12 bg-purple-500/10 rounded-xl">
                    <MapPin className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                  </div>
                </div>
                <h2 className="text-2xl font-bold text-foreground">
                  Onde você está?
                </h2>
                <p className="text-sm text-muted-foreground">
                  Ajude seus clientes a encontrarem você
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="address" className="text-sm font-medium">
                  Endereço Completo <span className="text-muted-foreground">(opcional)</span>
                </Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3 w-5 h-5 text-muted-foreground" />
                  <Textarea
                    id="address"
                    value={formData.address}
                    onChange={(e) => updateFormData('address', e.target.value)}
                    placeholder="Rua, número, bairro, cidade - Estado"
                    className="pl-10 resize-none"
                    rows={3}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Este endereço aparecerá nos agendamentos e confirmações
                </p>
              </div>
            </div>
          )}

          {/* Step 3: Contato */}
          {currentStep === 3 && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="text-center space-y-2 pb-4">
                <div className="flex justify-center mb-3">
                  <div className="flex items-center justify-center w-12 h-12 bg-green-500/10 rounded-xl">
                    <MessageSquare className="w-6 h-6 text-green-600 dark:text-green-400" />
                  </div>
                </div>
                <h2 className="text-2xl font-bold text-foreground">
                  Como seus clientes te encontram?
                </h2>
                <p className="text-sm text-muted-foreground">
                  Informações de contato para seus clientes
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone" className="text-sm font-medium">
                  Telefone/WhatsApp <span className="text-muted-foreground">(opcional)</span>
                </Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => updateFormData('phone', e.target.value)}
                    placeholder="(00) 00000-0000"
                    className="pl-10 h-12"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium">
                  E-mail de Contato <span className="text-muted-foreground">(opcional)</span>
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => updateFormData('email', e.target.value)}
                    placeholder="contato@suabarbearia.com"
                    className="pl-10 h-12"
                  />
                </div>
              </div>

              <div className="bg-primary/5 rounded-xl p-4 border border-primary/10">
                <div className="flex items-start gap-3">
                  <div className="flex items-center justify-center w-8 h-8 bg-primary/10 rounded-lg flex-shrink-0">
                    <Check className="w-5 h-5 text-primary" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-foreground">
                      Você pode pular estes campos
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Não se preocupe! Você pode adicionar ou editar essas informações a qualquer momento nas configurações.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex items-center justify-between pt-6 border-t">
            {currentStep > 1 ? (
              <Button
                type="button"
                variant="outline"
                onClick={handleBack}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Voltar
              </Button>
            ) : (
              <div />
            )}

            {currentStep < totalSteps ? (
              <Button
                type="button"
                onClick={handleNext}
                className="flex items-center gap-2"
              >
                Próximo
                <ArrowRight className="w-4 h-4" />
              </Button>
            ) : (
              <Button
                type="button"
                onClick={handleCreateBarbershop}
                disabled={isCreating}
                className="flex items-center gap-2"
              >
                {isCreating ? (
                  <>Criando...</>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    Finalizar
                  </>
                )}
              </Button>
            )}
          </div>

          {/* Steps Indicator */}
          <div className="flex justify-center gap-2 mt-6">
            {[1, 2, 3].map((step) => (
              <div
                key={step}
                className={`h-2 rounded-full transition-all duration-300 ${
                  step === currentStep
                    ? 'w-8 bg-primary'
                    : step < currentStep
                    ? 'w-2 bg-green-500'
                    : 'w-2 bg-muted'
                }`}
              />
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ModernDashboardLayout;