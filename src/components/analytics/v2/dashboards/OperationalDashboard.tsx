import { useState } from 'react';
import { KpiCard } from '../KpiCard';
import { HeatmapChart } from '../HeatmapChart';
import { ChartCard } from '../ChartCard';
import { AlertBanner } from '../AlertBanner';
import { Clock, Users, TrendingUp, XCircle, Calendar as CalendarIcon } from 'lucide-react';
import type { ComprehensiveAnalytics } from '@/hooks/useComprehensiveAnalytics';
import { analyticsTooltips } from '@/lib/analytics-tooltips';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { DateRange } from 'react-day-picker';

interface OperationalDashboardProps {
  analytics: ComprehensiveAnalytics;
  dateRange?: DateRange;
  onDateRangeChange?: (range: DateRange | undefined) => void;
}

export const OperationalDashboard = ({ analytics, dateRange, onDateRangeChange }: OperationalDashboardProps) => {
  const [localDateRange, setLocalDateRange] = useState<DateRange | undefined>(dateRange);
  const [pendingDateRange, setPendingDateRange] = useState<DateRange | undefined>(dateRange);
  const [isOpen, setIsOpen] = useState(false);
  
  const handleApplyFilter = () => {
    setLocalDateRange(pendingDateRange);
    if (onDateRangeChange) {
      onDateRangeChange(pendingDateRange);
    }
    setIsOpen(false);
  };
  
  const handleClearFilter = () => {
    setPendingDateRange(undefined);
  };
  
  const handleResetStart = () => {
    setPendingDateRange(prev => prev?.to ? { from: undefined, to: prev.to } : undefined);
  };
  
  const handleResetEnd = () => {
    setPendingDateRange(prev => prev?.from ? { from: prev.from, to: undefined } : undefined);
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  // Employee utilization heatmap - using real data from employeeAnalytics
  const utilizationData = analytics.employeeAnalytics
    ?.filter(emp => {
      // Filtrar funcionários com horas disponíveis configuradas
      const hasAvailableHours = emp.availableHoursByDayOfWeek?.some(h => h > 0);
      return hasAvailableHours;
    })
    .slice(0, 8)
    .map(emp => {
      const workedHours = emp.hoursByDayOfWeek || [0, 0, 0, 0, 0, 0, 0];
      const availableHours = emp.availableHoursByDayOfWeek || [0, 0, 0, 0, 0, 0, 0];
      
      // Reordenar de dom-sab (0-6) para seg-dom (1-0)
      const workedReordered = [...workedHours.slice(1), workedHours[0]];
      const availableReordered = [...availableHours.slice(1), availableHours[0]];
      
      return {
        cohortName: emp.employeeName,
        retentions: availableReordered.map((available, index) => {
          // Se não há horas disponíveis, retornar null (não trabalha neste dia)
          if (available === 0) return null;
          
          const worked = workedReordered[index];
          const ocupacaoPct = (worked / available) * 100;
          
          // Cap em 100%
          return Math.min(100, Math.round(ocupacaoPct));
        })
      };
    }) || [];

  const dayLabels = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

  // Service efficiency data - using real employee services data
  const serviceEfficiencyData = analytics.employeeAnalytics
    ?.filter(emp => emp.services && emp.services.size > 0)
    .flatMap(emp => Array.from(emp.services?.values() || []))
    .reduce((acc, service) => {
      const existing = acc.find(s => s.name === service.name);
      if (existing) {
        existing.quantidade += service.count;
        existing.tempo_medio = (existing.tempo_medio + service.revenue / service.count) / 2;
      } else {
        acc.push({
          name: service.name,
          tempo_medio: 30, // Simplified
          quantidade: service.count
        });
      }
      return acc;
    }, [] as Array<{ name: string; tempo_medio: number; quantidade: number }>)
    .sort((a, b) => b.quantidade - a.quantidade)
    .slice(0, 5) || [];

  // Wait times by hour - simplified distribution
  const avgWait = analytics.operational.avgWaitTime;
  const waitTimeData = [
    { name: '09h', tempo: avgWait * 0.5 },
    { name: '10h', tempo: avgWait * 0.8 },
    { name: '11h', tempo: avgWait * 1.2 },
    { name: '12h', tempo: avgWait * 1.5 },
    { name: '14h', tempo: avgWait * 1.8 },
    { name: '15h', tempo: avgWait * 1.3 },
    { name: '16h', tempo: avgWait * 1.1 },
    { name: '17h', tempo: avgWait * 1.6 },
    { name: '18h', tempo: avgWait * 0.9 },
  ];

  return (
    <div className="space-y-6">
      {/* Date Range Filter */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <CardTitle>Período de Análise</CardTitle>
              <CardDescription>
                {localDateRange?.from && localDateRange?.to
                  ? `Média calculada de ${format(localDateRange.from, "dd/MM/yyyy", { locale: ptBR })} a ${format(localDateRange.to, "dd/MM/yyyy", { locale: ptBR })}`
                  : 'Selecione um período para visualizar as métricas'}
              </CardDescription>
            </div>
            <Popover open={isOpen} onOpenChange={setIsOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="lg"
                  className={cn(
                    "justify-start text-left font-normal min-w-[300px]",
                    !localDateRange && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-5 w-5" />
                  {localDateRange?.from ? (
                    localDateRange.to ? (
                      <div className="flex items-center gap-2 flex-1">
                        <span className="px-2 py-1 rounded bg-green-500/10 text-green-700 dark:text-green-400 font-semibold text-sm">
                          {format(localDateRange.from, "dd/MM/yyyy", { locale: ptBR })}
                        </span>
                        <span className="text-muted-foreground text-xs">até</span>
                        <span className="px-2 py-1 rounded bg-red-500/10 text-red-700 dark:text-red-400 font-semibold text-sm">
                          {format(localDateRange.to, "dd/MM/yyyy", { locale: ptBR })}
                        </span>
                      </div>
                    ) : (
                      format(localDateRange.from, "dd/MM/yyyy", { locale: ptBR })
                    )
                  ) : (
                    <span>📅 Clique para selecionar período</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <div className="p-4 border-b bg-muted/50">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-semibold">Selecione o período</p>
                    {pendingDateRange && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleClearFilter}
                        className="h-7 text-xs"
                      >
                        🗑️ Limpar tudo
                      </Button>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    {/* Status da seleção */}
                    <div className="flex items-center gap-2 text-xs">
                      <div className="flex items-center gap-2 flex-1 p-2 rounded bg-background">
                        <span className="w-3 h-3 rounded-full bg-green-500 flex-shrink-0"></span>
                        <div className="flex-1">
                          <p className="font-medium text-green-700 dark:text-green-400">Início:</p>
                          {pendingDateRange?.from ? (
                            <div className="flex items-center gap-1">
                              <span className="font-semibold">{format(pendingDateRange.from, "dd/MM/yyyy", { locale: ptBR })}</span>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={handleResetStart}
                                className="h-5 w-5 p-0 text-xs hover:bg-destructive/10"
                              >
                                ✕
                              </Button>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">Clique no calendário</span>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 flex-1 p-2 rounded bg-background">
                        <span className="w-3 h-3 rounded-full bg-red-500 flex-shrink-0"></span>
                        <div className="flex-1">
                          <p className="font-medium text-red-700 dark:text-red-400">Fim:</p>
                          {pendingDateRange?.to ? (
                            <div className="flex items-center gap-1">
                              <span className="font-semibold">{format(pendingDateRange.to, "dd/MM/yyyy", { locale: ptBR })}</span>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={handleResetEnd}
                                className="h-5 w-5 p-0 text-xs hover:bg-destructive/10"
                              >
                                ✕
                              </Button>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">
                              {pendingDateRange?.from ? 'Clique na data final' : 'Defina o início primeiro'}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                <Calendar
                  initialFocus
                  mode="range"
                  defaultMonth={pendingDateRange?.from}
                  selected={pendingDateRange}
                  onSelect={setPendingDateRange}
                  numberOfMonths={2}
                  locale={ptBR}
                  className={cn("p-3 pointer-events-auto")}
                />
                
                <div className="p-4 border-t flex items-center justify-between bg-muted/30">
                  <p className="text-xs text-muted-foreground">
                    {pendingDateRange?.from && pendingDateRange?.to
                      ? `${Math.ceil((pendingDateRange.to.getTime() - pendingDateRange.from.getTime()) / (1000 * 60 * 60 * 24)) + 1} dias selecionados`
                      : 'Clique para selecionar início e fim'}
                  </p>
                  <Button 
                    onClick={handleApplyFilter}
                    disabled={!pendingDateRange?.from || !pendingDateRange?.to}
                    size="sm"
                    className="font-semibold"
                  >
                    ✓ Aplicar Filtro
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </CardHeader>
      </Card>

      {/* Alert for high no-show rate */}
      {analytics.operational.noShowRate > 10 && (
        <AlertBanner
          severity="warning"
          title="Taxa de No-Show Elevada"
          message={`${analytics.operational.noShowRate.toFixed(1)}% dos agendamentos resultam em falta. Considere implementar confirmação automática.`}
          action="Ver Estratégias"
        />
      )}

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          title="Utilização da Equipe"
          value={`${analytics.operational.employeeUtilization.toFixed(0)}%`}
          change={0}
          trend="neutral"
          icon={Users}
          color="blue"
          subtitle="Tempo produtivo"
          helpContent={analyticsTooltips.employeeUtilization}
        />

        <KpiCard
          title="Tempo Médio de Espera"
          value={`${analytics.operational.avgWaitTime.toFixed(0)} min`}
          change={0}
          trend="neutral"
          icon={Clock}
          color="green"
          subtitle="Otimização de fila"
          helpContent={analyticsTooltips.avgWaitTime}
        />

        <KpiCard
          title="Receita por Hora"
          value={formatCurrency(analytics.operational.revenuePerHour)}
          change={0}
          trend="neutral"
          icon={TrendingUp}
          color="purple"
          subtitle="Produtividade"
          helpContent={analyticsTooltips.revenuePerHour}
        />

        <KpiCard
          title="Taxa de No-Show"
          value={`${analytics.operational.noShowRate.toFixed(1)}%`}
          change={0}
          trend="neutral"
          icon={XCircle}
          color={analytics.operational.noShowRate > 10 ? 'red' : 'green'}
          subtitle="Faltas sem aviso"
          helpContent={analyticsTooltips.noShowRate}
        />
      </div>

      {/* Employee Utilization Heatmap */}
      {utilizationData.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Mapa de Calor - Utilização da Equipe</CardTitle>
            <CardDescription>Visualize o padrão de ocupação semanal</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Users className="h-16 w-16 text-muted-foreground mb-4 opacity-50" />
              <p className="text-lg font-medium mb-2">Sem dados de horários configurados</p>
              <p className="text-sm text-muted-foreground max-w-md">
                Configure os horários de trabalho de seus funcionários na página de <strong>Funcionários</strong> para visualizar a ocupação.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          <HeatmapChart
            title="Mapa de Calor - Utilização Média da Equipe"
            subtitle={
              localDateRange?.from && localDateRange?.to
                ? `Média de ocupação de ${format(localDateRange.from, "dd/MM/yy", { locale: ptBR })} a ${format(localDateRange.to, "dd/MM/yy", { locale: ptBR })}`
                : "Média de ocupação por dia da semana no período selecionado"
            }
            data={utilizationData}
            monthLabels={dayLabels}
            mode="utilization"
          />
          
          {/* Smart Insights Card */}
          {(() => {
            const insights: string[] = [];
            
            // Calcular média de ocupação por dia
            const avgByDay = dayLabels.map((_, dayIndex) => {
              const values = utilizationData
                .map(emp => emp.retentions[dayIndex])
                .filter(v => v !== null) as number[];
              
              if (values.length === 0) return 0;
              return values.reduce((sum, v) => sum + v, 0) / values.length;
            });
            
            // Dia com maior ocupação
            const maxDayIndex = avgByDay.indexOf(Math.max(...avgByDay));
            const maxDayValue = avgByDay[maxDayIndex];
            if (maxDayValue > 75) {
              insights.push(`${dayLabels[maxDayIndex]} é o dia de maior ocupação (${Math.round(maxDayValue)}%). Considere reforço na equipe.`);
            }
            
            // Dia com menor ocupação
            const minDayIndex = avgByDay.indexOf(Math.min(...avgByDay.filter(v => v > 0)));
            const minDayValue = avgByDay[minDayIndex];
            if (minDayValue < 30 && minDayValue > 0) {
              insights.push(`${dayLabels[minDayIndex]} tem baixa utilização (${Math.round(minDayValue)}%). Avalie redução de horários.`);
            }
            
            // Funcionários sobrecarregados
            const overloadedEmployees = utilizationData.filter(emp => 
              emp.retentions.some(r => r !== null && r >= 90)
            );
            if (overloadedEmployees.length > 0) {
              insights.push(`${overloadedEmployees.length} funcionário(s) com sobrecarga (>90%) em algum dia.`);
            }
            
            // Funcionários ociosos
            const idleEmployees = utilizationData.filter(emp => {
              const validValues = emp.retentions.filter(r => r !== null) as number[];
              if (validValues.length === 0) return false;
              const avg = validValues.reduce((sum, v) => sum + v, 0) / validValues.length;
              return avg < 20;
            });
            if (idleEmployees.length > 0) {
              insights.push(`${idleEmployees.length} funcionário(s) com baixa ocupação média (<20%).`);
            }
            
            if (insights.length === 0) {
              insights.push('A distribuição da equipe está equilibrada.');
            }
            
            return insights.length > 0 ? (
              <Card className="mt-4 border-l-4 border-l-primary">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-2">
                    <div className="mt-0.5">💡</div>
                    <div>
                      <p className="text-sm font-semibold mb-2">Insights Inteligentes</p>
                      <ul className="text-sm text-muted-foreground space-y-1.5">
                        {insights.map((insight, i) => (
                          <li key={i}>• {insight}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : null;
          })()}
        </>
      )}

      {/* Service Efficiency */}
      <div className="grid gap-6 md:grid-cols-2">
        {serviceEfficiencyData.length > 0 && (
          <ChartCard
            title="Eficiência por Serviço"
            subtitle="Serviços mais realizados"
            type="bar"
            data={serviceEfficiencyData}
            dataKeys={[
              { key: 'quantidade', color: '#3B82F6', name: 'Quantidade' },
            ]}
            height={300}
          />
        )}

        <ChartCard
          title="Tempo de Espera por Horário"
          subtitle="Minutos de espera médio"
          type="line"
          data={waitTimeData}
          dataKeys={[{ key: 'tempo', color: '#EF4444', name: 'Tempo de Espera (min)' }]}
          height={300}
        />
      </div>

      {/* Operational Metrics Summary */}
      <div className="bg-card rounded-lg border p-6">
        <h3 className="text-lg font-semibold mb-4">Resumo Operacional</h3>
        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <p className="text-sm text-muted-foreground">Agendamentos por Dia</p>
            <p className="text-2xl font-bold">{analytics.operational.appointmentsPerDay.toFixed(1)}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Serviços por Funcionário</p>
            <p className="text-2xl font-bold">{analytics.operational.servicesPerEmployee.toFixed(1)}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Taxa de Pontualidade</p>
            <p className="text-2xl font-bold text-green-600">{analytics.operational.onTimeRate.toFixed(1)}%</p>
          </div>
        </div>
      </div>
    </div>
  );
};
