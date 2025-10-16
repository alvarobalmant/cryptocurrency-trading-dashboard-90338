import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Scissors } from 'lucide-react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { DraggableServiceCard } from './DraggableServiceCard';

interface UncategorizedServicesSectionProps {
  services: any[];
  categories: any[];
  onEditService: (service: any) => void;
  onDeleteService: (serviceId: string) => void;
  onMoveService: (serviceId: string, categoryId: string | null) => void;
  onManageProducts?: (service: any) => void;
}

export const UncategorizedServicesSection = ({
  services,
  categories,
  onEditService,
  onDeleteService,
  onMoveService,
  onManageProducts,
}: UncategorizedServicesSectionProps) => {
  const { setNodeRef, isOver } = useDroppable({
    id: 'uncategorized',
    data: {
      type: 'uncategorized',
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-4 h-4 rounded-full bg-muted" />
        <h3 className="text-xl font-semibold flex items-center gap-2">
          <Scissors className="h-5 w-5" />
          Serviços sem pasta
        </h3>
      </div>
      
      <Card 
        ref={setNodeRef}
        className={`border-2 transition-colors ${
          isOver ? 'border-primary bg-primary/5' : 'border-dashed border-muted-foreground/25'
        }`}
      >
        <CardContent className="pt-6">
          {services.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Scissors className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Nenhum serviço sem pasta</p>
            </div>
          ) : (
            <SortableContext items={services.map(s => s.id)} strategy={verticalListSortingStrategy}>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {services.map((service) => (
                  <DraggableServiceCard
                    key={service.id}
                    service={service}
                    categories={categories}
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
      </Card>
    </div>
  );
};