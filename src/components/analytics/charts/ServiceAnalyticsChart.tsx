import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import type { BarbershopAnalytics } from '@/hooks/useAnalytics';

interface ServiceAnalyticsChartProps {
  analytics: BarbershopAnalytics;
}

export const ServiceAnalyticsChart = ({ analytics }: ServiceAnalyticsChartProps) => {
  // Aggregate service data from all employees
  const serviceMap = new Map<string, { count: number; revenue: number }>();

  analytics.employeeAnalytics.forEach(employee => {
    employee.topServices.forEach(service => {
      const existing = serviceMap.get(service.serviceName) || { count: 0, revenue: 0 };
      serviceMap.set(service.serviceName, {
        count: existing.count + service.count,
        revenue: existing.revenue + service.revenue,
      });
    });
  });

  const data = Array.from(serviceMap.entries())
    .map(([name, stats]) => ({
      name,
      value: stats.revenue,
      count: stats.count,
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);

  const COLORS = [
    'hsl(142, 71%, 45%)',
    'hsl(221, 83%, 53%)',
    'hsl(25, 95%, 53%)',
    'hsl(271, 91%, 65%)',
    'hsl(340, 82%, 52%)',
  ];

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
    }).format(value);
  };

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Top Serviços</CardTitle>
          <CardDescription>Serviços mais rentáveis</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">
            Nenhum serviço realizado no período
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Top Serviços</CardTitle>
        <CardDescription>Serviços mais rentáveis do período</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip 
              formatter={(value: number) => formatCurrency(value)}
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
              }}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="mt-4 space-y-2">
          {data.map((item, index) => (
            <div key={item.name} className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <div 
                  className="w-3 h-3 rounded-full" 
                  style={{ backgroundColor: COLORS[index % COLORS.length] }}
                />
                <span>{item.name}</span>
              </div>
              <div className="text-right">
                <div className="font-medium">{formatCurrency(item.value)}</div>
                <div className="text-xs text-muted-foreground">{item.count}x</div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
