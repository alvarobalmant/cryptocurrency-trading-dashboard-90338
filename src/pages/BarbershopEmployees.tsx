import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useEmployees } from '@/hooks/useEmployees';
import { useServices } from '@/hooks/useServices';
import { useEmployeeServices } from '@/hooks/useEmployeeServices';
import { useEmployeeInvitations } from '@/hooks/useEmployeeInvitations';
import { useBarbershops } from '@/hooks/useBarbershops';
import { useCommissionSummary } from '@/hooks/useCommissionSummary';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Plus, UserCheck, Trash2, Mail, RefreshCw, Users, Settings, CheckCircle, Clock, AlertCircle, DollarSign, Eye, TrendingUp, Phone } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { PlanLimitWrapper } from '@/components/PlanLimitWrapper';
import { supabase } from '@/integrations/supabase/client';

const BarbershopEmployees = () => {
  const { barbershopId } = useParams();
  const navigate = useNavigate();
  const { barbershops, loading: barbershopsLoading } = useBarbershops();
  const [currentBarbershop, setCurrentBarbershop] = useState(null);
  
  // Use the specific barbershop ID from URL params or the current barbershop ID
  const actualBarbershopId = barbershopId || currentBarbershop?.id;
  
  const { employees, loading, deleteEmployee, updateEmployee } = useEmployees(actualBarbershopId);
  const { services } = useServices(actualBarbershopId);
  const { assignServiceToEmployee, removeServiceFromEmployee, getEmployeesWithServices } = useEmployeeServices(actualBarbershopId);
  const { invitations, sendInvitation, cancelInvitation, resendInvitation } = useEmployeeInvitations(actualBarbershopId);
  const { data: employeeCommissionsSummary, isLoading: loadingCommissions } = useCommissionSummary(actualBarbershopId || '', undefined);
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
        title: 'Convite enviado com sucesso',
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
        title: 'Funcionário removido',
        description: 'Funcionário foi removido do sistema com sucesso.',
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
        title: 'Convite reenviado',
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
        title: 'Convite cancelado',
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
        title: checked ? 'Serviço associado' : 'Serviço removido',
        description: checked ? 'Serviço associado ao funcionário com sucesso.' : 'Serviço removido do funcionário.',
      });
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return (
          <Badge variant="outline" className="border-green-200 bg-green-50 text-green-700">
            <CheckCircle className="h-3 w-3 mr-1" />
            Ativo
          </Badge>
        );
      case 'pending':
        return (
          <Badge variant="outline" className="border-yellow-200 bg-yellow-50 text-yellow-700">
            <Clock className="h-3 w-3 mr-1" />
            Pendente
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="border-gray-200 bg-gray-50 text-gray-700">
            <AlertCircle className="h-3 w-3 mr-1" />
            Inativo
          </Badge>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => navigate(barbershopId ? '/barbershops' : '/dashboard')}
                className="text-gray-600 hover:text-gray-900 hover:bg-gray-100"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Users className="h-5 w-5 text-blue-600" />
                </div>
                <h1 className="text-xl font-semibold text-gray-900">Funcionários</h1>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Funcionários</h2>
              <p className="mt-1 text-sm text-gray-600">
                Gerencie os funcionários da sua barbearia
              </p>
            </div>
            
            <PlanLimitWrapper 
              feature="employees" 
              barbershopId={barbershopId}
              requiredPlan="pro"
            >
              <Button 
                className="bg-blue-600 hover:bg-blue-700 text-white"
                onClick={() => setDialogOpen(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Convidar funcionário
              </Button>
            </PlanLimitWrapper>
            
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle className="text-lg font-semibold text-gray-900">
                      Convidar funcionário
                    </DialogTitle>
                    <DialogDescription className="text-sm text-gray-600">
                      Envie um convite por email para um novo funcionário se juntar à sua equipe.
                    </DialogDescription>
                  </DialogHeader>
                  
                  <form onSubmit={handleSendInvitation} className="space-y-4">
                    <div>
                      <Label htmlFor="name" className="text-sm font-medium text-gray-700">
                        Nome completo *
                      </Label>
                      <Input
                        id="name"
                        name="name"
                        placeholder="Ex: João Silva"
                        required
                        className="mt-1 border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="email" className="text-sm font-medium text-gray-700">
                        Email *
                      </Label>
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        placeholder="joao@email.com"
                        required
                        className="mt-1 border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="phone" className="text-sm font-medium text-gray-700">
                        Telefone (opcional)
                      </Label>
                      <Input
                        id="phone"
                        name="phone"
                        placeholder="(11) 99999-9999"
                        className="mt-1 border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                      />
                    </div>
                    
                    <div className="flex gap-3 pt-4">
                      <Button
                        type="button"
                        variant="outline"
                        className="flex-1 border-gray-200 text-gray-700 hover:bg-gray-50"
                        onClick={() => setDialogOpen(false)}
                      >
                        Cancelar
                      </Button>
                      <Button 
                        type="submit" 
                        className="flex-1 bg-blue-600 hover:bg-blue-700 text-white" 
                        disabled={isCreating}
                      >
                        {isCreating ? 'Enviando...' : 'Enviar convite'}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-sm text-gray-600">Carregando funcionários...</p>
            </div>
          </div>
        ) : employees.length === 0 && invitations.length === 0 ? (
          <Card className="border-gray-200">
            <CardContent className="text-center py-12">
              <div className="mx-auto w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <Users className="h-6 w-6 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum funcionário cadastrado</h3>
              <p className="text-sm text-gray-600 mb-6">
                Comece enviando um convite para o seu primeiro funcionário.
              </p>
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                    <Plus className="h-4 w-4 mr-2" />
                    Enviar primeiro convite
                  </Button>
                </DialogTrigger>
              </Dialog>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-8">
            {/* Pending Invitations */}
            {invitations.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Mail className="h-5 w-5 text-gray-400" />
                  <h3 className="text-lg font-medium text-gray-900">Convites pendentes</h3>
                  <Badge variant="outline" className="border-yellow-200 bg-yellow-50 text-yellow-700">
                    {invitations.length}
                  </Badge>
                </div>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {invitations.map((invitation) => (
                    <Card key={invitation.id} className="border-gray-200 border-dashed">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <CardTitle className="text-base font-medium text-gray-900">
                              {invitation.name}
                            </CardTitle>
                            <p className="text-sm text-gray-600 mt-1">{invitation.email}</p>
                          </div>
                          <Badge variant="outline" className="border-yellow-200 bg-yellow-50 text-yellow-700">
                            <Clock className="h-3 w-3 mr-1" />
                            Pendente
                          </Badge>
                        </div>
                      </CardHeader>
                      
                      <CardContent className="pt-0">
                        {invitation.phone && (
                          <p className="text-sm text-gray-600 mb-3">📞 {invitation.phone}</p>
                        )}
                        <p className="text-xs text-gray-500 mb-4">
                          Expira em: {new Date(invitation.expires_at).toLocaleDateString('pt-BR')}
                        </p>
                        
                        <div className="flex gap-2">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="flex-1 border-gray-200 text-gray-700 hover:bg-gray-50"
                            onClick={() => handleResendInvitation(invitation.id)}
                          >
                            <RefreshCw className="h-3 w-3 mr-1" />
                            Reenviar
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            className="border-gray-200 text-gray-700 hover:bg-gray-50"
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
                <div className="flex items-center gap-2 mb-4">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <h3 className="text-lg font-medium text-gray-900">Funcionários ativos</h3>
                  <Badge variant="outline" className="border-green-200 bg-green-50 text-green-700">
                    {employees.length}
                  </Badge>
                </div>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {employees.map((employee) => {
                    const commissionData = Array.isArray(employeeCommissionsSummary) 
                      ? employeeCommissionsSummary.find((c: any) => c.employee_id === employee.id)
                      : undefined;
                    
                    return (
                    <Card key={employee.id} className="border-gray-200">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-12 w-12">
                              <AvatarImage src={employee.avatar_url || undefined} />
                              <AvatarFallback>{employee.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                            </Avatar>
                            <div>
                              <CardTitle className="text-base">{employee.name}</CardTitle>
                              <CardDescription className="text-sm">
                                {employee.email || 'Sem email'}
                              </CardDescription>
                            </div>
                          </div>
                          {getStatusBadge(employee.status)}
                        </div>
                      </CardHeader>
                      
                      <CardContent className="space-y-3">
                        <div className="flex items-center gap-2 text-sm">
                          <Phone className="h-4 w-4 text-gray-400" />
                          <span className="text-gray-600">{employee.phone || 'Sem telefone'}</span>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor={`commission-${employee.id}`} className="text-xs font-medium flex items-center gap-1">
                            <TrendingUp className="h-3 w-3" />
                            Comissão Padrão (%)
                          </Label>
                          <div className="flex gap-2">
                            <Input
                              id={`commission-${employee.id}`}
                              type="number"
                              min="0"
                              max="100"
                              step="0.01"
                              value={employee.commission_percentage || 0}
                              onChange={async (e) => {
                                const value = parseFloat(e.target.value) || 0;
                                try {
                                  await updateEmployee(employee.id, { 
                                    commission_percentage: value 
                                  });
                                  toast({
                                    title: 'Comissão atualizada',
                                    description: `Comissão de ${employee.name} atualizada para ${value}%`,
                                  });
                                } catch (error) {
                                  toast({
                                    title: 'Erro ao atualizar comissão',
                                    variant: 'destructive',
                                  });
                                }
                              }}
                              className="h-9"
                            />
                            <span className="flex items-center text-sm text-gray-500 min-w-[30px]">%</span>
                          </div>
                        </div>
                        
                        {commissionData && (
                          <div className="p-3 bg-green-50 rounded-lg space-y-1">
                            <div className="flex justify-between text-xs">
                              <span className="text-gray-600">A Receber:</span>
                              <span className="font-medium text-green-700">
                                R$ {commissionData.total_due?.toFixed(2) || '0.00'}
                              </span>
                            </div>
                            <div className="flex justify-between text-xs">
                              <span className="text-gray-600">Total Pago:</span>
                              <span className="font-medium">
                                R$ {commissionData.total_paid?.toFixed(2) || '0.00'}
                              </span>
                            </div>
                          </div>
                        )}
                        
                        <div className="flex gap-2">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="flex-1 border-gray-200 text-gray-700 hover:bg-gray-50"
                            onClick={() => openServicesDialog(employee.id)}
                          >
                            <Settings className="h-3 w-3 mr-1" />
                            Serviços
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            className="border-gray-200 text-gray-700 hover:bg-gray-50"
                            onClick={() => handleDeleteEmployee(employee.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Services Dialog */}
        <Dialog open={servicesDialogOpen} onOpenChange={setServicesDialogOpen}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-lg font-semibold text-gray-900">
                Serviços do funcionário
              </DialogTitle>
              <DialogDescription className="text-sm text-gray-600">
                Selecione quais serviços este funcionário pode realizar.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {services.map((service) => {
                const isAssigned = employeeServices.some(es => es.id === service.id);
                
                return (
                  <div key={service.id} className="flex items-start space-x-3 p-3 border border-gray-200 rounded-lg">
                    <Checkbox
                      id={`service-${service.id}`}
                      checked={isAssigned}
                      onCheckedChange={(checked) => handleServiceToggle(service.id, checked as boolean)}
                      className="mt-1"
                    />
                    <div className="flex-1 min-w-0">
                      <Label 
                        htmlFor={`service-${service.id}`} 
                        className="text-sm font-medium text-gray-900 cursor-pointer"
                      >
                        {service.name}
                      </Label>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-sm text-gray-600">
                          R$ {service.price?.toString()}
                        </span>
                        <span className="text-xs text-gray-400">•</span>
                        <span className="text-sm text-gray-600">
                          {service.duration_minutes}min
                        </span>
                      </div>
                      {service.description && (
                        <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                          {service.description}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
              
              {services.length === 0 && (
                <div className="text-center py-6">
                  <p className="text-sm text-gray-500">Nenhum serviço cadastrado ainda.</p>
                </div>
              )}
            </div>
            
            <div className="flex justify-end pt-4 border-t border-gray-200">
              <Button 
                onClick={() => setServicesDialogOpen(false)}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                Concluído
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
};

export default BarbershopEmployees;
