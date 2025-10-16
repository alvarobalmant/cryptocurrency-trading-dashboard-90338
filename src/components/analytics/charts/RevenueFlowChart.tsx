import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import type { BarbershopAnalytics } from '@/hooks/useAnalytics';

interface RevenueFlowChartProps {
  analytics: BarbershopAnalytics;
}

export const RevenueFlowChart = ({ analytics }: RevenueFlowChartProps) => {
  const data = [
    { 
      name: 'Recebido', 
      value: analytics.receivedRevenue,
      color: 'hsl(142, 71%, 45%)'
    },
    { 
      name: 'A Receber', 
      value: analytics.pendingRevenue,
      color: 'hsl(25, 95%, 53%)'
    },
    { 
      name: 'Futuro', 
      value: analytics.futureRevenue,
      color: 'hsl(221, 83%, 53%)'
    },
    { 
      name: 'Perdido', 
      value: analytics.lostRevenue,
      color: 'hsl(0, 84%, 60%)'
    },
  ];

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
    }).format(value);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Fluxo de Receita</CardTitle>
        <CardDescription>Distribuição da receita por status</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis 
              dataKey="name" 
              stroke="hsl(var(--muted-foreground))"
              fontSize={12}
            />
            <YAxis 
              stroke="hsl(var(--muted-foreground))"
              fontSize={12}
              tickFormatter={formatCurrency}
            />
            <Tooltip 
              formatter={(value: number) => formatCurrency(value)}
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
              }}
            />
            <Bar dataKey="value" radius={[8, 8, 0, 0]}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};
