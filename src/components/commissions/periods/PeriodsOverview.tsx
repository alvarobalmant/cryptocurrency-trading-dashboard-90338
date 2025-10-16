import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useCommissionPeriods } from "@/hooks/useCommissionPeriods";
import { DollarSign, Clock, CheckCircle, Users } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface PeriodsOverviewProps {
  barbershopId: string;
}

export const PeriodsOverview = ({ barbershopId }: PeriodsOverviewProps) => {
  const { periods, isLoading } = useCommissionPeriods(barbershopId);

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-32 mb-2" />
              <Skeleton className="h-3 w-20" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const pendingPeriods = periods.filter(p => p.status === 'pending_signature' || p.status === 'draft');
  const paidPeriods = periods.filter(p => p.status === 'paid');
  
  const totalPending = pendingPeriods.reduce((sum, p) => sum + p.net_amount, 0);
  const totalPaid = paidPeriods.reduce((sum, p) => sum + p.net_amount, 0);
  
  const employeesWithPending = new Set(pendingPeriods.map(p => p.employee_id)).size;

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
          <CardTitle className="text-sm font-medium">
            Pendente este Ciclo
          </CardTitle>
          <Clock className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            R$ {totalPending.toFixed(2)}
          </div>
          <p className="text-xs text-muted-foreground">
            {pendingPeriods.length} período(s) pendente(s)
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
          <CardTitle className="text-sm font-medium">
            Pago este Ciclo
          </CardTitle>
          <CheckCircle className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            R$ {totalPaid.toFixed(2)}
          </div>
          <p className="text-xs text-muted-foreground">
            {paidPeriods.length} período(s) pago(s)
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
          <CardTitle className="text-sm font-medium">
            Total de Períodos
          </CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {periods.length}
          </div>
          <p className="text-xs text-muted-foreground">
            Todos os períodos
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
          <CardTitle className="text-sm font-medium">
            Funcionários com Pendências
          </CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {employeesWithPending}
          </div>
          <p className="text-xs text-muted-foreground">
            Aguardando pagamento
          </p>
        </CardContent>
      </Card>
    </div>
  );
};
