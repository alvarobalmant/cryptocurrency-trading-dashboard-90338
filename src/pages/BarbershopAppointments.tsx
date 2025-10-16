import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useAppointments } from '@/hooks/useAppointments';
import { useEmployees } from '@/hooks/useEmployees';
import { usePayments } from '@/hooks/usePayments';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Calendar, RefreshCw } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import type { SafeBarbershop } from '@/types/barbershop';
import { PaymentDetailsModal } from '@/components/PaymentDetailsModal';
import { HistoryOverview } from '@/components/history/HistoryOverview';
import { HistoryFilters } from '@/components/history/HistoryFilters';
import { HistoryList } from '@/components/history/HistoryList';
import { Separator } from '@/components/ui/separator';

const BarbershopAppointments = () => {
  const { barbershopId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const { appointments, loading: appointmentsLoading, updateAppointmentStatus, refetch } = useAppointments(barbershopId!);
  const { employees } = useEmployees(barbershopId!);
  const { payments } = usePayments(barbershopId!);

  const [barbershop, setBarbershop] = useState<SafeBarbershop | null>(null);
  const [barbershopLoading, setBarbershopLoading] = useState(true);
  const [allRecords, setAllRecords] = useState<Array<any>>([]);
  
  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [employeeFilter, setEmployeeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [quickDateFilter, setQuickDateFilter] = useState('all');
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  
  // Modal states
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<string | null>(null);
  const [selectedPaymentId, setSelectedPaymentId] = useState<string | null>(null);
  const [historySortBy, setHistorySortBy] = useState<'transaction' | 'appointment'>('transaction');

  // Fetch specific barbershop
  useEffect(() => {
    const fetchBarbershop = async () => {
      if (!barbershopId) return;
      
      try {
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

  // Quick date filter options
  const getQuickDateRange = (filter: string) => {
    const today = new Date();
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    
    switch (filter) {
      case 'today':
        return { start: startOfToday, end: new Date(startOfToday.getTime() + 24 * 60 * 60 * 1000) };
      case 'week':
        const startOfWeek = new Date(startOfToday);
        startOfWeek.setDate(startOfToday.getDate() - startOfToday.getDay());
        const endOfWeek = new Date(startOfWeek.getTime() + 7 * 24 * 60 * 60 * 1000);
        return { start: startOfWeek, end: endOfWeek };
      case 'month':
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);
        return { start: startOfMonth, end: endOfMonth };
      default:
        return null;
    }
  };

  // Combine appointments and payments
  useEffect(() => {
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
      operation_date: apt.payment_status === 'paid' ? 
        (payments.find(p => p.appointment_id === apt.id)?.paid_at || 
         payments.find(p => p.appointment_id === apt.id)?.created_at || 
         apt.created_at) : 
        apt.created_at
    }));

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
        operation_date: payment.paid_at || payment.created_at
      }));

    let filtered = [...appointmentRecords, ...pixRecords];

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(record => 
        record.client_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        record.client_phone.includes(searchQuery)
      );
    }

    // Apply quick date filter
    if (quickDateFilter !== 'all') {
      const dateRange = getQuickDateRange(quickDateFilter);
      if (dateRange) {
        filtered = filtered.filter(record => {
          const recordDate = new Date(record.date);
          return recordDate >= dateRange.start && recordDate < dateRange.end;
        });
      }
    }

    // Apply specific date filter
    if (dateFilter) {
      filtered = filtered.filter(record => record.date === dateFilter);
    }

    // Apply other filters
    if (employeeFilter !== 'all') {
      filtered = filtered.filter(record => record.employee_id === employeeFilter);
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(record => record.status === statusFilter);
    }

    if (typeFilter !== 'all') {
      filtered = filtered.filter(record => record.type === typeFilter);
    }

    // Sort records
    filtered.sort((a, b) => {
      if (historySortBy === 'transaction') {
        const dateA = new Date(a.operation_date);
        const dateB = new Date(b.operation_date);
        return dateB.getTime() - dateA.getTime();
      } else {
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

    // Update active filters
    const active = [];
    if (searchQuery) active.push(`Busca: "${searchQuery}"`);
    if (quickDateFilter !== 'all') active.push(`Período: ${getQuickDateLabel(quickDateFilter)}`);
    if (dateFilter) active.push(`Data: ${format(parseISO(dateFilter), 'dd/MM/yyyy')}`);
    if (employeeFilter !== 'all') {
      const emp = employees.find(e => e.id === employeeFilter);
      if (emp) active.push(`Funcionário: ${emp.name}`);
    }
    if (statusFilter !== 'all') active.push(`Status: ${getStatusLabel(statusFilter)}`);
    if (typeFilter !== 'all') active.push(`Tipo: ${typeFilter === 'appointment' ? 'Agendamentos' : 'Pagamentos'}`);
    
    setActiveFilters(active);
  }, [appointments, payments, searchQuery, dateFilter, employeeFilter, statusFilter, typeFilter, quickDateFilter, historySortBy, employees]);

  const getQuickDateLabel = (filter: string) => {
    switch (filter) {
      case 'today': return 'Hoje';
      case 'week': return 'Esta semana';
      case 'month': return 'Este mês';
      default: return 'Todos';
    }
  };

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


  const getStatusLabel = (status: string) => {
    const labels = {
      pending: 'Marcado',
      confirmed: 'Feito', 
      cancelled: 'Cancelado',
      no_show: 'Cliente não apareceu'
    };
    return labels[status as keyof typeof labels] || 'Marcado';
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

  const clearAllFilters = () => {
    setSearchQuery('');
    setDateFilter('');
    setEmployeeFilter('all');
    setStatusFilter('all');
    setTypeFilter('all');
    setQuickDateFilter('all');
  };

  const removeFilter = (filterText: string) => {
    if (filterText.startsWith('Busca:')) setSearchQuery('');
    else if (filterText.startsWith('Período:')) setQuickDateFilter('all');
    else if (filterText.startsWith('Data:')) setDateFilter('');
    else if (filterText.startsWith('Funcionário:')) setEmployeeFilter('all');
    else if (filterText.startsWith('Status:')) setStatusFilter('all');
    else if (filterText.startsWith('Tipo:')) setTypeFilter('all');
  };

  // Calculate stats
  const totalRecords = allRecords.length;
  const appointmentCount = allRecords.filter(r => r.type === 'appointment').length;
  const paymentCount = allRecords.filter(r => r.type === 'payment').length;
  const todayRecords = allRecords.filter(r => r.date === new Date().toISOString().split('T')[0]).length;

  if (barbershopLoading || appointmentsLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"></div>
          <p className="text-muted-foreground">Carregando histórico...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card sticky top-0 z-10 backdrop-blur-sm bg-card/95">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => navigate('/barbershops')}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-2">
              <Calendar className="h-6 w-6 text-primary" />
              <div>
                <h1 className="text-xl font-bold">Histórico</h1>
                <p className="text-xs text-muted-foreground">{barbershop?.name}</p>
              </div>
            </div>
          </div>
          
          <Button 
            variant="outline" 
            size="sm"
            onClick={refetch}
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 space-y-8">
        {/* Overview */}
        <HistoryOverview
          totalRecords={totalRecords}
          appointmentCount={appointmentCount}
          paymentCount={paymentCount}
          todayRecords={todayRecords}
        />

        <Separator />

        {/* Filters */}
        <HistoryFilters
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          quickDateFilter={quickDateFilter}
          onQuickDateChange={setQuickDateFilter}
          typeFilter={typeFilter}
          onTypeChange={setTypeFilter}
          dateFilter={dateFilter}
          onDateChange={setDateFilter}
          employeeFilter={employeeFilter}
          onEmployeeChange={setEmployeeFilter}
          statusFilter={statusFilter}
          onStatusChange={setStatusFilter}
          employees={employees}
          activeFilters={activeFilters}
          onRemoveFilter={removeFilter}
          onClearAll={clearAllFilters}
        />

        <Separator />

        {/* Results List */}
        <HistoryList
          records={allRecords}
          historySortBy={historySortBy}
          onSortChange={() => setHistorySortBy(historySortBy === 'transaction' ? 'appointment' : 'transaction')}
          onStatusChange={handleStatusChange}
          onDetailsClick={handlePaymentClick}
          getEmployeeName={getEmployeeName}
          onClearFilters={clearAllFilters}
        />
      </main>

      {/* Payment Details Modal */}
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
              ? appointments.find(apt => apt.id === selectedAppointmentId)?.payment_status
              : undefined
          }
          paymentMethod={
            selectedAppointmentId 
              ? appointments.find(apt => apt.id === selectedAppointmentId)?.payment_method
              : undefined
          }
        />
      )}
    </div>
  );
};

export default BarbershopAppointments;
