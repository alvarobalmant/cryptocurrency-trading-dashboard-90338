import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown, LucideIcon } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { analyticsTheme } from '@/styles/analytics-theme';
import { MetricTooltip, MetricHelpContent } from './MetricTooltip';

interface KpiCardProps {
  title: string;
  value: string | number;
  change?: number;
  trend?: 'up' | 'down' | 'neutral';
  target?: number;
  icon?: LucideIcon;
  sparklineData?: number[];
  color?: 'green' | 'blue' | 'red' | 'purple' | 'orange';
  subtitle?: string;
  progress?: number;
  helpContent?: MetricHelpContent;
}

export const KpiCard = ({
  title,
  value,
  change,
  trend = 'neutral',
  target,
  icon: Icon,
  color = 'blue',
  subtitle,
  progress,
  helpContent
}: KpiCardProps) => {
  const colorClasses = {
    green: 'text-green-600 bg-green-50',
    blue: 'text-blue-600 bg-blue-50',
    red: 'text-red-600 bg-red-50',
    purple: 'text-purple-600 bg-purple-50',
    orange: 'text-orange-600 bg-orange-50',
  };

  const trendColor = trend === 'up' ? 'text-green-600' : trend === 'down' ? 'text-red-600' : 'text-muted-foreground';
  const TrendIcon = trend === 'up' ? TrendingUp : TrendingDown;

  return (
    <Card className="hover:shadow-md transition-shadow duration-200" style={{ boxShadow: analyticsTheme.shadows.sm }}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="flex items-center gap-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
          {helpContent && <MetricTooltip content={helpContent} />}
        </div>
        {Icon && (
          <div className={`p-2 rounded-lg ${colorClasses[color]}`}>
            <Icon className="h-4 w-4" />
          </div>
        )}
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold tracking-tight">{value}</div>
        
        {subtitle && (
          <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
        )}
        
        {change !== undefined && (
          <div className={`flex items-center gap-1 mt-2 text-xs font-medium ${trendColor}`}>
            <TrendIcon className="h-3 w-3" />
            <span>{Math.abs(change).toFixed(1)}%</span>
            <span className="text-muted-foreground ml-1">vs período anterior</span>
          </div>
        )}
        
        {progress !== undefined && (
          <div className="mt-3 space-y-1">
            <Progress value={progress} className="h-1.5" />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{progress.toFixed(0)}% da meta</span>
              {target && <span>Meta: {target.toLocaleString('pt-BR')}</span>}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
