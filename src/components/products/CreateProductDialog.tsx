import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Loader2, Plus, Trash2, HelpCircle } from 'lucide-react';
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
import { Switch } from '@/components/ui/switch';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { toast } from 'sonner';
import { useProducts } from '@/hooks/useProducts';
import { supabase } from '@/integrations/supabase/client';

const variantSchema = z.object({
  variant_name: z.string().min(1, 'Nome da variante é obrigatório'),
  unit_size: z.number().min(0.01, 'Tamanho deve ser positivo'),
  unit_cost: z.number().min(0, 'Custo deve ser positivo'),
  retail_price: z.number().min(0, 'Preço deve ser positivo'),
  min_stock_level: z.number().int().min(0, 'Estoque mínimo deve ser positivo'),
  reorder_point: z.number().int().min(0, 'Ponto de reposição deve ser positivo'),
});

const productSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório').max(100),
  description: z.string().optional(),
  product_types: z.array(z.string()).min(1, 'Selecione pelo menos um tipo'),
  unit_type: z.enum(['unit', 'ml', 'g', 'kg', 'l']),
  uses_variants: z.boolean(),
  stock_control_mode: z.enum(['unit', 'volume']),
  unit_size: z.string().optional(),
  initial_quantity: z.string().optional(),
  default_cost: z.string().optional(),
  retail_price: z.string().optional(),
  min_stock_level: z.string().optional(),
  reorder_point: z.string().optional(),
});

type ProductFormData = z.infer<typeof productSchema>;
type VariantFormData = z.infer<typeof variantSchema>;

interface CreateProductDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  barbershopId?: string;
  editingProduct?: any;
}

