import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useBarbershops } from '@/hooks/useBarbershops';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { 
  Store, 
  MapPin, 
  Phone, 
  Mail, 
  MessageSquare, 
  Check, 
  ArrowRight, 
  ArrowLeft,
  Sparkles,
  Building2,
  LogOut
} from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';

const BarbershopSetup = () => {
  const { user, signOut } = useAuth();
  const { createBarbershop } = useBarbershops();
  const [isCreating, setIsCreating] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const { toast } = useToast();
  const navigate = useNavigate();

  // Form data
  const [formData, setFormData] = useState({
    name: '',
    slogan: '',
    address: '',
    phone: '',
    email: '',
  });

  const totalSteps = 3;

  const updateFormData = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleNext = () => {
    // Validação do step atual
    if (currentStep === 1 && !formData.name.trim()) {
      toast({
        title: 'Campo obrigatório',
        description: 'Por favor, preencha o nome da barbearia.',
        variant: 'destructive',
      });
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
      toast({
        title: 'Campo obrigatório',
        description: 'Por favor, preencha o nome da barbearia.',
        variant: 'destructive',
      });
      return;
    }

    setIsCreating(true);

    try {
      await createBarbershop({
        name: formData.name,
        slogan: formData.slogan || null,
        address: formData.address || null,
        phone: formData.phone || null,
        email: formData.email || null,
        plan_type: 'free',
      });
      
      toast({
        title: 'Barbearia criada com sucesso! 🎉',
        description: 'Bem-vindo ao Barber+',
      });
      
      navigate('/dashboard');
    } catch (error: any) {
      toast({
        title: 'Erro ao criar barbearia',
        description: error.message,
        variant: 'destructive',
      });
      setIsCreating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 p-6 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          <span className="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg text-white font-bold text-lg">
            B+
          </span>
          <span className="font-display text-2xl font-bold text-gray-900">
            Barber<span className="text-indigo-500">+</span>
          </span>
        </Link>
        <Button variant="ghost" size="sm" onClick={signOut} className="text-gray-600">
          <LogOut className="h-4 w-4 mr-2" />
          Sair
        </Button>
      </div>

      {/* Main Content */}
      <div className="flex items-center justify-center min-h-screen p-4 pt-24">
        <div className="w-full max-w-2xl">
          {/* Welcome Message */}
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <div className="flex items-center justify-center w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl shadow-lg">
                <Building2 className="w-8 h-8 text-white" />
              </div>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Vamos configurar sua barbearia! ✂️
            </h1>
            <p className="text-gray-600">
              Olá, {user?.user_metadata?.name || user?.email?.split('@')[0]}! Estamos quase lá.
            </p>
          </div>

          {/* Progress Bar */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">
                Passo {currentStep} de {totalSteps}
              </span>
              <span className="text-sm text-gray-500">
                {Math.round((currentStep / totalSteps) * 100)}% completo
              </span>
            </div>
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-indigo-500 to-purple-600 transition-all duration-500 ease-out"
                style={{ width: `${(currentStep / totalSteps) * 100}%` }}
              />
            </div>
          </div>

          {/* Form Card */}
          <div className="bg-white rounded-2xl shadow-xl p-8 space-y-6">
            {/* Step 1: Informações Básicas */}
            {currentStep === 1 && (
              <div className="space-y-6 animate-in fade-in duration-300">
                <div className="text-center space-y-2 pb-4">
                  <div className="flex justify-center mb-3">
                    <div className="flex items-center justify-center w-12 h-12 bg-indigo-100 rounded-xl">
                      <Store className="w-6 h-6 text-indigo-600" />
                    </div>
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900">
                    Informações Básicas
                  </h2>
                  <p className="text-sm text-gray-600">
                    Como sua barbearia será conhecida no sistema?
                  </p>
                </div>

                {/* Nome da Barbearia */}
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-sm font-medium text-gray-700">
                    Nome da Barbearia *
                  </Label>
                  <div className="relative">
                    <Store className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => updateFormData('name', e.target.value)}
                      placeholder="Ex: Barbearia Elegance"
                      className="pl-10 h-12 border-gray-300 focus:border-indigo-500 focus:ring-indigo-500"
                      autoFocus
                    />
                  </div>
                  <p className="text-xs text-gray-500">
                    Este nome aparecerá para seus clientes e na agenda
                  </p>
                </div>

                {/* Slogan */}
                <div className="space-y-2">
                  <Label htmlFor="slogan" className="text-sm font-medium text-gray-700">
                    Slogan <span className="text-gray-400">(opcional)</span>
                  </Label>
                  <div className="relative">
                    <Sparkles className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <Input
                      id="slogan"
                      value={formData.slogan}
                      onChange={(e) => updateFormData('slogan', e.target.value)}
                      placeholder="Ex: Estilo e tradição em cada corte"
                      className="pl-10 h-12 border-gray-300 focus:border-indigo-500 focus:ring-indigo-500"
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
                    <div className="flex items-center justify-center w-12 h-12 bg-purple-100 rounded-xl">
                      <MapPin className="w-6 h-6 text-purple-600" />
                    </div>
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900">
                    Onde você está?
                  </h2>
                  <p className="text-sm text-gray-600">
                    Ajude seus clientes a encontrarem você
                  </p>
                </div>

                {/* Endereço */}
                <div className="space-y-2">
                  <Label htmlFor="address" className="text-sm font-medium text-gray-700">
                    Endereço Completo <span className="text-gray-400">(opcional)</span>
                  </Label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                    <textarea
                      id="address"
                      value={formData.address}
                      onChange={(e) => updateFormData('address', e.target.value)}
                      placeholder="Rua, número, bairro, cidade - Estado"
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 focus:outline-none resize-none"
                      rows={3}
                    />
                  </div>
                  <p className="text-xs text-gray-500">
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
                    <div className="flex items-center justify-center w-12 h-12 bg-green-100 rounded-xl">
                      <MessageSquare className="w-6 h-6 text-green-600" />
                    </div>
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900">
                    Como seus clientes te encontram?
                  </h2>
                  <p className="text-sm text-gray-600">
                    Informações de contato para seus clientes
                  </p>
                </div>

                {/* Telefone */}
                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-sm font-medium text-gray-700">
                    Telefone/WhatsApp <span className="text-gray-400">(opcional)</span>
                  </Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) => updateFormData('phone', e.target.value)}
                      placeholder="(00) 00000-0000"
                      className="pl-10 h-12 border-gray-300 focus:border-indigo-500 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                {/* Email */}
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium text-gray-700">
                    E-mail de Contato <span className="text-gray-400">(opcional)</span>
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => updateFormData('email', e.target.value)}
                      placeholder="contato@suabarbearia.com"
                      className="pl-10 h-12 border-gray-300 focus:border-indigo-500 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                {/* Info Box */}
                <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl p-4 border border-indigo-100">
                  <div className="flex items-start gap-3">
                    <div className="flex items-center justify-center w-8 h-8 bg-indigo-100 rounded-lg flex-shrink-0">
                      <Check className="w-5 h-5 text-indigo-600" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-gray-900">
                        Você pode pular estes campos
                      </p>
                      <p className="text-xs text-gray-600">
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
                  className="flex items-center gap-2 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700"
                >
                  Próximo
                  <ArrowRight className="w-4 h-4" />
                </Button>
              ) : (
                <Button
                  type="button"
                  onClick={handleCreateBarbershop}
                  disabled={isCreating}
                  className="flex items-center gap-2 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700"
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
          </div>

          {/* Steps Indicator */}
          <div className="flex justify-center gap-2 mt-6">
            {[1, 2, 3].map((step) => (
              <div
                key={step}
                className={`h-2 rounded-full transition-all duration-300 ${
                  step === currentStep
                    ? 'w-8 bg-gradient-to-r from-indigo-500 to-purple-600'
                    : step < currentStep
                    ? 'w-2 bg-green-500'
                    : 'w-2 bg-gray-300'
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BarbershopSetup;
