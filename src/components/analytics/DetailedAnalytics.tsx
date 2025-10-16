import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import type { BarbershopAnalytics, EmployeeAnalytics } from '@/hooks/useAnalytics';

interface DetailedAnalyticsProps {
  analytics: BarbershopAnalytics;
}

export const DetailedAnalytics = ({ analytics }: DetailedAnalyticsProps) => {
  const [expandedEmployees, setExpandedEmployees] = useState<Set<string>>(new Set());

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatHours = (hours: number) => {
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return `${h}h ${m}min`;
  };

  const toggleEmployee = (id: string) => {
    const newExpanded = new Set(expandedEmployees);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedEmployees(newExpanded);
  };

  const getEfficiencyMetrics = (employee: EmployeeAnalytics) => {
    const revenuePerHour = employee.totalHours > 0 
      ? employee.totalRevenue / employee.totalHours 
      : 0;
    const cancellationRate = employee.totalAppointments > 0
      ? (employee.cancelledAppointments / employee.totalAppointments) * 100
      : 0;
    const avgServiceValue = employee.confirmedAppointments > 0
      ? employee.confirmedRevenue / employee.confirmedAppointments
      : 0;

    return { revenuePerHour, cancellationRate, avgServiceValue };
  };

  const sortedEmployees = [...analytics.employeeAnalytics].sort(
    (a, b) => b.totalRevenue - a.totalRevenue
  );

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold">Análise Detalhada por Funcionário</h3>
      
      <div className="space-y-3">
        {sortedEmployees.map((employee) => {
          const isExpanded = expandedEmployees.has(employee.employeeId);
          const metrics = getEfficiencyMetrics(employee);

          return (
            <Collapsible
              key={employee.employeeId}
              open={isExpanded}
              onOpenChange={() => toggleEmployee(employee.employeeId)}
            >
              <Card className="hover:shadow-md transition-shadow">
                <CollapsibleTrigger asChild>
                  <CardHeader className="cursor-pointer">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <CardTitle className="text-base">{employee.employeeName}</CardTitle>
                          {employee.status === 'deleted' && (
                            <Badge variant="destructive" className="text-xs">
                              Excluído
                            </Badge>
                          )}
                        </div>
                        <CardDescription className="mt-1">
                          {employee.confirmedAppointments} serviços confirmados • {formatHours(employee.totalHours)} trabalhadas
                        </CardDescription>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <div className="text-lg font-bold text-green-600">
                            {formatCurrency(employee.confirmedRevenue)}
                          </div>
                        </div>
                        {isExpanded ? (
                          <ChevronUp className="h-5 w-5 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="h-5 w-5 text-muted-foreground" />
                        )}
                      </div>
                    </div>
                  </CardHeader>
                </CollapsibleTrigger>

                <CollapsibleContent>
                  <CardContent className="pt-0">
                    <div className="space-y-4 border-t pt-4">
                      {/* Efficiency Metrics */}
                      <div>
                        <h4 className="text-sm font-semibold mb-3">Métricas de Eficiência</h4>
                        <div className="grid grid-cols-3 gap-3">
                          <div className="text-center p-3 rounded-lg bg-muted">
                            <div className="text-lg font-bold">{formatCurrency(metrics.revenuePerHour)}</div>
                            <div className="text-xs text-muted-foreground">Por Hora</div>
                          </div>
                          <div className="text-center p-3 rounded-lg bg-muted">
                            <div className="text-lg font-bold">{metrics.cancellationRate.toFixed(1)}%</div>
                            <div className="text-xs text-muted-foreground">Cancelamento</div>
                          </div>
                          <div className="text-center p-3 rounded-lg bg-muted">
                            <div className="text-lg font-bold">{formatCurrency(metrics.avgServiceValue)}</div>
                            <div className="text-xs text-muted-foreground">Ticket Médio</div>
                          </div>
                        </div>
                      </div>

                      {/* Appointment Breakdown */}
                      <div>
                        <h4 className="text-sm font-semibold mb-3">Distribuição de Agendamentos</h4>
                        <div className="grid grid-cols-3 gap-3 text-sm">
                          <div>
                            <div className="text-green-600 font-semibold">{employee.confirmedAppointments}</div>
                            <div className="text-muted-foreground">Confirmados</div>
                          </div>
                          <div>
                            <div className="text-blue-600 font-semibold">{employee.pendingAppointments}</div>
                            <div className="text-muted-foreground">Pendentes</div>
                          </div>
                          <div>
                            <div className="text-red-600 font-semibold">{employee.cancelledAppointments}</div>
                            <div className="text-muted-foreground">Cancelados</div>
                          </div>
                        </div>
                      </div>

                      {/* Top Services */}
                      {employee.topServices.length > 0 && (
                        <div>
                          <h4 className="text-sm font-semibold mb-3">Principais Serviços</h4>
                          <div className="space-y-2">
                            {employee.topServices.map((service, index) => (
                              <div 
                                key={index}
                                className="flex items-center justify-between p-2 rounded bg-muted"
                              >
                                <span className="text-sm">{service.serviceName}</span>
                                <div className="text-right">
                                  <div className="text-sm font-medium">{service.count}x</div>
                                  <div className="text-xs text-muted-foreground">
                                    {formatCurrency(service.revenue)}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Financial Details */}
                      <div>
                        <h4 className="text-sm font-semibold mb-3">Detalhes Financeiros</h4>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between p-2 rounded bg-muted">
                            <span>Receita Total</span>
                            <span className="font-medium">{formatCurrency(employee.totalRevenue)}</span>
                          </div>
                          <div className="flex justify-between p-2 rounded bg-green-50">
                            <span className="text-green-700">Receita Confirmada</span>
                            <span className="font-medium text-green-600">
                              {formatCurrency(employee.confirmedRevenue)}
                            </span>
                          </div>
                          <div className="flex justify-between p-2 rounded bg-orange-50">
                            <span className="text-orange-700">Receita Pendente</span>
                            <span className="font-medium text-orange-600">
                              {formatCurrency(employee.pendingRevenue)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          );
        })}
      </div>
    </div>
  );
};
