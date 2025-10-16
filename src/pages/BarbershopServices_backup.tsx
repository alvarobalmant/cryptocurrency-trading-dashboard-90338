import { useState, useEffect } from 'react';
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
import { ArrowLeft, Plus, Scissors, Trash2, Edit3, Folder, FolderPlus, MoreVertical, ChevronDown, ChevronRight, FolderOpen } from 'lucide-react';
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
        title: 'Serviço cadastrado!',
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
        title: 'Serviço atualizado!',
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
        title: 'Serviço removido!',
        description: 'Serviço foi removido do sistema.',
      });
    } catch (error: any) {
      toast({
        title: 'Erro ao remover serviço',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const openEditDialog = (service: any) => {
    setSelectedService(service);
    setEditDialogOpen(true);
  };

  const openEditCategoryDialog = (category: any) => {
    setSelectedCategory(category);
    setEditCategoryDialogOpen(true);
  };

  const handleCreateCategory = async (categoryData: any) => {
    await createCategory(categoryData);
  };

  const handleUpdateCategory = async (categoryData: any) => {
    if (!selectedCategory) return;
    await updateCategory(selectedCategory.id, categoryData);
    setSelectedCategory(null);
  };

  const handleDeleteCategory = async (categoryId: string) => {
    try {
      await deleteCategory(categoryId);
      toast({
        title: 'Pasta removida!',
        description: 'Pasta foi removida com sucesso.',
      });
    } catch (error: any) {
      toast({
        title: 'Erro ao remover pasta',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const servicesByCategory = services.reduce((acc: any, service: any) => {
    const categoryId = service.category_id || 'uncategorized';
    if (!acc[categoryId]) {
      acc[categoryId] = [];
    }
    acc[categoryId].push(service);
    return acc;
  }, {});

  const uncategorizedServices = servicesByCategory['uncategorized'] || [];

  const toggleCategory = (categoryId: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId);
    } else {
      newExpanded.add(categoryId);
    }
    setExpandedCategories(newExpanded);
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over || active.id === over.id) return;

    const serviceId = active.id as string;
    const categoryId = over.id === 'uncategorized' ? null : over.id as string;

    try {
      await updateService(serviceId, { category_id: categoryId });
      toast({
        title: 'Serviço movido!',
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
        title: 'Serviço movido!',
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

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate(barbershopId ? '/barbershops' : '/dashboard')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-2">
            <Scissors className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-bold">Serviços</h1>
          </div>
        </div>
      </header>

      {/* Breadcrumb Navigation */}
      {breadcrumb.length > 0 && (
        <div className="border-b bg-muted/20">
          <div className="container mx-auto px-4 py-2">
            <div className="flex items-center gap-2 text-sm">
              <Button
                variant="ghost"
                size="sm"
                className="p-0 h-auto text-muted-foreground hover:text-foreground"
                onClick={() => navigateToCategory(null)}
              >
                Raiz
              </Button>
              {breadcrumb.map((category, index) => (
                <div key={category.id} className="flex items-center gap-2">
                  <span className="text-muted-foreground">/</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="p-0 h-auto text-muted-foreground hover:text-foreground"
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
      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-3xl font-bold">Serviços</h2>
            <p className="text-muted-foreground">
              Gerencie os serviços oferecidos pela sua barbearia
            </p>
          </div>
          
          <div className="flex gap-2">
            <Dialog open={categoryDialogOpen} onOpenChange={setCategoryDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <FolderPlus className="h-4 w-4 mr-2" />
                  Nova Pasta
                </Button>
              </DialogTrigger>
            </Dialog>
            
            <PlanLimitGuard 
              feature="services" 
              currentCount={services?.length || 0}
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
                    Novo Serviço
                  </Button>
                 </DialogTrigger>
                <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Cadastrar Serviço</DialogTitle>
                <DialogDescription>
                  Adicione um novo serviço à sua barbearia.
                </DialogDescription>
              </DialogHeader>
              
              <form onSubmit={handleCreateService} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome do Serviço *</Label>
                  <Input
                    id="name"
                    name="name"
                    placeholder="Ex: Corte + Barba"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="description">Descrição</Label>
                  <Textarea
                    id="description"
                    name="description"
                    placeholder="Descreva o serviço..."
                    rows={3}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="category_id">Pasta</Label>
                  <Select name="category_id" defaultValue="none">
                    <SelectTrigger>
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
                    <Label htmlFor="price">Preço (R$) *</Label>
                    <Input
                      id="price"
                      name="price"
                      type="number"
                      step="0.01"
                      placeholder="25.00"
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="duration_minutes">Duração (min) *</Label>
                    <Input
                      id="duration_minutes"
                      name="duration_minutes"
                      type="number"
                      placeholder="60"
                      required
                    />
                  </div>
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
                    {isCreating ? 'Cadastrando...' : 'Cadastrar'}
                  </Button>
                </div>
              </form>
            </DialogContent>
              </Dialog>
            </PlanLimitGuard>
          </div>
        </div>

        {/* Booking Settings */}
        {currentBarbershop && (
          <BookingSettingsCard 
            barbershopId={currentBarbershop.id}
            currentSettings={{
              show_categories_in_booking: currentBarbershop.show_categories_in_booking
            }}
          />
        )}

        {/* Services by Category */}
        <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          {loading || categoriesLoading ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Carregando serviços...</p>
            </div>
          ) : services.length === 0 && categories.length === 0 ? (
            <Card className="text-center py-12">
              <CardHeader>
                <Scissors className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <CardTitle>Nenhum serviço cadastrado</CardTitle>
                <CardDescription>
                  Cadastre seu primeiro serviço para começar.
                </CardDescription>
              </CardHeader>
            </Card>
          ) : (
            <div className="space-y-6">
              {/* Service Categories */}
              {categories.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-xl font-semibold flex items-center gap-2">
                    <FolderOpen className="h-5 w-5" />
                    {currentParentId ? 'Subpastas' : 'Pastas de Serviços'}
                  </h3>
                  {categories.map((category) => {
                    const categoryServices = isLeafCategory(category.id) ? 
                      (servicesByCategory[category.id] || []) : [];
                    const hasSubcategories = !isLeafCategory(category.id);
                    
                    return (
                      <div key={category.id} className="relative">
                        <ServiceCategoryCard
                          category={category}
                          services={categoryServices}
                          allCategories={allCategories}
                          isExpanded={expandedCategories.has(category.id)}
                          onToggle={() => toggleCategory(category.id)}
                          onEdit={openEditCategoryDialog}
                          onDelete={handleDeleteCategory}
                          onEditService={openEditDialog}
                          onDeleteService={handleDeleteService}
                          onMoveService={moveServiceToCategory}
                        />
                        {hasSubcategories && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="absolute top-2 right-12"
                            onClick={() => navigateToCategory(category.id)}
                          >
                            <ChevronRight className="h-4 w-4 mr-1" />
                            Abrir pasta
                          </Button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
              
              {/* Services in current level */}
              {(() => {
                const currentLevelServices = getServicesForCurrentLevel();
                const uncategorizedServices = currentLevelServices.filter(service => !service.category_id);
                return uncategorizedServices.length > 0 ? (
                  <UncategorizedServicesSection
                    services={uncategorizedServices}
                    categories={getLeafCategories()}
                    onEditService={openEditDialog}
                    onDeleteService={handleDeleteService}
                    onMoveService={moveServiceToCategory}
                  />
                ) : null;
              })()}
            </div>
          )}
        </DndContext>

        {/* Edit Dialog */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Editar Serviço</DialogTitle>
              <DialogDescription>
                Modifique as informações do serviço.
              </DialogDescription>
            </DialogHeader>
            
            {selectedService && (
              <form onSubmit={handleUpdateService} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-name">Nome do Serviço *</Label>
                  <Input
                    id="edit-name"
                    name="name"
                    defaultValue={selectedService.name}
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="edit-description">Descrição</Label>
                  <Textarea
                    id="edit-description"
                    name="description"
                    defaultValue={selectedService.description || ''}
                    rows={3}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="edit-category_id">Pasta</Label>
                  <Select name="category_id" defaultValue={selectedService.category_id || 'none'}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione uma pasta" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sem pasta</SelectItem>
                      {categories.map((category) => (
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
                    <Label htmlFor="edit-price">Preço (R$) *</Label>
                    <Input
                      id="edit-price"
                      name="price"
                      type="number"
                      step="0.01"
                      defaultValue={selectedService.price}
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="edit-duration">Duração (min) *</Label>
                    <Input
                      id="edit-duration"
                      name="duration_minutes"
                      type="number"
                      defaultValue={selectedService.duration_minutes}
                      required
                    />
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={() => setEditDialogOpen(false)}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit" className="flex-1" disabled={isEditing}>
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