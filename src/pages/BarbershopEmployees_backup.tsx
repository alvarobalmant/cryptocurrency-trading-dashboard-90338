import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useEmployees } from '@/hooks/useEmployees';
import { useServices } from '@/hooks/useServices';
import { useEmployeeServices } from '@/hooks/useEmployeeServices';
import { useEmployeeInvitations } from '@/hooks/useEmployeeInvitations';
import { useBarbershops } from '@/hooks/useBarbershops';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Plus, UserCheck, Trash2, Mail, RefreshCw } from 'lucide-react';
import { PlanLimitGuard } from '@/components/PlanLimitGuard';
import { supabase } from '@/integrations/supabase/client';

const BarbershopEmployees = () => {
  const { barbershopId } = useParams();
  const navigate = useNavigate();
  const { barbershops, loading: barbershopsLoading } = useBarbershops();
  const [currentBarbershop, setCurrentBarbershop] = useState(null);
  
  // Use the specific barbershop ID from URL params or the current barbershop ID
  const actualBarbershopId = barbershopId || currentBarbershop?.id;
  
  const { employees, loading, deleteEmployee } = useEmployees(actualBarbershopId);
  const { services } = useServices(actualBarbershopId);
  const { assignServiceToEmployee, removeServiceFromEmployee, getEmployeesWithServices } = useEmployeeServices(actualBarbershopId);
  const { invitations, sendInvitation, cancelInvitation, resendInvitation } = useEmployeeInvitations(actualBarbershopId);
  const [isCreating, setIsCreating] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [servicesDialogOpen, setServicesDialogOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<string | null>(null);
  const [employeeServices, setEmployeeServices] = useState<any[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    if (!barbershopsLoading && barbershops.length > 0) {
      if (barbershopId) {
        const barbershop = barbershops.find(b => b.id === barbershopId);
        setCurrentBarbershop(barbershop || null);
      } else {
        // Fallback to first barbershop if no ID in URL
        setCurrentBarbershop(barbershops[0]);
      }
    }
  }, [barbershopsLoading, barbershops, barbershopId]);

  

  const handleSendInvitation = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsCreating(true);

    const formData = new FormData(e.currentTarget);
    const invitationData = {
      barbershopName: currentBarbershop?.name || 'Barbearia',
      employeeName: formData.get('name') as string,
      employeeEmail: formData.get('email') as string,
      employeePhone: formData.get('phone') as string,
    };

    try {
      await sendInvitation(invitationData);
      toast({
        title: 'Convite enviado!',
        description: 'O funcionário receberá um email com o link para aceitar o convite.',
      });
      setDialogOpen(false);
      (e.target as HTMLFormElement).reset();
    } catch (error: any) {
      toast({
        title: 'Erro ao enviar convite',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteEmployee = async (employeeId: string) => {
    try {
      await deleteEmployee(employeeId);
      toast({
        title: 'Funcionário removido!',
        description: 'Funcionário foi removido do sistema.',
      });
    } catch (error: any) {
      toast({
        title: 'Erro ao remover funcionário',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleResendInvitation = async (invitationId: string) => {
    try {
      await resendInvitation(invitationId);
      toast({
        title: 'Convite reenviado!',
        description: 'Um novo email foi enviado para o funcionário.',
      });
    } catch (error: any) {
      toast({
        title: 'Erro ao reenviar convite',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleCancelInvitation = async (invitationId: string) => {
    try {
      await cancelInvitation(invitationId);
      toast({
        title: 'Convite cancelado!',
        description: 'O convite foi cancelado com sucesso.',
      });
    } catch (error: any) {
      toast({
        title: 'Erro ao cancelar convite',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const openServicesDialog = async (employeeId: string) => {
    setSelectedEmployee(employeeId);
    const employeesWithServices = await getEmployeesWithServices();
    const employee = employeesWithServices.find(e => e.employee.id === employeeId);
    setEmployeeServices(employee?.services || []);
    setServicesDialogOpen(true);
  };

  const handleServiceToggle = async (serviceId: string, checked: boolean) => {
    if (!selectedEmployee) return;

    try {
      if (checked) {
        await assignServiceToEmployee(selectedEmployee, serviceId);
        const service = services.find(s => s.id === serviceId);
        if (service) {
          setEmployeeServices(prev => [...prev, service]);
        }
      } else {
        await removeServiceFromEmployee(selectedEmployee, serviceId);
        setEmployeeServices(prev => prev.filter(s => s.id !== serviceId));
      }
      
      toast({
        title: checked ? 'Serviço associado!' : 'Serviço removido!',
        description: checked ? 'Serviço associado ao funcionário.' : 'Serviço removido do funcionário.',
      });
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate(barbershopId ? '/barbershops' : '/dashboard')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-2">
            <UserCheck className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-bold">Funcionários</h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-3xl font-bold">Funcionários</h2>
            <p className="text-muted-foreground">
              Gerencie os funcionários da sua barbearia
            </p>
          </div>
          
          <PlanLimitGuard 
            feature="employees" 
            currentCount={(employees?.length || 0) + (invitations?.length || 0)}
            fallback={
              <Button disabled variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Limite Atingido
              </Button>
            }
          >
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Enviar Convite
                </Button>
              </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Convidar Funcionário</DialogTitle>
                <DialogDescription>
                  Envie um convite por email para um novo funcionário.
                </DialogDescription>
              </DialogHeader>
              
              <form onSubmit={handleSendInvitation} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome Completo *</Label>
                  <Input
                    id="name"
                    name="name"
                    placeholder="Ex: João Silva"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="joao@email.com"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="phone">Telefone</Label>
                  <Input
                    id="phone"
                    name="phone"
                    placeholder="(11) 99999-9999"
                  />
                </div>
                
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={() => setDialogOpen(false)}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit" className="flex-1" disabled={isCreating}>
                    {isCreating ? 'Enviando...' : 'Enviar Convite'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
          </PlanLimitGuard>
        </div>

        {/* Employees Grid */}
        {loading ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">Carregando funcionários...</p>
          </div>
        ) : employees.length === 0 && invitations.length === 0 ? (
          <Card className="text-center py-12">
            <CardHeader>
              <UserCheck className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <CardTitle>Nenhum funcionário ou convite</CardTitle>
              <CardDescription>
                Envie seu primeiro convite para começar.
              </CardDescription>
            </CardHeader>
          </Card>
        ) : (
          <div className="space-y-6">
            {/* Pending Invitations */}
            {invitations.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-4">Convites Pendentes</h3>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {invitations.map((invitation) => (
                    <Card key={invitation.id} className="border-dashed">
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <CardTitle className="text-lg">{invitation.name}</CardTitle>
                          <Badge variant="outline">
                            <Mail className="h-3 w-3 mr-1" />
                            Pendente
                          </Badge>
                        </div>
                      </CardHeader>
                      
                      <CardContent>
                        <div className="space-y-2 text-sm text-muted-foreground mb-4">
                          <p>✉️ {invitation.email}</p>
                          {invitation.phone && <p>📞 {invitation.phone}</p>}
                          <p className="text-xs">
                            Expira em: {new Date(invitation.expires_at).toLocaleDateString()}
                          </p>
                        </div>
                        
                        <div className="flex gap-2">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="flex-1"
                            onClick={() => handleResendInvitation(invitation.id)}
                          >
                            <RefreshCw className="h-3 w-3 mr-1" />
                            Reenviar
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleCancelInvitation(invitation.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Active Employees */}
            {employees.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-4">Funcionários Ativos</h3>
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {employees.map((employee) => (
                    <Card key={employee.id} className="hover:shadow-md transition-shadow">
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <CardTitle className="text-lg">{employee.name}</CardTitle>
                          <Badge variant={employee.status === 'active' ? 'default' : 'secondary'}>
                            {employee.status === 'active' ? 'Ativo' : 
                             employee.status === 'pending' ? 'Pendente' : 'Inativo'}
                          </Badge>
                        </div>
                      </CardHeader>
                      
                      <CardContent>
                        <div className="space-y-2 text-sm text-muted-foreground mb-4">
                          {employee.email && (
                            <p>✉️ {employee.email}</p>
                          )}
                          {employee.phone && (
                            <p>📞 {employee.phone}</p>
                          )}
                        </div>
                        
                        {/* Commission Input */}
                        <div className="mb-4">
                          <Label className="text-xs text-muted-foreground">Comissão</Label>
                          <div className="flex items-center gap-2">
                            <Input
                              type="number"
                              placeholder="30"
                              min="0"
                              max="100"
                              step="0.01"
                              className="w-20 h-8 text-sm"
                              defaultValue={employee.commission_percentage || 0}
                              onBlur={async (e) => {
                                const value = parseFloat(e.target.value) || 0;
                                try {
                                  await supabase
                                    .from('employees')
                                    .update({ commission_percentage: value })
                                    .eq('id', employee.id);
                                  
                                  toast({
                                    title: 'Comissão atualizada!',
                                    description: `Comissão definida para ${value}%`,
                                  });
                                } catch (error: any) {
                                  toast({
                                    title: 'Erro ao atualizar comissão',
                                    description: error.message,
                                    variant: 'destructive',
                                  });
                                }
                              }}
                            />
                            <span className="text-xs text-muted-foreground">%</span>
                          </div>
                        </div>
                        
                        <div className="flex gap-2">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="flex-1"
                            onClick={() => openServicesDialog(employee.id)}
                          >
                            Serviços
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleDeleteEmployee(employee.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Services Dialog */}
        <Dialog open={servicesDialogOpen} onOpenChange={setServicesDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Serviços do Funcionário</DialogTitle>
              <DialogDescription>
                Selecione quais serviços este funcionário pode realizar.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 max-h-[400px] overflow-y-auto">
              {services.map((service) => {
                const isAssigned = employeeServices.some(es => es.id === service.id);
                
                return (
                  <div key={service.id} className="flex items-center space-x-3 p-3 border rounded-lg">
                    <Checkbox
                      id={`service-${service.id}`}
                      checked={isAssigned}
                      onCheckedChange={(checked) => handleServiceToggle(service.id, checked as boolean)}
                    />
                    <div className="flex-1">
                      <Label htmlFor={`service-${service.id}`} className="font-medium">
                        {service.name}
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        R$ {service.price?.toString()} - {service.duration_minutes}min
                      </p>
                      {service.description && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {service.description}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            
            <div className="flex justify-end">
              <Button onClick={() => setServicesDialogOpen(false)}>
                Fechar
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
};

export default BarbershopEmployees;