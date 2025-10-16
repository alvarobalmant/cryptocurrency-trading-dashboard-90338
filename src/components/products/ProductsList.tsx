import { useState } from 'react';
import { Package, Search, Edit, Archive, MoreVertical, Boxes } from 'lucide-react';
import ProductVariantsDialog from './ProductVariantsDialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface Product {
  id: string;
  name: string;
  sku: string | null;
  product_type: string;
  unit_type: string;
  uses_variants?: boolean;
  stock_control_mode?: string;
  unit_size?: number;
  default_cost: number;
  retail_price: number;
  min_stock_level: number;
  active: boolean;
  volume_stock?: {
    total_units: number;
    total_volume: number;
    total_value: number;
  };
}

interface ProductsListProps {
  products: Product[];
  loading: boolean;
  onEdit?: (product: Product) => void;
  onToggleActive?: (productId: string, active: boolean) => void;
}

const productTypeLabels: Record<string, string> = {
  consumable: 'Consumível',
  retail: 'Revenda',
  professional: 'Profissional',
  equipment: 'Equipamento',
};

const unitTypeLabels: Record<string, string> = {
  unit: 'Unidade',
  ml: 'ml',
  g: 'g',
  kg: 'kg',
  l: 'L',
};

export default function ProductsList({ products, loading, onEdit, onToggleActive }: ProductsListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [variantsDialogOpen, setVariantsDialogOpen] = useState(false);

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.sku?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatVolume = (volume: number, unit: string) => {
    // Converte ml para L se >= 1000ml
    if (unit === 'ml' && volume >= 1000) {
      return `${(volume / 1000).toFixed(2)} L`;
    }
    // Converte g para kg se >= 1000g
    if (unit === 'g' && volume >= 1000) {
      return `${(volume / 1000).toFixed(2)} kg`;
    }
    return `${volume.toFixed(2)} ${unit}`;
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="flex items-center justify-center">
            <Package className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="border-b border-border">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">Lista de Produtos</CardTitle>
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome ou SKU..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {filteredProducts.length === 0 ? (
          <div className="py-12 text-center">
            <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">
              {searchTerm ? 'Nenhum produto encontrado' : 'Nenhum produto cadastrado'}
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>SKU</TableHead>
                <TableHead>Nome</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Unidade</TableHead>
                <TableHead>Custo</TableHead>
                <TableHead>Estoque Atual</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProducts.map((product) => (
                <TableRow key={product.id}>
                  <TableCell className="font-mono text-sm">{product.sku || '-'}</TableCell>
                  <TableCell className="font-medium">
                    {product.name}
                    {product.uses_variants && (
                      <Badge variant="secondary" className="ml-2 text-xs">Variantes</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {productTypeLabels[product.product_type] || product.product_type}
                    </Badge>
                  </TableCell>
                  <TableCell>{unitTypeLabels[product.unit_type] || product.unit_type}</TableCell>
                  <TableCell>
                    {product.uses_variants ? (
                      <span className="text-muted-foreground text-sm">Ver variantes</span>
                    ) : (
                      <>R$ {Number(product.default_cost).toFixed(2)}</>
                    )}
                  </TableCell>
                  <TableCell>
                    {product.volume_stock ? (
                      <div className="flex flex-col gap-1">
                        {product.stock_control_mode === 'volume' ? (
                          <>
                            <span className="font-medium">
                              {formatVolume(product.volume_stock.total_volume, product.unit_type)}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              ({product.volume_stock.total_units.toFixed(3)} unid.)
                            </span>
                          </>
                        ) : (
                          <>
                            <span className="font-medium">
                              {product.volume_stock.total_units.toFixed(3)} unid.
                            </span>
                            {product.unit_size && (
                              <span className="text-xs text-muted-foreground">
                                ({formatVolume(product.volume_stock.total_volume, product.unit_type)})
                              </span>
                            )}
                          </>
                        )}
                      </div>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => {
                            setSelectedProduct(product);
                            setVariantsDialogOpen(true);
                          }}
                        >
                          <Boxes className="h-4 w-4 mr-2" />
                          Variantes
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onEdit?.(product)}>
                          <Edit className="h-4 w-4 mr-2" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => onToggleActive?.(product.id, !product.active)}
                        >
                          <Archive className="h-4 w-4 mr-2" />
                          {product.active ? 'Desativar' : 'Ativar'}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      {selectedProduct && (
        <ProductVariantsDialog
          open={variantsDialogOpen}
          onOpenChange={setVariantsDialogOpen}
          productId={selectedProduct.id}
          productName={selectedProduct.name}
          unitType={selectedProduct.unit_type}
        />
      )}
    </Card>
  );
}
