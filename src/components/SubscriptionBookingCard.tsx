import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Crown, Calendar, Users } from 'lucide-react';
import { useSubscriptions, SubscriptionPlan } from '@/hooks/useSubscriptions';
import { useToast } from '@/hooks/use-toast';

interface SubscriptionBookingCardProps {
  barbershopId: string;
  barbershopSlug: string;
  onSubscriptionCreated?: () => void;
}

const SubscriptionBookingCard: React.FC<SubscriptionBookingCardProps> = ({ 
  barbershopId, 
  barbershopSlug,
  onSubscriptionCreated 
}) => {
  const { subscriptionPlans, createSubscription } = useSubscriptions(barbershopId);
  const { toast } = useToast();
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null);
  const [selectedDuration, setSelectedDuration] = useState<number | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const activePlans = subscriptionPlans.filter(plan => plan.active);

  const handleSelectPlan = (plan: SubscriptionPlan) => {
    setSelectedPlan(plan);
    setSelectedDuration(null);
    setIsDialogOpen(true);
  };

  const getPrice = (plan: SubscriptionPlan, duration: number) => {
    switch (duration) {
      case 1:
        return plan.price_1_month;
      case 6:
        return plan.price_6_months;
      case 12:
        return plan.price_12_months;
      default:
        return 0;
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(price);
  };

  const handleCreateSubscription = async () => {
    if (!selectedPlan || !selectedDuration) return;

    setLoading(true);
    try {
      // You'll need to get the client profile ID from the auth context
      // For now, we'll use a placeholder
      const clientProfileId = "placeholder"; // This should be replaced with actual client profile ID
      
      const subscriptionData = {
        barbershopId,
        subscriptionPlanId: selectedPlan.id,
        clientProfileId,
        durationMonths: selectedDuration,
        successUrl: `${window.location.origin}/barbershop/${barbershopSlug}/subscription-success`,
        failureUrl: `${window.location.origin}/barbershop/${barbershopSlug}/subscription-failure`,
      };

      const result = await createSubscription(subscriptionData);
      
      if (result.init_point) {
        // Redirect to MercadoPago checkout
        window.location.href = result.init_point;
      }
    } catch (error) {
      console.error('Error creating subscription:', error);
    } finally {
      setLoading(false);
    }
  };

  if (activePlans.length === 0) {
    return null;
  }

  return (
    <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-accent/5">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Crown className="w-5 h-5 text-primary" />
          Planos de Assinatura
        </CardTitle>
        <CardDescription>
          Assine um plano e corte quantas vezes quiser!
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3">
          {activePlans.map((plan) => (
            <div
              key={plan.id}
              className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 transition-colors"
            >
              <div>
                <h4 className="font-medium">{plan.name}</h4>
                {plan.description && (
                  <p className="text-sm text-muted-foreground">{plan.description}</p>
                )}
                <div className="flex items-center gap-2 mt-1">
                  {plan.is_employee_specific && (
                    <Badge variant="outline" className="text-xs">
                      <Users className="w-3 h-3 mr-1" />
                      Funcionários específicos
                    </Badge>
                  )}
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">a partir de</p>
                <p className="font-semibold">{formatPrice(plan.price_1_month)}/mês</p>
                <Dialog open={isDialogOpen && selectedPlan?.id === plan.id} onOpenChange={setIsDialogOpen}>
                  <DialogTrigger asChild>
                    <Button 
                      size="sm" 
                      className="mt-2"
                      onClick={() => handleSelectPlan(plan)}
                    >
                      Assinar
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Assinar {selectedPlan?.name}</DialogTitle>
                      <DialogDescription>
                        Escolha a duração da sua assinatura
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <Select value={selectedDuration?.toString() || ""} onValueChange={(value) => setSelectedDuration(parseInt(value))}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione a duração" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">
                            1 Mês - {selectedPlan && formatPrice(selectedPlan.price_1_month)}
                          </SelectItem>
                          <SelectItem value="6">
                            6 Meses - {selectedPlan && formatPrice(selectedPlan.price_6_months)}
                            <Badge variant="secondary" className="ml-2">Economize!</Badge>
                          </SelectItem>
                          <SelectItem value="12">
                            12 Meses - {selectedPlan && formatPrice(selectedPlan.price_12_months)}
                            <Badge variant="default" className="ml-2">Melhor oferta!</Badge>
                          </SelectItem>
                        </SelectContent>
                      </Select>

                      {selectedPlan?.description && (
                        <div className="p-3 bg-muted rounded-lg">
                          <p className="text-sm">{selectedPlan.description}</p>
                        </div>
                      )}

                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="w-4 h-4" />
                        <span>Cortes ilimitados durante o período</span>
                      </div>

                      <Button 
                        onClick={handleCreateSubscription}
                        disabled={!selectedDuration || loading}
                        className="w-full"
                      >
                        {loading ? 'Processando...' : 'Prosseguir para Pagamento'}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default SubscriptionBookingCard;