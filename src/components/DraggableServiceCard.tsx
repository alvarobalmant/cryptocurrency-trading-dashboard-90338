import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Edit3, Trash2, MoreVertical, Package } from 'lucide-react';

interface DraggableServiceCardProps {
  service: any;
  categories: any[];
  onEdit: (service: any) => void;
  onDelete: (serviceId: string) => void;
  onMoveToCategory: (serviceId: string, categoryId: string | null) => void;
  onManageProducts?: (service: any) => void;
}

export const DraggableServiceCard = ({
  service,
  categories,
  onEdit,
  onDelete,
  onMoveToCategory,
  onManageProducts,
}: DraggableServiceCardProps) => {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const handleEdit = () => {
    onEdit(service);
  };

  const handleDeleteClick = () => {
    setShowDeleteDialog(true);
  };

  const handleDeleteConfirm = () => {
    onDelete(service.id);
    setShowDeleteDialog(false);
  };

  return (
    <>
      <Card className="hover:shadow-md transition-shadow">
        <CardHeader>
          <div className="flex items-start justify-between">
            <CardTitle className="text-lg">{service.name}</CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant={service.active ? 'default' : 'secondary'}>
                {service.active ? 'Ativo' : 'Inativo'}
              </Badge>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem onClick={handleEdit}>
                    <Edit3 className="h-4 w-4 mr-2" />
                    Editar serviço
                  </DropdownMenuItem>
                  {onManageProducts && (
                    <DropdownMenuItem onClick={() => onManageProducts(service)}>
                      <Package className="h-4 w-4 mr-2" />
                      Gerenciar produtos
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={() => onMoveToCategory(service.id, null)}>
                    Remover da pasta
                  </DropdownMenuItem>
                  {categories.map((category) => (
                    <DropdownMenuItem 
                      key={category.id}
                      onClick={() => onMoveToCategory(service.id, category.id)}
                    >
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: category.color }}
                        />
                        Mover para {category.name}
                      </div>
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuItem 
                    onClick={handleDeleteClick}
                    className="text-destructive"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Excluir serviço
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
          {service.description && (
            <CardDescription>{service.description}</CardDescription>
          )}
        </CardHeader>
        
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Preço:</span>
              <span className="font-semibold text-lg text-primary">
                R$ {service.price?.toString()}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Duração:</span>
              <span className="text-sm">{service.duration_minutes} minutos</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o serviço "{service.name}"? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};