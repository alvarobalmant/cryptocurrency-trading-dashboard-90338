import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Package, Droplet, Weight } from 'lucide-react';
import { useProducts } from '@/hooks/useProducts';

interface InventoryOverviewProps {
  barbershopId?: string;
}

export default function InventoryOverview({ barbershopId }: InventoryOverviewProps) {
  const { products, loading } = useProducts(barbershopId);

  const calculateTotals = () => {
    const totals: Record<string, { volume: number; value: number; count: number }> = {};

    products.forEach((product) => {
      const stock = product.volume_stock;
      if (!stock || stock.total_volume === 0) return;

      const key = product.unit_type;
      if (!totals[key]) {
        totals[key] = { volume: 0, value: 0, count: 0 };
      }
      totals[key].volume += stock.total_volume;
      totals[key].value += stock.total_value;
      totals[key].count += 1;
    });

    return Object.entries(totals).map(([unit, data]) => ({ unit, ...data }));
  };

  const formatVolume = (volume: number, unit: string) => {
    // Converte ml para L se >= 1000ml
    if (unit === 'ml' && volume >= 1000) {
      return {
        value: (volume / 1000).toFixed(2),
        unit: 'L'
      };
    }
    // Converte g para kg se >= 1000g
    if (unit === 'g' && volume >= 1000) {
      return {
        value: (volume / 1000).toFixed(2),
        unit: 'kg'
      };
    }
    return {
      value: volume.toFixed(2),
      unit: unit
    };
  };

  const totals = calculateTotals();

  const getUnitIcon = (unit: string) => {
    if (unit === 'ml' || unit === 'l') return Droplet;
    if (unit === 'g' || unit === 'kg') return Weight;
    return Package;
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12">
          <Package className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {totals.length === 0 ? (
        <Card className="col-span-full">
          <CardContent className="py-12 text-center">
            <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">Nenhum estoque disponível</p>
          </CardContent>
        </Card>
      ) : (
        totals.map((item) => {
          const Icon = getUnitIcon(item.unit);
          return (
            <Card key={item.unit}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total em {item.unit.toUpperCase()}
                </CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {(() => {
                    const formatted = formatVolume(item.volume, item.unit);
                    return `${formatted.value} ${formatted.unit}`;
                  })()}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {item.count} produto{item.count !== 1 ? 's' : ''}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Valor total: R$ {item.value.toLocaleString('pt-BR', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </p>
              </CardContent>
            </Card>
          );
        })
      )}
    </div>
  );
}
