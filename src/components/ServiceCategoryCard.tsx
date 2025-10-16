import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { ChevronDown, ChevronRight, FolderOpen, Folder, Edit3, Trash2, MoreVertical } from 'lucide-react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { DraggableServiceCard } from './DraggableServiceCard';

interface ServiceCategoryCardProps {
  category: any;
  services: any[];
  allCategories: any[];
  isExpanded: boolean;
  onToggle: () => void;
  onEdit: (category: any) => void;
  onDelete: (categoryId: string) => void;
  onEditService: (service: any) => void;
  onDeleteService: (serviceId: string) => void;
  onMoveService: (serviceId: string, categoryId: string | null) => void;
  onManageProducts?: (service: any) => void;
}

export const ServiceCategoryCard = ({
  category,
  services,
  allCategories,
  isExpanded,
  onToggle,
  onEdit,
  onDelete,
  onEditService,
  onDeleteService,
  onMoveService,
  onManageProducts,
}: ServiceCategoryCardProps) => {
  const { setNodeRef, isOver } = useDroppable({
    id: category.id,
    data: {
      type: 'category',
      category,
    },
  });

  const otherCategories = allCategories.filter(cat => cat.id !== category.id);

  return (
    <Card 
      ref={setNodeRef}
      className={`border-2 transition-colors ${
        isOver ? 'border-primary bg-primary/5' : 'border-border'
      }`}
    >
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <Collapsible open={isExpanded} onOpenChange={onToggle} className="flex-1">
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="p-0 h-auto justify-start gap-2 hover:bg-muted/50 transition-colors">
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
                <div 
                  className="w-4 h-4 rounded-full"
                  style={{ backgroundColor: category.color }}
                />
                {isExpanded ? (
                  <FolderOpen className="h-5 w-5" />
                ) : (
                  <Folder className="h-5 w-5" />
                )}
                <CardTitle className="text-lg">{category.name}</CardTitle>
                <Badge variant="secondary" className="ml-2">
                  {services.length}
                </Badge>
              </Button>
            </CollapsibleTrigger>
          </Collapsible>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(category)}>
                <Edit3 className="h-4 w-4 mr-2" />
                Editar pasta
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => onDelete(category.id)}
                className="text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Excluir pasta
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        
        {category.description && (
          <p className="text-sm text-muted-foreground ml-10">{category.description}</p>
        )}
      </CardHeader>

      <Collapsible open={isExpanded}>
        <CollapsibleContent>
          <CardContent className="pt-0">
            {services.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Folder className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Arraste serviços para esta pasta</p>
              </div>
            ) : (
              <SortableContext items={services.map(s => s.id)} strategy={verticalListSortingStrategy}>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {services.map((service) => (
                    <DraggableServiceCard
                      key={service.id}
                      service={service}
                      categories={otherCategories}
                      onEdit={onEditService}
                      onDelete={onDeleteService}
                      onMoveToCategory={onMoveService}
                      onManageProducts={onManageProducts}
                    />
                  ))}
                </div>
              </SortableContext>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};