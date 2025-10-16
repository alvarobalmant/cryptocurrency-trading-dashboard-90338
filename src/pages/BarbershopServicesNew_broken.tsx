import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useBarbershops } from '@/hooks/useBarbershops';
import { useServices } from '@/hooks/useServices';
import { useServiceCategories } from '@/hooks/useServiceCategories';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Plus, Scissors, Trash2, Edit3, Folder, FolderPlus, MoreVertical, ChevronDown, ChevronRight, FolderOpen, Settings, Clock, DollarSign } from 'lucide-react';
import { PlanLimitGuard } from '@/components/PlanLimitGuard';
import { ServiceCategoryDialog } from '@/components/ServiceCategoryDialog';
import { ServiceCategoryCard } from '@/components/ServiceCategoryCard';
import { UncategorizedServicesSection } from '@/components/UncategorizedServicesSection';
import { BookingSettingsCard } from '@/components/BookingSettingsCard';
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';

const BarbershopServices = () => {
  const { barbershopId } = useParams();
  const navigate = useNavigate();
  const { barbershops, loading: barbershopsLoading } = useBarbershops();
  const [currentBarbershop, setCurrentBarbershop] = useState(null);
  const [currentParentId, setCurrentParentId] = useState<string | null>(null);
  const [breadcrumb, setBreadcrumb] = useState<any[]>([]);
  
  // Use the specific barbershop ID from URL params or the current barbershop ID
  const actualBarbershopId = barbershopId || currentBarbershop?.id;
  
  const { services, loading, createService, updateService, deleteService } = useServices(actualBarbershopId);
  const { categories, allCategories, loading: categoriesLoading, createCategory, updateCategory, deleteCategory } = useServiceCategories(actualBarbershopId, currentParentId);
  const [isCreating, setIsCreating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [editCategoryDialogOpen, setEditCategoryDialogOpen] = useState(false);
  const [selectedService, setSelectedService] = useState<any>(null);
  const [selectedCategory, setSelectedCategory] = useState<any>(null);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [activeId, setActiveId] = useState<string | null>(null);
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

  // Update breadcrumb when currentParentId changes
  useEffect(() => {
    if (allCategories.length > 0) {
      const buildBreadcrumb = (parentId: string | null) => {
        const path = [];
        let currentId = parentId;
        
        while (currentId) {
          const category = allCategories.find(cat => cat.id === currentId);
          if (category) {
            path.unshift(category);
            currentId = category.parent_id;
          } else {
            break;
          }
        }
        
        return path;
      };
      
      setBreadcrumb(buildBreadcrumb(currentParentId));
    }
  }, [currentParentId, allCategories]);

  const navigateToCategory = (categoryId: string | null) => {
    setCurrentParentId(categoryId);
  };

  const isLeafCategory = (categoryId: string) => {
    return !allCategories.some(cat => cat.parent_id === categoryId);
  };

  // Filter services to show only those in leaf categories
  const getServicesForCurrentLevel = () => {
    if (currentParentId === null) {
      // Root level - show services in root categories or uncategorized
      return services.filter(service => {
        if (!service.category_id) return true; // Uncategorized
        const category = allCategories.find(cat => cat.id === service.category_id);
        return category && category.parent_id === null && isLeafCategory(category.id);
      });
    } else {
      // Show services in leaf categories that are children of current parent
      return services.filter(service => {
        if (!service.category_id) return false;
        const category = allCategories.find(cat => cat.id === service.category_id);
        return category && category.parent_id === currentParentId && isLeafCategory(category.id);
      });
    }
  };

  // Get categories that can have services (leaf categories)
  const getLeafCategories = () => {
    return allCategories.filter(cat => isLeafCategory(cat.id));
  };

  const handleCreateService = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsCreating(true);

    const formData = new FormData(e.currentTarget);
    const categoryId = formData.get('category_id') as string;
    const leafCategories = getLeafCategories();
    const isValidCategory = categoryId === 'none' || leafCategories.some(cat => cat.id === categoryId);
    
    if (!isValidCategory && categoryId !== 'none') {
      toast({
        title: 'Erro',
        description: 'Serviços só podem ser adicionados a pastas que não têm subpastas.',
        variant: 'destructive',
      });
      setIsCreating(false);
      return;
    }
    
    const serviceData = {
      name: formData.get('name') as string,
      description: formData.get('description') as string,
      price: parseFloat(formData.get('price') as string),
      duration_minutes: parseInt(formData.get('duration_minutes') as string),
      category_id: categoryId === 'none' ? null : categoryId,
    };

    try {
      await createService(serviceData);
      toast({
        title: 'Serviço cadastrado',
        description: 'Serviço adicionado com sucesso.',
      });
      setDialogOpen(false);
      (e.target as HTMLFormElement).reset();
    } catch (error: any) {
      toast({
        title: 'Erro ao cadastrar serviço',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleUpdateService = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedService) return;
    
    setIsEditing(true);

    const formData = new FormData(e.currentTarget);
    const categoryId = formData.get('category_id') as string;
    const leafCategories = getLeafCategories();
    const isValidCategory = categoryId === 'none' || leafCategories.some(cat => cat.id === categoryId);
    
    if (!isValidCategory && categoryId !== 'none') {
      toast({
        title: 'Erro',
        description: 'Serviços só podem ser adicionados a pastas que não têm subpastas.',
        variant: 'destructive',
      });
      setIsEditing(false);
      return;
    }
    
    const updates = {
      name: formData.get('name') as string,
      description: formData.get('description') as string,
      price: parseFloat(formData.get('price') as string),
      duration_minutes: parseInt(formData.get('duration_minutes') as string),
      category_id: categoryId === 'none' ? null : categoryId,
    };

    try {
      await updateService(selectedService.id, updates);
      toast({
        title: 'Serviço atualizado',
        description: 'Serviço foi atualizado com sucesso.',
      });
      setEditDialogOpen(false);
      setSelectedService(null);
    } catch (error: any) {
      toast({
        title: 'Erro ao atualizar serviço',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsEditing(false);
    }
  };

  const handleDeleteService = async (serviceId: string) => {
    try {
      await deleteService(serviceId);
      toast({
        title: 'Serviço excluído',
        description: 'Serviço foi removido com sucesso.',
      });
    } catch (error: any) {
      toast({
        title: 'Erro ao excluir serviço',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleCreateCategory = async (categoryData: any) => {
    try {
      await createCategory({
        ...categoryData,
        parent_id: currentParentId,
      });
      toast({
        title: 'Pasta criada',
        description: 'Nova pasta foi criada com sucesso.',
      });
    } catch (error: any) {
      toast({
        title: 'Erro ao criar pasta',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleUpdateCategory = async (categoryData: any) => {
    if (!selectedCategory) return;
    
    try {
      await updateCategory(selectedCategory.id, categoryData);
      toast({
        title: 'Pasta atualizada',
        description: 'Pasta foi atualizada com sucesso.',
      });
      setSelectedCategory(null);
    } catch (error: any) {
      toast({
        title: 'Erro ao atualizar pasta',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleDeleteCategory = async (categoryId: string) => {
    try {
      await deleteCategory(categoryId);
      toast({
        title: 'Pasta excluída',
        description: 'Pasta foi removida com sucesso.',
      });
    } catch (error: any) {
      toast({
        title: 'Erro ao excluir pasta',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over || active.id === over.id) return;

    const serviceId = active.id as string;
    const targetCategoryId = over.id === 'uncategorized' ? null : over.id as string;

    try {
      await updateService(serviceId, { category_id: targetCategoryId });
      toast({
        title: 'Serviço movido',
        description: 'Serviço foi movido para a nova pasta.',
      });
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const moveServiceToCategory = async (serviceId: string, categoryId: string | null) => {
    try {
      await updateService(serviceId, { category_id: categoryId });
      toast({
        title: 'Serviço movido',
        description: 'Serviço foi movido para a nova pasta.',
      });
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  if (loading || categoriesLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando serviços...</p>
        </div>
      </div>
    );
  }

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
                className="text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Scissors className="h-4 w-4 text-blue-600" />
                </div>
                <div>
                  <h1 className="text-lg font-semibold text-gray-900">Serviços</h1>
                  <p className="text-sm text-gray-500">Gerencie os serviços oferecidos pela sua barbearia</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Breadcrumb Navigation */}
      {breadcrumb.length > 0 && (
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
            <div className="flex items-center gap-2 text-sm">
              <Button
                variant="ghost"
                size="sm"
                className="p-0 h-auto text-gray-500 hover:text-gray-700 font-medium"
                onClick={() => navigateToCategory(null)}
              >
                Início
              </Button>
              {breadcrumb.map((category, index) => (
                <div key={category.id} className="flex items-center gap-2">
                  <span className="text-gray-400">/</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="p-0 h-auto text-gray-500 hover:text-gray-700 font-medium"
                    onClick={() => navigateToCategory(category.id)}
                  >
                    {category.name}
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Actions Bar */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              {breadcrumb.length > 0 ? breadcrumb[breadcrumb.length - 1].name : 'Todos os Serviços'}
            </h2>
            <p className="text-gray-600 mt-1">
              {services?.length || 0} serviços cadastrados
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <Dialog open={categoryDialogOpen} onOpenChange={setCategoryDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="border-gray-300 text-gray-700 hover:bg-gray-50">
                  <FolderPlus className="h-4 w-4 mr-2" />
                  Nova Pasta
                </Button>
              </DialogTrigger>
            </Dialog>
            
            <PlanLimitGuard 
              feature="services" 
              currentCount={services?.length || 0}
              fallback={
                <Button disabled variant="outline" className="border-gray-300 text-gray-400">
                  <Plus className="h-4 w-4 mr-2" />
                  Limite Atingido
                </Button>
              }
            >
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                    <Plus className="h-4 w-4 mr-2" />
                    Novo Serviço
                  </Button>
                </DialogTrigger>
              </Dialog>
            </PlanLimitGuard>
          </div>
        </div>

        {/* Booking Settings */}
        <div className="mb-8">
          <BookingSettingsCard />
        </div>

        {/* Content */}
        <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <div className="space-y-6">
            {/* Categories */}
            {categories.map((category) => (
              <ServiceCategoryCard
                key={category.id}
                category={category}
                services={services}
                allCategories={allCategories}
                onEditCategory={(cat) => {
                  setSelectedCategory(cat);
                  setEditCategoryDialogOpen(true);
                }}
                onDeleteCategory={handleDeleteCategory}
                onEditService={(service) => {
                  setSelectedService(service);
                  setEditDialogOpen(true);
                }}
                onDeleteService={handleDeleteService}
                onNavigateToCategory={navigateToCategory}
                expandedCategories={expandedCategories}
                setExpandedCategories={setExpandedCategories}
                moveServiceToCategory={moveServiceToCategory}
              />
            ))}

            {/* Uncategorized Services */}
            <UncategorizedServicesSection
              services={getServicesForCurrentLevel().filter(s => !s.category_id)}
              onEditService={(service) => {
                setSelectedService(service);
                setEditDialogOpen(true);
              }}
              onDeleteService={handleDeleteService}
              moveServiceToCategory={moveServiceToCategory}
              allCategories={allCategories}
            />

            {/* Empty State */}
            {services?.length === 0 && (
              <Card className="border-gray-200 bg-white">
                <CardContent className="flex flex-col items-center justify-center py-16">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                    <Scissors className="h-8 w-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Nenhum serviço cadastrado</h3>
                  <p className="text-gray-500 text-center mb-6 max-w-md">
                    Comece criando seu primeiro serviço para que os clientes possam fazer agendamentos.
                  </p>
                  <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                    <DialogTrigger asChild>
                      <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                        <Plus className="h-4 w-4 mr-2" />
                        Criar Primeiro Serviço
                      </Button>
                    </DialogTrigger>
                  </Dialog>
                </CardContent>
              </Card>
            )}
          </div>

          <DragOverlay>
            {activeId ? (
              <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-lg">
                <div className="flex items-center gap-3">
                  <Scissors className="h-4 w-4 text-gray-400" />
                  <span className="font-medium text-gray-900">
                    {services.find(s => s.id === activeId)?.name}
                  </span>
                </div>
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>

        {/* Create Service Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle className="text-lg font-semibold text-gray-900">Cadastrar Serviço</DialogTitle>
              <DialogDescription className="text-gray-600">
                Adicione um novo serviço à sua barbearia.
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleCreateService} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-sm font-medium text-gray-700">Nome do Serviço *</Label>
                <Input
                  id="name"
                  name="name"
                  placeholder="Ex: Corte + Barba"
                  required
                  className="border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="description" className="text-sm font-medium text-gray-700">Descrição</Label>
                <Textarea
                  id="description"
                  name="description"
                  placeholder="Descreva o serviço..."
                  rows={3}
                  className="border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="category_id" className="text-sm font-medium text-gray-700">Pasta</Label>
                <Select name="category_id" defaultValue="none">
                  <SelectTrigger className="border-gray-300 focus:border-blue-500 focus:ring-blue-500">
                    <SelectValue placeholder="Selecione uma pasta" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sem pasta</SelectItem>
                    {getLeafCategories().map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: category.color }}
                          />
                          {category.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="price" className="text-sm font-medium text-gray-700">Preço (R$) *</Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      id="price"
                      name="price"
                      type="number"
                      step="0.01"
                      placeholder="25.00"
                      required
                      className="pl-10 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="duration_minutes" className="text-sm font-medium text-gray-700">Duração (min) *</Label>
                  <div className="relative">
                    <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      id="duration_minutes"
                      name="duration_minutes"
                      type="number"
                      placeholder="60"
                      required
                      className="pl-10 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>
              
              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1 border-gray-300 text-gray-700 hover:bg-gray-50"
                  onClick={() => setDialogOpen(false)}
                >
                  Cancelar
                </Button>
                <Button 
                  type="submit" 
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white" 
                  disabled={isCreating}
                >
                  {isCreating ? 'Cadastrando...' : 'Cadastrar'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Edit Service Dialog */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle className="text-lg font-semibold text-gray-900">Editar Serviço</DialogTitle>
              <DialogDescription className="text-gray-600">
                Modifique as informações do serviço.
              </DialogDescription>
            </DialogHeader>
            
            {selectedService && (
              <form onSubmit={handleUpdateService} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="edit-name" className="text-sm font-medium text-gray-700">Nome do Serviço *</Label>
                  <Input
                    id="edit-name"
                    name="name"
                    defaultValue={selectedService.name}
                    required
                    className="border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="edit-description" className="text-sm font-medium text-gray-700">Descrição</Label>
                  <Textarea
                    id="edit-description"
                    name="description"
                    defaultValue={selectedService.description || ''}
                    rows={3}
                    className="border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="edit-category_id" className="text-sm font-medium text-gray-700">Pasta</Label>
                  <Select name="category_id" defaultValue={selectedService.category_id || 'none'}>
                    <SelectTrigger className="border-gray-300 focus:border-blue-500 focus:ring-blue-500">
                      <SelectValue placeholder="Selecione uma pasta" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sem pasta</SelectItem>
                      {getLeafCategories().map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-3 h-3 rounded-full" 
                              style={{ backgroundColor: category.color }}
                            />
                            {category.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-price" className="text-sm font-medium text-gray-700">Preço (R$) *</Label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        id="edit-price"
                        name="price"
                        type="number"
                        step="0.01"
                        defaultValue={selectedService.price}
                        required
                        className="pl-10 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="edit-duration" className="text-sm font-medium text-gray-700">Duração (min) *</Label>
                    <div className="relative">
                      <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        id="edit-duration"
                        name="duration_minutes"
                        type="number"
                        defaultValue={selectedService.duration_minutes}
                        required
                        className="pl-10 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>
                
                <div className="flex gap-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1 border-gray-300 text-gray-700 hover:bg-gray-50"
                    onClick={() => setEditDialogOpen(false)}
                  >
                    Cancelar
                  </Button>
                  <Button 
                    type="submit" 
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white" 
                    disabled={isEditing}
                  >
                    {isEditing ? 'Salvando...' : 'Salvar'}
                  </Button>
                </div>
              </form>
            )}
          </DialogContent>
        </Dialog>

        {/* Category Dialogs */}
        <ServiceCategoryDialog
          open={categoryDialogOpen}
          onOpenChange={setCategoryDialogOpen}
          onSave={handleCreateCategory}
          title="Criar Nova Pasta"
          description="Crie uma pasta para organizar seus serviços."
          allCategories={allCategories}
          currentParentId={currentParentId}
        />

        <ServiceCategoryDialog
          open={editCategoryDialogOpen}
          onOpenChange={setEditCategoryDialogOpen}
          category={selectedCategory}
          onSave={handleUpdateCategory}
          title="Editar Pasta"
          description="Edite as informações da pasta."
          allCategories={allCategories}
          currentParentId={currentParentId}
        />
      </main>
    </div>
  );
};

export default BarbershopServices;
