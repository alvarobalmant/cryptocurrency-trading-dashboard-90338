import { useState, useEffect } from 'react';
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
  Plus
} from 'lucide-react';

interface Employee {
  id: string;
  name: string;
  email: string;
  phone: string;
  barbershop_id: string;
  status: string;
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

const EmployeePanel = () => {
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [barbershop, setBarbershop] = useState<Barbershop | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [availableServices, setAvailableServices] = useState<Service[]>([]);
  const [employeeServices, setEmployeeServices] = useState<EmployeeService[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
  });

  useEffect(() => {
    const loadEmployeeData = async () => {
      if (!user?.email) return;

      try {
        // Get employee data
        const { data: employeeData, error: employeeError } = await supabase
          .from('employees')
          .select('*')
          .eq('email', user.email)
          .eq('status', 'active')
          .single();

        if (employeeError) {
          toast({
            title: 'Acesso negado',
            description: 'Você não é um funcionário ativo em nenhuma barbearia.',
            variant: 'destructive',
          });
          return;
        }

        setEmployee(employeeData);
        setFormData({
          name: employeeData.name || '',
          phone: employeeData.phone || '',
        });

        // Get barbershop data
        const { data: barbershopData, error: barbershopError } = await supabase
          .from('barbershops')
          .select('*')
          .eq('id', employeeData.barbershop_id)
          .single();

        if (barbershopError) throw barbershopError;
        setBarbershop(barbershopData);

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
      } finally {
        setLoading(false);
      }
    };

    loadEmployeeData();
  }, [user]);

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
            Você não é um funcionário ativo em nenhuma barbearia.
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
              <h1 className="text-xl font-bold">{barbershop.name}</h1>
              <p className="text-sm text-muted-foreground">Painel do Funcionário</p>
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
        <div className="grid gap-6 lg:grid-cols-2">
          
          {/* Profile Card */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <UserCheck className="h-5 w-5" />
                    Meu Perfil
                  </CardTitle>
                  <CardDescription>
                    Gerencie suas informações pessoais
                  </CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEditing(!editing)}
                >
                  {editing ? 'Cancelar' : 'Editar'}
                </Button>
              </div>
            </CardHeader>
            
            <CardContent>
              {editing ? (
                <form onSubmit={handleUpdateProfile} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nome Completo</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      required
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
                    <Button type="submit" className="flex-1">
                      Salvar
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="flex-1"
                      onClick={() => setEditing(false)}
                    >
                      Cancelar
                    </Button>
                  </div>
                </form>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-sm">
                    <UserCheck className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{employee.name}</span>
                  </div>
                  
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span>{employee.email}</span>
                  </div>
                  
                  {employee.phone && (
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span>{employee.phone}</span>
                    </div>
                  )}

                  <Separator />

                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="gap-1">
                      <CheckCircle className="h-3 w-3" />
                      Funcionário Ativo
                    </Badge>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Services Management Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Scissors className="h-5 w-5" />
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

          {/* Quick Stats Card */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Resumo Rápido
              </CardTitle>
            </CardHeader>
            
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-muted/50 rounded-lg">
                  <div className="text-2xl font-bold text-primary">
                    {employeeServices.length}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Serviços Ativos
                  </div>
                </div>

                <div className="text-center p-4 bg-muted/50 rounded-lg">
                  <div className="text-2xl font-bold text-primary">
                    0
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Agendamentos Hoje
                  </div>
                </div>

                <div className="text-center p-4 bg-muted/50 rounded-lg">
                  <div className="text-2xl font-bold text-primary">
                    R$ 0,00
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Faturamento do Mês
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

        </div>
      </main>
    </div>
  );
};

export default EmployeePanel;