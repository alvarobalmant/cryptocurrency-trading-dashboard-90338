import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCommissionTransactions } from "@/hooks/useCommissionTransactions";

interface PayCommissionDialogProps {
  transactionId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const PayCommissionDialog = ({ transactionId, open, onOpenChange }: PayCommissionDialogProps) => {
  const [paymentMethod, setPaymentMethod] = useState<string>("cash");
  const [paymentNotes, setPaymentNotes] = useState<string>("");
  const { markAsPaid, isMarkingAsPaid } = useCommissionTransactions("", undefined, undefined);

  const handleSubmit = () => {
    markAsPaid(
      {
        transactionId,
        paymentMethod,
        paymentNotes: paymentNotes || undefined,
      },
      {
        onSuccess: () => {
          onOpenChange(false);
          setPaymentMethod("cash");
          setPaymentNotes("");
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Registrar Pagamento de Comissão</DialogTitle>
          <DialogDescription>
            Informe os detalhes do pagamento da comissão ao funcionário.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="payment-method">Forma de Pagamento</Label>
            <Select value={paymentMethod} onValueChange={setPaymentMethod}>
              <SelectTrigger id="payment-method">
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">Dinheiro</SelectItem>
                <SelectItem value="pix">PIX</SelectItem>
                <SelectItem value="bank_transfer">Transferência Bancária</SelectItem>
                <SelectItem value="check">Cheque</SelectItem>
                <SelectItem value="other">Outro</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="payment-notes">Observações (opcional)</Label>
            <Textarea
              id="payment-notes"
              placeholder="Adicione informações adicionais sobre o pagamento..."
              value={paymentNotes}
              onChange={(e) => setPaymentNotes(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isMarkingAsPaid}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={isMarkingAsPaid}>
            {isMarkingAsPaid ? "Processando..." : "Confirmar Pagamento"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
