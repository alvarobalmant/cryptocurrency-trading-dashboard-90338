import { EmployeePerformanceMatrix } from './charts/EmployeePerformanceMatrix';
import { ServiceAnalyticsChart } from './charts/ServiceAnalyticsChart';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { AlertCircle, CheckCircle2, XCircle } from 'lucide-react';
import type { BarbershopAnalytics } from '@/hooks/useAnalytics';

interface OperationalInsightsProps {
  analytics: BarbershopAnalytics;
}

export const OperationalInsights = ({ analytics }: OperationalInsightsProps) => {
  const completionRate = analytics.totalAppointments > 0
    ? (analytics.confirmedAppointments / analytics.totalAppointments) * 100
    : 0;

  const cancellationRate = analytics.totalAppointments > 0
    ? (analytics.cancelledAppointments / analytics.totalAppointments) * 100
    : 0;

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold">Insights Operacionais</h3>
      
      <div className="grid gap-4 md:grid-cols-2">
        {/* Appointment Status */}
        <Card>
          <CardHeader>
            <CardTitle>Status dos Agendamentos</CardTitle>
            <CardDescription>Visão geral de todos os agendamentos</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <span className="text-sm">Confirmados</span>
                </div>
                <span className="text-sm font-medium">{analytics.confirmedAppointments}</span>
              </div>
              <Progress value={completionRate} className="h-2" />
              <p className="text-xs text-muted-foreground">{completionRate.toFixed(1)}% de conclusão</p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-blue-600" />
                  <span className="text-sm">Pendentes</span>
                </div>
                <span className="text-sm font-medium">{analytics.pendingAppointments}</span>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <XCircle className="h-4 w-4 text-red-600" />
                  <span className="text-sm">Cancelados</span>
                </div>
                <span className="text-sm font-medium">{analytics.cancelledAppointments}</span>
              </div>
              <Progress value={cancellationRate} className="h-2 bg-red-100" />
              <p className="text-xs text-muted-foreground">{cancellationRate.toFixed(1)}% de cancelamento</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Performance Matrix and Service Analytics */}
      <div className="grid gap-4 md:grid-cols-2">
        <EmployeePerformanceMatrix analytics={analytics} />
        <ServiceAnalyticsChart analytics={analytics} />
      </div>
    </div>
  );
};
