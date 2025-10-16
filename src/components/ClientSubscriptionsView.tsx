import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, CreditCard, Users } from 'lucide-react';
import { useSubscriptions } from '@/hooks/useSubscriptions';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ClientSubscriptionsViewProps {
  barbershopId: string;
}

const ClientSubscriptionsView: React.FC<ClientSubscriptionsViewProps> = ({ barbershopId }) => {
  const { clientSubscriptions, loading } = useSubscriptions(barbershopId);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'default';
      case 'pending':
        return 'secondary';
      case 'cancelled':
        return 'destructive';
      case 'expired':
        return 'outline';
      case 'paused':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active':
        return 'Ativa';
      case 'pending':
        return 'Pendente';
      case 'cancelled':
        return 'Cancelada';
      case 'expired':
        return 'Expirada';
      case 'paused':
        return 'Pausada';
      default:
        return status;
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(price);
  };

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'dd/MM/yyyy', { locale: ptBR });
  };

  if (loading) {
    return <div>Carregando assinaturas...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Assinaturas de Clientes</h2>
        <p className="text-muted-foreground">
          Visualize e gerencie as assinaturas ativas dos seus clientes
        </p>
      </div>

      <div className="grid gap-4">
        {clientSubscriptions.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-8">
              <CreditCard className="w-12 h-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Nenhuma assinatura encontrada</h3>
              <p className="text-muted-foreground text-center">
                Quando seus clientes adquirirem assinaturas, elas aparecerão aqui.
              </p>
            </CardContent>
          </Card>
        ) : (
          clientSubscriptions.map((subscription) => (
            <Card key={subscription.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      {subscription.subscription_plans?.name}
                      <Badge variant={getStatusColor(subscription.status)}>
                        {getStatusText(subscription.status)}
                      </Badge>
                    </CardTitle>
                    <CardDescription>
                      Duração: {subscription.duration_months} {subscription.duration_months === 1 ? 'mês' : 'meses'}
                    </CardDescription>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-semibold">{formatPrice(subscription.amount_paid)}</p>
                    <p className="text-sm text-muted-foreground">Valor pago</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {subscription.start_date && (
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">Data de Início</p>
                        <p className="text-sm text-muted-foreground">
                          {formatDate(subscription.start_date)}
                        </p>
                      </div>
                    </div>
                  )}
                  
                  {subscription.end_date && (
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">Data de Expiração</p>
                        <p className="text-sm text-muted-foreground">
                          {formatDate(subscription.end_date)}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {subscription.subscription_plans?.description && (
                  <div className="mt-4">
                    <p className="text-sm text-muted-foreground">
                      {subscription.subscription_plans.description}
                    </p>
                  </div>
                )}

                <div className="mt-4 flex items-center gap-4 text-sm text-muted-foreground">
                  <span>Renovação automática: {subscription.auto_renewal ? 'Sim' : 'Não'}</span>
                  {subscription.subscription_plans?.is_employee_specific && (
                    <span className="flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      Funcionários específicos
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default ClientSubscriptionsView;