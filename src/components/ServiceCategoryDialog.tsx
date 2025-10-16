import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import AvatarUpload from '@/components/AvatarUpload';
import type { ServiceCategory } from '@/hooks/useServiceCategories';

interface ServiceCategoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category?: ServiceCategory | null;
  onSave: (data: any) => Promise<void>;
  title: string;
  description: string;
  allCategories?: ServiceCategory[];
  currentParentId?: string | null;
}

const colors = [
  '#3B82F6', '#EF4444', '#10B981', '#F59E0B', 
  '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16'
];

export const ServiceCategoryDialog = ({
  open,
  onOpenChange,
  category,
  onSave,
  title,
  description,
  allCategories = [],
  currentParentId,
}: ServiceCategoryDialogProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [selectedColor, setSelectedColor] = useState(category?.color || colors[0]);
  const [avatarUrl, setAvatarUrl] = useState(category?.avatar_url || '');
  const [selectedParentId, setSelectedParentId] = useState<string | null>(category?.parent_id || currentParentId || null);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    const categoryData = {
      name: formData.get('name') as string,
      description: formData.get('description') as string,
      slogan: formData.get('slogan') as string,
      color: selectedColor,
      avatar_url: avatarUrl || null,
      parent_id: selectedParentId,
    };

    try {
      await onSave(categoryData);
      toast({
        title: category ? 'Pasta atualizada!' : 'Pasta criada!',
        description: category ? 'Pasta foi atualizada com sucesso.' : 'Nova pasta criada com sucesso.',
      });
      onOpenChange(false);
      (e.target as HTMLFormElement).reset();
      setSelectedColor(colors[0]);
      setAvatarUrl('');
      setSelectedParentId(null);
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Reset state when category changes (opening dialog with existing category)
  useEffect(() => {
    if (category) {
      setSelectedColor(category.color || colors[0]);
      setAvatarUrl(category.avatar_url || '');
      setSelectedParentId(category.parent_id || null);
    } else {
      setSelectedColor(colors[0]);
      setAvatarUrl('');
      setSelectedParentId(currentParentId || null);
    }
  }, [category, currentParentId]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome da Pasta *</Label>
            <Input
              id="name"
              name="name"
              placeholder="Ex: Serviços Masculinos"
              defaultValue={category?.name || ''}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="slogan">Slogan</Label>
            <Input
              id="slogan"
              name="slogan"
              placeholder="Ex: Estilo e elegância para homens"
              defaultValue={category?.slogan || ''}
            />
          </div>

          <div className="space-y-2">
            <Label>Pasta Pai (Opcional)</Label>
            <Select value={selectedParentId ?? 'none'} onValueChange={(value) => setSelectedParentId(value === 'none' ? null : value)}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione uma pasta pai (opcional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nenhuma (pasta raiz)</SelectItem>
                {allCategories
                  .filter(cat => cat.id !== category?.id) // Don't allow selecting self as parent
                  .map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              name="description"
              placeholder="Descreva o tipo de serviço..."
              defaultValue={category?.description || ''}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label>Foto da Pasta</Label>
            <AvatarUpload
              currentAvatarUrl={avatarUrl || category?.avatar_url}
              onAvatarUpdate={(url) => {
                setAvatarUrl(url || '');
              }}
              fallbackText="?"
            />
          </div>

          <div className="space-y-2">
            <Label>Cor da Pasta</Label>
            <div className="flex gap-2 flex-wrap">
              {colors.map((color) => (
                <button
                  key={color}
                  type="button"
                  className={`w-8 h-8 rounded-full border-2 ${
                    selectedColor === color ? 'border-foreground' : 'border-border'
                  }`}
                  style={{ backgroundColor: color }}
                  onClick={() => setSelectedColor(color)}
                />
              ))}
            </div>
          </div>
          
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" className="flex-1" disabled={isLoading}>
              {isLoading ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};