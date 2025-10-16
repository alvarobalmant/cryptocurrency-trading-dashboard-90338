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
import { ArrowLeft, Plus, Scissors, Trash2, Edit3, Folder, FolderPlus, MoreVertical, ChevronDown, ChevronRight, FolderOpen, Package } from 'lucide-react';
import { ServiceCategoryDialog } from '@/components/ServiceCategoryDialog';
import { ServiceCategoryCard } from '@/components/ServiceCategoryCard';
import { UncategorizedServicesSection } from '@/components/UncategorizedServicesSection';
import { BookingSettingsCard } from '@/components/BookingSettingsCard';
import ServiceProductsDialog from '@/components/products/ServiceProductsDialog';
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';

const BarbershopServicesNew = () => {
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
  const [serviceProductsDialogOpen, setServiceProductsDialogOpen] = useState(false);
  const [selectedServiceForProducts, setSelectedServiceForProducts] = useState<any>(null);
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
      const newService = await createService(serviceData);
      toast({
        title: 'Serviço cadastrado!',
        description: 'Serviço adicionado com sucesso.',
      });
      setDialogOpen(false);
      (e.target as HTMLFormElement).reset();
      
      // Open products dialog after service creation
      if (newService) {
        setSelectedServiceForProducts(newService);
        setServiceProductsDialogOpen(true);
      }
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

  const openProductsDialog = (service: any) => {
    setSelectedServiceForProducts(service);
    setServiceProductsDialogOpen(true);
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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center space-x-4">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => navigate(barbershopId ? '/barbershops' : '/dashboard')}
              className="border-gray-300 text-gray-700 hover:bg-gray-50"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center space-x-2">
              <Scissors className="h-6 w-6 text-blue-600" />
              <h1 className="text-xl font-semibold text-gray-900">Serviços</h1>
            </div>
          </div>
        </div>
      </header>

      {/* Breadcrumb Navigation */}
      {breadcrumb.length > 0 && (
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2">
            <div className="flex items-center space-x-2 text-sm">
              <Button
                variant="ghost"
                size="sm"
                className="p-0 h-auto text-gray-500 hover:text-gray-700"
                onClick={() => navigateToCategory(null)}
              >
                Raiz
              </Button>
              {breadcrumb.map((category, index) => (
                <div key={category.id} className="flex items-center space-x-2">
                  <span className="text-gray-400">/</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="p-0 h-auto text-gray-500 hover:text-gray-700"
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
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-semibold text-gray-900">Serviços</h2>
            <p className="text-gray-600 mt-1">
              Gerencie os serviços oferecidos pela sua barbearia
            </p>
          </div>
          
          <div className="flex space-x-3">
            <Dialog open={categoryDialogOpen} onOpenChange={setCategoryDialogOpen}>
              <DialogTrigger asChild>
                <Button 
                  variant="outline"
                  className="border-gray-300 text-gray-700 hover:bg-gray-50"
                >
                  <FolderPlus className="h-4 w-4 mr-2" />
                  Nova pasta
                </Button>
              </DialogTrigger>
            </Dialog>
            
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-blue-600 hover:bg-blue-700 text-white border-0">
                  <Plus className="h-4 w-4 mr-2" />
                  Novo serviço
                </Button>
              </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle className="text-lg font-medium text-gray-900">
                      Adicionar serviço
                    </DialogTitle>
                    <DialogDescription className="text-gray-600">
                      Adicione um novo serviço à sua barbearia.
                    </DialogDescription>
                  </DialogHeader>
                  
                  <form onSubmit={handleCreateService} className="space-y-6 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="name" className="text-sm font-medium text-gray-700">
                        Nome do serviço *
                      </Label>
                      <Input
                        id="name"
                        name="name"
                        placeholder="Ex: Corte + Barba"
                        required
                        className="border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="description" className="text-sm font-medium text-gray-700">
                        Descrição
                      </Label>
                      <Textarea
                        id="description"
                        name="description"
                        placeholder="Descreva o serviço..."
                        rows={3}
                        className="border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="category_id" className="text-sm font-medium text-gray-700">
                        Pasta
                      </Label>
                      <Select name="category_id" defaultValue="none">
                        <SelectTrigger className="border-gray-300 focus:border-blue-500 focus:ring-blue-500">
                          <SelectValue placeholder="Selecione uma pasta" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Sem pasta</SelectItem>
                          {getLeafCategories().map((category) => (
                            <SelectItem key={category.id} value={category.id}>
                              <div className="flex items-center space-x-2">
                                <div 
                                  className="w-3 h-3 rounded-full" 
                                  style={{ backgroundColor: category.color }}
                                />
                                <span>{category.name}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="price" className="text-sm font-medium text-gray-700">
                          Preço (R$) *
                        </Label>
                        <Input
                          id="price"
                          name="price"
                          type="number"
                          step="0.01"
                          placeholder="0,00"
                          required
                          className="border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="duration_minutes" className="text-sm font-medium text-gray-700">
                          Duração (min) *
                        </Label>
                        <Input
                          id="duration_minutes"
                          name="duration_minutes"
                          type="number"
                          placeholder="30"
                          required
                          className="border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                    
                    <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setDialogOpen(false)}
                        className="border-gray-300 text-gray-700 hover:bg-gray-50"
                      >
                        Cancelar
                      </Button>
                      <Button 
                        type="submit" 
                        disabled={isCreating}
                        className="bg-blue-600 hover:bg-blue-700 text-white border-0"
                      >
                        {isCreating ? 'Adicionando...' : 'Adicionar serviço'}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </div>

        {/* Booking Settings */}
        {currentBarbershop && (
          <div className="mb-6">
            <BookingSettingsCard 
              barbershopId={currentBarbershop.id}
              currentSettings={{
                show_categories_in_booking: currentBarbershop.show_categories_in_booking
              }}
            />
          </div>
        )}

        {/* Services by Category */}
        <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          {loading || categoriesLoading ? (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
              <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mb-4"></div>
              <p className="text-gray-500">Carregando serviços...</p>
            </div>
          ) : services.length === 0 && categories.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                <Scissors className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum serviço cadastrado</h3>
              <p className="text-gray-500 mb-6">
                Cadastre seu primeiro serviço para começar a receber agendamentos.
              </p>
              <Button 
                onClick={() => setDialogOpen(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white border-0"
              >
                <Plus className="h-4 w-4 mr-2" />
                Cadastrar primeiro serviço
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Service Categories */}
              {categories.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <FolderOpen className="h-5 w-5 text-gray-400" />
                    <h3 className="text-lg font-medium text-gray-900">
                      {currentParentId ? 'Subpastas' : 'Pastas de serviços'}
                    </h3>
                  </div>
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
                          onManageProducts={openProductsDialog}
                        />
                        {hasSubcategories && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="absolute top-4 right-16 border-gray-300 text-gray-700 hover:bg-gray-50"
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
                    onManageProducts={openProductsDialog}
                  />
                ) : null;
              })()}
            </div>
          )}
        </DndContext>

        {/* Edit Dialog */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-lg font-medium text-gray-900">
                Editar serviço
              </DialogTitle>
              <DialogDescription className="text-gray-600">
                Modifique as informações do serviço.
              </DialogDescription>
            </DialogHeader>
            
            {selectedService && (
              <form onSubmit={handleUpdateService} className="space-y-6 py-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-name" className="text-sm font-medium text-gray-700">
                    Nome do serviço *
                  </Label>
                  <Input
                    id="edit-name"
                    name="name"
                    defaultValue={selectedService.name}
                    required
                    className="border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="edit-description" className="text-sm font-medium text-gray-700">
                    Descrição
                  </Label>
                  <Textarea
                    id="edit-description"
                    name="description"
                    defaultValue={selectedService.description || ''}
                    rows={3}
                    className="border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="edit-category_id" className="text-sm font-medium text-gray-700">
                    Pasta
                  </Label>
                  <Select name="category_id" defaultValue={selectedService.category_id || 'none'}>
                    <SelectTrigger className="border-gray-300 focus:border-blue-500 focus:ring-blue-500">
                      <SelectValue placeholder="Selecione uma pasta" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sem pasta</SelectItem>
                      {categories.map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          <div className="flex items-center space-x-2">
                            <div 
                              className="w-3 h-3 rounded-full" 
                              style={{ backgroundColor: category.color }}
                            />
                            <span>{category.name}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-price" className="text-sm font-medium text-gray-700">
                      Preço (R$) *
                    </Label>
                    <Input
                      id="edit-price"
                      name="price"
                      type="number"
                      step="0.01"
                      defaultValue={selectedService.price}
                      required
                      className="border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="edit-duration" className="text-sm font-medium text-gray-700">
                      Duração (min) *
                    </Label>
                    <Input
                      id="edit-duration"
                      name="duration_minutes"
                      type="number"
                      defaultValue={selectedService.duration_minutes}
                      required
                      className="border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>
                </div>
                
                <div className="flex justify-between items-center space-x-3 pt-4 border-t border-gray-200">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => openProductsDialog(selectedService)}
                    className="border-blue-500 text-blue-600 hover:bg-blue-50"
                  >
                    <Package className="h-4 w-4 mr-2" />
                    Gerenciar produtos
                  </Button>
                  <div className="flex space-x-3">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setEditDialogOpen(false)}
                      className="border-gray-300 text-gray-700 hover:bg-gray-50"
                    >
                      Cancelar
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={isEditing}
                      className="bg-blue-600 hover:bg-blue-700 text-white border-0"
                    >
                      {isEditing ? 'Salvando...' : 'Salvar alterações'}
                    </Button>
                  </div>
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
          onSave={handleUpdateCategory}
          title="Editar Pasta"
          description="Modifique as informações da pasta."
          allCategories={allCategories}
          currentParentId={currentParentId}
          category={selectedCategory}
        />

        {/* Service Products Dialog */}
        <ServiceProductsDialog
          open={serviceProductsDialogOpen}
          onOpenChange={setServiceProductsDialogOpen}
          serviceId={selectedServiceForProducts?.id}
          serviceName={selectedServiceForProducts?.name || ''}
          barbershopId={actualBarbershopId}
        />
      </main>
    </div>
  );
};

export default BarbershopServicesNew;
