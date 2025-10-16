import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Crown, Users, Calendar, TrendingUp, ArrowUpRight, CheckCircle, Briefcase, Zap, Shield, Sparkles } from 'lucide-react';
import { useSaasSubscription } from '@/hooks/useSaasSubscription';
import { usePlanLimits } from '@/hooks/usePlanLimits';
import { UpgradeDialog } from './UpgradeDialog';
import { useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface BarbershopSubscriptionCardProps {
  barbershopId: string;
}

export function BarbershopSubscriptionCard({ barbershopId }: BarbershopSubscriptionCardProps) {
  const { subscription, loading, getDaysRemaining, getCurrentPlan, getPlanConfig } = useSaasSubscription(barbershopId);
  const { stats, loading: loadingLimits } = usePlanLimits(barbershopId);
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);

  if (loading || loadingLimits) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-1/2"></div>
            <div className="h-8 bg-muted rounded w-3/4"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const currentPlan = getCurrentPlan();
  const daysRemaining = getDaysRemaining();

  const getPlanInfo = () => {
    switch (currentPlan) {
      case 'premium':
        return {
          name: 'Premium',
          icon: Crown,
          color: 'text-amber-600',
          bgGradient: 'from-amber-50 to-amber-100',
          borderColor: 'border-amber-300',
          iconBg: 'bg-amber-100',
          price: 'R$ 99,90/mês',
          benefits: [
            'Funcionários ilimitados',
            'Serviços ilimitados',
            'Agendamentos ilimitados',
            'Suporte prioritário',
            'Relatórios avançados'
          ]
        };
      case 'pro':
        return {
          name: 'Profissional',
          icon: TrendingUp,
          color: 'text-purple-600',
          bgGradient: 'from-purple-50 to-purple-100',
          borderColor: 'border-purple-300',
          iconBg: 'bg-purple-100',
          price: 'R$ 49,90/mês',
          benefits: [
            'Até 10 funcionários',
            'Até 20 serviços',
            'Até 500 agendamentos/mês',
            'Suporte via email',
            'Relatórios básicos'
          ]
        };
      case 'basic':
        return {
          name: 'Básico',
          icon: CheckCircle,
          color: 'text-blue-600',
          bgGradient: 'from-blue-50 to-blue-100',
          borderColor: 'border-blue-300',
          iconBg: 'bg-blue-100',
          price: 'R$ 29,90/mês',
          benefits: [
            'Até 3 funcionários',
            'Até 5 serviços',
            'Até 100 agendamentos/mês',
            'Suporte básico'
          ]
        };
      default:
        return {
          name: 'Gratuito',
          icon: TrendingUp,
          color: 'text-slate-600',
          bgGradient: 'from-slate-50 to-slate-100',
          borderColor: 'border-slate-200',
          iconBg: 'bg-slate-100',
          price: 'Grátis',
          benefits: [
            'Até 3 funcionários',
            'Até 2 serviços',
            'Até 10 agendamentos/mês'
          ]
        };
    }
  };

  const planInfo = getPlanInfo();

  const getUsagePercentage = (current: number, max: number) => {
    if (max === -1) return 0;
    return Math.min((current / max) * 100, 100);
  };

  const getUsageColor = (percentage: number) => {
    if (percentage >= 90) return 'bg-red-500';
    if (percentage >= 70) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  return (
    <>
      <Card className={`border-2 ${planInfo.borderColor}`}>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className={`${planInfo.iconBg} p-3 rounded-xl`}>
                <planInfo.icon className={`h-6 w-6 ${planInfo.color}`} />
              </div>
              <div>
                <CardTitle className="text-xl">Sua Assinatura</CardTitle>
                <CardDescription className="flex items-center gap-2 mt-1">
                  <span className={`font-semibold ${planInfo.color}`}>
                    Plano {planInfo.name}
                  </span>
                  <span className="text-muted-foreground">•</span>
                  <span>{planInfo.price}</span>
                </CardDescription>
              </div>
            </div>
            
            <Button
              variant="default"
              size="sm"
              onClick={() => setShowUpgradeDialog(true)}
            >
              {currentPlan === 'free' ? 'Fazer Upgrade' : 'Renovar'}
              <ArrowUpRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {subscription && subscription.status === 'active' && (
            <div className={`bg-gradient-to-br ${planInfo.bgGradient} p-4 rounded-lg border ${planInfo.borderColor}`}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Calendar className={`h-4 w-4 ${planInfo.color}`} />
                  <span className="font-medium text-sm">Período de Assinatura</span>
                </div>
                <Badge variant="secondary" className="bg-white/50">
                  {daysRemaining > 0 ? `${daysRemaining} dias restantes` : 'Expirado'}
                </Badge>
              </div>
              
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground mb-1">Início</p>
                  <p className="font-medium">
                    {subscription.start_date 
                      ? format(new Date(subscription.start_date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })
                      : 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground mb-1">Término</p>
                  <p className="font-medium">
                    {subscription.end_date 
                      ? format(new Date(subscription.end_date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })
                      : 'N/A'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Benefits Section */}
          <div className="space-y-3">
            <h4 className="font-semibold text-sm flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              Benefícios do Plano
            </h4>
            <div className="space-y-2">
              {planInfo.benefits.map((benefit, index) => (
                <div key={index} className="flex items-start gap-2 text-sm">
                  <CheckCircle className={`h-4 w-4 mt-0.5 flex-shrink-0 ${planInfo.color}`} />
                  <span>{benefit}</span>
                </div>
              ))}
            </div>
          </div>

          {!loadingLimits && stats && (
            <div className="space-y-4">
              <h4 className="font-semibold text-sm flex items-center gap-2">
                <Briefcase className="h-4 w-4" />
                Uso do Plano
              </h4>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span>Funcionários</span>
                  </div>
                  <span className="font-medium">
                    {stats.active_employees}/{stats.max_employees === -1 ? '∞' : stats.max_employees}
                  </span>
                </div>
                {stats.max_employees !== -1 && (
                  <Progress 
                    value={getUsagePercentage(stats.active_employees, stats.max_employees)}
                    className="h-2"
                    indicatorClassName={getUsageColor(getUsagePercentage(stats.active_employees, stats.max_employees))}
                  />
                )}
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <Briefcase className="h-4 w-4 text-muted-foreground" />
                    <span>Serviços</span>
                  </div>
                  <span className="font-medium">
                    {stats.active_services}/{stats.max_services === -1 ? '∞' : stats.max_services}
                  </span>
                </div>
                {stats.max_services !== -1 && (
                  <Progress 
                    value={getUsagePercentage(stats.active_services, stats.max_services)}
                    className="h-2"
                    indicatorClassName={getUsageColor(getUsagePercentage(stats.active_services, stats.max_services))}
                  />
                )}
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>Agendamentos este mês</span>
                  </div>
                  <span className="font-medium">
                    {stats.current_month_appointments}/{stats.max_appointments_per_month === -1 ? '∞' : stats.max_appointments_per_month}
                  </span>
                </div>
                {stats.max_appointments_per_month !== -1 && (
                  <Progress 
                    value={getUsagePercentage(stats.current_month_appointments, stats.max_appointments_per_month)}
                    className="h-2"
                    indicatorClassName={getUsageColor(getUsagePercentage(stats.current_month_appointments, stats.max_appointments_per_month))}
                  />
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <UpgradeDialog 
        open={showUpgradeDialog}
        onOpenChange={setShowUpgradeDialog}
        barbershopId={barbershopId}
      />
    </>
  );
}
