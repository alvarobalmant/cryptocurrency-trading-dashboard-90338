import { useState, useEffect } from 'react';
import { Plus, Trash2, Package, AlertCircle, DollarSign } from 'lucide-react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { useServiceProducts } from '@/hooks/useServiceProducts';
import { useProducts } from '@/hooks/useProducts';

interface ServiceProductsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  serviceId: string;
  serviceName: string;
  barbershopId: string;
}

export default function ServiceProductsDialog({
  open,
  onOpenChange,
  serviceId,
  serviceName,
  barbershopId,
}: ServiceProductsDialogProps) {
  const { serviceProducts, loading, addProductToService, removeProductFromService } =
    useServiceProducts(serviceId);
  const { products } = useProducts(barbershopId);

  const [selectedProduct, setSelectedProduct] = useState('');
  const [selectedVariant, setSelectedVariant] = useState('');
  const [quantity, setQuantity] = useState('');
  const [unit, setUnit] = useState('');

  // Reset form when dialog closes
  useEffect(() => {
    if (!open) {
      setSelectedProduct('');
      setSelectedVariant('');
      setQuantity('');
      setUnit('');
    }
  }, [open]);

  const selectedProductData = products.find((p) => p.id === selectedProduct);

  // Update unit when product changes
  useEffect(() => {
    if (selectedProductData) {
      setUnit(selectedProductData.unit_type);
      setSelectedVariant(''); // Reset variant when product changes
    }
  }, [selectedProductData]);

  const handleAddProduct = async () => {
    if (!selectedProduct || !quantity) {
      toast.error('Selecione um produto e informe a quantidade');
      return;
    }

    if (selectedProductData?.uses_variants && !selectedVariant) {
      toast.error('Selecione uma variante do produto');
      return;
    }

    try {
      const variantId = selectedProductData?.uses_variants ? selectedVariant : null;
      
      await addProductToService(
        selectedProduct,
        variantId,
        parseFloat(quantity),
        unit
      );

      toast.success('Produto vinculado ao serviço!');
      setSelectedProduct('');
      setSelectedVariant('');
      setQuantity('');
    } catch (error: any) {
      toast.error('Erro ao vincular produto: ' + error.message);
    }
  };

  const handleRemoveProduct = async (itemId: string) => {
    try {
      await removeProductFromService(itemId);
      toast.success('Produto removido do serviço!');
    } catch (error: any) {
      toast.error('Erro ao remover produto');
    }
  };

  const availableProducts = products.filter(
    (product) =>
      !serviceProducts.some((sp) => sp.product_id === product.id) &&
      product.active
  );

  // Calculate total cost estimate
  const totalCostEstimate = serviceProducts.reduce((total, item) => {
    return total + (item.cost_per_use || 0);
  }, 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Produtos do Serviço: {serviceName}
          </DialogTitle>
          <DialogDescription>
            Configure quais produtos são consumidos automaticamente ao realizar este serviço
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Add Product Form */}
          <div className="border rounded-lg p-4 bg-muted/30">
            <h4 className="font-medium mb-4 flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Adicionar Produto
            </h4>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 md:col-span-1">
                  <Label>Produto *</Label>
                  <Select value={selectedProduct} onValueChange={setSelectedProduct}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um produto" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableProducts.length === 0 ? (
                        <div className="p-2 text-sm text-muted-foreground text-center">
                          Nenhum produto disponível
                        </div>
                      ) : (
                        availableProducts.map((product) => (
                          <SelectItem key={product.id} value={product.id}>
                            {product.name} {product.uses_variants && '(com variantes)'}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>

                {/* Show variant selector if product has variants */}
                {selectedProductData?.uses_variants && (
                  <div className="col-span-2 md:col-span-1">
                    <Label>Variante *</Label>
                    <Select value={selectedVariant} onValueChange={setSelectedVariant}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a variante" />
                      </SelectTrigger>
                      <SelectContent>
                        {selectedProductData.volume_stock?.variants?.map((variant: any) => (
                          <SelectItem key={variant.variant_id} value={variant.variant_id}>
                            {variant.variant_name} ({variant.unit_size}{selectedProductData.unit_type})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className={selectedProductData?.uses_variants ? 'col-span-2' : 'col-span-2 md:col-span-1'}>
                  <Label>Quantidade consumida por serviço ({unit || 'un'}) *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="Ex: 5"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                  />
                </div>
              </div>

              <Button onClick={handleAddProduct} className="w-full" disabled={!selectedProduct || !quantity}>
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Produto ao Serviço
              </Button>
            </div>
          </div>

          {/* Info Alert */}
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-sm">
              <strong>Sistema automático de desconto:</strong> Quando um agendamento for confirmado, 
              os produtos vinculados serão descontados automaticamente do estoque usando o método FIFO 
              (primeiro que entra, primeiro que sai).
            </AlertDescription>
          </Alert>

          {/* Current Products List */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-medium flex items-center gap-2">
                <Package className="h-4 w-4" />
                Produtos Vinculados
                {serviceProducts.length > 0 && (
                  <Badge variant="secondary">{serviceProducts.length}</Badge>
                )}
              </h4>
              {totalCostEstimate > 0 && (
                <div className="flex items-center gap-2 text-sm">
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Custo estimado:</span>
                  <span className="font-semibold">R$ {totalCostEstimate.toFixed(2)}</span>
                </div>
              )}
            </div>
            
            {loading ? (
              <div className="text-center py-12 border rounded-lg">
                <Package className="h-12 w-12 animate-spin mx-auto mb-3 text-muted-foreground" />
                <p className="text-muted-foreground">Carregando produtos...</p>
              </div>
            ) : serviceProducts.length === 0 ? (
              <div className="text-center py-12 border rounded-lg bg-muted/20">
                <Package className="h-16 w-16 mx-auto mb-3 text-muted-foreground/50" />
                <p className="font-medium text-muted-foreground mb-1">
                  Nenhum produto vinculado a este serviço
                </p>
                <p className="text-sm text-muted-foreground">
                  Adicione produtos para controlar o consumo automaticamente
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {serviceProducts.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <Package className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">{item.products?.name}</p>
                        <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                          <span>
                            Consumo: <strong>{item.quantity_per_service} {item.unit}</strong> por serviço
                          </span>
                          {item.cost_per_use && (
                            <span className="flex items-center gap-1">
                              <DollarSign className="h-3 w-3" />
                              R$ {item.cost_per_use.toFixed(2)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveProduct(item.id)}
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
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
