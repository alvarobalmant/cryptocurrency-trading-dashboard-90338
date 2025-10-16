import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { usePlanLimits } from '@/hooks/usePlanLimits';
import { Users, Scissors, Calendar } from 'lucide-react';

interface PlanUsageCardProps {
  barbershopId: string;
}

export const PlanUsageCard = ({ barbershopId }: PlanUsageCardProps) => {
  const { usageStats, loading } = usePlanLimits(barbershopId);

  if (loading || !usageStats) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Uso do Plano</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-3/4"></div>
            <div className="h-2 bg-muted rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const getProgressColor = (current: number, max: number) => {
    if (max === -1) return 'bg-green-500'; // Unlimited
    const percentage = (current / max) * 100;
    if (percentage >= 90) return 'bg-red-500';
    if (percentage >= 70) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const formatLimit = (limit: number) => {
    return limit === -1 ? 'Ilimitado' : limit.toString();
  };

  const calculatePercentage = (current: number, max: number) => {
    if (max === -1) return 0; // Unlimited shows as 0%
    return Math.min((current / max) * 100, 100);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Uso do Plano</CardTitle>
        <Badge variant="outline" className="capitalize">
          {usageStats.plan_type}
        </Badge>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Funcionários */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-blue-500" />
              <span>Funcionários</span>
            </div>
            <span className="font-medium">
              {usageStats.active_employees} / {formatLimit(usageStats.max_employees)}
            </span>
          </div>
          <Progress 
            value={calculatePercentage(usageStats.active_employees, usageStats.max_employees)}
            className="h-2"
          />
        </div>

        {/* Serviços */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <Scissors className="h-4 w-4 text-purple-500" />
              <span>Serviços</span>
            </div>
            <span className="font-medium">
              {usageStats.active_services} / {formatLimit(usageStats.max_services)}
            </span>
          </div>
          <Progress 
            value={calculatePercentage(usageStats.active_services, usageStats.max_services)}
            className="h-2"
          />
        </div>

        {/* Agendamentos */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-green-500" />
              <span>Agendamentos (mês atual)</span>
            </div>
            <span className="font-medium">
              {usageStats.current_month_appointments} / {formatLimit(usageStats.max_appointments_per_month)}
            </span>
          </div>
          <Progress 
            value={calculatePercentage(usageStats.current_month_appointments, usageStats.max_appointments_per_month)}
            className="h-2"
          />
        </div>

        {/* Status dos limites */}
        <div className="pt-2 border-t space-y-2">
          <div className="text-xs text-muted-foreground space-y-1">
            {!usageStats.can_add_employee && (
              <div className="text-red-600">⚠️ Limite de funcionários atingido</div>
            )}
            {!usageStats.can_add_service && (
              <div className="text-red-600">⚠️ Limite de serviços atingido</div>
            )}
            {!usageStats.can_create_appointment && (
              <div className="text-red-600">⚠️ Limite de agendamentos do mês atingido</div>
            )}
            {usageStats.can_add_employee && usageStats.can_add_service && usageStats.can_create_appointment && (
              <div className="text-green-600">✅ Todos os recursos disponíveis</div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};