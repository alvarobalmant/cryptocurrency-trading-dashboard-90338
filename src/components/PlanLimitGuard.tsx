import { ReactNode, useState } from 'react';
import { usePlanLimits } from '@/hooks/usePlanLimits';
import { useSubscription, PlanType, PLAN_LIMITS } from '@/hooks/useSubscription';
import { UpgradeDialog } from './UpgradeDialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Crown, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PlanLimitGuardProps {
  children: ReactNode;
  feature: 'employees' | 'services' | 'appointments';
  currentCount?: number; // Made optional since we get it from the hook
  barbershopId?: string;
  requiredPlan?: PlanType;
  fallback?: ReactNode;
}

export const PlanLimitGuard = ({ 
  children, 
  feature, 
  currentCount, 
  barbershopId,
  requiredPlan,
  fallback 
}: PlanLimitGuardProps) => {
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);
  const { subscription, isFeatureAvailable } = useSubscription();
  const { usageStats } = usePlanLimits(barbershopId);

  // Use backend validation - now that RLS is working properly
  const canAccess = usageStats ? (() => {
    switch (feature) {
      case 'employees':
        return usageStats.can_add_employee;
      case 'services':
        return usageStats.can_add_service;
      case 'appointments':
        return usageStats.can_create_appointment;
      default:
        return true;
    }
  })() : (currentCount !== undefined ? isFeatureAvailable(feature, currentCount) : true);

  // If a specific plan is required and user doesn't have it
  if (requiredPlan && subscription.plan !== requiredPlan) {
    const requiredPlanInfo = PLAN_LIMITS[requiredPlan];
    
    if (fallback) {
      return <>{fallback}</>;
    }

    return (
      <>
        <Alert className="border-amber-200 bg-amber-50">
          <Crown className="h-4 w-4 text-amber-600" />
          <AlertDescription className="flex items-center justify-between">
            <span>
              Este recurso requer o plano <strong>{requiredPlan}</strong> (R$ {requiredPlanInfo.price.toFixed(2).replace('.', ',')}/mês)
            </span>
            <Button 
              size="sm" 
              onClick={() => setShowUpgradeDialog(true)}
              className="ml-4"
            >
              Fazer Upgrade
            </Button>
          </AlertDescription>
        </Alert>
        
        <UpgradeDialog 
          open={showUpgradeDialog}
          onOpenChange={setShowUpgradeDialog}
          barbershopId={barbershopId}
        />
      </>
    );
  }

  // Check if feature is available
  if (!canAccess) {
    const currentLimit = usageStats ? 
      (feature === 'employees' ? usageStats.max_employees :
       feature === 'services' ? usageStats.max_services :
       usageStats.max_appointments_per_month) :
      PLAN_LIMITS[subscription.plan][
        feature === 'employees' ? 'employees' : 
        feature === 'services' ? 'services' : 
        'appointmentsPerMonth'
      ];
    
    if (fallback) {
      return <>{fallback}</>;
    }

    return (
      <>
        <Alert className="border-orange-200 bg-orange-50">
          <Lock className="h-4 w-4 text-orange-600" />
          <AlertDescription className="flex items-center justify-between">
            <span>
              Limite atingido: {currentLimit === -1 ? 'Ilimitado' : currentLimit} {
                feature === 'employees' ? 'funcionários' :
                feature === 'services' ? 'serviços' :
                'agendamentos por mês'
              }
            </span>
            <Button 
              size="sm" 
              onClick={() => setShowUpgradeDialog(true)}
              className="ml-4"
            >
              Ver Planos
            </Button>
          </AlertDescription>
        </Alert>
        
        <UpgradeDialog 
          open={showUpgradeDialog}
          onOpenChange={setShowUpgradeDialog}
          barbershopId={barbershopId}
        />
      </>
    );
  }

  return <>{children}</>;
};