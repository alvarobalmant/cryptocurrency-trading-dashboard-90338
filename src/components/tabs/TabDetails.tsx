import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Plus, Trash2, User, Phone, FileText, DollarSign, X } from 'lucide-react';
import { useTabItems } from '@/hooks/useTabItems';
import { useTabs, Tab } from '@/hooks/useTabs';
import { formatCurrency } from '@/lib/utils';
import AddTabItemDialog from './AddTabItemDialog';
import ProcessTabPaymentDialog from './ProcessTabPaymentDialog';

interface TabDetailsProps {
  tabId: string;
  barbershopId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function TabDetails({
  tabId,
  barbershopId,
  open,
  onOpenChange,
}: TabDetailsProps) {
  const [tab, setTab] = useState<Tab | null>(null);
  const { items, removeItem } = useTabItems(tabId);
  const { closeTab, cancelTab } = useTabs(barbershopId);
  const [addItemDialogOpen, setAddItemDialogOpen] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);

  useEffect(() => {
    if (tabId) {
      fetchTab();
    }
  }, [tabId]);

  const fetchTab = async () => {
    const { data, error } = await supabase
      .from('tabs')
      .select('*')
      .eq('id', tabId)
      .single();

    if (!error && data) {
      setTab(data);
    }
  };

  if (!tab) {
    return null;
  }

  const isOpen = tab.status === 'open';
  const canEdit = isOpen;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                {tab.tab_number}
              </DialogTitle>
              <Badge
                className={
                  tab.status === 'open'
                    ? 'bg-green-50 text-green-700 border-green-200'
                    : tab.status === 'closed'
                    ? 'bg-gray-50 text-gray-700 border-gray-200'
                    : 'bg-red-50 text-red-700 border-red-200'
                }
              >
                {tab.status === 'open'
                  ? 'Aberta'
                  : tab.status === 'closed'
                  ? 'Fechada'
                  : 'Cancelada'}
              </Badge>
            </div>
          </DialogHeader>

          <div className="space-y-6">
            {/* Client Info */}
            <Card className="p-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{tab.client_name}</span>
                </div>
                {tab.client_phone && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Phone className="h-4 w-4" />
                    <span>{tab.client_phone}</span>
                  </div>
                )}
                {tab.notes && (
                  <p className="text-sm text-muted-foreground mt-2">{tab.notes}</p>
                )}
              </div>
            </Card>

            {/* Items List */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">Itens da Comanda</h3>
                {canEdit && (
                  <Button
                    size="sm"
                    onClick={() => setAddItemDialogOpen(true)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Adicionar Item
                  </Button>
                )}
              </div>

              {items.length === 0 ? (
                <Card className="p-8 text-center">
                  <p className="text-muted-foreground mb-4">
                    Nenhum item adicionado ainda
                  </p>
                  {canEdit && (
                    <Button onClick={() => setAddItemDialogOpen(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Adicionar Primeiro Item
                    </Button>
                  )}
                </Card>
              ) : (
                <div className="space-y-2">
                  {items.map((item) => (
                    <Card key={item.id} className="p-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-medium">{item.item_name}</h4>
                            <Badge variant="outline" className="text-xs">
                              {item.item_type === 'product'
                                ? 'Produto'
                                : item.item_type === 'service'
                                ? 'Serviço'
                                : 'Outro'}
                            </Badge>
                          </div>
                          {item.description && (
                            <p className="text-sm text-muted-foreground mb-2">
                              {item.description}
                            </p>
                          )}
                          <div className="flex items-center gap-4 text-sm">
                            <span>Qtd: {item.quantity}</span>
                            <span>
                              Unit: {formatCurrency(item.unit_price)}
                            </span>
                            {item.discount > 0 && (
                              <span className="text-green-600">
                                Desc: {formatCurrency(item.discount)}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-start gap-2">
                          <span className="font-semibold">
                            {formatCurrency(item.total)}
                          </span>
                          {canEdit && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeItem(item.id)}
                              className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>

            <Separator />

            {/* Totals */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Subtotal:</span>
                <span>{formatCurrency(tab.subtotal)}</span>
              </div>
              {tab.discount > 0 && (
                <div className="flex items-center justify-between text-sm text-green-600">
                  <span>Desconto:</span>
                  <span>- {formatCurrency(tab.discount)}</span>
                </div>
              )}
              <div className="flex items-center justify-between text-lg font-bold">
                <span>Total:</span>
                <span>{formatCurrency(tab.total)}</span>
              </div>
              {tab.payment_status === 'partially_paid' && (
                <>
                  <div className="flex items-center justify-between text-sm text-green-600">
                    <span>Pago:</span>
                    <span>{formatCurrency(tab.paid_amount)}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm font-semibold">
                    <span>Restante:</span>
                    <span>{formatCurrency(tab.total - tab.paid_amount)}</span>
                  </div>
                </>
              )}
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3">
              {isOpen && items.length > 0 && (
                <>
                  <Button
                    variant="outline"
                    onClick={() => cancelTab(tab.id)}
                  >
                    <X className="h-4 w-4 mr-2" />
                    Cancelar Comanda
                  </Button>
                  <Button onClick={() => setPaymentDialogOpen(true)}>
                    <DollarSign className="h-4 w-4 mr-2" />
                    Processar Pagamento
                  </Button>
                </>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AddTabItemDialog
        tabId={tabId}
        barbershopId={barbershopId}
        open={addItemDialogOpen}
        onOpenChange={setAddItemDialogOpen}
      />

      <ProcessTabPaymentDialog
        tab={tab}
        barbershopId={barbershopId}
        open={paymentDialogOpen}
        onOpenChange={setPaymentDialogOpen}
        onSuccess={() => {
          fetchTab();
          onOpenChange(false);
        }}
      />
    </>
  );
}
