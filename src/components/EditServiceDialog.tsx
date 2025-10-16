import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Package } from 'lucide-react';

interface EditServiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  service: any;
  categories: any[];
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => Promise<void>;
  onManageProducts?: () => void;
  isEditing: boolean;
}

export function EditServiceDialog({
  open,
  onOpenChange,
  service,
  categories,
  onSubmit,
  onManageProducts,
  isEditing,
}: EditServiceDialogProps) {
  if (!service) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] p-0 gap-0">
        {/* Header */}
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle className="text-xl font-semibold">
            Editar serviço
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground mt-1">
            Atualize as informações do serviço abaixo
          </DialogDescription>
        </DialogHeader>

        {/* Form Content */}
        <form onSubmit={onSubmit} className="flex flex-col h-full">
          <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
            {/* Basic Information Section */}
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="edit-name" className="text-sm font-medium">
                  Nome do serviço <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="edit-name"
                  name="name"
                  defaultValue={service.name}
                  placeholder="Ex: Corte + Barba"
                  required
                  className="h-10"
                />
                <p className="text-xs text-muted-foreground">
                  Digite o nome que será exibido aos clientes
                </p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="edit-description" className="text-sm font-medium">
                  Descrição
                </Label>
                <Textarea
                  id="edit-description"
                  name="description"
                  defaultValue={service.description || ''}
                  placeholder="Descreva os detalhes do serviço..."
                  rows={4}
                  className="resize-none"
                />
                <p className="text-xs text-muted-foreground">
                  Adicione uma descrição detalhada do serviço (opcional)
                </p>
              </div>
            </div>

            {/* Pricing & Duration Section */}
            <div className="space-y-4 pt-4 border-t">
              <h3 className="text-sm font-semibold">Preço e duração</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="edit-price" className="text-sm font-medium">
                    Preço <span className="text-destructive">*</span>
                  </Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                      R$
                    </span>
                    <Input
                      id="edit-price"
                      name="price"
                      type="number"
                      step="0.01"
                      min="0"
                      defaultValue={service.price}
                      required
                      className="h-10 pl-10"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Valor cobrado
                  </p>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="edit-duration" className="text-sm font-medium">
                    Duração <span className="text-destructive">*</span>
                  </Label>
                  <div className="relative">
                    <Input
                      id="edit-duration"
                      name="duration_minutes"
                      type="number"
                      min="1"
                      defaultValue={service.duration_minutes}
                      required
                      className="h-10 pr-16"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                      minutos
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Tempo estimado
                  </p>
                </div>
              </div>
            </div>

            {/* Category Section */}
            <div className="space-y-4 pt-4 border-t">
              <h3 className="text-sm font-semibold">Organização</h3>
              
              <div className="space-y-1.5">
                <Label htmlFor="edit-category" className="text-sm font-medium">
                  Pasta
                </Label>
                <Select name="category_id" defaultValue={service.category_id || 'none'}>
                  <SelectTrigger id="edit-category" className="h-10">
                    <SelectValue placeholder="Selecione uma pasta" />
                  </SelectTrigger>
                  <SelectContent className="max-h-[200px]">
                    <SelectItem value="none">Sem pasta</SelectItem>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full flex-shrink-0"
                            style={{ backgroundColor: category.color }}
                          />
                          <span>{category.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Organize seus serviços em pastas (opcional)
                </p>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t bg-muted/20">
            <div className="flex items-center justify-between gap-3">
              {onManageProducts && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={onManageProducts}
                  className="gap-2"
                >
                  <Package className="h-4 w-4" />
                  Gerenciar produtos
                </Button>
              )}
              <div className="flex items-center gap-3 ml-auto">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={isEditing} className="min-w-[140px]">
                  {isEditing ? 'Salvando...' : 'Salvar alterações'}
                </Button>
              </div>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
