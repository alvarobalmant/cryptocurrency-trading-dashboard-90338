import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { 
  Calendar, 
  Clock, 
  User, 
  Settings, 
  LogOut, 
  Bell,
  TrendingUp,
  DollarSign,
  CalendarCheck,
  Scissors,
  Home,
  ChevronRight,
  Star,
  Users,
  Activity
} from 'lucide-react';

// Componentes modernos
import ModernHeader from '@/components/modern/ModernHeader';
import ModernSidebar from '@/components/modern/ModernSidebar';
import DashboardOverview from '@/components/modern/DashboardOverview';
import ModernAppointments from '@/components/modern/ModernAppointments';
import ModernProfile from '@/components/modern/ModernProfile';
import ModernSchedule from '@/components/modern/ModernSchedule';
import ModernServices from '@/components/modern/ModernServices';

interface Employee {
  id: string;
  name: string;
  email: string;
  phone: string;
  avatar_url: string | null;
  slug: string;
  barbershop_id: string;
  status: string;
  created_at: string;
  commission_percentage?: number;
}

interface Barbershop {
  id: string;
  name: string;
  slug: string;
}

interface Service {
  id: string;
  name: string;
  price: number;
  duration_minutes: number;
  description: string | null;
}

type ActiveSection = 'dashboard' | 'appointments' | 'profile' | 'schedule' | 'services';

