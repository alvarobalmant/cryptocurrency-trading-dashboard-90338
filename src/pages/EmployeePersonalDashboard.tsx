import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  UserCheck, 
  LogOut, 
  Settings, 
  Clock, 
  Phone, 
  Mail, 
  Calendar,
  Scissors,
  CheckCircle,
  XCircle,
  User,
  CalendarCheck
} from 'lucide-react';
import AvatarUpload from '@/components/AvatarUpload';
import ScheduleManager from '@/components/ScheduleManager';
import TodayAppointments from '@/components/TodayAppointments';
import AllAppointments from '@/components/AllAppointments';

interface Employee {
  id: string;
  name: string;
  email: string;
  phone: string;
  barbershop_id: string;
  status: string;
  avatar_url?: string;
  slug: string;
}

interface Barbershop {
  id: string;
  name: string;
  slug: string;
}

interface Service {
  id: string;
  name: string;
  description: string;
  price: number;
  duration_minutes: number;
}

interface EmployeeService {
  id: string;
  service_id: string;
  services: Service;
}

const EmployeePersonalDashboard = () => {
  const { employeeSlug } = useParams();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [barbershop, setBarbershop] = useState<Barbershop | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [availableServices, setAvailableServices] = useState<Service[]>([]);
  const [employeeServices, setEmployeeServices] = useState<EmployeeService[]>([]);
  const [showAllAppointments, setShowAllAppointments] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
  });

  useEffect(() => {
    const loadEmployeeData = async () => {
      if (!user?.email || !employeeSlug) return;

      try {
        console.log('🔍 Loading employee data for:', { userEmail: user?.email, employeeSlug, authUser: !!user });
        
        // Get employee data by slug (assuming slug is the name)
        const { data: employeeData, error: employeeError } = await supabase
          .from('employees')
          .select('*')
          .eq('email', user.email)
          .eq('status', 'active')
          .single();

        console.log('📊 Employee query result:', { employeeData, employeeError });

        if (employeeError) {
          console.error('❌ Employee query error:', employeeError);
          toast({
            title: 'Acesso negado',
            description: 'Você não é um funcionário ativo.',
            variant: 'destructive',
          });
          navigate('/');
          return;
        }

        // Ensure URL matches employee slug; if not, redirect silently
        if (employeeData.slug !== employeeSlug) {
          navigate(`/employees/${employeeData.slug}`, { replace: true });
          return;
        }

        setEmployee(employeeData);
        setFormData({
          name: employeeData.name || '',
          phone: employeeData.phone || '',
        });

        // Get barbershop data (use RPC with SECURITY DEFINER to bypass RLS safely)
        const { data: safeBarbershopData, error: barbershopError } = await supabase
          .rpc('get_barbershop_for_employee', { employee_email_param: user.email });

        if (barbershopError) throw barbershopError;
        const barbershopData = Array.isArray(safeBarbershopData) ? safeBarbershopData[0] : safeBarbershopData;
        if (!barbershopData) throw new Error('Barbearia não encontrada para este funcionário.');
        setBarbershop(barbershopData as any);

        // Get all services from the barbershop
        const { data: servicesData, error: servicesError } = await supabase
          .from('services')
          .select('*')
          .eq('barbershop_id', employeeData.barbershop_id)
          .eq('active', true)
          .order('name');

        if (servicesError) throw servicesError;
        setAvailableServices(servicesData || []);

        // Get employee's assigned services
        const { data: employeeServicesData, error: employeeServicesError } = await supabase
          .from('employee_services')
          .select(`
            id,
            service_id,
            services (*)
          `)
          .eq('employee_id', employeeData.id);

        if (employeeServicesError) throw employeeServicesError;
        setEmployeeServices(employeeServicesData || []);

      } catch (error: any) {
        console.error('Error loading employee data:', error);
        toast({
          title: 'Erro',
          description: 'Erro ao carregar dados do funcionário.',
          variant: 'destructive',
        });
        navigate('/');
      } finally {
        setLoading(false);
      }
    };

    loadEmployeeData();
  }, [user, employeeSlug]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!employee) return;

    try {
      const { error } = await supabase
        .from('employees')
        .update({
          name: formData.name,
          phone: formData.phone,
        })
        .eq('id', employee.id);

      if (error) throw error;

      setEmployee(prev => prev ? ({
        ...prev,
        name: formData.name,
        phone: formData.phone,
      }) : null);

      setEditing(false);
      toast({
        title: 'Perfil atualizado!',
        description: 'Suas informações foram atualizadas com sucesso.',
      });
    } catch (error: any) {
      toast({
        title: 'Erro ao atualizar',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleUpdateAvatar = async (newAvatarUrl: string) => {
    if (!employee) return;
    
    try {
      const { error } = await supabase
        .from('employees')
        .update({ avatar_url: newAvatarUrl })
        .eq('id', employee.id);

      if (error) throw error;

      setEmployee(prev => prev ? { ...prev, avatar_url: newAvatarUrl } : null);
      toast({
        title: 'Sucesso!',
        description: 'Avatar atualizado com sucesso.',
      });
    } catch (error: any) {
      toast({
        title: 'Erro ao atualizar avatar',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleServiceToggle = async (serviceId: string, isCurrentlyAssigned: boolean) => {
    if (!employee) return;

    try {
      if (isCurrentlyAssigned) {
        // Remove service
        const { error } = await supabase
          .from('employee_services')
          .delete()
          .eq('employee_id', employee.id)
          .eq('service_id', serviceId);

        if (error) throw error;

        setEmployeeServices(prev => 
          prev.filter(es => es.service_id !== serviceId)
        );

        toast({
          title: 'Serviço removido',
          description: 'O serviço foi removido da sua lista.',
        });
      } else {
        // Add service
        const { data, error } = await supabase
          .from('employee_services')
          .insert({
            employee_id: employee.id,
            service_id: serviceId,
          })
          .select(`
            id,
            service_id,
            services (*)
          `)
          .single();

        if (error) throw error;

        setEmployeeServices(prev => [...prev, data]);

        toast({
          title: 'Serviço adicionado',
          description: 'O serviço foi adicionado à sua lista.',
        });
      }
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/');
    } catch (error: any) {
      toast({
        title: 'Erro ao sair',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const isServiceAssigned = (serviceId: string) => {
    return employeeServices.some(es => es.service_id === serviceId);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex items-center gap-2">
          <Scissors className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!employee || !barbershop) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <XCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <h1 className="text-xl font-semibold mb-2">Acesso Negado</h1>
          <p className="text-muted-foreground">
            Você não é um funcionário ativo ou este perfil não existe.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Scissors className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold">{employee.name}</h1>
              <p className="text-sm text-muted-foreground">
                Funcionário - {barbershop.name}
              </p>
            </div>
          </div>
          <Button variant="ghost" onClick={handleSignOut}>
            <LogOut className="h-4 w-4 mr-2" />
            Sair
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {showAllAppointments ? (
          <AllAppointments 
            employeeId={employee.id}
            employeeName={employee.name}
            onBack={() => setShowAllAppointments(false)}
          />
        ) : (
          <Tabs defaultValue="appointments" className="space-y-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="appointments">
                <CalendarCheck className="h-4 w-4 mr-2" />
                Agendamentos Hoje
              </TabsTrigger>
              <TabsTrigger value="profile">
                <User className="h-4 w-4 mr-2" />
                Perfil
              </TabsTrigger>
              <TabsTrigger value="schedule">
                <Clock className="h-4 w-4 mr-2" />
                Horários
              </TabsTrigger>
              <TabsTrigger value="services">
                <Settings className="h-4 w-4 mr-2" />
                Serviços
              </TabsTrigger>
            </TabsList>

            <TabsContent value="appointments" className="space-y-6">
              <TodayAppointments 
                employeeId={employee.id}
                employeeName={employee.name}
                onViewAllAppointments={() => setShowAllAppointments(true)}
              />
            </TabsContent>

            <TabsContent value="profile" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              {/* Profile Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Meu Perfil
                  </CardTitle>
                  <CardDescription>
                    Gerencie suas informações pessoais
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {editing ? (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="name">Nome</Label>
                        <Input
                          id="name"
                          value={formData.name}
                          onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="phone">Telefone</Label>
                        <Input
                          id="phone"
                          value={formData.phone}
                          onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" onClick={handleUpdateProfile}>
                          Salvar
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setEditing(false)}>
                          Cancelar
                        </Button>
                      </div>
                    </>
                  ) : (
                    <>
                      <AvatarUpload
                        currentAvatarUrl={employee?.avatar_url}
                        onAvatarUpdate={handleUpdateAvatar}
                        fallbackText={employee?.name?.substring(0, 2)?.toUpperCase() || 'FU'}
                        employeeId={employee?.id}
                        size="md"
                      />
                      <div className="space-y-2">
                        <p><strong>Nome:</strong> {employee?.name}</p>
                        <p><strong>Email:</strong> {employee?.email}</p>
                        <p><strong>Telefone:</strong> {employee?.phone || 'Não informado'}</p>
                      </div>
                      <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
                        Editar Perfil
                      </Button>
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Quick Stats */}
              <Card>
                <CardHeader>
                  <CardTitle>Estatísticas Rápidas</CardTitle>
                  <CardDescription>
                    Resumo das suas atividades
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between">
                    <span>Serviços Ativos</span>
                    <Badge variant="outline">{employeeServices.length}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Agendamentos Hoje</span>
                    <Badge variant="outline">0</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Faturamento Mensal</span>
                    <Badge variant="outline">R$ 0,00</Badge>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="schedule" className="space-y-6">
            {employee && <ScheduleManager employeeId={employee.id} />}
          </TabsContent>

          <TabsContent value="services" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Meus Serviços
                </CardTitle>
                <CardDescription>
                  Selecione os serviços que você pode realizar
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {availableServices.map((service) => {
                    const isAssigned = isServiceAssigned(service.id);
                    return (
                      <div key={service.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex-1">
                          <div className="font-medium">{service.name}</div>
                          <div className="text-sm text-muted-foreground flex items-center gap-4">
                            <span>R$ {service.price}</span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {service.duration_minutes}min
                            </span>
                          </div>
                          {service.description && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {service.description}
                            </p>
                          )}
                        </div>
                        <Switch
                          checked={isAssigned}
                          onCheckedChange={() => handleServiceToggle(service.id, isAssigned)}
                        />
                      </div>
                    );
                  })}

                  {availableServices.length === 0 && (
                    <div className="text-center py-8">
                      <Scissors className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">
                        Nenhum serviço cadastrado na barbearia ainda.
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
           </TabsContent>
         </Tabs>
        )}
       </main>
     </div>
   );
 };

export default EmployeePersonalDashboard;