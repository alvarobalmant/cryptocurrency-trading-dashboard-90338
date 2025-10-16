import { useState, createElement } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Crown, Settings, CreditCard } from 'lucide-react';
import { useSubscription } from '@/hooks/useSubscription';
import { UpgradeDialog } from './UpgradeDialog';
import { useToast } from '@/hooks/use-toast';

export const SubscriptionBanner = () => {
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);
  const { subscription, openCustomerPortal } = useSubscription();
  const { toast } = useToast();

  const handleManageSubscription = async () => {
    try {
      const portalUrl = await openCustomerPortal();
      window.open(portalUrl, '_blank');
    } catch (error) {
      console.error('Error opening customer portal:', error);
      toast({
        title: "Erro",
        description: "Não foi possível abrir o portal de gerenciamento. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  const getPlanBadgeVariant = () => {
    switch (subscription.plan) {
      case 'premium':
        return 'default';
      case 'pro':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const getPlanIcon = () => {
    return subscription.plan === 'premium' ? Crown : CreditCard;
  };

  return (
    <>
      <Card className="mb-6">
        <CardContent className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            {createElement(getPlanIcon(), { className: "w-5 h-5 text-primary" })}
            <div>
              <div className="flex items-center gap-2">
                <span className="font-medium">Plano Atual:</span>
                <Badge variant={getPlanBadgeVariant()} className="capitalize">
                  {subscription.plan}
                </Badge>
              </div>
              {subscription.subscription_end && (
                <p className="text-sm text-muted-foreground">
                  Renovação em: {new Date(subscription.subscription_end).toLocaleDateString('pt-BR')}
                </p>
              )}
            </div>
          </div>

          <div className="flex gap-2">
            {subscription.subscribed && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleManageSubscription}
              >
                <Settings className="w-4 h-4 mr-2" />
                Gerenciar
              </Button>
            )}
            <Button 
              size="sm"
              onClick={() => setShowUpgradeDialog(true)}
            >
              <Crown className="w-4 h-4 mr-2" />
              {subscription.plan === 'premium' ? 'Ver Planos' : 'Fazer Upgrade'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <UpgradeDialog 
        open={showUpgradeDialog}
        onOpenChange={setShowUpgradeDialog}
      />
    </>
  );
};