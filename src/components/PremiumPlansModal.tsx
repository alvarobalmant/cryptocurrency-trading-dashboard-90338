import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, Sparkles, Zap, Crown, ArrowRight } from 'lucide-react';
import { useSubscription, PlanType, PLAN_LIMITS } from '@/hooks/useSubscription';
import { useToast } from '@/hooks/use-toast';

interface PremiumPlansModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const planConfig = {
  free: {
    icon: Zap,
    color: 'hsl(var(--muted))',
    gradient: 'from-slate-50 to-slate-100',
    highlight: 'border-slate-200',
    accentColor: 'text-slate-600'
  },
  basic: {
    icon: Sparkles,
    color: 'hsl(217, 91%, 60%)',
    gradient: 'from-blue-50 to-blue-100',
    highlight: 'border-blue-300',
    accentColor: 'text-blue-600'
  },
  pro: {
    icon: Sparkles,
    color: 'hsl(262, 83%, 58%)',
    gradient: 'from-purple-50 to-purple-100',
    highlight: 'border-purple-400',
    accentColor: 'text-purple-600',
    recommended: true
  },
  premium: {
    icon: Crown,
    color: 'hsl(43, 96%, 56%)',
    gradient: 'from-amber-50 to-amber-100',
    highlight: 'border-amber-400',
    accentColor: 'text-amber-600'
  }
};

export const PremiumPlansModal = ({ open, onOpenChange }: PremiumPlansModalProps) => {
  const [loading, setLoading] = useState<string | null>(null);
  const { subscription, createCheckout } = useSubscription();
  const { toast } = useToast();

  const handleUpgrade = async (plan: PlanType) => {
    if (plan === 'free' || plan === subscription.plan) return;
    
    setLoading(plan);
    try {
      const checkoutUrl = await createCheckout(plan);
      window.open(checkoutUrl, '_blank');
      onOpenChange(false);
    } catch (error) {
      console.error('Error creating checkout:', error);
      toast({
        title: "Erro ao processar",
        description: "Não foi possível iniciar o checkout. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setLoading(null);
    }
  };

  const isCurrentPlan = (plan: PlanType) => subscription.plan === plan;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="space-y-3 pb-6">
          <DialogTitle className="text-3xl font-semibold text-center">
            Escolha o plano ideal para você
          </DialogTitle>
          <DialogDescription className="text-center text-base">
            Aumente sua produtividade e aproveite recursos exclusivos
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 py-4">
          {(Object.keys(PLAN_LIMITS) as PlanType[]).map((plan) => {
            const planInfo = PLAN_LIMITS[plan];
            const config = planConfig[plan];
            const Icon = config.icon;
            const isCurrent = isCurrentPlan(plan);
            const isLoadingPlan = loading === plan;
            
            return (
              <div 
                key={plan} 
                className={`relative rounded-2xl border-2 ${config.highlight} bg-gradient-to-br ${config.gradient} p-6 transition-all hover:shadow-xl ${
                  isCurrent ? 'ring-2 ring-primary shadow-lg scale-105' : ''
                } ${config.recommended ? 'md:scale-105' : ''}`}
              >
                {config.recommended && !isCurrent && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <Badge className="bg-gradient-to-r from-purple-600 to-purple-700 text-white px-4 py-1 shadow-lg">
                      <Sparkles className="w-3 h-3 mr-1" />
                      Recomendado
                    </Badge>
                  </div>
                )}
                
                {isCurrent && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <Badge className="bg-gradient-to-r from-green-600 to-green-700 text-white px-4 py-1 shadow-lg">
                      <Check className="w-3 h-3 mr-1" />
                      Plano Atual
                    </Badge>
                  </div>
                )}
                
                <div className="space-y-6">
                  {/* Header */}
                  <div className="text-center space-y-3">
                    <div className={`inline-flex items-center justify-center w-14 h-14 rounded-xl bg-white shadow-sm ${config.accentColor}`}>
                      <Icon className="w-7 h-7" />
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold capitalize mb-1">
                        {plan === 'free' ? 'Gratuito' : plan === 'basic' ? 'Básico' : plan === 'pro' ? 'Profissional' : 'Premium'}
                      </h3>
                      <div className="text-3xl font-bold">
                        {plan === 'free' ? (
                          <span className={config.accentColor}>R$ 0</span>
                        ) : (
                          <span className={config.accentColor}>
                            R$ {planInfo.price.toFixed(2).replace('.', ',')}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {plan === 'free' ? 'Para sempre' : 'por mês'}
                      </p>
                    </div>
                  </div>

                  {/* Features */}
                  <ul className="space-y-3">
                    {planInfo.features.map((feature, index) => (
                      <li key={index} className="flex items-start gap-3 text-sm">
                        <div className="mt-0.5">
                          <Check className={`w-4 h-4 ${config.accentColor}`} />
                        </div>
                        <span className="text-foreground/80 leading-relaxed">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  {/* CTA Button */}
                  <div className="pt-4">
                    {isCurrent ? (
                      <Button 
                        variant="outline" 
                        className="w-full bg-white/50" 
                        disabled
                      >
                        Seu plano atual
                      </Button>
                    ) : plan === 'free' ? (
                      <Button 
                        variant="outline" 
                        className="w-full bg-white/50" 
                        disabled
                      >
                        Plano básico
                      </Button>
                    ) : (
                      <Button
                        onClick={() => handleUpgrade(plan)}
                        disabled={isLoadingPlan}
                        className={`w-full bg-gradient-to-r ${
                          config.recommended 
                            ? 'from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800' 
                            : config.accentColor === 'text-amber-600'
                            ? 'from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800'
                            : 'from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800'
                        } text-white shadow-md hover:shadow-lg transition-all`}
                      >
                        {isLoadingPlan ? (
                          "Processando..."
                        ) : (
                          <>
                            Escolher {plan}
                            <ArrowRight className="w-4 h-4 ml-2" />
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer note */}
        <div className="text-center pt-6 border-t">
          <p className="text-sm text-muted-foreground">
            Todos os planos incluem suporte técnico. Cancele quando quiser, sem taxas adicionais.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};