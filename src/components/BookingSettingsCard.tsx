import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useBarbershops } from '@/hooks/useBarbershops';
import { Folder, Settings } from 'lucide-react';

interface BookingSettingsCardProps {
  barbershopId: string;
  currentSettings: {
    show_categories_in_booking?: boolean;
  };
}

export const BookingSettingsCard = ({ barbershopId, currentSettings }: BookingSettingsCardProps) => {
  const [showCategoriesInBooking, setShowCategoriesInBooking] = useState(
    currentSettings.show_categories_in_booking || false
  );
  const [isUpdating, setIsUpdating] = useState(false);
  const { updateBarbershop } = useBarbershops();
  const { toast } = useToast();

  const handleToggleCategoriesInBooking = async (checked: boolean) => {
    setIsUpdating(true);
    try {
      await updateBarbershop(barbershopId, {
        show_categories_in_booking: checked,
      });
      setShowCategoriesInBooking(checked);
      toast({
        title: 'Configuração atualizada!',
        description: checked 
          ? 'Pastas serão exibidas no agendamento.' 
          : 'Pastas não serão exibidas no agendamento.',
      });
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Configurações de Agendamento
        </CardTitle>
        <CardDescription>
          Configure como os serviços serão exibidos para os clientes durante o agendamento.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Folder className="h-4 w-4" />
              <Label htmlFor="show-categories">Mostrar pastas no agendamento</Label>
            </div>
            <p className="text-sm text-muted-foreground">
              Quando ativado, clientes escolherão primeiro uma pasta, depois os serviços.
              Quando desativado, todos os serviços são mostrados diretamente.
            </p>
          </div>
          <Switch
            id="show-categories"
            checked={showCategoriesInBooking}
            onCheckedChange={handleToggleCategoriesInBooking}
            disabled={isUpdating}
          />
        </div>
      </CardContent>
    </Card>
  );
};