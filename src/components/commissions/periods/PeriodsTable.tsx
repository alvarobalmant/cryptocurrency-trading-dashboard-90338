import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCommissionPeriods, CommissionPeriod } from "@/hooks/useCommissionPeriods";
import { useEmployees } from "@/hooks/useEmployees";
import { Eye, DollarSign, FileText, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { PeriodDetailsDialog } from "./PeriodDetailsDialog";
import { PayPeriodDialog } from "./PayPeriodDialog";
import { Skeleton } from "@/components/ui/skeleton";

interface PeriodsTableProps {
  barbershopId: string;
  statusFilter?: string;
  compact?: boolean;
}

export const PeriodsTable = ({ barbershopId, statusFilter, compact = false }: PeriodsTableProps) => {
  const [selectedEmployee, setSelectedEmployee] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>(statusFilter || 'all');
  const [selectedPeriod, setSelectedPeriod] = useState<CommissionPeriod | null>(null);
  const [payDialogOpen, setPayDialogOpen] = useState(false);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);

  const { periods, isLoading } = useCommissionPeriods(
    barbershopId, 
    selectedEmployee === 'all' ? undefined : selectedEmployee,
    selectedStatus === 'all' && !statusFilter ? undefined : (statusFilter || selectedStatus)
  );
  const { employees } = useEmployees(barbershopId);

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; label: string }> = {
      draft: { variant: "outline", label: "Rascunho" },
      pending_signature: { variant: "secondary", label: "Pendente" },
      signed: { variant: "default", label: "Assinado" },
      paid: { variant: "default", label: "Pago" },
      cancelled: { variant: "destructive", label: "Cancelado" },
    };
    
    return variants[status] || { variant: "outline", label: status };
  };

  const handleViewDetails = (period: CommissionPeriod) => {
    setSelectedPeriod(period);
    setDetailsDialogOpen(true);
  };

  const handlePayClick = (period: CommissionPeriod) => {
    setSelectedPeriod(period);
    setPayDialogOpen(true);
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(compact ? 3 : 5)].map((_, i) => (
          <Skeleton key={i} className="h-16 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  if (compact) {
    return (
      <>
        {periods.length === 0 ? (
          <div className="text-center py-8">
            <FileText className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
            <p className="text-sm text-muted-foreground">Nenhum período encontrado</p>
          </div>
        ) : (
          <div className="space-y-3">
            {periods.slice(0, 5).map((period) => {
              const statusInfo = getStatusBadge(period.status);
              return (
                <div
                  key={period.id}
                  className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-medium truncate">{period.employee?.name || 'N/A'}</p>
                      <Badge variant={statusInfo.variant} className="text-xs">
                        {statusInfo.label}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                      <span>
                        {format(new Date(period.period_start), "dd/MM", { locale: ptBR })} -{" "}
                        {format(new Date(period.period_end), "dd/MM", { locale: ptBR })}
                      </span>
                      <span className="font-semibold text-foreground">
                        R$ {period.net_amount.toFixed(2)}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2 ml-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleViewDetails(period)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    {(period.status === 'pending_signature' || period.status === 'pending') && (
                      <Button
                        size="sm"
                        onClick={() => handlePayClick(period)}
                      >
                        <DollarSign className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {selectedPeriod && (
          <>
            <PeriodDetailsDialog
              period={selectedPeriod}
              open={detailsDialogOpen}
              onOpenChange={(open) => {
                setDetailsDialogOpen(open);
                if (!open) setSelectedPeriod(null);
              }}
            />
            <PayPeriodDialog
              period={selectedPeriod}
              open={payDialogOpen}
              onOpenChange={(open) => {
                setPayDialogOpen(open);
                if (!open) setSelectedPeriod(null);
              }}
            />
          </>
        )}
      </>
    );
  }

  return (
    <>
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue placeholder="Todos os funcionários" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os funcionários</SelectItem>
              {employees.map((emp) => (
                <SelectItem key={emp.id} value={emp.id}>
                  {emp.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {!statusFilter && (
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="w-full sm:w-[160px]">
                <SelectValue placeholder="Todos os status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                <SelectItem value="pending_signature">Pendente</SelectItem>
                <SelectItem value="paid">Pago</SelectItem>
                <SelectItem value="cancelled">Cancelado</SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>

        {periods.length === 0 ? (
          <div className="text-center py-16 border rounded-lg bg-muted/20">
            <FileText className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground text-lg">Nenhum período encontrado</p>
            <p className="text-sm text-muted-foreground mt-2">
              Ajuste os filtros ou gere novos períodos
            </p>
          </div>
        ) : (
          <div className="rounded-lg border overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="font-semibold">Funcionário</TableHead>
                    <TableHead className="font-semibold">Período</TableHead>
                    <TableHead className="font-semibold">Valor Total</TableHead>
                    <TableHead className="font-semibold">Status</TableHead>
                    <TableHead className="font-semibold">Criado em</TableHead>
                    <TableHead className="font-semibold">Pago em</TableHead>
                    <TableHead className="text-right font-semibold">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {periods.map((period) => {
                    const statusInfo = getStatusBadge(period.status);
                    return (
                      <TableRow key={period.id} className="hover:bg-muted/50">
                        <TableCell className="font-medium">
                          {period.employee?.name || 'N/A'}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          {format(new Date(period.period_start), "dd/MM", { locale: ptBR })} -{" "}
                          {format(new Date(period.period_end), "dd/MM/yy", { locale: ptBR })}
                        </TableCell>
                        <TableCell className="font-semibold">
                          R$ {period.net_amount.toFixed(2)}
                        </TableCell>
                        <TableCell>
                          <Badge variant={statusInfo.variant}>
                            {statusInfo.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {format(new Date(period.created_at), "dd/MM/yyyy", { locale: ptBR })}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {period.paid_at 
                            ? format(new Date(period.paid_at), "dd/MM/yyyy", { locale: ptBR })
                            : "-"
                          }
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleViewDetails(period)}
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              <span className="hidden sm:inline">Ver</span>
                            </Button>
                            {(period.status === 'pending_signature' || period.status === 'pending') && (
                              <Button
                                size="sm"
                                onClick={() => handlePayClick(period)}
                              >
                                <DollarSign className="h-4 w-4 mr-1" />
                                <span className="hidden sm:inline">Pagar</span>
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </div>

      {selectedPeriod && (
        <>
          <PeriodDetailsDialog
            period={selectedPeriod}
            open={detailsDialogOpen}
            onOpenChange={(open) => {
              setDetailsDialogOpen(open);
              if (!open) setSelectedPeriod(null);
            }}
          />
          <PayPeriodDialog
            period={selectedPeriod}
            open={payDialogOpen}
            onOpenChange={(open) => {
              setPayDialogOpen(open);
              if (!open) setSelectedPeriod(null);
            }}
          />
        </>
      )}
    </>
  );
};
