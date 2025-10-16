import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Check, ArrowRight, CreditCard, QrCode, Copy, X } from 'lucide-react';
import { useSaasSubscription, SaasPlanType } from '@/hooks/useSaasSubscription';
import { useToast } from '@/hooks/use-toast';

interface UpgradeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  barbershopId?: string;
}

const plans = [
  {
    id: 'basic' as SaasPlanType,
    name: 'Starter',
    description: 'Perfeito para começar',
    monthlyPrice: 29,
    yearlyPrice: 23,
    features: [
      'Até 100 agendamentos/mês',
      '1 profissional',
      'Agenda básica',
      'Cadastro de clientes',
      'Relatórios básicos',
      'Suporte por email'
    ]
  },
  {
    id: 'pro' as SaasPlanType,
    name: 'Professional',
    description: 'Para barbearias em crescimento',
    monthlyPrice: 49,
    yearlyPrice: 39,
    popular: true,
    features: [
      'Agendamentos ilimitados',
      'Até 3 profissionais',
      'WhatsApp integrado',
      'Controle de caixa',
      'Relatórios avançados',
      'Lista de espera',
      'Suporte prioritário'
    ]
  },
  {
    id: 'premium' as SaasPlanType,
    name: 'Enterprise',
    description: 'Para redes e grandes barbearias',
    monthlyPrice: 99,
    yearlyPrice: 79,
    features: [
      'Tudo do Professional',
      'Profissionais ilimitados',
      'Múltiplas unidades',
      'IA para otimização',
      'Marketing automatizado',
      'API personalizada',
      'Gerente de sucesso',
      'Suporte 24/7'
    ]
  }
];

