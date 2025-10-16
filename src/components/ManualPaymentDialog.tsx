import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle2, DollarSign } from 'lucide-react';

interface ManualPaymentDialogProps {
  appointment: {
    id: string;
    client_name: string;
    services?: {
      name: string;
      price: number;
    };
  };
  onPaymentCompleted: () => void;
}

const ManualPaymentDialog = ({ appointment, onPaymentCompleted }: ManualPaymentDialogProps) => {
  const [open, setOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleManualCompletion = async () => {
    if (!paymentMethod) {
      toast({
        title: 'Erro',
        description: 'Selecione a forma de pagamento.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    
    try {
      // Atualizar status do agendamento para confirmado e pago
      const { error: appointmentError } = await supabase
        .from('appointments')
        .update({
          status: 'confirmed',
          payment_status: 'paid',
          payment_method: paymentMethod,
          notes: notes || undefined,
        })
        .eq('id', appointment.id);

      if (appointmentError) throw appointmentError;

      // Criar registro de pagamento manual
      const appointmentData = await supabase
        .from('appointments')
        .select('barbershop_id, service_id, employee_id, client_phone')
        .eq('id', appointment.id)
        .single();

      if (appointmentData.error) throw appointmentData.error;

      const { error: paymentError } = await supabase
        .from('payments')
        .insert({
          barbershop_id: appointmentData.data.barbershop_id,
          appointment_id: appointment.id,
          service_id: appointmentData.data.service_id,
          employee_id: appointmentData.data.employee_id,
          amount: appointment.services?.price || 0,
          status: 'paid',
          payment_method: paymentMethod,
          payment_type: 'appointment',
          client_name: appointment.client_name,
          client_phone: appointmentData.data.client_phone,
          description: `Pagamento Manual - ${appointment.services?.name || 'Serviço'}`,
          paid_at: new Date().toISOString(),
          net_received_amount: appointment.services?.price || 0,
          transaction_amount: appointment.services?.price || 0,
        });

      if (paymentError) throw paymentError;

      toast({
        title: 'Sucesso!',
        description: `Pagamento de ${appointment.client_name} marcado como concluído.`,
      });

      setOpen(false);
      setPaymentMethod('');
      setNotes('');
      onPaymentCompleted();
    } catch (error) {
        toast({
          title: 'Erro',
          description: 'Erro ao marcar pagamento como concluído.',
          variant: 'destructive',
        });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <CheckCircle2 className="h-4 w-4 mr-2" />
          Marcar Pago
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Marcar Pagamento como Concluído
          </DialogTitle>
          <DialogDescription>
            Marque este agendamento como pago manualmente (dinheiro, cartão na maquininha, etc.)
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="p-4 bg-muted rounded-lg">
            <p className="font-medium">{appointment.client_name}</p>
            <p className="text-sm text-muted-foreground">{appointment.services?.name}</p>
            <p className="text-sm font-medium text-primary">R$ {appointment.services?.price?.toFixed(2)}</p>
          </div>

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

          <div className="flex gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleManualCompletion}
              disabled={loading || !paymentMethod}
              className="flex-1"
            >
              {loading ? 'Confirmando...' : 'Confirmar Pagamento'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ManualPaymentDialog;