export default function EmployeePersonalDashboardNew() {
  const { employeeSlug } = useParams<{ employeeSlug: string }>();
  const navigate = useNavigate();
  const { user, signOut, loading: authLoading } = useAuth();
  const { toast } = useToast();

  // Estados principais
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [barbershop, setBarbershop] = useState<Barbershop | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState<ActiveSection>('dashboard');
  const [availableServices, setAvailableServices] = useState<Service[]>([]);
  const [employeeServices, setEmployeeServices] = useState<string[]>([]);
  const [commissionPercentage, setCommissionPercentage] = useState<number>(0);

  // Carregar dados iniciais - aguardar a autenticação terminar de carregar
  useEffect(() => {
    console.log('🔄 useEffect triggered:', { 
      hasUser: !!user, 
      userEmail: user?.email, 
      employeeSlug, 
      authLoading 
    });
    
    if (authLoading) {
      console.log('⏳ Auth still loading, waiting...');
      return;
    }
    
    if (user?.email && employeeSlug) {
      loadEmployeeData();
    } else if (!user) {
      console.log('❌ No user found, redirecting to auth');
      toast({
        title: 'Acesso negado',
        description: 'Você precisa estar logado para acessar esta página.',
        variant: 'destructive',
      });
      navigate('/auth');
    }
  }, [user?.email, employeeSlug, authLoading]);

  const loadEmployeeData = async () => {
    try {
      setLoading(true);
      
      console.log('🔍 Loading employee data for:', { userEmail: user?.email, employeeSlug, authUser: !!user });

      // Buscar funcionário por email
      const { data: employeeData, error: employeeError } = await supabase
        .from('employees')
        .select('*')
        .eq('email', user?.email)
        .eq('status', 'active')
        .single();

      console.log('📊 Employee query result:', { employeeData, employeeError });

      if (employeeError) {
        console.error('❌ Employee query error:', employeeError);
        throw employeeError;
      }

      if (!employeeData) {
        toast({
          title: 'Acesso negado',
          description: 'Você não tem permissão para acessar esta página.',
          variant: 'destructive',
        });
        navigate('/');
        return;
      }

      // Verificar se o slug está correto
      if (employeeSlug !== employeeData.slug) {
        navigate(`/employees/${employeeData.slug}`, { replace: true });
        return;
      }

      setEmployee(employeeData);
      setCommissionPercentage(Number(employeeData.commission_percentage || 0));

      // Buscar dados da barbearia (via RPC para respeitar RLS)
      const { data: safeBarbershopData, error: barbershopError } = await supabase
        .rpc('get_barbershop_for_employee', { employee_email_param: user?.email || '' });

      if (barbershopError) throw barbershopError;
      const barbershopData = Array.isArray(safeBarbershopData) ? safeBarbershopData[0] : safeBarbershopData;
      if (!barbershopData) throw new Error('Barbearia não encontrada para este funcionário.');
      setBarbershop(barbershopData as any);

      // Buscar serviços disponíveis
      const { data: servicesData, error: servicesError } = await supabase
        .from('services')
        .select('*')
        .eq('barbershop_id', employeeData.barbershop_id)
        .eq('active', true)
        .order('name');

      if (servicesError) throw servicesError;
      setAvailableServices(servicesData || []);

      // Buscar serviços do funcionário
      const { data: employeeServicesData, error: employeeServicesError } = await supabase
        .from('employee_services')
        .select('service_id')
        .eq('employee_id', employeeData.id);

      if (employeeServicesError) throw employeeServicesError;
      setEmployeeServices(employeeServicesData?.map(es => es.service_id) || []);

    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os dados.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut();
      navigate('/auth');
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
    }
  };

  const updateEmployeeProfile = async (updatedData: Partial<Employee>) => {
    if (!employee) return;

    try {
      const { error } = await supabase
        .from('employees')
        .update(updatedData)
        .eq('id', employee.id);

      if (error) throw error;

      setEmployee({ ...employee, ...updatedData });
      
      toast({
        title: 'Sucesso!',
        description: 'Perfil atualizado com sucesso.',
      });
    } catch (error) {
      console.error('Erro ao atualizar perfil:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível atualizar o perfil.',
        variant: 'destructive',
      });
    }
  };

  const toggleEmployeeService = async (serviceId: string) => {
    if (!employee) return;

    try {
      const isCurrentlyActive = employeeServices.includes(serviceId);

      if (isCurrentlyActive) {
        // Remover serviço
        const { error } = await supabase
          .from('employee_services')
          .delete()
          .eq('employee_id', employee.id)
          .eq('service_id', serviceId);

        if (error) throw error;

        setEmployeeServices(prev => prev.filter(id => id !== serviceId));
      } else {
        // Adicionar serviço
        const { error } = await supabase
          .from('employee_services')
          .insert({
            employee_id: employee.id,
            service_id: serviceId,
          });

        if (error) throw error;

        setEmployeeServices(prev => [...prev, serviceId]);
      }

      toast({
        title: 'Sucesso!',
        description: `Serviço ${isCurrentlyActive ? 'removido' : 'adicionado'} com sucesso.`,
      });
    } catch (error) {
      console.error('Erro ao alterar serviço:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível alterar o serviço.',
        variant: 'destructive',
      });
    }
  };

  // Navegação da sidebar
  const sidebarItems = [
    {
      id: 'dashboard' as ActiveSection,
      label: 'Dashboard',
      icon: Home,
      badge: null,
    },
    {
      id: 'appointments' as ActiveSection,
      label: 'Agendamentos',
      icon: CalendarCheck,
      badge: '5', // Será calculado dinamicamente
    },
    {
      id: 'profile' as ActiveSection,
      label: 'Perfil',
      icon: User,
      badge: null,
    },
    {
      id: 'schedule' as ActiveSection,
      label: 'Horários',
      icon: Clock,
      badge: null,
    },
    {
      id: 'services' as ActiveSection,
      label: 'Serviços',
      icon: Scissors,
      badge: employeeServices.length.toString(),
    },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin mx-auto"></div>
          <p className="text-slate-600 font-medium">Carregando seu painel...</p>
        </div>
      </div>
    );
  }

  if (!employee || !barbershop) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto">
            <User className="w-8 h-8 text-red-600" />
          </div>
          <p className="text-slate-600 font-medium">Funcionário não encontrado</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
      {/* Header Moderno */}
      <ModernHeader
        employee={employee}
        barbershop={barbershop}
        onLogout={handleLogout}
      />

      <div className="flex">
        {/* Sidebar Moderna */}
        <ModernSidebar
          items={sidebarItems}
          activeSection={activeSection}
          onSectionChange={(section) => setActiveSection(section as ActiveSection)}
        />

        {/* Conteúdo Principal */}
        <main className="flex-1 lg:ml-64 pt-16">
          <div className="p-6 lg:p-8 max-w-7xl mx-auto">
            {/* Breadcrumb */}
            <nav className="flex items-center space-x-2 text-sm text-slate-600 mb-8">
              <span>Funcionário</span>
              <ChevronRight className="w-4 h-4" />
              <span className="text-slate-900 font-medium">
                {sidebarItems.find(item => item.id === activeSection)?.label}
              </span>
            </nav>

            {/* Conteúdo das Seções */}
            {activeSection === 'dashboard' && (
              <DashboardOverview
                employee={employee}
                barbershop={barbershop}
                employeeServices={employeeServices}
                availableServices={availableServices}
              />
            )}

            {activeSection === 'appointments' && (
              <ModernAppointments
                employeeId={employee.id}
                employeeName={employee.name}
              />
            )}

            {activeSection === 'profile' && (
              <ModernProfile
                employee={employee}
                onUpdateProfile={updateEmployeeProfile}
              />
            )}

            {activeSection === 'schedule' && (
              <ModernSchedule
                employeeId={employee.id}
              />
            )}

            {activeSection === 'services' && (
              <ModernServices
                availableServices={availableServices}
                employeeServices={employeeServices}
                onToggleService={toggleEmployeeService}
              />
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
