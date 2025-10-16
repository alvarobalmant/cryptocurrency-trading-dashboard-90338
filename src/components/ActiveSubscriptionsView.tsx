import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, User, CreditCard, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useClientSubscriptions } from '@/hooks/useClientSubscriptions';
import { useClientPayments } from '@/hooks/useClientPayments';
import { Separator } from '@/components/ui/separator';

interface ActiveSubscriptionsViewProps {
  barbershopId: string;
}

interface ClientWithSubscription {
  client_id: string;
  client_name: string;
  client_phone: string;
  plan_name: string;
  status: string;
  start_date: string;
  end_date: string;
  amount_paid: number;
  duration_months: number;
}

const ActiveSubscriptionsView: React.FC<ActiveSubscriptionsViewProps> = ({ barbershopId }) => {
  const [clients, setClients] = useState<ClientWithSubscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [selectedClientName, setSelectedClientName] = useState<string>('');

  const { subscriptions: clientSubscriptions, loading: subsLoading } = useClientSubscriptions(selectedClientId || undefined);
  const { payments: clientPayments, loading: paymentsLoading } = useClientPayments(selectedClientId || undefined, barbershopId);

  useEffect(() => {
    fetchActiveSubscriptions();
  }, [barbershopId]);

  const fetchActiveSubscriptions = async () => {
    try {
      const { data, error } = await supabase
        .from('client_subscriptions')
        .select(`
          client_profile_id,
          status,
          start_date,
          end_date,
          amount_paid,
          duration_months,
          client_profiles(id, name, phone),
          subscription_plans(name)
        `)
        .eq('barbershop_id', barbershopId)
        .eq('status', 'active')
        .order('start_date', { ascending: false });

      if (error) throw error;

      const uniqueClients = data?.reduce((acc: ClientWithSubscription[], curr: any) => {
        const existing = acc.find(c => c.client_id === curr.client_profile_id);
        if (!existing) {
          acc.push({
            client_id: curr.client_profile_id,
            client_name: curr.client_profiles?.name || 'Cliente',
            client_phone: curr.client_profiles?.phone || '',
            plan_name: curr.subscription_plans?.name || 'Plano',
            status: curr.status,
            start_date: curr.start_date,
            end_date: curr.end_date,
            amount_paid: curr.amount_paid,
            duration_months: curr.duration_months,
          });
        }
        return acc;
      }, []);

      setClients(uniqueClients || []);
    } catch (error) {
      console.error('Error fetching active subscriptions:', error);
    } finally {
      setLoading(false);
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

  const getStatusText = (status: string) => {
    const statusMap: Record<string, string> = {
      active: 'Ativa',
      pending: 'Pendente',
      cancelled: 'Cancelada',
      expired: 'Expirada',
      paused: 'Pausada',
    };
    return statusMap[status] || status;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {clients.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <CreditCard className="w-12 h-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Nenhuma assinatura ativa</h3>
              <p className="text-muted-foreground text-center">
                Quando seus clientes adquirirem assinaturas, elas aparecerão aqui.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {clients.map((client) => (
              <Card
                key={client.client_id}
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => {
                  setSelectedClientId(client.client_id);
                  setSelectedClientName(client.client_name);
                }}
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <User className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold">{client.client_name}</h3>
                        <p className="text-sm text-muted-foreground">{client.client_phone}</p>
                      </div>
                    </div>
                    <Badge variant="default" className="bg-green-500">Ativa</Badge>
                  </div>

                  <Separator className="my-4" />

                  <div className="space-y-3">
                    <div>
                      <p className="text-sm text-muted-foreground">Plano</p>
                      <p className="font-medium">{client.plan_name}</p>
                    </div>

                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="w-4 h-4 text-muted-foreground" />
                      <span className="text-muted-foreground">
                        Até {formatDate(client.end_date)}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="w-4 h-4 text-muted-foreground" />
                      <span className="text-muted-foreground">
                        {client.duration_months} {client.duration_months === 1 ? 'mês' : 'meses'}
                      </span>
                    </div>

                    <div className="pt-2">
                      <p className="text-lg font-bold text-primary">{formatPrice(client.amount_paid)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Dialog open={!!selectedClientId} onOpenChange={() => setSelectedClientId(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Histórico de {selectedClientName}</DialogTitle>
          </DialogHeader>

          <div className="space-y-6 mt-4">
            {/* Histórico de Assinaturas */}
            <div>
              <h3 className="text-lg font-semibold mb-3">Assinaturas</h3>
              {subsLoading ? (
                <div className="flex justify-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                </div>
              ) : clientSubscriptions.length === 0 ? (
                <p className="text-muted-foreground text-sm">Nenhuma assinatura encontrada</p>
              ) : (
                <div className="space-y-3">
                  {clientSubscriptions.map((sub) => (
                    <Card key={sub.id}>
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium">{sub.plan_name}</p>
                            <p className="text-sm text-muted-foreground">
                              {sub.start_date && sub.end_date && 
                                `${formatDate(sub.start_date)} - ${formatDate(sub.end_date)}`
                              }
                            </p>
                          </div>
                          <div className="text-right">
                            <Badge variant={sub.status === 'active' ? 'default' : 'secondary'}>
                              {getStatusText(sub.status)}
                            </Badge>
                            <p className="text-sm font-semibold mt-1">{formatPrice(sub.amount_paid)}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>

            <Separator />

            {/* Histórico de Pagamentos */}
            <div>
              <h3 className="text-lg font-semibold mb-3">Pagamentos</h3>
              {paymentsLoading ? (
                <div className="flex justify-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                </div>
              ) : clientPayments.length === 0 ? (
                <p className="text-muted-foreground text-sm">Nenhum pagamento encontrado</p>
              ) : (
                <div className="space-y-3">
                  {clientPayments.map((payment) => (
                    <Card key={payment.id}>
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium">{payment.description || 'Pagamento'}</p>
                            <p className="text-sm text-muted-foreground">
                              {payment.payment_method || 'Não especificado'}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {formatDate(payment.created_at)}
                            </p>
                          </div>
                          <div className="text-right">
                            <Badge variant={payment.status === 'approved' ? 'default' : 'secondary'}>
                              {payment.status}
                            </Badge>
                            <p className="text-sm font-semibold mt-1">{formatPrice(payment.amount)}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ActiveSubscriptionsView;
