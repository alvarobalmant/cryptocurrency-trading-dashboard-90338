import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { ChartCard } from '../ChartCard';
import { Users, DollarSign, Calendar, Clock, TrendingUp, Award, Hash } from 'lucide-react';
import type { ComprehensiveAnalytics } from '@/hooks/useComprehensiveAnalytics';
import { useState } from 'react';

interface EmployeeDashboardProps {
  analytics: ComprehensiveAnalytics;
}

export const EmployeeDashboard = ({ analytics }: EmployeeDashboardProps) => {
  const [showAppointmentsValue, setShowAppointmentsValue] = useState(false);
  
  const formatCurrency = (value: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  const employeeDetails = analytics.employeeAnalytics || [];

  // Calculate summary metrics
  const totalAppointments = employeeDetails.reduce((sum, emp) => sum + emp.totalAppointments, 0);
  const totalRevenue = employeeDetails.reduce((sum, emp) => sum + emp.totalRevenue, 0);
  const avgTicket = totalRevenue / totalAppointments || 0;

  // Top performers - usar apenas receita confirmada
  const topByRevenue = [...employeeDetails].sort((a, b) => b.confirmedRevenue - a.confirmedRevenue).slice(0, 3);
  const topByAppointments = [...employeeDetails].sort((a, b) => b.confirmedAppointments - a.confirmedAppointments).slice(0, 3);

  // Chart data - Revenue by employee
  const revenueChartData = employeeDetails.map(emp => ({
    name: emp.employeeName.split(' ')[0], // First name only
    Receita: emp.totalRevenue
  }));


  // Chart data - Appointments by employee (count or value)
  const appointmentsChartData = employeeDetails.map(emp => {
    if (showAppointmentsValue) {
      return {
        name: emp.employeeName.split(' ')[0],
        Confirmados: emp.confirmedRevenue || 0,
        Pendentes: emp.pendingRevenue || 0,
        Cancelados: emp.cancelledRevenue || 0
      };
    }
    
    return {
      name: emp.employeeName.split(' ')[0],
      Confirmados: emp.confirmedAppointments,
      Pendentes: emp.pendingAppointments,
      Cancelados: emp.cancelledAppointments
    };
  });

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Funcionários</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{employeeDetails.length}</div>
            <p className="text-xs text-muted-foreground">
              Ativos no período
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Receita Total</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalRevenue)}</div>
            <p className="text-xs text-muted-foreground">
              Todos os funcionários
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ticket Médio</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(avgTicket)}</div>
            <p className="text-xs text-muted-foreground">
              Por atendimento
            </p>
          </CardContent>
        </Card>

      </div>

      {/* Charts */}
      <div className="grid gap-6 md:grid-cols-2">
        <ChartCard
          title="Receita por Funcionário"
          subtitle="Receita total gerada"
          type="bar"
          data={revenueChartData}
          dataKeys={[
            { key: 'Receita', color: '#3B82F6', name: 'Receita Total' }
          ]}
          height={300}
        />

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Agendamentos por Funcionário</CardTitle>
                <CardDescription>
                  {showAppointmentsValue ? 'Valor em reais por status' : 'Quantidade por status'}
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAppointmentsValue(!showAppointmentsValue)}
                className="gap-2"
              >
                {showAppointmentsValue ? (
                  <>
                    <Hash className="h-4 w-4" />
                    Qtd
                  </>
                ) : (
                  <>
                    <DollarSign className="h-4 w-4" />
                    R$
                  </>
                )}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <ChartCard
              title=""
              type="bar"
              data={appointmentsChartData}
              dataKeys={[
                { key: 'Confirmados', color: '#10B981', name: 'Confirmados' },
                { key: 'Pendentes', color: '#F59E0B', name: 'Pendentes' },
                { key: 'Cancelados', color: '#EF4444', name: 'Cancelados' }
              ]}
              height={260}
              valueFormat={showAppointmentsValue ? 'currency' : 'number'}
            />
          </CardContent>
        </Card>
      </div>

      {/* Top Performers */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-green-600" />
              Top em Receita Confirmada
            </CardTitle>
            <CardDescription>Funcionários com maior faturamento confirmado</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {topByRevenue.map((emp, idx) => (
                <div key={emp.employeeId} className="flex items-center gap-3">
                  <Badge variant={idx === 0 ? "default" : "secondary"} className="w-8 h-8 rounded-full flex items-center justify-center">
                    {idx + 1}
                  </Badge>
                  <div className="flex-1">
                    <p className="font-medium">{emp.employeeName}</p>
                    <p className="text-sm text-muted-foreground">
                      {emp.confirmedAppointments} atendimentos confirmados
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-green-600">{formatCurrency(emp.confirmedRevenue)}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatCurrency(emp.confirmedRevenue / (emp.confirmedAppointments || 1))} /atend.
                    </p>
                    {emp.pendingRevenue > 0 && (
                      <p className="text-xs text-orange-600">
                        +{formatCurrency(emp.pendingRevenue)} pend.
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-blue-600" />
              Top em Atendimentos
            </CardTitle>
            <CardDescription>Funcionários mais ativos</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {topByAppointments.map((emp, idx) => (
                <div key={emp.employeeId} className="flex items-center gap-3">
                  <Badge variant={idx === 0 ? "default" : "secondary"} className="w-8 h-8 rounded-full flex items-center justify-center">
                    {idx + 1}
                  </Badge>
                  <div className="flex-1">
                    <p className="font-medium">{emp.employeeName}</p>
                    <p className="text-sm text-muted-foreground">
                      {emp.totalHours.toFixed(1)}h trabalhadas
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-blue-600">{emp.confirmedAppointments}</p>
                    <p className="text-xs text-muted-foreground">
                      confirmados
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Detalhamento por Funcionário</CardTitle>
              <CardDescription>Métricas completas de desempenho com receitas por status</CardDescription>
            </div>
            <div className="flex gap-4 text-xs">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded bg-green-600"></div>
                <span>Confirmada</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded bg-orange-600"></div>
                <span>Pendente</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded bg-red-600"></div>
                <span>Cancelada</span>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Funcionário</TableHead>
                  <TableHead className="text-center">Total</TableHead>
                  <TableHead className="text-center">Confirmados</TableHead>
                  <TableHead className="text-right">Receita Confirmada</TableHead>
                  <TableHead className="text-right">Receita Pendente</TableHead>
                  <TableHead className="text-right">Receita Cancelada</TableHead>
                  <TableHead className="text-right">Ticket Médio</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {employeeDetails.map((emp) => (
                  <TableRow key={emp.employeeId}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback>
                            {emp.employeeName.split(' ').map(n => n[0]).join('').substring(0, 2)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{emp.employeeName}</p>
                          {emp.topServices.length > 0 && (
                            <p className="text-xs text-muted-foreground">
                              Top: {emp.topServices[0].serviceName}
                            </p>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex flex-col items-center gap-1">
                        <span className="font-medium">{emp.totalAppointments}</span>
                        <div className="flex gap-1 text-xs">
                          <span className="text-green-600">{emp.confirmedAppointments}C</span>
                          <span className="text-orange-600">{emp.pendingAppointments}P</span>
                          <span className="text-red-600">{emp.cancelledAppointments}X</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                        {emp.confirmedAppointments}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="font-medium text-green-600">
                        {formatCurrency(emp.confirmedRevenue)}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="font-medium text-orange-600">
                        {formatCurrency(emp.pendingRevenue)}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="font-medium text-red-600">
                        {formatCurrency(emp.cancelledRevenue || 0)}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(emp.confirmedRevenue / (emp.confirmedAppointments || 1))}
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant={emp.status === 'active' ? 'default' : 'secondary'}
                        className={emp.status === 'active' ? 'bg-green-100 text-green-800' : ''}
                      >
                        {emp.status === 'active' ? 'Ativo' : emp.status === 'inactive' ? 'Inativo' : 'Deletado'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Top Services by Employee */}
      <Card>
        <CardHeader>
          <CardTitle>Serviços Mais Realizados por Funcionário</CardTitle>
          <CardDescription>Top 3 serviços de cada profissional</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {employeeDetails.map((emp) => (
              <Card key={emp.employeeId}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="text-xs">
                        {emp.employeeName.split(' ').map(n => n[0]).join('').substring(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                    {emp.employeeName}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {emp.topServices.slice(0, 3).map((service, idx) => (
                      <div key={idx} className="flex justify-between items-center text-sm">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="w-6 h-6 p-0 flex items-center justify-center">
                            {idx + 1}
                          </Badge>
                          <span className="font-medium">{service.serviceName}</span>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">{service.count}x</p>
                          <p className="text-xs text-muted-foreground">
                            {formatCurrency(service.revenue)}
                          </p>
                        </div>
                      </div>
                    ))}
                    {emp.topServices.length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        Nenhum serviço registrado
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
