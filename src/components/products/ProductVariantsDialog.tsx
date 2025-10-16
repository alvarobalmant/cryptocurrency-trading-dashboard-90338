import { useState } from 'react';
import { Plus, Trash2, Package } from 'lucide-react';
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
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface ProductVariantsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productId: string;
  productName: string;
  unitType: string;
}

interface Variant {
  id: string;
  variant_name: string;
  sku: string | null;
  price_adjustment: number;
  attributes: any;
}

export default function ProductVariantsDialog({
  open,
  onOpenChange,
  productId,
  productName,
  unitType,
}: ProductVariantsDialogProps) {
  const [variants, setVariants] = useState<Variant[]>([]);
  const [loading, setLoading] = useState(false);
  const [newVariant, setNewVariant] = useState({
    variant_name: '',
    size: '',
    price_adjustment: 0,
  });

  const fetchVariants = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('product_variants')
        .select('*')
        .eq('product_id', productId)
        .eq('active', true);

      if (error) throw error;
      setVariants(data || []);
    } catch (error: any) {
      toast.error('Erro ao carregar variantes');
    } finally {
      setLoading(false);
    }
  };

  const handleAddVariant = async () => {
    if (!newVariant.variant_name || !newVariant.size) {
      toast.error('Preencha o nome e tamanho da variante');
      return;
    }

    try {
      const { error } = await supabase.from('product_variants').insert({
        product_id: productId,
        variant_name: newVariant.variant_name,
        price_adjustment: newVariant.price_adjustment,
        attributes: { size: newVariant.size, unit: unitType },
        active: true,
      });

      if (error) throw error;

      toast.success('Variante adicionada!');
      setNewVariant({ variant_name: '', size: '', price_adjustment: 0 });
      fetchVariants();
    } catch (error: any) {
      toast.error('Erro ao adicionar variante');
    }
  };

  const handleDeleteVariant = async (variantId: string) => {
    try {
      const { error } = await supabase
        .from('product_variants')
        .update({ active: false })
        .eq('id', variantId);

      if (error) throw error;

      toast.success('Variante removida!');
      fetchVariants();
    } catch (error: any) {
      toast.error('Erro ao remover variante');
    }
  };

  useState(() => {
    if (open) {
      fetchVariants();
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Variantes de {productName}</DialogTitle>
          <DialogDescription>
            Gerencie as variantes deste produto (ex: tamanhos, embalagens)
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Add New Variant */}
          <div className="border rounded-lg p-4 bg-muted/50">
            <h4 className="font-medium mb-4">Adicionar Nova Variante</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Nome da Variante *</Label>
                <Input
                  placeholder="Ex: 500ml, 300ml"
                  value={newVariant.variant_name}
                  onChange={(e) =>
                    setNewVariant({ ...newVariant, variant_name: e.target.value })
                  }
                />
              </div>
              <div>
                <Label>Tamanho ({unitType}) *</Label>
                <Input
                  type="number"
                  placeholder="Ex: 500, 300"
                  value={newVariant.size}
                  onChange={(e) =>
                    setNewVariant({ ...newVariant, size: e.target.value })
                  }
                />
              </div>
              <div>
                <Label>Ajuste de Preço (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={newVariant.price_adjustment}
                  onChange={(e) =>
                    setNewVariant({
                      ...newVariant,
                      price_adjustment: parseFloat(e.target.value) || 0,
                    })
                  }
                />
              </div>
              <div className="flex items-end">
                <Button onClick={handleAddVariant} className="w-full">
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar
                </Button>
              </div>
            </div>
          </div>

          {/* Existing Variants */}
          <div>
            <h4 className="font-medium mb-3">Variantes Cadastradas</h4>
            {loading ? (
              <div className="text-center py-8">
                <Package className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
              </div>
            ) : variants.length === 0 ? (
              <div className="text-center py-8 border rounded-lg">
                <Package className="h-12 w-12 mx-auto mb-2 text-muted-foreground" />
                <p className="text-muted-foreground">Nenhuma variante cadastrada</p>
              </div>
            ) : (
              <div className="space-y-2">
                {variants.map((variant) => (
                  <div
                    key={variant.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50"
                  >
                    <div className="flex items-center gap-3">
                      <Package className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="font-medium">{variant.variant_name}</p>
                        <p className="text-sm text-muted-foreground">
                          {variant.attributes?.size} {variant.attributes?.unit}
                          {variant.price_adjustment !== 0 && (
                            <span className="ml-2">
                              • Ajuste:{' '}
                              {variant.price_adjustment > 0 ? '+' : ''}
                              R$ {variant.price_adjustment.toFixed(2)}
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {variant.sku && (
                        <Badge variant="outline" className="font-mono">
                          {variant.sku}
                        </Badge>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteVariant(variant.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
