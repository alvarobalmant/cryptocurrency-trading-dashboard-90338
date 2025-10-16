import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCommissionTransactions } from "@/hooks/useCommissionTransactions";
import { useEmployees } from "@/hooks/useEmployees";
import { CheckCircle2, Clock, DollarSign } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Skeleton } from "@/components/ui/skeleton";
import { PayCommissionDialog } from "./PayCommissionDialog";

interface CommissionsTableProps {
  barbershopId: string;
}

export const CommissionsTable = ({ barbershopId }: CommissionsTableProps) => {
  const [selectedEmployee, setSelectedEmployee] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<"all" | "pending" | "paid">("pending");
  const [payDialogOpen, setPayDialogOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<string | null>(null);

  const { employees } = useEmployees(barbershopId);
  const { transactions, isLoading } = useCommissionTransactions(
    barbershopId,
    selectedEmployee === "all" ? undefined : selectedEmployee,
    selectedStatus === "all" ? undefined : selectedStatus
  );

  const handlePayClick = (transactionId: string) => {
    setSelectedTransaction(transactionId);
    setPayDialogOpen(true);
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Histórico de Comissões</CardTitle>
              <CardDescription>
                Gerencie e acompanhe todas as comissões dos funcionários
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Funcionário" />
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

              <Select value={selectedStatus} onValueChange={(v) => setSelectedStatus(v as any)}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="pending">Pendentes</SelectItem>
                  <SelectItem value="paid">Pagas</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <DollarSign className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhuma comissão encontrada</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Funcionário</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Serviço</TableHead>
                  <TableHead>Valor Serviço</TableHead>
                  <TableHead>% Comissão</TableHead>
                  <TableHead>Valor Comissão</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((transaction) => (
                  <TableRow key={transaction.id}>
                  <TableCell>
                    {transaction.appointment?.appointment_date && transaction.appointment?.start_time
                      ? format(new Date(`${transaction.appointment.appointment_date}T${transaction.appointment.start_time}`), "dd/MM/yyyy HH:mm", { locale: ptBR })
                      : format(new Date(transaction.created_at), "dd/MM/yyyy", { locale: ptBR })}
                  </TableCell>
                    <TableCell className="font-medium">
                      {transaction.employee?.name || "N/A"}
                    </TableCell>
                    <TableCell>{transaction.appointment?.client_name || "N/A"}</TableCell>
                    <TableCell>{transaction.service?.name || "N/A"}</TableCell>
                    <TableCell>
                      {Number(transaction.service_value).toLocaleString('pt-BR', { 
                        style: 'currency', 
                        currency: 'BRL' 
                      })}
                    </TableCell>
                    <TableCell>{transaction.commission_percentage}%</TableCell>
                    <TableCell className="font-semibold">
                      {Number(transaction.commission_value).toLocaleString('pt-BR', { 
                        style: 'currency', 
                        currency: 'BRL' 
                      })}
                    </TableCell>
                    <TableCell>
                      {transaction.status === 'paid' ? (
                        <Badge variant="default" className="gap-1">
                          <CheckCircle2 className="h-3 w-3" />
                          Paga
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="gap-1">
                          <Clock className="h-3 w-3" />
                          Pendente
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {transaction.status === 'pending' && (
                        <Button 
                          size="sm" 
                          onClick={() => handlePayClick(transaction.id)}
                        >
                          Pagar
                        </Button>
                      )}
                      {transaction.status === 'paid' && transaction.paid_at && (
                        <span className="text-xs text-muted-foreground">
                          Pago em {format(new Date(transaction.paid_at), "dd/MM/yyyy", { locale: ptBR })}
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {selectedTransaction && (
        <PayCommissionDialog
          transactionId={selectedTransaction}
          open={payDialogOpen}
          onOpenChange={setPayDialogOpen}
        />
      )}
    </>
  );
};
