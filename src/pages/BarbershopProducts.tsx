import { useState } from 'react';
import { Package, Plus, AlertTriangle, Users, Archive, TrendingUp } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { useBarbershop } from '@/hooks/useBarbershop';
import { useProducts } from '@/hooks/useProducts';
import { useSuppliers } from '@/hooks/useSuppliers';
import { useStockAlerts } from '@/hooks/useStockAlerts';
import ProductsList from '@/components/products/ProductsList';
import SuppliersList from '@/components/products/SuppliersList';
import StockAlertsList from '@/components/products/StockAlertsList';
import InventoryOverview from '@/components/products/InventoryOverview';
import CreateProductDialog from '@/components/products/CreateProductDialog';
import CreateSupplierDialog from '@/components/products/CreateSupplierDialog';
import ServiceProductsDialog from '@/components/products/ServiceProductsDialog';

export default function BarbershopProducts() {
  const { barbershop } = useBarbershop();
  const { products, loading: productsLoading, updateProduct } = useProducts(barbershop?.id);
  const { suppliers } = useSuppliers(barbershop?.id);
  const { alerts, loading: alertsLoading } = useStockAlerts(barbershop?.id);
  const [activeTab, setActiveTab] = useState('products');
  const [createProductOpen, setCreateProductOpen] = useState(false);
  const [createSupplierOpen, setCreateSupplierOpen] = useState(false);
  const [serviceProductsOpen, setServiceProductsOpen] = useState(false);
  const [selectedService, setSelectedService] = useState<{ id: string; name: string } | null>(null);
  const [editingProduct, setEditingProduct] = useState<any>(null);

  const activeProducts = products.filter(p => p.active);
  const criticalAlerts = alerts.filter(a => a.severity === 'critical' && a.status === 'active');
  const lowStockProducts = products.filter(p => {
    // This would need to check actual stock levels
    return p.active;
  }).length;

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border bg-card">
        <div className="max-w-[1400px] mx-auto px-6 py-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-semibold text-foreground mb-1">Gestão de Produtos</h1>
              <p className="text-sm text-muted-foreground">
                Controle completo de estoque, produtos e fornecedores
              </p>
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={() => setCreateSupplierOpen(true)}
              >
                <Users className="h-4 w-4 mr-2" />
                Novo Fornecedor
              </Button>
              <Button onClick={() => setCreateProductOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Novo Produto
              </Button>
            </div>
          </div>

          {/* KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Produtos Ativos</p>
                    <p className="text-2xl font-semibold mt-1">{activeProducts.length}</p>
                  </div>
                  <Package className="h-8 w-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Fornecedores</p>
                    <p className="text-2xl font-semibold mt-1">{suppliers.length}</p>
                  </div>
                  <Users className="h-8 w-8 text-green-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Alertas Críticos</p>
                    <p className="text-2xl font-semibold mt-1">{criticalAlerts.length}</p>
                  </div>
                  <AlertTriangle className="h-8 w-8 text-red-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Estoque Baixo</p>
                    <p className="text-2xl font-semibold mt-1">{lowStockProducts}</p>
                  </div>
                  <Archive className="h-8 w-8 text-orange-500" />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto px-6 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-muted">
            <TabsTrigger value="products" className="data-[state=active]:bg-background">
              <Package className="h-4 w-4 mr-2" />
              Produtos
              <Badge variant="secondary" className="ml-2">{activeProducts.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="inventory" className="data-[state=active]:bg-background">
              <Archive className="h-4 w-4 mr-2" />
              Estoque
            </TabsTrigger>
            <TabsTrigger value="suppliers" className="data-[state=active]:bg-background">
              <Users className="h-4 w-4 mr-2" />
              Fornecedores
              <Badge variant="secondary" className="ml-2">{suppliers.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="alerts" className="data-[state=active]:bg-background">
              <AlertTriangle className="h-4 w-4 mr-2" />
              Alertas
              {criticalAlerts.length > 0 && (
                <Badge variant="destructive" className="ml-2">{criticalAlerts.length}</Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="products" className="space-y-4">
            <ProductsList
              products={products}
              loading={productsLoading}
              onEdit={(product) => {
                setEditingProduct(product);
                setCreateProductOpen(true);
              }}
              onToggleActive={async (productId, active) => {
                try {
                  await updateProduct(productId, { active });
                  toast.success(`Produto ${active ? 'ativado' : 'desativado'}!`);
                } catch (error) {
                  toast.error('Erro ao atualizar produto');
                }
              }}
            />
          </TabsContent>

          <TabsContent value="inventory" className="space-y-4">
            <InventoryOverview barbershopId={barbershop?.id} />
          </TabsContent>

          <TabsContent value="suppliers" className="space-y-4">
            <SuppliersList suppliers={suppliers} />
          </TabsContent>

          <TabsContent value="alerts" className="space-y-4">
            <StockAlertsList alerts={alerts} loading={alertsLoading} />
          </TabsContent>
        </Tabs>
      </div>

      <CreateProductDialog 
        open={createProductOpen} 
        onOpenChange={(open) => {
          setCreateProductOpen(open);
          if (!open) setEditingProduct(null);
        }}
        barbershopId={barbershop?.id}
        editingProduct={editingProduct}
      />

      <CreateSupplierDialog 
        open={createSupplierOpen} 
        onOpenChange={setCreateSupplierOpen}
        barbershopId={barbershop?.id}
      />

      {selectedService && (
        <ServiceProductsDialog
          open={serviceProductsOpen}
          onOpenChange={setServiceProductsOpen}
          serviceId={selectedService.id}
          serviceName={selectedService.name}
          barbershopId={barbershop?.id || ''}
        />
      )}
    </div>
  );
}
