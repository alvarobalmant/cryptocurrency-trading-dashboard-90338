import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SegmentMetrics {
  clv: number;
  clientCount: number;
  avgFrequency: number;
  avgTicket: number;
  lastVisitAvg: number;
  totalRevenue: number;
  percentageOfTotal: number;
}

interface PremiumSegmentCardProps {
  title: string;
  description: string;
  criteria: string;
  icon: LucideIcon;
  metrics: SegmentMetrics;
  color: 'purple' | 'blue' | 'green';
  actionInsight: string;
  priority: 'high' | 'medium' | 'low';
}

const colorConfig = {
  purple: {
    badge: 'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-800',
    icon: 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400',
    gradient: 'from-purple-500/10 to-transparent',
    text: 'text-purple-600 dark:text-purple-400',
    progress: 'bg-purple-500',
    border: 'border-purple-200 dark:border-purple-800',
    glow: 'shadow-purple-500/10'
  },
  blue: {
    badge: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800',
    icon: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
    gradient: 'from-blue-500/10 to-transparent',
    text: 'text-blue-600 dark:text-blue-400',
    progress: 'bg-blue-500',
    border: 'border-blue-200 dark:border-blue-800',
    glow: 'shadow-blue-500/10'
  },
  green: {
    badge: 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800',
    icon: 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400',
    gradient: 'from-green-500/10 to-transparent',
    text: 'text-green-600 dark:text-green-400',
    progress: 'bg-green-500',
    border: 'border-green-200 dark:border-green-800',
    glow: 'shadow-green-500/10'
  }
};

const priorityConfig = {
  high: { label: 'Prioridade Máxima', color: 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20' },
  medium: { label: 'Atenção Moderada', color: 'bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/20' },
  low: { label: 'Manter Estratégia', color: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20' }
};

export const PremiumSegmentCard = ({
  title,
  description,
  criteria,
  icon: Icon,
  metrics,
  color,
  actionInsight,
  priority
}: PremiumSegmentCardProps) => {
  const colors = colorConfig[color];
  const priorityInfo = priorityConfig[priority];

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  return (
    <Card className={cn(
      "relative overflow-hidden transition-all duration-300 hover:shadow-xl",
      colors.glow,
      "border-2",
      colors.border
    )}>
      {/* Background Gradient */}
      <div className={cn(
        "absolute inset-0 bg-gradient-to-br opacity-50",
        colors.gradient
      )} />

      {/* Content */}
      <div className="relative p-6 space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <div className={cn(
              "p-3 rounded-xl",
              colors.icon
            )}>
              <Icon className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-bold">{title}</h3>
                <Badge variant="outline" className={colors.badge}>
                  {metrics.clientCount} {metrics.clientCount === 1 ? 'cliente' : 'clientes'}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">{description}</p>
            </div>
          </div>
        </div>

        {/* Critério de Classificação */}
        <div className="bg-muted/50 rounded-lg p-3 border border-border">
          <p className="text-xs font-medium text-muted-foreground mb-1">Critério de Classificação</p>
          <p className="text-sm font-semibold">{criteria}</p>
        </div>

        {/* Métricas Principais */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">CLV Médio</p>
            <p className={cn("text-2xl font-bold", colors.text)}>{formatCurrency(metrics.clv)}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">Receita Total</p>
            <p className="text-2xl font-bold">{formatCurrency(metrics.totalRevenue)}</p>
          </div>
        </div>

        {/* Métricas Secundárias */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-background/60 rounded-lg p-3 border border-border">
            <p className="text-xs text-muted-foreground mb-1">Frequência</p>
            <p className="text-lg font-bold">{metrics.avgFrequency.toFixed(1)}x/mês</p>
          </div>
          <div className="bg-background/60 rounded-lg p-3 border border-border">
            <p className="text-xs text-muted-foreground mb-1">Ticket Médio</p>
            <p className="text-lg font-bold">{formatCurrency(metrics.avgTicket)}</p>
          </div>
          <div className="bg-background/60 rounded-lg p-3 border border-border">
            <p className="text-xs text-muted-foreground mb-1">Últ. Visita</p>
            <p className="text-lg font-bold">{metrics.lastVisitAvg} dias</p>
          </div>
        </div>

        {/* Representatividade */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium text-muted-foreground">Representatividade</span>
            <span className={cn("font-bold", colors.text)}>{metrics.percentageOfTotal.toFixed(1)}%</span>
          </div>
          <Progress 
            value={metrics.percentageOfTotal} 
            className="h-2"
            // @ts-ignore - Progress component accepts className for indicator
            indicatorClassName={colors.progress}
          />
        </div>

        {/* Insight Acionável */}
        <div className={cn(
          "rounded-lg p-4 border-2",
          priorityInfo.color
        )}>
          <div className="flex items-start gap-3">
            <div className="mt-0.5">
              <div className="w-2 h-2 rounded-full bg-current animate-pulse" />
            </div>
            <div className="space-y-1">
              <p className="text-xs font-bold uppercase tracking-wide">{priorityInfo.label}</p>
              <p className="text-sm font-medium">{actionInsight}</p>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};
