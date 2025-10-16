import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tab } from '@/hooks/useTabs';
import { formatCurrency } from '@/lib/utils';
import { CreatePixPayment } from '@/components/CreatePixPayment';
import { CreatePointPayment } from '@/components/CreatePointPayment';
import CreateWalkInPayment from '@/components/CreateWalkInPayment';
import ManualPaymentDialog from '@/components/ManualPaymentDialog';
import { supabase } from '@/integrations/supabase/client';
import { Wallet, Smartphone, CreditCard, Link, AlertCircle, CheckCircle2, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';

interface ProcessTabPaymentDialogProps {
  tab: Tab;
  barbershopId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export default function ProcessTabPaymentDialog({
  tab,
  barbershopId,
  open,
  onOpenChange,
  onSuccess,
}: ProcessTabPaymentDialogProps) {
  const [barbershop, setBarbershop] = useState<any>(null);
  const [services, setServices] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentTab, setCurrentTab] = useState('manual');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [notes, setNotes] = useState('');
  const [processing, setProcessing] = useState(false);
  const { toast } = useToast();

  const remainingAmount = tab.total - tab.paid_amount;

  // Fetch barbershop, services and employees data
  useEffect(() => {
    if (open && barbershopId) {
      fetchData();
    }
  }, [open, barbershopId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch barbershop
      const { data: barbershopData } = await supabase
        .from('barbershops')
        .select('*')
        .eq('id', barbershopId)
        .single();

      if (barbershopData) {
        setBarbershop(barbershopData);
      }

      // Fetch services
      const { data: servicesData } = await supabase
        .from('services')
        .select('*')
        .eq('barbershop_id', barbershopId)
        .eq('active', true)
        .order('name');

      if (servicesData) {
        setServices(servicesData);
      }

      // Fetch employees
      const { data: employeesData } = await supabase
        .from('employees')
        .select('*')
        .eq('barbershop_id', barbershopId)
        .eq('status', 'active')
        .order('name');

      if (employeesData) {
        setEmployees(employeesData);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleManualPayment = async () => {
    if (!paymentMethod) {
      toast({
        title: 'Erro',
        description: 'Selecione a forma de pagamento.',
        variant: 'destructive',
      });
      return;
    }

    setProcessing(true);
    try {
      // Create payment record
      const { data: payment, error: paymentError } = await supabase
        .from('payments')
        .insert({
          barbershop_id: barbershopId,
          tab_id: tab.id,
          appointment_id: tab.appointment_id,
          amount: remainingAmount,
          payment_method: paymentMethod,
          payment_type: 'walk_in',
          payment_source: 'tab',
          status: 'paid',
          client_name: tab.client_name,
          client_phone: tab.client_phone,
          description: `Pagamento da comanda ${tab.tab_number}${notes ? ` - ${notes}` : ''}`,
          paid_at: new Date().toISOString(),
          net_received_amount: remainingAmount,
        })
        .select()
        .single();

      if (paymentError) throw paymentError;

      // Update tab payment status
      const newPaidAmount = Number(tab.paid_amount) + remainingAmount;
      const isFullyPaid = newPaidAmount >= Number(tab.total);

      const { error: updateTabError } = await supabase
        .from('tabs')
        .update({
          paid_amount: newPaidAmount,
          payment_status: isFullyPaid ? 'paid' : 'partially_paid',
          status: isFullyPaid ? 'closed' : 'open',
          closed_at: isFullyPaid ? new Date().toISOString() : null,
        })
        .eq('id', tab.id);

      if (updateTabError) throw updateTabError;

      // If tab has appointment, update appointment payment status
      if (tab.appointment_id && isFullyPaid) {
        await supabase
          .from('appointments')
          .update({
            payment_status: 'paid',
            payment_method: paymentMethod,
            status: 'confirmed',
          })
          .eq('id', tab.appointment_id);
      }

      toast({
        title: 'Pagamento processado',
        description: isFullyPaid 
          ? 'Comanda paga e fechada com sucesso' 
          : 'Pagamento parcial registrado',
      });

      setPaymentMethod('');
      setNotes('');
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error processing payment:', error);
      toast({
        title: 'Erro ao processar pagamento',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[700px]">
          <DialogHeader>
            <DialogTitle>Processar Pagamento</DialogTitle>
          </DialogHeader>
          <div className="p-8 text-center">
            <p className="text-muted-foreground">Carregando...</p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const mercadoPagoEnabled = barbershop?.mercadopago_enabled || false;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Processar Pagamento
          </DialogTitle>
          <DialogDescription>
            Escolha a forma de pagamento da comanda
          </DialogDescription>
        </DialogHeader>

        {/* Tab Summary */}
        <Card className="p-4 bg-muted">
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Comanda:</span>
              <span className="font-medium">{tab.tab_number}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Cliente:</span>
              <span className="font-medium">{tab.client_name}</span>
            </div>
            <Separator className="my-2" />
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total:</span>
              <span className="font-medium">{formatCurrency(tab.total)}</span>
            </div>
            {tab.paid_amount > 0 && (
              <div className="flex justify-between text-green-600">
                <span>Já Pago:</span>
                <span>{formatCurrency(tab.paid_amount)}</span>
              </div>
            )}
            <div className="flex justify-between text-lg font-bold">
              <span>A Pagar:</span>
              <span>{formatCurrency(remainingAmount)}</span>
            </div>
          </div>
        </Card>

        {mercadoPagoEnabled ? (
          <Tabs value={currentTab} onValueChange={setCurrentTab} className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="manual" className="text-xs">
                <Wallet className="h-4 w-4 mr-1" />
                Manual
              </TabsTrigger>
              <TabsTrigger value="pix" className="text-xs">
                <Smartphone className="h-4 w-4 mr-1" />
                PIX
              </TabsTrigger>
              <TabsTrigger value="point" className="text-xs">
                <CreditCard className="h-4 w-4 mr-1" />
                Point
              </TabsTrigger>
              <TabsTrigger value="link" className="text-xs">
                <Link className="h-4 w-4 mr-1" />
                Link
              </TabsTrigger>
            </TabsList>

            {/* Manual Payment */}
            <TabsContent value="manual" className="space-y-4">
              <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
                <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 rounded-t-lg">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-100 rounded-full">
                      <Wallet className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-medium text-gray-900">Pagamento Manual</h3>
                      <p className="text-sm text-gray-500">Registrar pagamento em dinheiro ou cartão físico</p>
                    </div>
                  </div>
                </div>

                <div className="p-6 space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">
                      Como o cliente pagou? *
                    </label>
                    <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                      <SelectTrigger className="border-gray-200">
                        <SelectValue placeholder="Selecione a forma de pagamento" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cash">Dinheiro</SelectItem>
                        <SelectItem value="debit_card">Cartão de Débito</SelectItem>
                        <SelectItem value="credit_card">Cartão de Crédito</SelectItem>
                        <SelectItem value="pix">PIX</SelectItem>
                        <SelectItem value="other">Outro</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">
                      Observações (opcional)
                    </label>
                    <Textarea
                      placeholder="Ex: Cliente pagou em dinheiro após o serviço..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={3}
                      className="border-gray-200"
                    />
                  </div>

                  <div className="flex gap-3 pt-4 border-t border-gray-200">
                    <Button
                      variant="outline"
                      onClick={() => onOpenChange(false)}
                      className="flex-1 border-gray-200"
                    >
                      Cancelar
                    </Button>
                    <Button
                      onClick={handleManualPayment}
                      disabled={processing || !paymentMethod}
                      className="flex-1 bg-blue-600 hover:bg-blue-700"
                    >
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      {processing ? 'Processando...' : 'Confirmar Pagamento'}
                    </Button>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* PIX Payment */}
            <TabsContent value="pix">
              <CreatePixPayment
                barbershopId={barbershopId}
                services={services}
                employees={employees}
                selectedAppointment={{
                  client_name: tab.client_name,
                  client_phone: tab.client_phone,
                }}
                onPaymentCreated={() => {
                  onSuccess();
                  onOpenChange(false);
                }}
                onModalClose={() => onOpenChange(false)}
              />
            </TabsContent>

            {/* Point Payment */}
            <TabsContent value="point">
              <CreatePointPayment
                barbershopId={barbershopId}
                services={services}
                employees={employees}
                selectedAppointment={{
                  client_name: tab.client_name,
                  client_phone: tab.client_phone,
                }}
                onPaymentCreated={() => {
                  onSuccess();
                  onOpenChange(false);
                }}
              />
            </TabsContent>

            {/* Payment Link */}
            <TabsContent value="link">
              <CreateWalkInPayment
                barbershopId={barbershopId}
                services={services}
                employees={employees}
                selectedAppointment={{
                  client_name: tab.client_name,
                  client_phone: tab.client_phone,
                }}
                onPaymentCreated={() => {
                  onSuccess();
                  onOpenChange(false);
                }}
                mode="payment_link"
              />
            </TabsContent>
          </Tabs>
        ) : (
          <>
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                MercadoPago não configurado. Apenas pagamento manual disponível.
              </AlertDescription>
            </Alert>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Como o cliente pagou? *
                </label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a forma de pagamento" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Dinheiro</SelectItem>
                    <SelectItem value="debit_card">Cartão de Débito</SelectItem>
                    <SelectItem value="credit_card">Cartão de Crédito</SelectItem>
                    <SelectItem value="pix">PIX</SelectItem>
                    <SelectItem value="other">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Observações (opcional)
                </label>
                <Textarea
                  placeholder="Ex: Cliente pagou em dinheiro após o serviço..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                />
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  className="flex-1"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleManualPayment}
                  disabled={processing || !paymentMethod}
                  className="flex-1"
                >
                  {processing ? 'Processando...' : 'Confirmar Pagamento'}
                </Button>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
