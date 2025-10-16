import { ReactNode, useState } from 'react';
import { usePlanLimits } from '@/hooks/usePlanLimits';
import { useSubscription, PlanType } from '@/hooks/useSubscription';
import { UpgradeDialog } from './UpgradeDialog';
import { toast } from 'sonner';

interface PlanLimitWrapperProps {
  children: ReactNode;
  feature: 'employees' | 'services' | 'appointments';
  barbershopId?: string;
  requiredPlan?: PlanType;
  onLimitReached?: () => void;
}

/**
 * Wrapper that allows the button to always show, but intercepts clicks
 * to show upgrade dialog when limit is reached
 */
export const PlanLimitWrapper = ({ 
  children, 
  feature, 
  barbershopId,
  requiredPlan,
  onLimitReached
}: PlanLimitWrapperProps) => {
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);
  const { subscription } = useSubscription();
  const { usageStats } = usePlanLimits(barbershopId);

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
  })() : true;

  const handleClick = (event: React.MouseEvent) => {
    if (!canAccess) {
      event.preventDefault();
      event.stopPropagation();
      event.nativeEvent.stopImmediatePropagation();
      
      // Show toast with limit info
      const featureName = feature === 'employees' ? 'funcionários' : 
                         feature === 'services' ? 'serviços' : 'agendamentos';
      
      const currentLimit = usageStats ? 
        (feature === 'employees' ? usageStats.max_employees :
         feature === 'services' ? usageStats.max_services :
         usageStats.max_appointments_per_month) : 0;
      
      toast.error(
        `Limite atingido: ${currentLimit === -1 ? 'Ilimitado' : currentLimit} ${featureName}. Faça upgrade para continuar!`
      );
      
      setShowUpgradeDialog(true);
      onLimitReached?.();
      return false;
    }
  };

  return (
    <>
      <div 
        onClick={handleClick}
        onClickCapture={canAccess ? undefined : handleClick}
        className="contents"
      >
        {children}
      </div>
      
      <UpgradeDialog 
        open={showUpgradeDialog}
        onOpenChange={setShowUpgradeDialog}
        barbershopId={barbershopId}
      />
    </>
  );
};