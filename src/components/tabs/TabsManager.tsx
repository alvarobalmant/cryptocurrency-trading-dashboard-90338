import { useState } from 'react';
import { useTabs } from '@/hooks/useTabs';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Search, FileText, User, Clock, DollarSign } from 'lucide-react';
import CreateTabDialog from './CreateTabDialog';
import TabDetails from './TabDetails';
import { formatCurrency } from '@/lib/utils';

interface TabsManagerProps {
  barbershopId: string;
}

export default function TabsManager({ barbershopId }: TabsManagerProps) {
  const { tabs, loading, getOpenTabs, getClosedTabs } = useTabs(barbershopId);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTab, setSelectedTab] = useState<string | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  const openTabs = getOpenTabs();
  const closedTabs = getClosedTabs();

  const filterTabs = (tabsList: typeof tabs) => {
    if (!searchTerm) return tabsList;
    const term = searchTerm.toLowerCase();
    return tabsList.filter(
      (tab) =>
        tab.tab_number.toLowerCase().includes(term) ||
        tab.client_name.toLowerCase().includes(term) ||
        tab.client_phone?.includes(term)
    );
  };

  const getPaymentStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      pending: { variant: 'outline' as const, label: 'Pendente', className: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
      partially_paid: { variant: 'secondary' as const, label: 'Parcial', className: 'bg-blue-50 text-blue-700 border-blue-200' },
      paid: { variant: 'default' as const, label: 'Pago', className: 'bg-green-50 text-green-700 border-green-200' },
    };
    const config = variants[status] || variants.pending;
    return <Badge className={config.className}>{config.label}</Badge>;
  };

  const TabCard = ({ tab }: { tab: typeof tabs[0] }) => (
    <Card
      className="p-4 hover:shadow-md transition-shadow cursor-pointer"
      onClick={() => setSelectedTab(tab.id)}
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <FileText className="h-4 w-4 text-primary" />
            <h3 className="font-semibold">{tab.tab_number}</h3>
          </div>
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <User className="h-3 w-3" />
            <span>{tab.client_name}</span>
          </div>
        </div>
        {getPaymentStatusBadge(tab.payment_status)}
      </div>

      <div className="space-y-2 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Total:</span>
          <span className="font-semibold">{formatCurrency(tab.total)}</span>
        </div>
        {tab.payment_status === 'partially_paid' && (
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Pago:</span>
            <span>{formatCurrency(tab.paid_amount)}</span>
          </div>
        )}
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Clock className="h-3 w-3" />
          <span>{new Date(tab.opened_at).toLocaleString('pt-BR')}</span>
        </div>
      </div>
    </Card>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Comandas</h1>
          <p className="text-muted-foreground">
            Gerencie as comandas da barbearia
          </p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nova Comanda
        </Button>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por número, cliente ou telefone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <Tabs defaultValue="open" className="w-full">
        <TabsList>
          <TabsTrigger value="open">
            Abertas ({openTabs.length})
          </TabsTrigger>
          <TabsTrigger value="closed">
            Fechadas ({closedTabs.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="open" className="space-y-4 mt-6">
          {filterTabs(openTabs).length === 0 ? (
            <Card className="p-8 text-center">
              <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">Nenhuma comanda aberta</h3>
              <p className="text-muted-foreground mb-4">
                Crie uma nova comanda para começar
              </p>
              <Button onClick={() => setCreateDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Nova Comanda
              </Button>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filterTabs(openTabs).map((tab) => (
                <TabCard key={tab.id} tab={tab} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="closed" className="space-y-4 mt-6">
          {filterTabs(closedTabs).length === 0 ? (
            <Card className="p-8 text-center">
              <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">Nenhuma comanda fechada</h3>
              <p className="text-muted-foreground">
                Comandas fechadas aparecerão aqui
              </p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filterTabs(closedTabs).map((tab) => (
                <TabCard key={tab.id} tab={tab} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <CreateTabDialog
        barbershopId={barbershopId}
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
      />

      {selectedTab && (
        <TabDetails
          tabId={selectedTab}
          barbershopId={barbershopId}
          open={!!selectedTab}
          onOpenChange={(open) => !open && setSelectedTab(null)}
        />
      )}
    </div>
  );
}
