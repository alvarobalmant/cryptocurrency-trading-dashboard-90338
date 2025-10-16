import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DollarSign, Clock, Calendar, XCircle } from 'lucide-react';
import type { ComprehensiveAnalytics } from '@/hooks/useComprehensiveAnalytics';

interface RevenueBreakdownCardProps {
  analytics: ComprehensiveAnalytics;
}

export const RevenueBreakdownCard = ({ analytics }: RevenueBreakdownCardProps) => {
  const formatCurrency = (value: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  const totalRevenue = analytics.cashFlow.receivedRevenue + analytics.cashFlow.pendingRevenue + analytics.cashFlow.futureRevenue;
  
  const getPercentage = (value: number) => 
    totalRevenue > 0 ? ((value / totalRevenue) * 100).toFixed(1) : '0.0';

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="h-5 w-5" />
          Detalhamento de Receitas
        </CardTitle>
        <CardDescription>
          Divisão clara entre receitas pagas, a receber, futuras e perdidas
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Receita Paga */}
          <div className="flex items-center justify-between p-4 border rounded-lg bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-green-600 flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="font-semibold text-green-900 dark:text-green-100">Receita Paga</p>
                <p className="text-xs text-green-700 dark:text-green-300">Confirmado + Pagamento Recebido</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-green-600">{formatCurrency(analytics.cashFlow.receivedRevenue)}</p>
              <Badge variant="secondary" className="mt-1 bg-green-100 text-green-800">
                {getPercentage(analytics.cashFlow.receivedRevenue)}%
              </Badge>
            </div>
          </div>

          {/* Receita A Receber */}
          <div className="flex items-center justify-between p-4 border rounded-lg bg-orange-50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-800">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-orange-600 flex items-center justify-center">
                <Clock className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="font-semibold text-orange-900 dark:text-orange-100">A Receber</p>
                <p className="text-xs text-orange-700 dark:text-orange-300">Confirmado + Pagamento Pendente</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-orange-600">{formatCurrency(analytics.cashFlow.pendingRevenue)}</p>
              <Badge variant="secondary" className="mt-1 bg-orange-100 text-orange-800">
                {getPercentage(analytics.cashFlow.pendingRevenue)}%
              </Badge>
            </div>
          </div>

          {/* Receita Futura */}
          <div className="flex items-center justify-between p-4 border rounded-lg bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-blue-600 flex items-center justify-center">
                <Calendar className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="font-semibold text-blue-900 dark:text-blue-100">Receita Futura</p>
                <p className="text-xs text-blue-700 dark:text-blue-300">Agendamentos Pendentes</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-blue-600">{formatCurrency(analytics.cashFlow.futureRevenue)}</p>
              <Badge variant="secondary" className="mt-1 bg-blue-100 text-blue-800">
                {getPercentage(analytics.cashFlow.futureRevenue)}%
              </Badge>
            </div>
          </div>

          {/* Receita Perdida (Cancelados) */}
          <div className="flex items-center justify-between p-4 border rounded-lg bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-red-600 flex items-center justify-center">
                <XCircle className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="font-semibold text-red-900 dark:text-red-100">Receita Perdida</p>
                <p className="text-xs text-red-700 dark:text-red-300">Cancelados + No-Show + Falhas</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-red-600">{formatCurrency(analytics.cashFlow.lostRevenue || 0)}</p>
              <Badge variant="secondary" className="mt-1 bg-red-100 text-red-800">
                Não contabilizado
              </Badge>
            </div>
          </div>

          {/* Total */}
          <div className="pt-4 mt-4 border-t">
            <div className="flex items-center justify-between">
              <p className="font-semibold text-muted-foreground">Total (excluindo perdas)</p>
              <p className="text-xl font-bold">
                {formatCurrency(analytics.cashFlow.receivedRevenue + analytics.cashFlow.pendingRevenue + analytics.cashFlow.futureRevenue)}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