export default function CreateProductDialog({
  open,
  onOpenChange,
  barbershopId,
  editingProduct,
}: CreateProductDialogProps) {
  const isEditing = !!editingProduct;
  const { createProduct, updateProduct } = useProducts(barbershopId);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [variants, setVariants] = useState<VariantFormData[]>([]);
  const [selectedTypes, setSelectedTypes] = useState<string[]>(['consumable']);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: isEditing ? {
      name: editingProduct.name,
      description: editingProduct.description || '',
      product_types: [editingProduct.product_type],
      unit_type: editingProduct.unit_type,
      uses_variants: editingProduct.uses_variants,
      stock_control_mode: editingProduct.stock_control_mode || 'volume',
      unit_size: editingProduct.unit_size?.toString() || '',
      default_cost: editingProduct.default_cost?.toString() || '',
      retail_price: editingProduct.retail_price?.toString() || '',
      min_stock_level: editingProduct.min_stock_level?.toString() || '',
      reorder_point: editingProduct.reorder_point?.toString() || '',
    } : {
      product_types: ['consumable'],
      unit_type: 'ml',
      uses_variants: false,
      stock_control_mode: 'volume',
    },
  });

  // Initialize editing state
  useEffect(() => {
    if (open && editingProduct) {
      // Produto em edição - popular formulário
      const types = editingProduct.product_type ? [editingProduct.product_type] : ['consumable'];
      setSelectedTypes(types);
      
      reset({
        name: editingProduct.name || '',
        description: editingProduct.description || '',
        product_types: types,
        unit_type: editingProduct.unit_type || 'ml',
        uses_variants: editingProduct.uses_variants || false,
        stock_control_mode: editingProduct.stock_control_mode || 'volume',
        unit_size: editingProduct.unit_size?.toString() || '',
        default_cost: editingProduct.default_cost?.toString() || '',
        retail_price: editingProduct.retail_price?.toString() || '',
        min_stock_level: editingProduct.min_stock_level?.toString() || '0',
        reorder_point: editingProduct.reorder_point?.toString() || '0',
        initial_quantity: '',
      });
    } else if (open && !editingProduct) {
      // Novo produto - resetar formulário
      setSelectedTypes(['consumable']);
      setVariants([]);
      reset({
        name: '',
        description: '',
        product_types: ['consumable'],
        unit_type: 'ml',
        uses_variants: false,
        stock_control_mode: 'volume',
        unit_size: '',
        default_cost: '',
        retail_price: '',
        min_stock_level: '0',
        reorder_point: '0',
        initial_quantity: '',
      });
    }
  }, [open, editingProduct, reset]);

  const unitType = watch('unit_type');
  const usesVariants = watch('uses_variants');
  const stockControlMode = watch('stock_control_mode');
  
  const toggleProductType = (type: string) => {
    const newTypes = selectedTypes.includes(type)
      ? selectedTypes.filter(t => t !== type)
      : [...selectedTypes, type];
    setSelectedTypes(newTypes);
    setValue('product_types', newTypes);
  };

  const isRetail = selectedTypes.includes('retail');

  const addVariant = () => {
    setVariants([
      ...variants,
      {
        variant_name: '',
        unit_size: 0,
        unit_cost: 0,
        retail_price: 0,
        min_stock_level: 0,
        reorder_point: 0,
      },
    ]);
  };

  const removeVariant = (index: number) => {
    setVariants(variants.filter((_, i) => i !== index));
  };

  const updateVariant = (index: number, field: keyof VariantFormData, value: any) => {
    const newVariants = [...variants];
    newVariants[index] = { ...newVariants[index], [field]: value };
    setVariants(newVariants);
  };

  const onSubmit = async (data: ProductFormData) => {
    if (!barbershopId) {
      toast.error('Barbearia não selecionada');
      return;
    }

    if (usesVariants && variants.length === 0 && !isEditing) {
      toast.error('Adicione pelo menos uma variante');
      return;
    }

    setIsSubmitting(true);
    try {
      if (isEditing) {
        // Update existing product
        await updateProduct(editingProduct.id, {
          name: data.name,
          description: data.description || null,
          product_type: data.product_types[0],
          unit_type: data.unit_type,
          stock_control_mode: data.stock_control_mode,
          unit_size: usesVariants ? null : parseFloat(data.unit_size || '0'),
          default_cost: usesVariants ? null : parseFloat(data.default_cost || '0'),
          retail_price: usesVariants ? null : (isRetail ? parseFloat(data.retail_price || '0') : null),
          min_stock_level: usesVariants ? null : parseInt(data.min_stock_level || '0'),
          reorder_point: usesVariants ? null : parseInt(data.reorder_point || '0'),
        });
        toast.success('Produto atualizado com sucesso!');
      } else {
        // Create new product
        const product = await createProduct({
          name: data.name,
          description: data.description || null,
          product_type: data.product_types[0],
          unit_type: data.unit_type,
          uses_variants: usesVariants,
          stock_control_mode: data.stock_control_mode,
          unit_size: usesVariants ? null : parseFloat(data.unit_size || '0'),
          default_cost: usesVariants ? null : parseFloat(data.default_cost || '0'),
          retail_price: usesVariants ? null : (isRetail ? parseFloat(data.retail_price || '0') : null),
          min_stock_level: usesVariants ? null : parseInt(data.min_stock_level || '0'),
          reorder_point: usesVariants ? null : parseInt(data.reorder_point || '0'),
          track_batches: true,
          track_expiry: data.product_types.includes('consumable'),
          active: true,
        });

        // If using variants, create them
        if (usesVariants && variants.length > 0 && product) {
          for (const variant of variants) {
            await supabase.from('product_variants').insert({
              product_id: product.id,
              variant_name: variant.variant_name,
              unit_size: variant.unit_size,
              unit_cost: variant.unit_cost,
              retail_price: variant.retail_price,
              min_stock_level: variant.min_stock_level,
              reorder_point: variant.reorder_point,
              active: true,
            });
          }
        }

        // Create initial inventory if quantity provided
        if (!usesVariants && data.initial_quantity && parseFloat(data.initial_quantity) > 0 && product) {
          await supabase.from('inventory_batches').insert({
            product_id: product.id,
            batch_number: 'INICIAL-001',
            quantity_received: parseFloat(data.initial_quantity),
            quantity_available: parseFloat(data.initial_quantity),
            unit_cost: parseFloat(data.default_cost || '0'),
            status: 'active',
          });
        }

        toast.success('Produto criado com sucesso!');
      }
      
      reset();
      setVariants([]);
      setSelectedTypes(['consumable']);
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error saving product:', error);
      toast.error(error.message || `Erro ao ${isEditing ? 'atualizar' : 'criar'} produto`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar Produto' : 'Novo Produto'}</DialogTitle>
          <DialogDescription>
            {isEditing ? 'Atualize as informações do produto' : 'Cadastre um novo produto para controle de estoque'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label htmlFor="name">Nome do Produto *</Label>
              <Input
                id="name"
                {...register('name')}
                placeholder="Ex: Shampoo Dove"
              />
              {errors.name && (
                <p className="text-sm text-destructive mt-1">{errors.name.message}</p>
              )}
            </div>

            <div className="col-span-2">
              <Label htmlFor="description">Descrição</Label>
              <Textarea
                id="description"
                {...register('description')}
                placeholder="Descrição opcional do produto"
                rows={2}
              />
            </div>

            <div className="col-span-2">
              <Label>Tipo de Produto * (selecione um ou mais)</Label>
              <div className="grid grid-cols-2 gap-3 mt-2">
                {[
                  { value: 'consumable', label: 'Consumível' },
                  { value: 'retail', label: 'Revenda' },
                  { value: 'professional', label: 'Profissional' },
                  { value: 'equipment', label: 'Equipamento' },
                ].map((type) => (
                  <div key={type.value} className="flex items-center space-x-2">
                    <Checkbox
                      id={type.value}
                      checked={selectedTypes.includes(type.value)}
                      onCheckedChange={() => toggleProductType(type.value)}
                    />
                    <Label htmlFor={type.value} className="cursor-pointer">
                      {type.label}
                    </Label>
                  </div>
                ))}
              </div>
              {errors.product_types && (
                <p className="text-sm text-destructive mt-1">{errors.product_types.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="unit_type">Unidade de Medida *</Label>
              <Select
                value={unitType}
                onValueChange={(value) => setValue('unit_type', value as any)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ml">Mililitro (ml)</SelectItem>
                  <SelectItem value="l">Litro (L)</SelectItem>
                  <SelectItem value="g">Grama (g)</SelectItem>
                  <SelectItem value="kg">Quilograma (kg)</SelectItem>
                  <SelectItem value="unit">Unidade</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="col-span-2 flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <Label>Usar Variantes</Label>
                <p className="text-sm text-muted-foreground">
                  Cadastre tamanhos diferentes (ex: 300ml, 500ml)
                </p>
              </div>
              <Switch
                checked={usesVariants}
                onCheckedChange={(checked) => setValue('uses_variants', checked)}
              />
            </div>

            <div className="col-span-2">
              <Label htmlFor="stock_control_mode">Controle de Estoque *</Label>
              <Select
                value={stockControlMode}
                onValueChange={(value) => setValue('stock_control_mode', value as any)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="volume">Por Volume ({unitType})</SelectItem>
                  <SelectItem value="unit">Por Unidade</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground mt-1">
                {stockControlMode === 'volume' 
                  ? `Estoque será mostrado em ${unitType} (ex: 1500ml total)`
                  : 'Estoque será mostrado em unidades (ex: 3 frascos)'
                }
              </p>
            </div>

            {!usesVariants && (
              <>
                <div className="col-span-2">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="unit_size">Tamanho de Cada Unidade ({unitType}) *</Label>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          <p>Tamanho da embalagem. Ex: um frasco de shampoo de 500ml, digite 500</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <Input
                    id="unit_size"
                    type="number"
                    step="0.01"
                    {...register('unit_size')}
                    placeholder={unitType === 'ml' ? "500" : "1"}
                  />
                  {errors.unit_size && (
                    <p className="text-sm text-destructive mt-1">{errors.unit_size.message}</p>
                  )}
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <Label htmlFor="initial_quantity">Quantidade Inicial (unidades)</Label>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          <p>Quantas unidades você já possui em estoque agora?</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <Input
                    id="initial_quantity"
                    type="number"
                    {...register('initial_quantity')}
                    placeholder="0"
                  />
                </div>

                <div>
                  <Label htmlFor="default_cost">Custo Unitário (R$) *</Label>
                  <Input
                    id="default_cost"
                    type="number"
                    step="0.01"
                    {...register('default_cost')}
                    placeholder="0.00"
                  />
                  {errors.default_cost && (
                    <p className="text-sm text-destructive mt-1">{errors.default_cost.message}</p>
                  )}
                </div>

                {isRetail && (
                  <div>
                    <div className="flex items-center gap-2">
                      <Label htmlFor="retail_price">Preço de Venda (R$) *</Label>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            <p>Preço pelo qual você vende este produto para clientes</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    <Input
                      id="retail_price"
                      type="number"
                      step="0.01"
                      {...register('retail_price')}
                      placeholder="0.00"
                    />
                    {errors.retail_price && (
                      <p className="text-sm text-destructive mt-1">{errors.retail_price.message}</p>
                    )}
                  </div>
                )}

                <div>
                  <div className="flex items-center gap-2">
                    <Label htmlFor="min_stock_level">Estoque Mínimo ({stockControlMode === 'volume' ? unitType : 'unid'}) *</Label>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          <p>Quantidade mínima que você deseja manter em estoque. Quando atingir este nível, você receberá um alerta.</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <Input
                    id="min_stock_level"
                    type="number"
                    {...register('min_stock_level')}
                    placeholder="0"
                  />
                  {errors.min_stock_level && (
                    <p className="text-sm text-destructive mt-1">{errors.min_stock_level.message}</p>
                  )}
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <Label htmlFor="reorder_point">Ponto de Reposição ({stockControlMode === 'volume' ? unitType : 'unid'}) *</Label>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          <p>Quando atingir esta quantidade, é hora de fazer um novo pedido. Geralmente é maior que o estoque mínimo para dar tempo de receber a encomenda.</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <Input
                    id="reorder_point"
                    type="number"
                    {...register('reorder_point')}
                    placeholder="0"
                  />
                  {errors.reorder_point && (
                    <p className="text-sm text-destructive mt-1">{errors.reorder_point.message}</p>
                  )}
                </div>
              </>
            )}
          </div>

          {usesVariants && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Variantes do Produto</Label>
                  <p className="text-sm text-muted-foreground">
                    Adicione diferentes tamanhos/embalagens
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addVariant}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar Variante
                </Button>
              </div>

              {variants.length === 0 && (
                <Card className="p-6">
                  <p className="text-sm text-muted-foreground text-center">
                    Nenhuma variante adicionada. Clique no botão acima para adicionar.
                  </p>
                </Card>
              )}

              {variants.map((variant, index) => (
                <Card key={index} className="p-4">
                  <div className="flex items-start justify-between mb-4">
                    <h4 className="text-sm font-medium">Variante #{index + 1}</h4>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeVariant(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Nome (ex: 300ml, 500ml) *</Label>
                      <Input
                        value={variant.variant_name}
                        onChange={(e) => updateVariant(index, 'variant_name', e.target.value)}
                        placeholder="300ml"
                      />
                    </div>
                    <div>
                      <Label>Tamanho ({unitType}) *</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={variant.unit_size}
                        onChange={(e) => updateVariant(index, 'unit_size', parseFloat(e.target.value) || 0)}
                        placeholder="300"
                      />
                    </div>
                    <div>
                      <Label>Custo Unitário (R$) *</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={variant.unit_cost}
                        onChange={(e) => updateVariant(index, 'unit_cost', parseFloat(e.target.value) || 0)}
                        placeholder="10.00"
                      />
                    </div>
                    <div>
                      <Label>Preço Venda (R$) *</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={variant.retail_price}
                        onChange={(e) => updateVariant(index, 'retail_price', parseFloat(e.target.value) || 0)}
                        placeholder="18.00"
                      />
                    </div>
                    <div>
                      <Label>Estoque Mínimo (unidades) *</Label>
                      <Input
                        type="number"
                        value={variant.min_stock_level}
                        onChange={(e) => updateVariant(index, 'min_stock_level', parseInt(e.target.value) || 0)}
                        placeholder="5"
                      />
                    </div>
                    <div>
                      <Label>Ponto Reposição (unidades) *</Label>
                      <Input
                        type="number"
                        value={variant.reorder_point}
                        onChange={(e) => updateVariant(index, 'reorder_point', parseInt(e.target.value) || 0)}
                        placeholder="3"
                      />
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                reset();
                setVariants([]);
                onOpenChange(false);
              }}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEditing ? 'Atualizar Produto' : 'Criar Produto'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
