import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Plus, Settings, Trash2, Users } from 'lucide-react';
import { useSubscriptions, SubscriptionPlan } from '@/hooks/useSubscriptions';
import { useEmployees } from '@/hooks/useEmployees';
import { useToast } from '@/hooks/use-toast';
import { Checkbox } from '@/components/ui/checkbox';

interface SubscriptionPlansManagerProps {
  barbershopId: string;
}

const SubscriptionPlansManager: React.FC<SubscriptionPlansManagerProps> = ({ barbershopId }) => {
  const { subscriptionPlans, loading, createSubscriptionPlan, updateSubscriptionPlan, deleteSubscriptionPlan, getSubscriptionPlanEmployees, updateSubscriptionPlanEmployees } = useSubscriptions(barbershopId);
  const { employees } = useEmployees(barbershopId);
  const { toast } = useToast();
  
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price_1_month: '',
    price_6_months: '',
    price_12_months: '',
    is_employee_specific: false,
  });
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      price_1_month: '',
      price_6_months: '',
      price_12_months: '',
      is_employee_specific: false,
    });
    setSelectedEmployees([]);
  };

  const handleCreatePlan = async () => {
    try {
      const planData = {
        barbershop_id: barbershopId,
        name: formData.name,
        description: formData.description,
        price_1_month: parseFloat(formData.price_1_month),
        price_6_months: parseFloat(formData.price_6_months),
        price_12_months: parseFloat(formData.price_12_months),
        commission_enabled: false,
        commission_percentage: 0,
        is_employee_specific: formData.is_employee_specific,
        active: true,
      };

      const newPlan = await createSubscriptionPlan(planData);
      
      if (formData.is_employee_specific && selectedEmployees.length > 0) {
        await updateSubscriptionPlanEmployees(newPlan.id, selectedEmployees);
      }

      setIsCreateDialogOpen(false);
      resetForm();
    } catch (error) {
      // Error handling is done in the hook
    }
  };

  const handleEditPlan = async () => {
    if (!selectedPlan) return;

    try {
      const updates = {
        name: formData.name,
        description: formData.description,
        price_1_month: parseFloat(formData.price_1_month),
        price_6_months: parseFloat(formData.price_6_months),
        price_12_months: parseFloat(formData.price_12_months),
        commission_enabled: false,
        commission_percentage: 0,
        is_employee_specific: formData.is_employee_specific,
      };

      await updateSubscriptionPlan(selectedPlan.id, updates);
      
      if (formData.is_employee_specific) {
        await updateSubscriptionPlanEmployees(selectedPlan.id, selectedEmployees);
      } else {
        await updateSubscriptionPlanEmployees(selectedPlan.id, []);
      }

      setIsEditDialogOpen(false);
      resetForm();
      setSelectedPlan(null);
    } catch (error) {
      // Error handling is done in the hook
    }
  };

  const handleEditClick = async (plan: SubscriptionPlan) => {
    setSelectedPlan(plan);
    setFormData({
      name: plan.name,
      description: plan.description || '',
      price_1_month: plan.price_1_month.toString(),
      price_6_months: plan.price_6_months.toString(),
      price_12_months: plan.price_12_months.toString(),
      is_employee_specific: plan.is_employee_specific,
    });

    if (plan.is_employee_specific) {
      const planEmployees = await getSubscriptionPlanEmployees(plan.id);
      setSelectedEmployees(planEmployees.map(pe => pe.employee_id));
    }

    setIsEditDialogOpen(true);
  };

  const handleDeletePlan = async (planId: string) => {
    if (confirm('Tem certeza que deseja deletar este plano de assinatura?')) {
      try {
        await deleteSubscriptionPlan(planId);
      } catch (error) {
        // Error handling is done in the hook
      }
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(price);
  };

  if (loading) {
    return <div>Carregando planos de assinatura...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Planos de Assinatura</h2>
          <p className="text-muted-foreground">
            Configure planos de assinatura para seus clientes
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="w-4 h-4 mr-2" />
              Novo Plano
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Criar Plano de Assinatura</DialogTitle>
              <DialogDescription>
                Configure um novo plano de assinatura para seus clientes
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Nome do Plano</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: Plano Premium"
                />
              </div>
              
              <div>
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Descreva os benefícios do plano"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <Label htmlFor="price_1_month">1 Mês</Label>
                  <Input
                    id="price_1_month"
                    type="number"
                    step="0.01"
                    value={formData.price_1_month}
                    onChange={(e) => setFormData({ ...formData, price_1_month: e.target.value })}
                    placeholder="0,00"
                  />
                </div>
                <div>
                  <Label htmlFor="price_6_months">6 Meses</Label>
                  <Input
                    id="price_6_months"
                    type="number"
                    step="0.01"
                    value={formData.price_6_months}
                    onChange={(e) => setFormData({ ...formData, price_6_months: e.target.value })}
                    placeholder="0,00"
                  />
                </div>
                <div>
                  <Label htmlFor="price_12_months">12 Meses</Label>
                  <Input
                    id="price_12_months"
                    type="number"
                    step="0.01"
                    value={formData.price_12_months}
                    onChange={(e) => setFormData({ ...formData, price_12_months: e.target.value })}
                    placeholder="0,00"
                  />
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="is_employee_specific"
                    checked={formData.is_employee_specific}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_employee_specific: checked })}
                  />
                  <Label htmlFor="is_employee_specific">Específico para funcionários</Label>
                </div>

                {formData.is_employee_specific && (
                  <div>
                    <Label>Funcionários Incluídos</Label>
                    <div className="space-y-2 max-h-32 overflow-y-auto">
                      {employees.map((employee) => (
                        <div key={employee.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={`employee-${employee.id}`}
                            checked={selectedEmployees.includes(employee.id)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedEmployees([...selectedEmployees, employee.id]);
                              } else {
                                setSelectedEmployees(selectedEmployees.filter(id => id !== employee.id));
                              }
                            }}
                          />
                          <Label htmlFor={`employee-${employee.id}`} className="text-sm">
                            {employee.name}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <Button onClick={handleCreatePlan} className="w-full">
                Criar Plano
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {subscriptionPlans.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-8">
              <Users className="w-12 h-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Nenhum plano criado</h3>
              <p className="text-muted-foreground text-center mb-4">
                Crie seu primeiro plano de assinatura para começar a oferecer este serviço aos seus clientes.
              </p>
            </CardContent>
          </Card>
        ) : (
          subscriptionPlans.map((plan) => (
            <Card key={plan.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      {plan.name}
                      {!plan.active && <Badge variant="secondary">Inativo</Badge>}
                      {plan.is_employee_specific && <Badge variant="outline">Específico</Badge>}
                    </CardTitle>
                    {plan.description && (
                      <CardDescription>{plan.description}</CardDescription>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditClick(plan)}
                    >
                      <Settings className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeletePlan(plan.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">1 Mês</p>
                    <p className="text-lg font-semibold">{formatPrice(plan.price_1_month)}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">6 Meses</p>
                    <p className="text-lg font-semibold">{formatPrice(plan.price_6_months)}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">12 Meses</p>
                    <p className="text-lg font-semibold">{formatPrice(plan.price_12_months)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Plano de Assinatura</DialogTitle>
            <DialogDescription>
              Atualize as informações do plano de assinatura
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-name">Nome do Plano</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ex: Plano Premium"
              />
            </div>
            
            <div>
              <Label htmlFor="edit-description">Descrição</Label>
              <Textarea
                id="edit-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Descreva os benefícios do plano"
              />
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <Label htmlFor="edit-price_1_month">1 Mês</Label>
                <Input
                  id="edit-price_1_month"
                  type="number"
                  step="0.01"
                  value={formData.price_1_month}
                  onChange={(e) => setFormData({ ...formData, price_1_month: e.target.value })}
                  placeholder="0,00"
                />
              </div>
              <div>
                <Label htmlFor="edit-price_6_months">6 Meses</Label>
                <Input
                  id="edit-price_6_months"
                  type="number"
                  step="0.01"
                  value={formData.price_6_months}
                  onChange={(e) => setFormData({ ...formData, price_6_months: e.target.value })}
                  placeholder="0,00"
                />
              </div>
              <div>
                <Label htmlFor="edit-price_12_months">12 Meses</Label>
                <Input
                  id="edit-price_12_months"
                  type="number"
                  step="0.01"
                  value={formData.price_12_months}
                  onChange={(e) => setFormData({ ...formData, price_12_months: e.target.value })}
                  placeholder="0,00"
                />
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Switch
                  id="edit-is_employee_specific"
                  checked={formData.is_employee_specific}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_employee_specific: checked })}
                />
                <Label htmlFor="edit-is_employee_specific">Específico para funcionários</Label>
              </div>

              {formData.is_employee_specific && (
                <div>
                  <Label>Funcionários Incluídos</Label>
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {employees.map((employee) => (
                      <div key={employee.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`edit-employee-${employee.id}`}
                          checked={selectedEmployees.includes(employee.id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedEmployees([...selectedEmployees, employee.id]);
                            } else {
                              setSelectedEmployees(selectedEmployees.filter(id => id !== employee.id));
                            }
                          }}
                        />
                        <Label htmlFor={`edit-employee-${employee.id}`} className="text-sm">
                          {employee.name}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <Button onClick={handleEditPlan} className="w-full">
              Salvar Alterações
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SubscriptionPlansManager;