import { TrendingUp, TrendingDown, Activity } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useFinancialHealth } from '@/hooks/useFinancialHealth';
import type { BarbershopAnalytics } from '@/hooks/useAnalytics';

interface FinancialHealthScoreProps {
  analytics: BarbershopAnalytics | null;
}

export const FinancialHealthScore = ({ analytics }: FinancialHealthScoreProps) => {
  const { score, status, trend } = useFinancialHealth(analytics);

  const statusConfig = {
    excellent: { color: 'text-green-600', bgColor: 'bg-green-50', label: 'Excelente' },
    good: { color: 'text-blue-600', bgColor: 'bg-blue-50', label: 'Bom' },
    fair: { color: 'text-orange-600', bgColor: 'bg-orange-50', label: 'Regular' },
    poor: { color: 'text-red-600', bgColor: 'bg-red-50', label: 'Crítico' },
    unknown: { color: 'text-muted-foreground', bgColor: 'bg-muted', label: 'Sem dados' },
  };

  const config = statusConfig[status];

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Saúde Financeira</CardTitle>
        <Activity className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="flex items-end justify-between">
          <div>
            <div className={`text-4xl font-bold ${config.color}`}>{score}</div>
            <Badge variant="outline" className="mt-2">
              {config.label}
            </Badge>
          </div>
          <div className="text-right">
            {trend > 0 ? (
              <TrendingUp className="h-6 w-6 text-green-600" />
            ) : (
              <TrendingDown className="h-6 w-6 text-red-600" />
            )}
          </div>
        </div>
        <CardDescription className="mt-3">
          Score baseado em fluxo de caixa, eficiência e crescimento
        </CardDescription>
      </CardContent>
    </Card>
  );
};