export const UpgradeDialog = ({ open, onOpenChange, barbershopId }: UpgradeDialogProps) => {
  const [loading, setLoading] = useState<string | null>(null);
  const [isYearly, setIsYearly] = useState(false);
  const [showPaymentMethodDialog, setShowPaymentMethodDialog] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<{ planId: SaasPlanType; durationMonths: 1 | 12 } | null>(null);
  const [pixData, setPixData] = useState<{ qr_code: string; qr_code_base64: string } | null>(null);
  const { subscription, createSubscription } = useSaasSubscription(barbershopId || '');
  const { toast } = useToast();

  if (!barbershopId) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Erro</DialogTitle>
            <DialogDescription>
              ID da barbearia não encontrado. Por favor, tente novamente.
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    );
  }

  const handleSelectPlan = (planId: SaasPlanType, durationMonths: 1 | 12) => {
    if (planId === subscription?.plan_type) return;
    setSelectedPlan({ planId, durationMonths });
    setShowPaymentMethodDialog(true);
  };

  const handlePaymentMethod = async (method: 'pix' | 'card') => {
    if (!selectedPlan) return;
    
    setLoading(selectedPlan.planId);
    setShowPaymentMethodDialog(false);
    
    try {
      const result = await createSubscription(selectedPlan.planId, selectedPlan.durationMonths, method);
      
      if (method === 'pix' && result.qr_code && result.qr_code_base64) {
        setPixData({
          qr_code: result.qr_code,
          qr_code_base64: result.qr_code_base64
        });
        toast({
          title: "QR Code gerado!",
          description: "Escaneie o código para realizar o pagamento.",
        });
      } else if (method === 'card' && result.init_point) {
        window.open(result.init_point, '_blank');
        toast({
          title: "Redirecionando...",
          description: "Você será redirecionado para completar o pagamento.",
        });
      }
    } catch (error) {
      console.error('Error creating subscription:', error);
      toast({
        title: "Erro",
        description: "Não foi possível iniciar o processo de pagamento. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setLoading(null);
      setSelectedPlan(null);
    }
  };

  const isCurrentPlan = (planId: SaasPlanType) => subscription?.plan_type === planId;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-3xl font-bold text-center">
            Escolha o plano ideal para sua barbearia
          </DialogTitle>
          <DialogDescription className="text-center text-base">
            Comece grátis e escale conforme seu negócio cresce. Sem taxas ocultas, sem surpresas.
          </DialogDescription>
        </DialogHeader>

        {/* Pricing Toggle */}
        <div className="flex items-center justify-center gap-4 my-6">
          <span className={`font-medium ${!isYearly ? 'text-foreground' : 'text-muted-foreground'}`}>
            Mensal
          </span>
          <button
            onClick={() => setIsYearly(!isYearly)}
            className="relative w-14 h-7 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            style={{ 
              backgroundColor: isYearly ? 'hsl(var(--primary))' : 'hsl(var(--muted))' 
            }}
          >
            <span
              className="absolute top-1 left-1 w-5 h-5 bg-background rounded-full transition-transform shadow-sm"
              style={{ transform: isYearly ? 'translateX(28px)' : 'translateX(0)' }}
            />
          </button>
          <span className={`font-medium ${isYearly ? 'text-foreground' : 'text-muted-foreground'}`}>
            Anual
            <span className="ml-2 px-2 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full">
              -20%
            </span>
          </span>
        </div>

        {/* Plans Grid */}
        <div className="grid md:grid-cols-3 gap-6 mb-6">
          {plans.map((plan) => {
            const isCurrent = isCurrentPlan(plan.id);
            const isLoadingPlan = loading === plan.id;
            const price = isYearly ? plan.yearlyPrice : plan.monthlyPrice;
            const durationMonths = isYearly ? 12 : 1;
            
            return (
              <div
                key={plan.id}
                className={`relative bg-card rounded-2xl border-2 p-6 hover:shadow-2xl transition-all ${
                  plan.popular
                    ? 'border-primary shadow-xl scale-105'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-sm font-bold rounded-full">
                    Mais Popular
                  </div>
                )}

                <div className="mb-6">
                  <h3 className="text-2xl font-bold text-foreground mb-2">{plan.name}</h3>
                  <p className="text-muted-foreground">{plan.description}</p>
                </div>

                <div className="mb-6">
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-bold text-foreground">R$</span>
                    <span className="text-5xl font-bold text-foreground">
                      {price}
                    </span>
                    <span className="text-muted-foreground">/mês</span>
                  </div>
                  {isYearly ? (
                    <>
                      <p className="text-xs text-muted-foreground mt-1">
                        cobrado anualmente
                      </p>
                      <p className="text-sm text-green-600 font-medium mt-2">
                        Economize R$ {(plan.monthlyPrice - plan.yearlyPrice) * 12}/ano
                      </p>
                    </>
                  ) : null}
                </div>

                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-3">
                      <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                      <span className="text-sm text-muted-foreground">{feature}</span>
                    </li>
                  ))}
                </ul>

                {isCurrent ? (
                  <Button 
                    variant="outline" 
                    className="w-full" 
                    disabled
                  >
                    Plano Atual
                  </Button>
                ) : (
                  <Button
                    onClick={() => handleSelectPlan(plan.id, durationMonths)}
                    disabled={isLoadingPlan}
                    className={`w-full flex items-center justify-center gap-2 ${
                      plan.popular
                        ? 'bg-gradient-to-r from-indigo-500 to-purple-600 hover:shadow-xl'
                        : ''
                    }`}
                    variant={plan.popular ? 'default' : 'secondary'}
                  >
                    {isLoadingPlan ? (
                      <span>Processando...</span>
                    ) : (
                      <>
                        <span>Escolher {plan.name}</span>
                        <ArrowRight className="w-5 h-5" />
                      </>
                    )}
                  </Button>
                )}

                <p className="text-center text-sm text-muted-foreground mt-4">
                  {isYearly ? 'Pagamento único - válido por 12 meses' : 'Pagamento recorrente via Mercado Pago'}
                </p>
              </div>
            );
          })}
        </div>

        {/* Payment Method Selection Dialog */}
        <Dialog open={showPaymentMethodDialog} onOpenChange={setShowPaymentMethodDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Escolha a forma de pagamento</DialogTitle>
              <DialogDescription>
                Selecione como deseja realizar o pagamento do plano
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <Button
                onClick={() => handlePaymentMethod('pix')}
                className="w-full h-20 flex items-center justify-center gap-3"
                variant="outline"
              >
                <QrCode className="w-8 h-8" />
                <div className="text-left">
                  <div className="font-semibold">PIX</div>
                  <div className="text-xs text-muted-foreground">Pagamento instantâneo</div>
                </div>
              </Button>
              <Button
                onClick={() => handlePaymentMethod('card')}
                className="w-full h-20 flex items-center justify-center gap-3"
                variant="outline"
              >
                <CreditCard className="w-8 h-8" />
                <div className="text-left">
                  <div className="font-semibold">Cartão de Crédito</div>
                  <div className="text-xs text-muted-foreground">Parcelado ou à vista</div>
                </div>
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* PIX QR Code Dialog */}
        <Dialog open={!!pixData} onOpenChange={() => setPixData(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center justify-between">
                Pagar com PIX
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => setPixData(null)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </DialogTitle>
              <DialogDescription>
                Escaneie o QR Code abaixo com o app do seu banco
              </DialogDescription>
            </DialogHeader>
            {pixData && (
              <div className="flex flex-col items-center gap-4 py-4">
                <div className="bg-white p-4 rounded-lg">
                  <img 
                    src={`data:image/png;base64,${pixData.qr_code_base64}`} 
                    alt="QR Code PIX"
                    className="w-64 h-64"
                  />
                </div>
                <div className="w-full">
                  <p className="text-sm text-muted-foreground mb-2">Ou copie o código PIX:</p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={pixData.qr_code}
                      readOnly
                      className="flex-1 px-3 py-2 text-sm border rounded-md bg-muted"
                    />
                    <Button
                      size="icon"
                      variant="outline"
                      onClick={() => {
                        navigator.clipboard.writeText(pixData.qr_code);
                        toast({
                          title: "Copiado!",
                          description: "Código PIX copiado para a área de transferência.",
                        });
                      }}
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                <p className="text-xs text-center text-muted-foreground">
                  Após o pagamento, seu plano será ativado automaticamente em alguns minutos.
                </p>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  );
};