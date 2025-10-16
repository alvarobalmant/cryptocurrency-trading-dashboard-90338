import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { MetricTooltip, MetricHelpContent } from './MetricTooltip';
import { Info, Activity } from 'lucide-react';

interface CohortHeatmapData {
  cohortName: string;
  retentions: (number | null)[];
}

interface HeatmapChartProps {
  title: string;
  subtitle?: string;
  data: CohortHeatmapData[];
  monthLabels: string[];
  helpContent?: MetricHelpContent;
  mode?: 'retention' | 'utilization';
}

export const HeatmapChart = ({ title, subtitle, data, monthLabels, helpContent, mode = 'retention' }: HeatmapChartProps) => {
  // Validação defensiva
  if (!data || !monthLabels || !Array.isArray(data) || !Array.isArray(monthLabels)) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          {subtitle && <CardDescription>{subtitle}</CardDescription>}
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Activity className="h-16 w-16 text-muted-foreground mb-4 opacity-50" />
            <p className="text-lg font-medium mb-2">Sem dados disponíveis</p>
            <p className="text-sm text-muted-foreground max-w-md">
              {mode === 'utilization' 
                ? 'Adicione agendamentos com funcionários ativos para visualizar a distribuição de ocupação.'
                : 'Dados insuficientes para exibir o mapa de calor de retenção.'}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          {subtitle && <CardDescription>{subtitle}</CardDescription>}
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Activity className="h-16 w-16 text-muted-foreground mb-4 opacity-50" />
            <p className="text-lg font-medium mb-2">Sem dados para exibir</p>
            <p className="text-sm text-muted-foreground max-w-md">
              {mode === 'utilization'
                ? 'Adicione agendamentos com funcionários para visualizar padrões de ocupação semanal.'
                : 'Aguarde mais dados de clientes para visualizar a retenção por cohort.'}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const getColorForRetention = (value: number | null) => {
    if (value === null) return 'bg-muted/30';
    
    if (mode === 'utilization') {
      // Cores otimizadas para ocupação
      if (value >= 90) return 'bg-red-500'; // Sobrecarga
      if (value >= 75) return 'bg-emerald-600'; // Ótimo
      if (value >= 50) return 'bg-emerald-500'; // Bom
      if (value >= 25) return 'bg-yellow-500'; // Médio
      if (value >= 10) return 'bg-orange-400'; // Baixo
      return 'bg-gray-400'; // Muito baixo
    }
    
    // Cores para retenção (modo padrão)
    if (value === 100) return 'bg-emerald-600';
    if (value >= 75) return 'bg-emerald-500';
    if (value >= 50) return 'bg-yellow-500';
    if (value >= 25) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const getTextColor = (value: number | null) => {
    if (value === null) return 'text-muted-foreground';
    if (value >= 50) return 'text-white';
    return 'text-foreground';
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              {title}
              {helpContent && (
                <MetricTooltip content={helpContent}>
                  <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                </MetricTooltip>
              )}
            </CardTitle>
            {subtitle && <CardDescription>{subtitle}</CardDescription>}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {/* Header com labels dos meses */}
          <div className="grid gap-2" style={{ gridTemplateColumns: '100px repeat(auto-fit, minmax(70px, 1fr))' }}>
            <div className="text-xs font-medium text-muted-foreground">Cohort</div>
            {monthLabels.map((label, index) => (
              <div key={index} className="text-xs font-medium text-muted-foreground text-center">
                {label}
              </div>
            ))}
          </div>
          
          {/* Linhas do heatmap */}
          {data.map((row, rowIndex) => (
            <div key={rowIndex} className="grid gap-2" style={{ gridTemplateColumns: '100px repeat(auto-fit, minmax(70px, 1fr))' }}>
              <div className="text-xs font-semibold text-foreground flex items-center">
                {row.cohortName}
              </div>
              {row.retentions.map((value, colIndex) => (
                <div
                  key={colIndex}
                  className={`
                    relative aspect-square rounded-md flex items-center justify-center text-xs font-bold
                    ${getColorForRetention(value)} ${getTextColor(value)}
                    transition-all duration-200 cursor-pointer
                    hover:ring-2 hover:ring-primary hover:scale-105
                    ${value === null ? 'opacity-40' : ''}
                  `}
                  title={
                    value !== null
                      ? mode === 'utilization'
                        ? `${row.cohortName}\n${monthLabels[colIndex]}: ${value.toFixed(0)}% ocupação`
                        : `Cohort: ${row.cohortName}\nMês ${colIndex}: ${value.toFixed(1)}% retidos`
                      : mode === 'utilization'
                        ? `${row.cohortName}\n${monthLabels[colIndex]}: Sem dados`
                        : `Cohort: ${row.cohortName}\nMês ${colIndex}: Dados ainda não disponíveis`
                  }
                >
                  {value !== null ? (
                    <span className="drop-shadow-sm">{value.toFixed(0)}%</span>
                  ) : (
                    <span className="text-[10px]">-</span>
                  )}
                </div>
              ))}
            </div>
          ))}

          {/* Legenda */}
          <div className="flex flex-wrap items-center justify-end gap-3 mt-6 pt-4 border-t text-xs">
            <span className="font-medium text-muted-foreground">
              {mode === 'utilization' ? 'Ocupação:' : 'Retenção:'}
            </span>
            {mode === 'utilization' ? (
              <>
                <div className="flex items-center gap-1.5">
                  <div className="w-4 h-4 bg-red-500 rounded"></div>
                  <span className="text-muted-foreground">≥90% (Sobrecarga)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-4 h-4 bg-emerald-600 rounded"></div>
                  <span className="text-muted-foreground">75-90% (Ótimo)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-4 h-4 bg-emerald-500 rounded"></div>
                  <span className="text-muted-foreground">50-75% (Bom)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-4 h-4 bg-yellow-500 rounded"></div>
                  <span className="text-muted-foreground">25-50% (Médio)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-4 h-4 bg-orange-400 rounded"></div>
                  <span className="text-muted-foreground">10-25% (Baixo)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-4 h-4 bg-gray-400 rounded"></div>
                  <span className="text-muted-foreground">&lt;10%</span>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center gap-1.5">
                  <div className="w-4 h-4 bg-emerald-600 rounded"></div>
                  <span className="text-muted-foreground">100%</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-4 h-4 bg-emerald-500 rounded"></div>
                  <span className="text-muted-foreground">≥75%</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-4 h-4 bg-yellow-500 rounded"></div>
                  <span className="text-muted-foreground">50-75%</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-4 h-4 bg-orange-500 rounded"></div>
                  <span className="text-muted-foreground">25-50%</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-4 h-4 bg-red-500 rounded"></div>
                  <span className="text-muted-foreground">&lt;25%</span>
                </div>
              </>
            )}
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-4 bg-muted/30 rounded border border-dashed border-muted-foreground"></div>
              <span className="text-muted-foreground">Sem dados</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
