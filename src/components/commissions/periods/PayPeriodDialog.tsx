import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCommissionPeriods, CommissionPeriod } from "@/hooks/useCommissionPeriods";
import { Loader2, DollarSign } from "lucide-react";

interface PayPeriodDialogProps {
  period: CommissionPeriod;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const PayPeriodDialog = ({ period, open, onOpenChange }: PayPeriodDialogProps) => {
  const { payPeriod, isPaying } = useCommissionPeriods(period.barbershop_id);

  const [paymentMethod, setPaymentMethod] = useState<string>('pix');
  const [paymentNotes, setPaymentNotes] = useState<string>('');

  const handlePay = () => {
    payPeriod({
      periodId: period.id,
      paymentMethod,
      paymentNotes: paymentNotes || undefined,
    });

    onOpenChange(false);
    setPaymentMethod('pix');
    setPaymentNotes('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Marcar Período como Pago
          </DialogTitle>
          <DialogDescription>
            {period.employee?.name} - R$ {period.net_amount.toFixed(2)}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Método de Pagamento</Label>
            <Select value={paymentMethod} onValueChange={setPaymentMethod}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pix">PIX</SelectItem>
                <SelectItem value="cash">Dinheiro</SelectItem>
                <SelectItem value="bank_transfer">Transferência Bancária</SelectItem>
                <SelectItem value="card">Cartão</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Observações (opcional)</Label>
            <Textarea
              placeholder="Adicione observações sobre o pagamento..."
              value={paymentNotes}
              onChange={(e) => setPaymentNotes(e.target.value)}
              rows={3}
            />
          </div>

          <div className="bg-muted p-4 rounded-lg">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Valor a pagar:</span>
              <span className="text-xl font-bold">R$ {period.net_amount.toFixed(2)}</span>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPaying}>
            Cancelar
          </Button>
          <Button onClick={handlePay} disabled={isPaying}>
            {isPaying && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Confirmar Pagamento
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
