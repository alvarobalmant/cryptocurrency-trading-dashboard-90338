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
import { useToast } from '@/hooks/use-toast';
import { 
  ArrowLeft, 
  Filter, 
  Calendar, 
  User, 
  Phone, 
  Clock, 
  QrCode, 
  CreditCard, 
  ExternalLink,
  Search,
  X,
  TrendingUp,
  DollarSign,
  Users,
  Activity,
  ChevronDown,
  ChevronUp,
  BarChart3,
  Scissors,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Download,
  RefreshCw
} from 'lucide-react';
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
  
  const { appointments, loading: appointmentsLoading, updateAppointmentStatus, refetch } = useAppointments(barbershopId!);
  const { employees } = useEmployees(barbershopId!);
  const { payments } = usePayments(barbershopId!);

  const [barbershop, setBarbershop] = useState<SafeBarbershop | null>(null);
  const [barbershopLoading, setBarbershopLoading] = useState(true);
  const [allRecords, setAllRecords] = useState<Array<any>>([]);
  
  // Enhanced filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [employeeFilter, setEmployeeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [quickDateFilter, setQuickDateFilter] = useState('all');
  const [filtersExpanded, setFiltersExpanded] = useState(false);
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

  const getStatusBadge = (status: string) => {
    const variants = {
      pending: { variant: 'secondary' as const, label: 'Pendente', color: 'bg-orange-100 text-orange-800 border-orange-200' },
      confirmed: { variant: 'default' as const, label: 'Confirmado', color: 'bg-blue-100 text-blue-800 border-blue-200' },
      cancelled: { variant: 'destructive' as const, label: 'Cancelado', color: 'bg-red-100 text-red-800 border-red-200' },
      no_show: { variant: 'outline' as const, label: 'Não compareceu', color: 'bg-gray-100 text-gray-800 border-gray-200' }
    };
    
    const config = variants[status as keyof typeof variants] || variants.pending;
    return <Badge className={config.color}>{config.label}</Badge>;
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
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <div className="text-center">
          <div className="relative">
            <div className="w-16 h-16 mx-auto mb-6 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center">
              <Calendar className="h-8 w-8 text-white animate-pulse" />
            </div>
            <div className="absolute inset-0 w-16 h-16 mx-auto bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl animate-ping opacity-20"></div>
          </div>
          <p className="text-slate-600 font-medium">Carregando histórico...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Modern Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-slate-200/60 sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/barbershops')}
                className="text-slate-600 hover:text-slate-800 hover:bg-slate-100"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Voltar
              </Button>
              
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                  <Calendar className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
                    Histórico Completo
                  </h1>
                  <p className="text-xs text-slate-500">{barbershop?.name}</p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <Button 
                variant="outline" 
                size="sm"
                onClick={refetch}
                className="border-slate-200 text-slate-600 hover:bg-slate-50"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Atualizar
              </Button>
              
              <Button 
                variant="outline" 
                size="sm"
                className="border-slate-200 text-slate-600 hover:bg-slate-50"
              >
                <Download className="h-4 w-4 mr-2" />
                Exportar
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section with Stats */}
      <section className="container mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Total de Registros</p>
                  <p className="text-3xl font-bold text-slate-800">{totalRecords}</p>
                </div>
                <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center">
                  <BarChart3 className="h-6 w-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Agendamentos</p>
                  <p className="text-3xl font-bold text-blue-600">{appointmentCount}</p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center">
                  <Calendar className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Pagamentos Walk-in</p>
                  <p className="text-3xl font-bold text-green-600">{paymentCount}</p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-2xl flex items-center justify-center">
                  <CreditCard className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Hoje</p>
                  <p className="text-3xl font-bold text-orange-600">{todayRecords}</p>
                </div>
                <div className="w-12 h-12 bg-orange-100 rounded-2xl flex items-center justify-center">
                  <Activity className="h-6 w-6 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Enhanced Filters Section */}
        <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg mb-8">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-600 rounded-xl flex items-center justify-center">
                  <Filter className="h-5 w-5 text-white" />
                </div>
                <div>
                  <CardTitle className="text-lg font-bold text-slate-800">Filtros Inteligentes</CardTitle>
                  <p className="text-sm text-slate-600">Encontre exatamente o que você precisa</p>
                </div>
              </div>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setFiltersExpanded(!filtersExpanded)}
                className="text-slate-600 hover:text-slate-800"
              >
                {filtersExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                {filtersExpanded ? 'Menos filtros' : 'Mais filtros'}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Primary Filters - Always Visible */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Buscar cliente..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 border-slate-200 focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
              
              {/* Quick Date Filters */}
              <Select value={quickDateFilter} onValueChange={setQuickDateFilter}>
                <SelectTrigger className="border-slate-200 focus:border-blue-500 focus:ring-blue-500">
                  <SelectValue placeholder="Período" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os períodos</SelectItem>
                  <SelectItem value="today">Hoje</SelectItem>
                  <SelectItem value="week">Esta semana</SelectItem>
                  <SelectItem value="month">Este mês</SelectItem>
                </SelectContent>
              </Select>
              
              {/* Type Filter */}
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="border-slate-200 focus:border-blue-500 focus:ring-blue-500">
                  <SelectValue placeholder="Tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os tipos</SelectItem>
                  <SelectItem value="appointment">Agendamentos</SelectItem>
                  <SelectItem value="payment">Pagamentos Walk-in</SelectItem>
                </SelectContent>
              </Select>
              
              {/* Clear Filters */}
              <Button
                variant="outline"
                onClick={clearAllFilters}
                className="border-slate-200 text-slate-600 hover:bg-slate-50"
                disabled={activeFilters.length === 0}
              >
                <X className="h-4 w-4 mr-2" />
                Limpar Tudo
              </Button>
            </div>

            {/* Secondary Filters - Expandable */}
            {filtersExpanded && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-slate-200">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Data Específica</label>
                  <Input
                    type="date"
                    value={dateFilter}
                    onChange={(e) => setDateFilter(e.target.value)}
                    className="border-slate-200 focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Funcionário</label>
                  <Select value={employeeFilter} onValueChange={setEmployeeFilter}>
                    <SelectTrigger className="border-slate-200 focus:border-blue-500 focus:ring-blue-500">
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
                  <label className="text-sm font-medium text-slate-700">Status</label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="border-slate-200 focus:border-blue-500 focus:ring-blue-500">
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
              </div>
            )}

            {/* Active Filters Display */}
            {activeFilters.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-4 border-t border-slate-200">
                <span className="text-sm font-medium text-slate-600 mr-2">Filtros ativos:</span>
                {activeFilters.map((filter, index) => (
                  <Badge
                    key={index}
                    variant="secondary"
                    className="bg-blue-100 text-blue-800 border-blue-200 cursor-pointer hover:bg-blue-200 transition-colors"
                    onClick={() => removeFilter(filter)}
                  >
                    {filter}
                    <X className="h-3 w-3 ml-1" />
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Results Section */}
        <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl flex items-center justify-center">
                  <Activity className="h-5 w-5 text-white" />
                </div>
                <div>
                  <CardTitle className="text-lg font-bold text-slate-800">
                    Resultados ({allRecords.length})
                  </CardTitle>
                  <p className="text-sm text-slate-600">
                    {allRecords.length === 0 ? 'Nenhum registro encontrado' : 
                     `Mostrando ${allRecords.length} registro${allRecords.length !== 1 ? 's' : ''}`}
                  </p>
                </div>
              </div>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setHistorySortBy(historySortBy === 'transaction' ? 'appointment' : 'transaction')}
                className="text-slate-600 hover:text-slate-800 hover:bg-slate-100"
              >
                {historySortBy === 'transaction' ? (
                  <>
                    <DollarSign className="h-4 w-4 mr-2" />
                    Por Transação
                  </>
                ) : (
                  <>
                    <Calendar className="h-4 w-4 mr-2" />
                    Por Agendamento
                  </>
                )}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {allRecords.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-r from-slate-200 to-slate-300 rounded-3xl flex items-center justify-center">
                  <Search className="h-10 w-10 text-slate-400" />
                </div>
                <h3 className="text-xl font-semibold text-slate-800 mb-2">Nenhum resultado encontrado</h3>
                <p className="text-slate-600 max-w-md mx-auto mb-6">
                  Tente ajustar os filtros ou limpar todos para ver mais resultados.
                </p>
                <Button onClick={clearAllFilters} variant="outline">
                  <X className="h-4 w-4 mr-2" />
                  Limpar Filtros
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {allRecords.map((record) => (
                  <Card key={record.id} className={`border transition-all duration-200 hover:shadow-md ${
                    record.type === 'payment' ? 'bg-blue-50/50 border-blue-200' : 'border-slate-200'
                  }`}>
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 space-y-4">
                          {/* Header Row */}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <Badge 
                                variant={record.type === 'appointment' ? 'default' : 'secondary'} 
                                className={record.type === 'appointment' ? 
                                  'bg-blue-100 text-blue-800 border-blue-200' : 
                                  'bg-green-100 text-green-800 border-green-200'
                                }
                              >
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
                                    {record.data.payment_method === 'pix' && 'PIX Walk-in'}
                                    {record.data.payment_method === 'point' && 'Maquininha'}
                                    {!record.data.payment_method && 'Link/Cartão'}
                                  </>
                                )}
                              </Badge>
                              
                              <div className="flex items-center gap-2">
                                {getStatusBadge(record.status)}
                                <PaymentStatusBadge 
                                  data={{
                                    payment_status: record.payment_status,
                                    payment_method: record.payment_method,
                                    status: record.status,
                                    is_subscription_appointment: record.data.is_subscription_appointment
                                  }} 
                                />
                              </div>
                            </div>
                            
                            <div className="text-right">
                              <p className="text-sm text-slate-500">
                                {historySortBy === 'transaction' ? 'Transação' : 'Agendamento'}
                              </p>
                              <p className="font-medium text-slate-800">
                                {format(parseISO(
                                  historySortBy === 'transaction' ? 
                                    record.operation_date.split('T')[0] : 
                                    record.date
                                ), 'dd/MM/yyyy', { locale: ptBR })}
                              </p>
                            </div>
                          </div>
                          
                          {/* Client Info Row */}
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                                <span className="text-white text-sm font-medium">
                                  {record.client_name.charAt(0).toUpperCase()}
                                </span>
                              </div>
                              <div>
                                <p className="font-semibold text-slate-800">{record.client_name}</p>
                                <p className="text-sm text-slate-600 flex items-center gap-1">
                                  <Phone className="h-3 w-3" />
                                  {record.client_phone}
                                </p>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4 text-slate-400" />
                              <span className="text-sm text-slate-600">
                                {getEmployeeName(record.employee_id)}
                              </span>
                            </div>
                            
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4 text-slate-400" />
                              <span className="text-sm text-slate-600">
                                {record.time}
                                {record.type === 'appointment' && record.data.end_time && 
                                  ` - ${record.data.end_time}`
                                }
                              </span>
                            </div>
                          </div>
                          
                          {/* Service/Notes Row */}
                          {(record.data.services?.name || record.notes) && (
                            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                              <div className="flex items-center gap-2">
                                <Scissors className="h-4 w-4 text-slate-400" />
                                <span className="text-sm text-slate-600">
                                  {record.data.services?.name || record.notes || 'Sem descrição'}
                                </span>
                              </div>
                              
                              {record.data.services?.price && (
                                <div className="text-right">
                                  <p className="text-lg font-bold text-green-600">
                                    R$ {Number(record.data.services.price).toFixed(2)}
                                  </p>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                        
                        {/* Actions */}
                        <div className="flex flex-col gap-2 ml-4">
                          {record.type === 'appointment' && (
                            <Select
                              value={record.status}
                              onValueChange={(value) => handleStatusChange(record.id, value)}
                            >
                              <SelectTrigger className="w-32 h-8 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                 <SelectItem value="pending">Marcado</SelectItem>
                                 <SelectItem value="confirmed">Feito</SelectItem>
                                 <SelectItem value="cancelled">Cancelado</SelectItem>
                                 <SelectItem value="no_show">Cliente não apareceu</SelectItem>
                              </SelectContent>
                            </Select>
                          )}
                          
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handlePaymentClick(record.id, record.type)}
                            className="text-xs"
                          >
                            Ver Detalhes
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </section>

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
