import { AlertTriangle, CheckCircle, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useStockAlerts } from '@/hooks/useStockAlerts';
import { useBarbershop } from '@/hooks/useBarbershop';

interface StockAlert {
  id: string;
  product_id: string;
  alert_type: string;
  severity: string;
  status: string;
  alert_data: any;
  created_at: string;
}

interface StockAlertsListProps {
  alerts: StockAlert[];
  loading: boolean;
}

const alertTypeLabels: Record<string, string> = {
  LOW_STOCK: 'Estoque Baixo',
  REORDER: 'Ponto de Reposição',
  EXPIRED: 'Produto Vencido',
  EXPIRING_SOON: 'Vencendo em Breve',
};

const severityColors: Record<string, string> = {
  critical: 'destructive',
  warning: 'warning',
  info: 'secondary',
};

export default function StockAlertsList({ alerts, loading }: StockAlertsListProps) {
  const { barbershop } = useBarbershop();
  const { resolveAlert } = useStockAlerts(barbershop?.id);

  const handleResolve = async (alertId: string) => {
    try {
      await resolveAlert(alertId);
    } catch (error) {
      console.error('Error resolving alert:', error);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="flex items-center justify-center">
            <AlertTriangle className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const activeAlerts = alerts.filter(a => a.status === 'active');

  return (
    <Card>
      <CardHeader className="border-b border-border">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">Alertas de Estoque</CardTitle>
          <Badge variant={activeAlerts.length > 0 ? 'destructive' : 'secondary'}>
            {activeAlerts.length} ativos
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {activeAlerts.length === 0 ? (
          <div className="py-12 text-center">
            <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
            <p className="text-lg font-semibold mb-1">Tudo certo!</p>
            <p className="text-muted-foreground">Não há alertas de estoque no momento</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {activeAlerts.map((alert) => (
              <div key={alert.id} className="p-4 hover:bg-muted/50 transition-colors">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1">
                    <AlertTriangle 
                      className={`h-5 w-5 mt-0.5 ${
                        alert.severity === 'critical' ? 'text-red-500' : 'text-orange-500'
                      }`} 
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium">
                          {alertTypeLabels[alert.alert_type] || alert.alert_type}
                        </h4>
                        <Badge variant={severityColors[alert.severity] as any}>
                          {alert.severity === 'critical' ? 'Crítico' : 'Atenção'}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        {alert.alert_type === 'LOW_STOCK' && (
                          `Estoque atual: ${alert.alert_data.current_stock} (mínimo: ${alert.alert_data.min_level})`
                        )}
                        {alert.alert_type === 'REORDER' && (
                          `Atingiu o ponto de reposição: ${alert.alert_data.current_stock} unidades`
                        )}
                        {alert.alert_type === 'EXPIRED' && (
                          `Vencido desde ${new Date(alert.alert_data.expiry_date).toLocaleDateString('pt-BR')}`
                        )}
                        {alert.alert_type === 'EXPIRING_SOON' && (
                          `Vence em ${alert.alert_data.days_until_expiry} dias (${new Date(alert.alert_data.expiry_date).toLocaleDateString('pt-BR')})`
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(alert.created_at).toLocaleString('pt-BR')}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleResolve(alert.id)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
