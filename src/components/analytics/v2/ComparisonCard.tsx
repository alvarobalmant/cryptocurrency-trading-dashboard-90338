import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';

interface ComparisonCardProps {
  title: string;
  current: number;
  previous: number;
  metric: string;
  format?: 'currency' | 'number' | 'percentage';
}

export const ComparisonCard = ({
  title,
  current,
  previous,
  metric,
  format = 'currency'
}: ComparisonCardProps) => {
  const difference = current - previous;
  const percentageChange = previous !== 0 ? (difference / previous) * 100 : 0;
  const isPositive = difference > 0;
  const isNeutral = difference === 0;

  const formatValue = (value: number) => {
    if (format === 'currency') {
      return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
    }
    if (format === 'percentage') {
      return `${value.toFixed(1)}%`;
    }
    return value.toLocaleString('pt-BR');
  };

  const Icon = isNeutral ? Minus : isPositive ? ArrowUpRight : ArrowDownRight;
  const colorClass = isNeutral ? 'text-muted-foreground' : isPositive ? 'text-green-600' : 'text-red-600';
  const bgClass = isNeutral ? 'bg-muted' : isPositive ? 'bg-green-50' : 'bg-red-50';

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-2xl font-bold">{formatValue(current)}</p>
            <p className="text-xs text-muted-foreground mt-1">{metric}</p>
          </div>
          <div className={`flex flex-col items-end gap-1`}>
            <div className={`flex items-center gap-1 px-2 py-1 rounded-full ${bgClass}`}>
              <Icon className={`h-3 w-3 ${colorClass}`} />
              <span className={`text-xs font-medium ${colorClass}`}>
                {!isNeutral && (isPositive ? '+' : '')}{percentageChange.toFixed(1)}%
              </span>
            </div>
            <p className="text-xs text-muted-foreground">vs {formatValue(previous)}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
