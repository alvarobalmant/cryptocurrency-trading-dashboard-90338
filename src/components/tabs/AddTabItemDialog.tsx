import { useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useProducts } from '@/hooks/useProducts';
import { useServices } from '@/hooks/useServices';
import { useTabItems } from '@/hooks/useTabItems';
import { formatCurrency } from '@/lib/utils';
import { 
  Search, 
  Plus, 
  Minus, 
  Package, 
  Scissors, 
  FileText,
  ShoppingCart,
  Check
} from 'lucide-react';
import { cn } from '@/lib/utils';

const formSchema = z.object({
  item_type: z.enum(['product', 'service', 'custom']),
  product_id: z.string().optional(),
  service_id: z.string().optional(),
  item_name: z.string().min(1, 'Nome é obrigatório'),
  description: z.string().optional(),
  quantity: z.coerce.number().min(0.01, 'Quantidade deve ser maior que 0'),
  unit_price: z.coerce.number().min(0, 'Preço deve ser maior ou igual a 0'),
  discount: z.coerce.number().min(0, 'Desconto deve ser maior ou igual a 0').optional(),
  notes: z.string().optional(),
});

interface AddTabItemDialogProps {
  tabId: string;
  barbershopId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type ItemCategory = 'product' | 'service' | 'custom';

export default function AddTabItemDialog({
  tabId,
  barbershopId,
  open,
  onOpenChange,
}: AddTabItemDialogProps) {
  const { addItem } = useTabItems(tabId);
  const { products, loading: loadingProducts } = useProducts(barbershopId);
  const { services, loading: loadingServices } = useServices(barbershopId);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [category, setCategory] = useState<ItemCategory>('product');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedItemId, setSelectedItemId] = useState<string>('');

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      item_type: 'product',
      quantity: 1,
      unit_price: 0,
      discount: 0,
    },
  });

  const quantity = form.watch('quantity');
  const unitPrice = form.watch('unit_price');
  const discount = form.watch('discount') || 0;

  // Filtrar produtos ativos de varejo
  const filteredProducts = useMemo(() => {
    return products
      .filter((p) => p.active && p.product_type === 'retail')
      .filter((p) =>
        searchTerm
          ? p.name.toLowerCase().includes(searchTerm.toLowerCase())
          : true
      );
  }, [products, searchTerm]);

  // Filtrar serviços ativos
  const filteredServices = useMemo(() => {
    return services
      .filter((s) => s.active)
      .filter((s) =>
        searchTerm
          ? s.name.toLowerCase().includes(searchTerm.toLowerCase())
          : true
      );
  }, [services, searchTerm]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsSubmitting(true);
    try {
      await addItem({
        item_type: values.item_type,
        product_id: values.product_id,
        service_id: values.service_id,
        item_name: values.item_name,
        description: values.description,
        quantity: values.quantity,
        unit_price: values.unit_price,
        discount: values.discount || 0,
        notes: values.notes,
      });
      form.reset();
      setSearchTerm('');
      setSelectedItemId('');
      onOpenChange(false);
    } catch (error) {
      console.error('Error adding item:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleProductSelect = (product: any) => {
    setSelectedItemId(product.id);
    form.setValue('item_type', 'product');
    form.setValue('product_id', product.id);
    form.setValue('item_name', product.name);
    form.setValue('unit_price', Number(product.retail_price || 0));
    form.setValue('description', product.description || '');
  };

  const handleServiceSelect = (service: any) => {
    setSelectedItemId(service.id);
    form.setValue('item_type', 'service');
    form.setValue('service_id', service.id);
    form.setValue('item_name', service.name);
    form.setValue('unit_price', Number(service.price));
    form.setValue('description', service.description || '');
  };

  const adjustQuantity = (delta: number) => {
    const current = form.getValues('quantity');
    const newValue = Math.max(0.01, current + delta);
    form.setValue('quantity', Number(newValue.toFixed(2)));
  };

  const subtotal = quantity * unitPrice;
  const total = subtotal - discount;

  const CategoryButton = ({ 
    value, 
    icon: Icon, 
    label 
  }: { 
    value: ItemCategory; 
    icon: any; 
    label: string 
  }) => (
    <button
      type="button"
      onClick={() => {
        setCategory(value);
        setSearchTerm('');
        setSelectedItemId('');
        form.reset({ item_type: value, quantity: 1, unit_price: 0, discount: 0 });
      }}
      className={cn(
        "flex-1 flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all",
        category === value
          ? "border-primary bg-primary/5"
          : "border-border hover:border-primary/50 hover:bg-muted/50"
      )}
    >
      <Icon className={cn("h-5 w-5", category === value && "text-primary")} />
      <span className={cn("text-sm font-medium", category === value && "text-primary")}>
        {label}
      </span>
    </button>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0">
        <DialogHeader className="p-6 pb-4">
          <DialogTitle className="text-2xl flex items-center gap-2">
            <ShoppingCart className="h-6 w-6" />
            Adicionar Item à Comanda
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col lg:flex-row h-full">
          {/* Seleção de Item */}
          <div className="flex-1 p-6 pt-0 space-y-4 border-r">
            {/* Category Selection */}
            <div className="flex gap-2">
              <CategoryButton value="product" icon={Package} label="Produtos" />
              <CategoryButton value="service" icon={Scissors} label="Serviços" />
              <CategoryButton value="custom" icon={FileText} label="Customizado" />
            </div>

            {category !== 'custom' && (
              <>
                {/* Search Bar */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder={`Buscar ${category === 'product' ? 'produtos' : 'serviços'}...`}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 h-11"
                  />
                </div>

                {/* Items List */}
                <ScrollArea className="h-[400px] pr-4">
                  <div className="space-y-2">
                    {category === 'product' && (
                      <>
                        {loadingProducts ? (
                          <div className="text-center py-8 text-muted-foreground">
                            Carregando produtos...
                          </div>
                        ) : filteredProducts.length === 0 ? (
                          <div className="text-center py-8 text-muted-foreground">
                            {searchTerm ? 'Nenhum produto encontrado' : 'Nenhum produto disponível'}
                          </div>
                        ) : (
                          filteredProducts.map((product) => (
                            <button
                              key={product.id}
                              type="button"
                              onClick={() => handleProductSelect(product)}
                              className={cn(
                                "w-full text-left p-4 rounded-lg border-2 transition-all hover:shadow-md",
                                selectedItemId === product.id
                                  ? "border-primary bg-primary/5"
                                  : "border-border hover:border-primary/50"
                              )}
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                    <h4 className="font-semibold text-base truncate">
                                      {product.name}
                                    </h4>
                                    {selectedItemId === product.id && (
                                      <Check className="h-4 w-4 text-primary flex-shrink-0" />
                                    )}
                                  </div>
                                  {product.description && (
                                    <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                                      {product.description}
                                    </p>
                                  )}
                                  {product.sku && (
                                    <Badge variant="outline" className="text-xs">
                                      SKU: {product.sku}
                                    </Badge>
                                  )}
                                </div>
                                <div className="text-right flex-shrink-0">
                                  <div className="text-lg font-bold text-primary">
                                    {formatCurrency(Number(product.retail_price || 0))}
                                  </div>
                                </div>
                              </div>
                            </button>
                          ))
                        )}
                      </>
                    )}

                    {category === 'service' && (
                      <>
                        {loadingServices ? (
                          <div className="text-center py-8 text-muted-foreground">
                            Carregando serviços...
                          </div>
                        ) : filteredServices.length === 0 ? (
                          <div className="text-center py-8 text-muted-foreground">
                            {searchTerm ? 'Nenhum serviço encontrado' : 'Nenhum serviço disponível'}
                          </div>
                        ) : (
                          filteredServices.map((service) => (
                            <button
                              key={service.id}
                              type="button"
                              onClick={() => handleServiceSelect(service)}
                              className={cn(
                                "w-full text-left p-4 rounded-lg border-2 transition-all hover:shadow-md",
                                selectedItemId === service.id
                                  ? "border-primary bg-primary/5"
                                  : "border-border hover:border-primary/50"
                              )}
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                    <h4 className="font-semibold text-base truncate">
                                      {service.name}
                                    </h4>
                                    {selectedItemId === service.id && (
                                      <Check className="h-4 w-4 text-primary flex-shrink-0" />
                                    )}
                                  </div>
                                  {service.description && (
                                    <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                                      {service.description}
                                    </p>
                                  )}
                                  <Badge variant="outline" className="text-xs">
                                    {service.duration} min
                                  </Badge>
                                </div>
                                <div className="text-right flex-shrink-0">
                                  <div className="text-lg font-bold text-primary">
                                    {formatCurrency(Number(service.price))}
                                  </div>
                                </div>
                              </div>
                            </button>
                          ))
                        )}
                      </>
                    )}
                  </div>
                </ScrollArea>
              </>
            )}

            {category === 'custom' && (
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="item_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome do Item *</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: Item customizado" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Descrição</FormLabel>
                      <FormControl>
                        <Input placeholder="Detalhes adicionais" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="unit_price"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Preço Unitário *</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}
          </div>

          {/* Resumo e Ações */}
          <div className="w-full lg:w-96 p-6 bg-muted/30 space-y-6">
            <div>
              <h3 className="font-semibold text-lg mb-4">Resumo do Item</h3>
              
              <div className="space-y-4">
                  {/* Quantidade */}
                  <div className="space-y-2">
                    <FormLabel>Quantidade</FormLabel>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => adjustQuantity(-1)}
                        disabled={quantity <= 0.01}
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                      <FormField
                        control={form.control}
                        name="quantity"
                        render={({ field }) => (
                          <FormItem className="flex-1">
                            <FormControl>
                              <Input
                                type="number"
                                step="0.01"
                                className="text-center text-lg font-semibold"
                                {...field}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => adjustQuantity(1)}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Preço Unitário (editável) */}
                  <FormField
                    control={form.control}
                    name="unit_price"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Preço Unitário</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            className="text-lg font-semibold"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Desconto */}
                  <FormField
                    control={form.control}
                    name="discount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Desconto (R$)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Separator />

                  {/* Totais */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Subtotal:</span>
                      <span className="font-medium">{formatCurrency(subtotal)}</span>
                    </div>
                    {discount > 0 && (
                      <div className="flex justify-between text-sm text-red-600">
                        <span>Desconto:</span>
                        <span className="font-medium">-{formatCurrency(discount)}</span>
                      </div>
                    )}
                    <Separator />
                    <div className="flex justify-between text-lg font-bold">
                      <span>Total:</span>
                      <span className="text-primary">{formatCurrency(total)}</span>
                    </div>
                  </div>

                  {/* Botões de Ação */}
                  <div className="flex flex-col gap-3 pt-4">
                    <Button 
                      type="submit" 
                      size="lg" 
                      disabled={isSubmitting || !form.formState.isValid}
                      className="w-full"
                    >
                      {isSubmitting ? 'Adicionando...' : 'Adicionar à Comanda'}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="lg"
                      onClick={() => onOpenChange(false)}
                      className="w-full"
                    >
                      Cancelar
                    </Button>
                  </div>
              </div>
            </div>
          </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
