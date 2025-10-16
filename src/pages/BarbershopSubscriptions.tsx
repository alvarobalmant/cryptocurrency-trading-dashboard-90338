import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import SubscriptionPlansManager from '@/components/SubscriptionPlansManager';
import ActiveSubscriptionsView from '@/components/ActiveSubscriptionsView';
import ModernHeader from '@/components/modern/ModernHeader';
import type { SafeBarbershop } from '@/types/barbershop';

const BarbershopSubscriptions: React.FC = () => {
  const { barbershopId } = useParams<{ barbershopId: string }>();
  const [barbershop, setBarbershop] = useState<SafeBarbershop | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBarbershop = async () => {
      if (!barbershopId) return;

      try {
        const { data, error } = await supabase.rpc('get_safe_barbershop_data', {
          barbershop_id_param: barbershopId
        });

        if (error) throw error;
        
        setBarbershop(data?.[0] || null);
      } catch (error) {
        console.error('Error fetching barbershop:', error);
        setBarbershop(null);
      } finally {
        setLoading(false);
      }
    };

    fetchBarbershop();
  }, [barbershopId]);

  if (loading) {
    return <div>Carregando...</div>;
  }

  if (!barbershop) {
    return <div>Barbearia não encontrada</div>;
  }

  if (!barbershop.mercadopago_enabled) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <Alert className="max-w-2xl mx-auto">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="text-center">
              <strong>MercadoPago não configurado</strong>
              <br />
              Para usar o sistema de assinaturas, você precisa configurar sua conta do MercadoPago primeiro.
              Vá para Configurações da Barbearia para configurar.
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Sistema de Assinaturas</h1>
          <p className="text-muted-foreground">
            Gerencie planos de assinatura e visualize assinaturas ativas
          </p>
        </div>

        <Tabs defaultValue="plans" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="plans">Planos de Assinatura</TabsTrigger>
            <TabsTrigger value="subscriptions">Assinaturas Ativas</TabsTrigger>
          </TabsList>

          <TabsContent value="plans">
            <Card>
              <CardHeader>
                <CardTitle>Gerenciar Planos</CardTitle>
              </CardHeader>
              <CardContent>
                <SubscriptionPlansManager barbershopId={barbershopId!} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="subscriptions">
            <Card>
              <CardHeader>
                <CardTitle>Assinaturas dos Clientes</CardTitle>
              </CardHeader>
              <CardContent>
                <ActiveSubscriptionsView barbershopId={barbershopId!} />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default BarbershopSubscriptions;