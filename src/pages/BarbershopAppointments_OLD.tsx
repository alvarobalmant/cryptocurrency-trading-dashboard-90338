import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useAppointments } from '@/hooks/useAppointments';
import { useEmployees } from '@/hooks/useEmployees';
import { usePayments } from '@/hooks/usePayments';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Filter, Calendar, User, Phone, Clock, QrCode, CreditCard, ExternalLink } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import type { SafeBarbershop } from '@/types/barbershop';
import { PaymentStatusBadge } from '@/utils/paymentStatus';
import { PaymentDetailsModal } from '@/components/PaymentDetailsModal';

const BarbershopAppointments = () => {
  const { barbershopId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  
  console.log('BarbershopAppointments - barbershopId from params:', barbershopId);
  
  const { appointments, loading: appointmentsLoading, updateAppointmentStatus, refetch } = useAppointments(barbershopId!);
  const { employees } = useEmployees(barbershopId!);
  const { payments } = usePayments(barbershopId!);

  const [barbershop, setBarbershop] = useState<SafeBarbershop | null>(null);
  const [barbershopLoading, setBarbershopLoading] = useState(true);
  const [filteredAppointments, setFilteredAppointments] = useState(appointments);
  const [allRecords, setAllRecords] = useState<Array<any>>([]);
  const [dateFilter, setDateFilter] = useState('');
  const [employeeFilter, setEmployeeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all'); // agendamento, pix, todos
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<string | null>(null);
  const [selectedPaymentId, setSelectedPaymentId] = useState<string | null>(null);
  const [historySortBy, setHistorySortBy] = useState<'transaction' | 'appointment'>('transaction');

  // Fetch specific barbershop
  useEffect(() => {
    const fetchBarbershop = async () => {
      if (!barbershopId) return;
      
      try {
        // SECURE: Use security definer function instead of direct table access
        const { data, error } = await supabase.rpc('get_safe_barbershop_data', {
          barbershop_id_param: barbershopId
        });

        if (error) throw error;
        
        if (data && data.length > 0) {
          setBarbershop(data[0]);
        }
      } catch (error) {
        console.error('Error fetching barbershop:', error);
      } finally {
        setBarbershopLoading(false);
      }
    };

    fetchBarbershop();
  }, [barbershopId]);

  // Combinar agendamentos e pagamentos PIX
  useEffect(() => {
    // Converter agendamentos para formato comum
    const appointmentRecords = appointments.map(apt => ({
      id: apt.id,
      type: 'appointment' as const,
      date: apt.appointment_date,
      time: apt.start_time,
      client_name: apt.client_name,
      client_phone: apt.client_phone,
      employee_id: apt.employee_id,
      status: apt.status,
      payment_status: apt.payment_status,
      payment_method: apt.payment_method,
      notes: apt.notes,
      data: apt,
      // Usar data do pagamento se disponível, senão data do agendamento
      operation_date: apt.payment_status === 'paid' ? 
        (payments.find(p => p.appointment_id === apt.id)?.paid_at || 
         payments.find(p => p.appointment_id === apt.id)?.created_at || 
         apt.created_at) : 
        apt.created_at
    }));

    // Converter pagamentos walk-in (PIX, cartão/link, maquininha) para formato comum
    const pixRecords = payments
      .filter(payment => payment.payment_type === 'walk_in')
      .map(payment => ({
        id: payment.id,
        type: 'payment' as const,
        date: payment.created_at.split('T')[0],
        time: payment.created_at.split('T')[1]?.split('.')[0] || '00:00:00',
        client_name: payment.client_name,
        client_phone: payment.client_phone,
        employee_id: payment.employee_id,
        status: payment.status === 'paid' ? 'confirmed' : payment.status,
        payment_status: payment.status,
        payment_method: payment.payment_method,
        notes: payment.description,
        data: payment,
        // Usar data do pagamento efetivo se disponível, senão data de criação  
        operation_date: payment.paid_at || payment.created_at
      }));

    // Combinar e ordenar
    const combined = [...appointmentRecords, ...pixRecords];
    
    let filtered = [...combined];

    // Filter by date
    if (dateFilter) {
      filtered = filtered.filter(record => record.date === dateFilter);
    }

    // Filter by employee
    if (employeeFilter !== 'all') {
      filtered = filtered.filter(record => record.employee_id === employeeFilter);
    }

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(record => record.status === statusFilter);
    }

    // Filter by type
    if (typeFilter !== 'all') {
      filtered = filtered.filter(record => record.type === typeFilter);
    }

    // Sort by operation date (newest first) - considera a data da operação de pagamento ou agendamento
    filtered.sort((a, b) => {
      if (historySortBy === 'transaction') {
        const dateA = new Date(a.operation_date);
        const dateB = new Date(b.operation_date);
        return dateB.getTime() - dateA.getTime();
      } else {
        // Ordenar por data do agendamento
        const dateA = a.type === 'appointment' 
          ? new Date(a.date + 'T' + a.time)
          : new Date(a.operation_date);
        const dateB = b.type === 'appointment'
          ? new Date(b.date + 'T' + b.time)
          : new Date(b.operation_date);
        return dateB.getTime() - dateA.getTime();
      }
    });

    setAllRecords(filtered);
  }, [appointments, payments, dateFilter, employeeFilter, statusFilter, typeFilter, historySortBy]);

  const handleStatusChange = async (appointmentId: string, newStatus: string) => {
    try {
      await updateAppointmentStatus(appointmentId, newStatus);
      toast({
        title: 'Status atualizado!',
        description: `Agendamento marcado como ${getStatusLabel(newStatus)}.`,
      });
      refetch();
    } catch (error: any) {
      toast({
        title: 'Erro ao atualizar status',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      pending: { variant: 'secondary' as const, label: 'Pendente' },
      confirmed: { variant: 'default' as const, label: 'Confirmado' },
      cancelled: { variant: 'destructive' as const, label: 'Cancelado' },
      no_show: { variant: 'outline' as const, label: 'Não compareceu' }
    };
    
    const config = variants[status as keyof typeof variants] || variants.pending;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getStatusLabel = (status: string) => {
    const labels = {
      pending: 'Pendente',
      confirmed: 'Confirmado', 
      cancelled: 'Cancelado',
      no_show: 'Não compareceu'
    };
    return labels[status as keyof typeof labels] || 'Pendente';
  };

  const getEmployeeName = (employeeId: string) => {
    const employee = employees.find(emp => emp.id === employeeId);
    return employee?.name || 'Funcionário não encontrado';
  };

  const handlePaymentClick = (recordId: string, recordType: 'appointment' | 'payment') => {
    if (recordType === 'appointment') {
      setSelectedAppointmentId(recordId);
      setSelectedPaymentId(null);
    } else {
      setSelectedPaymentId(recordId);
      setSelectedAppointmentId(null);
    }
    setPaymentModalOpen(true);
  };

  if (barbershopLoading || appointmentsLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <Clock className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Carregando agendamentos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/barbershops')}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Histórico de Agendamentos e Pagamentos</h1>
              <p className="text-muted-foreground">{barbershop?.name}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto p-6 space-y-6">
        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filtros
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Data</label>
                <Input
                  type="date"
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Funcionário</label>
                <Select value={employeeFilter} onValueChange={setEmployeeFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os funcionários</SelectItem>
                    {employees.map((employee) => (
                      <SelectItem key={employee.id} value={employee.id}>
                        {employee.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Status</label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                     <SelectItem value="all">Todos os status</SelectItem>
                     <SelectItem value="pending">Marcado</SelectItem>
                     <SelectItem value="confirmed">Feito</SelectItem>
                     <SelectItem value="cancelled">Cancelado</SelectItem>
                     <SelectItem value="no_show">Cliente não apareceu</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Tipo</label>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="appointment">Agendamentos</SelectItem>
                    <SelectItem value="payment">Pagamentos Walk-in</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium invisible">Ações</label>
                <Button
                  variant="outline"
                  onClick={() => {
                    setDateFilter('');
                    setEmployeeFilter('all');
                    setStatusFilter('all');
                    setTypeFilter('all');
                  }}
                  className="w-full"
                >
                  Limpar Filtros
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Appointments Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Histórico ({allRecords.length})</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setHistorySortBy(historySortBy === 'transaction' ? 'appointment' : 'transaction')}
                className="h-8 px-3 text-sm"
                title={`Ordenar por ${historySortBy === 'transaction' ? 'data do agendamento' : 'data da transação'}`}
              >
                {historySortBy === 'transaction' ? '💰 Transação' : '📅 Agendamento'}
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                 <TableHeader>
                    <TableRow>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Data/Hora do Agendamento</TableHead>
                      <TableHead>Data/Hora da Transação</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Funcionário</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Pagamento</TableHead>
                      <TableHead>Telefone</TableHead>
                      <TableHead>Notas</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                 </TableHeader>
                <TableBody>
                  {allRecords.length > 0 ? (
                    allRecords.map((record) => (
                      <TableRow key={record.id} className={record.type === 'payment' ? 'bg-blue-50/50' : ''}>
                        <TableCell>
                          <Badge variant={record.type === 'appointment' ? 'default' : 'secondary'} className="text-xs">
                            {record.type === 'appointment' ? (
                              <>
                                <Calendar className="h-3 w-3 mr-1" />
                                Agendamento
                              </>
                            ) : (
                              <>
                                {record.data.payment_method === 'pix' && <QrCode className="h-3 w-3 mr-1" />}
                                {record.data.payment_method === 'point' && <CreditCard className="h-3 w-3 mr-1" />}
                                {!record.data.payment_method && <ExternalLink className="h-3 w-3 mr-1" />}
                                {record.data.payment_method === 'pix' && 'PIX'}
                                {record.data.payment_method === 'point' && 'Maquininha'}
                                {!record.data.payment_method && 'Link/Cartão'}
                              </>
                            )}
                          </Badge>
                        </TableCell>
                         <TableCell>
                           <div className="flex flex-col">
                             <span className="font-medium">
                               {format(parseISO(record.date), 'dd/MM/yyyy', { locale: ptBR })}
                             </span>
                             <span className="text-sm text-muted-foreground">
                               {record.time}{record.type === 'appointment' && record.data.end_time ? ` - ${record.data.end_time}` : ''}
                             </span>
                           </div>
                         </TableCell>
                         <TableCell>
                           <div className="flex flex-col">
                             {record.type === 'appointment' ? (
                               // Para agendamentos, mostrar data da transação se disponível
                               payments.find(p => p.appointment_id === record.id)?.paid_at || 
                               payments.find(p => p.appointment_id === record.id)?.created_at ? (
                                 <>
                                   <span className="font-medium">
                                     {format(parseISO(payments.find(p => p.appointment_id === record.id)?.paid_at || 
                                                     payments.find(p => p.appointment_id === record.id)?.created_at || ''), 'dd/MM/yyyy', { locale: ptBR })}
                                   </span>
                                   <span className="text-sm text-muted-foreground">
                                     {format(parseISO(payments.find(p => p.appointment_id === record.id)?.paid_at || 
                                                     payments.find(p => p.appointment_id === record.id)?.created_at || ''), 'HH:mm', { locale: ptBR })}
                                   </span>
                                 </>
                               ) : (
                                 <span className="text-sm text-muted-foreground">—</span>
                               )
                             ) : (
                               // Para pagamentos walk-in, mostrar data da transação
                               <>
                                 <span className="font-medium">
                                   {format(parseISO(record.data.paid_at || record.data.created_at), 'dd/MM/yyyy', { locale: ptBR })}
                                 </span>
                                 <span className="text-sm text-muted-foreground">
                                   {format(parseISO(record.data.paid_at || record.data.created_at), 'HH:mm', { locale: ptBR })}
                                 </span>
                               </>
                             )}
                           </div>
                         </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            {record.client_name}
                          </div>
                        </TableCell>
                        <TableCell>{getEmployeeName(record.employee_id)}</TableCell>
                        <TableCell>{getStatusBadge(record.status)}</TableCell>
                         <TableCell>
                           <PaymentStatusBadge 
                             data={{
                               payment_status: record.payment_status,
                               payment_method: record.payment_method,
                               status: record.status,
                               is_subscription_appointment: record.type === 'appointment' ? record.data.is_subscription_appointment : false
                             }}
                             onClick={() => handlePaymentClick(record.id, record.type)}
                           />
                         </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Phone className="h-4 w-4 text-muted-foreground" />
                            {record.client_phone}
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-muted-foreground">
                            {record.notes || '-'}
                          </span>
                        </TableCell>
                        <TableCell>
                          {record.type === 'appointment' ? (
                            <Select
                              value={record.status}
                              onValueChange={(value) => handleStatusChange(record.id, value)}
                            >
                              <SelectTrigger className="w-32">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                 <SelectItem value="pending">Marcado</SelectItem>
                                 <SelectItem value="confirmed">Feito</SelectItem>
                                 <SelectItem value="cancelled">Cancelado</SelectItem>
                                 <SelectItem value="no_show">Cliente não apareceu</SelectItem>
                              </SelectContent>
                            </Select>
                          ) : (
                            <span className="text-sm text-muted-foreground">
                              Pagamento Walk-in
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                     <TableRow>
                       <TableCell colSpan={10} className="text-center py-8">
                        <Calendar className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                        <p className="text-muted-foreground">
                          Nenhum registro encontrado com os filtros aplicados
                        </p>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      {(selectedAppointmentId || selectedPaymentId) && (
        <PaymentDetailsModal
          isOpen={paymentModalOpen}
          onClose={() => {
            setPaymentModalOpen(false);
            setSelectedAppointmentId(null);
            setSelectedPaymentId(null);
          }}
          appointmentId={selectedAppointmentId || undefined}
          paymentId={selectedPaymentId || undefined}
          paymentStatus={
            selectedAppointmentId 
              ? filteredAppointments.find(apt => apt.id === selectedAppointmentId)?.payment_status
              : undefined
          }
          paymentMethod={
            selectedAppointmentId 
              ? filteredAppointments.find(apt => apt.id === selectedAppointmentId)?.payment_method
              : undefined
          }
        />
      )}
    </div>
  );
};

export default BarbershopAppointments;