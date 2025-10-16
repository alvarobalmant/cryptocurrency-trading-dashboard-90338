import { FinancialHealthScore } from './widgets/FinancialHealthScore';
import { RevenueFlowChart } from './charts/RevenueFlowChart';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, Users, TrendingUp } from 'lucide-react';
import type { BarbershopAnalytics } from '@/hooks/useAnalytics';

interface ExecutiveDashboardProps {
  analytics: BarbershopAnalytics;
}

export const ExecutiveDashboard = ({ analytics }: ExecutiveDashboardProps) => {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold">Visão Executiva</h3>
      
      <div className="grid gap-4 md:grid-cols-3">
        {/* Financial Health */}
        <FinancialHealthScore analytics={analytics} />
        
        {/* Owner Net Income */}
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Lucro Líquido do Dono</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(analytics.ownerReceivedRevenue)}
            </div>
            <CardDescription className="text-xs mt-1">
              Recebido menos comissões pagas
            </CardDescription>
            <div className="mt-3 space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">A receber:</span>
                <span className="font-medium text-orange-600">
                  {formatCurrency(analytics.ownerPendingRevenue)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Projetado:</span>
                <span className="font-medium text-blue-600">
                  {formatCurrency(analytics.ownerProjectedRevenue)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Team Performance */}
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Performance da Equipe</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.employeeAnalytics.length}</div>
            <CardDescription className="text-xs mt-1">
              Funcionários ativos
            </CardDescription>
            <div className="mt-3 space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total de serviços:</span>
                <span className="font-medium">{analytics.confirmedAppointments}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Horas trabalhadas:</span>
                <span className="font-medium">{Math.round(analytics.totalHoursWorked)}h</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Flow Chart */}
      <RevenueFlowChart analytics={analytics} />
    </div>
  );
};
