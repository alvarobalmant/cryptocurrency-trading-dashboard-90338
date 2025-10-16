import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AreaChart, Area, BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { analyticsTheme } from '@/styles/analytics-theme';
import { MetricTooltip, MetricHelpContent } from './MetricTooltip';

interface ChartCardProps {
  title: string;
  subtitle?: string;
  type: 'area' | 'bar' | 'line';
  data: any[];
  dataKeys: { key: string; color: string; name?: string }[];
  height?: number;
  showLegend?: boolean;
  showGrid?: boolean;
  gradientFill?: boolean;
  helpContent?: MetricHelpContent;
  valueFormat?: 'currency' | 'percentage' | 'number';
}

export const ChartCard = ({
  title,
  subtitle,
  type,
  data,
  dataKeys,
  height = 300,
  showLegend = true,
  showGrid = true,
  gradientFill = false,
  helpContent,
  valueFormat = 'currency'
}: ChartCardProps) => {
  const formatValue = (value: number) => {
    if (valueFormat === 'percentage') {
      return `${value.toFixed(1)}%`;
    }
    if (valueFormat === 'number') {
      return value.toLocaleString('pt-BR');
    }
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background/95 backdrop-blur-sm border rounded-lg p-3 shadow-lg">
          <p className="text-sm font-medium mb-1">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {typeof entry.value === 'number' ? formatValue(entry.value) : entry.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  const renderChart = () => {
    const commonProps = {
      data,
      margin: { top: 10, right: 30, left: 0, bottom: 0 }
    };

    const gridColor = 'hsl(var(--muted))';
    
    if (type === 'area') {
      return (
        <AreaChart {...commonProps}>
          {showGrid && <CartesianGrid strokeDasharray="3 3" stroke={gridColor} opacity={0.2} />}
          <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} />
          <YAxis 
            stroke="hsl(var(--muted-foreground))" 
            fontSize={12}
            tickFormatter={(value) => valueFormat === 'percentage' ? `${value}%` : value}
          />
          <Tooltip content={<CustomTooltip />} />
          {showLegend && <Legend />}
          {dataKeys.map((item, index) => (
            <Area
              key={item.key}
              type="monotone"
              dataKey={item.key}
              stroke={item.color}
              fill={gradientFill ? `url(#gradient${index})` : item.color}
              fillOpacity={0.6}
              strokeWidth={2}
              name={item.name || item.key}
            />
          ))}
          {gradientFill && dataKeys.map((item, index) => (
            <defs key={`def-${index}`}>
              <linearGradient id={`gradient${index}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={item.color} stopOpacity={0.8}/>
                <stop offset="95%" stopColor={item.color} stopOpacity={0.1}/>
              </linearGradient>
            </defs>
          ))}
        </AreaChart>
      );
    }

    if (type === 'bar') {
      return (
        <BarChart {...commonProps}>
          {showGrid && <CartesianGrid strokeDasharray="3 3" stroke={gridColor} opacity={0.2} />}
          <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} />
          <YAxis 
            stroke="hsl(var(--muted-foreground))" 
            fontSize={12}
            tickFormatter={(value) => valueFormat === 'percentage' ? `${value}%` : value}
          />
          <Tooltip content={<CustomTooltip />} />
          {showLegend && <Legend />}
          {dataKeys.map((item) => (
            <Bar key={item.key} dataKey={item.key} fill={item.color} radius={[8, 8, 0, 0]} name={item.name || item.key} />
          ))}
        </BarChart>
      );
    }

    return (
      <LineChart {...commonProps}>
        {showGrid && <CartesianGrid strokeDasharray="3 3" stroke={gridColor} opacity={0.2} />}
        <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} />
        <YAxis 
          stroke="hsl(var(--muted-foreground))" 
          fontSize={12}
          tickFormatter={(value) => valueFormat === 'percentage' ? `${value}%` : value}
        />
        <Tooltip content={<CustomTooltip />} />
        {showLegend && <Legend />}
        {dataKeys.map((item) => (
          <Line
            key={item.key}
            type="monotone"
            dataKey={item.key}
            stroke={item.color}
            strokeWidth={2}
            dot={{ r: 4 }}
            activeDot={{ r: 6 }}
            name={item.name || item.key}
          />
        ))}
      </LineChart>
    );
  };

  return (
    <Card style={{ boxShadow: analyticsTheme.shadows.sm }}>
      <CardHeader>
        <div className="flex items-center gap-2">
          <CardTitle>{title}</CardTitle>
          {helpContent && <MetricTooltip content={helpContent} />}
        </div>
        {subtitle && <CardDescription>{subtitle}</CardDescription>}
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={height}>
          {renderChart()}
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};
