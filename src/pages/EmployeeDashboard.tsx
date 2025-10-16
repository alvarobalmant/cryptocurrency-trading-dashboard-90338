import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { UserCheck, LogOut, Settings, Clock, Phone, Mail } from 'lucide-react';

const EmployeeDashboard = () => {
  const { barbershopSlug } = useParams();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  
  const [employee, setEmployee] = useState<any>(null);
  const [barbershop, setBarbershop] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
  });

  useEffect(() => {
    const loadEmployeeData = async () => {
      if (!user || !barbershopSlug) return;

      try {
        // Get barbershop by slug
        const { data: barbershopData, error: barbershopError } = await supabase
          .from('barbershops')
          .select('*')
          .eq('slug', barbershopSlug)
          .single();

        if (barbershopError) throw barbershopError;
        setBarbershop(barbershopData);

        // Get employee data
        const { data: employeeData, error: employeeError } = await supabase
          .from('employees')
          .select(`
            *,
            employee_services (
              services (*)
            )
          `)
          .eq('barbershop_id', barbershopData.id)
          .eq('email', user.email)
          .eq('status', 'active')
          .single();

        if (employeeError) {
          // Employee not found or not active
          toast({
            title: 'Acesso negado',
            description: 'Você não tem permissão para acessar esta página.',
            variant: 'destructive',
          });
          navigate('/');
          return;
        }

        setEmployee(employeeData);
        setFormData({
          name: employeeData.name || '',
          phone: employeeData.phone || '',
        });

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
  }, [user, barbershopSlug]);

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

      setEmployee(prev => ({
        ...prev,
        name: formData.name,
        phone: formData.phone,
      }));

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

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <UserCheck className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-bold">{barbershop?.name}</h1>
          </div>
          <Button variant="ghost" onClick={handleSignOut}>
            <LogOut className="h-4 w-4 mr-2" />
            Sair
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="grid gap-6 md:grid-cols-2">
          
          {/* Profile Card */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="h-5 w-5" />
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
                    <span className="font-medium">{employee?.name}</span>
                  </div>
                  
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span>{employee?.email}</span>
                  </div>
                  
                  {employee?.phone && (
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span>{employee.phone}</span>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Services Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Meus Serviços
              </CardTitle>
              <CardDescription>
                Serviços que você pode realizar
              </CardDescription>
            </CardHeader>
            
            <CardContent>
              {employee?.employee_services?.length > 0 ? (
                <div className="space-y-3">
                  {employee.employee_services.map((es: any) => (
                    <div key={es.services.id} className="p-3 border rounded-lg">
                      <div className="font-medium">{es.services.name}</div>
                      <div className="text-sm text-muted-foreground flex items-center gap-4">
                        <span>R$ {es.services.price}</span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {es.services.duration_minutes}min
                        </span>
                      </div>
                      {es.services.description && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {es.services.description}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-4">
                  Nenhum serviço atribuído ainda.
                </p>
              )}
            </CardContent>
          </Card>

        </div>
      </main>
    </div>
  );
};

export default EmployeeDashboard;