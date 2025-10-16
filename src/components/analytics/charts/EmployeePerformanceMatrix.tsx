import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { BarbershopAnalytics, EmployeeAnalytics } from '@/hooks/useAnalytics';

interface EmployeePerformanceMatrixProps {
  analytics: BarbershopAnalytics;
}

export const EmployeePerformanceMatrix = ({ analytics }: EmployeePerformanceMatrixProps) => {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
    }).format(value);
  };

  const getPerformanceLevel = (employee: EmployeeAnalytics) => {
    const avgRevenue = analytics.totalRevenue / analytics.employeeAnalytics.length;
    const revenueRatio = employee.totalRevenue / avgRevenue;
    
    if (revenueRatio >= 1.2) return { label: 'Alto', color: 'bg-green-500' };
    if (revenueRatio >= 0.8) return { label: 'Médio', color: 'bg-blue-500' };
    return { label: 'Baixo', color: 'bg-orange-500' };
  };

  const getCancellationRate = (employee: EmployeeAnalytics) => {
    if (employee.totalAppointments === 0) return 0;
    return (employee.cancelledAppointments / employee.totalAppointments) * 100;
  };

  const sortedEmployees = [...analytics.employeeAnalytics].sort(
    (a, b) => b.totalRevenue - a.totalRevenue
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Matriz de Performance</CardTitle>
        <CardDescription>Comparativo de desempenho dos funcionários</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {sortedEmployees.map((employee) => {
            const performance = getPerformanceLevel(employee);
            const cancellationRate = getCancellationRate(employee);
            const revenuePerHour = employee.totalHours > 0 
              ? employee.totalRevenue / employee.totalHours 
              : 0;

            return (
              <div 
                key={employee.employeeId}
                className="flex items-center gap-4 p-3 rounded-lg border border-border hover:bg-accent/50 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium truncate">{employee.employeeName}</span>
                    <div className={`w-2 h-2 rounded-full ${performance.color}`} />
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                    <span>{employee.confirmedAppointments} serviços</span>
                    <span>•</span>
                    <span>{formatCurrency(revenuePerHour)}/hora</span>
                    <span>•</span>
                    <span>{cancellationRate.toFixed(1)}% cancelamento</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-green-600">
                    {formatCurrency(employee.confirmedRevenue)}
                  </div>
                  <Badge variant="outline" className="mt-1">
                    {performance.label}
                  </Badge>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};
