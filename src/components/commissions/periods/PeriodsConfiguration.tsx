import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { useCommissionSettings } from "@/hooks/useCommissionSettings";
import { Settings, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";

interface PeriodsConfigurationProps {
  barbershopId: string;
}

export const PeriodsConfiguration = ({ barbershopId }: PeriodsConfigurationProps) => {
  const { settings, isLoading, updateSettings, isUpdating } = useCommissionSettings(barbershopId);
  
  const [periodType, setPeriodType] = useState<'weekly' | 'monthly'>('weekly');
  const [autoGenerate, setAutoGenerate] = useState(true);
  const [closeDay, setCloseDay] = useState<number>(1);

  useEffect(() => {
    if (settings) {
      setPeriodType(settings.default_period_type === 'monthly' ? 'monthly' : 'weekly');
      setAutoGenerate(settings.auto_generate_periods);
      setCloseDay(settings.default_period_type === 'weekly' 
        ? (settings.weekly_close_day || 1) 
        : (settings.monthly_close_day || 1)
      );
    }
  }, [settings]);

  const handleSave = () => {
    updateSettings({
      default_period_type: periodType,
      auto_generate_periods: autoGenerate,
      weekly_close_day: periodType === 'weekly' ? closeDay : null,
      monthly_close_day: periodType === 'monthly' ? closeDay : null,
    });
  };

  const weekDays = [
    { value: 1, label: 'Segunda-feira' },
    { value: 2, label: 'Terça-feira' },
    { value: 3, label: 'Quarta-feira' },
    { value: 4, label: 'Quinta-feira' },
    { value: 5, label: 'Sexta-feira' },
    { value: 6, label: 'Sábado' },
    { value: 0, label: 'Domingo' },
  ];

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Configurações de Pagamento Periódico
        </CardTitle>
        <CardDescription>
          Configure como os períodos de comissão serão gerados automaticamente
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Intervalo de Pagamento</Label>
            <Select value={periodType} onValueChange={(value: 'weekly' | 'monthly') => setPeriodType(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="weekly">Semanal (7 dias)</SelectItem>
                <SelectItem value="monthly">Mensal</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>{periodType === 'weekly' ? 'Dia da Semana' : 'Dia do Mês'}</Label>
            {periodType === 'weekly' ? (
              <Select value={closeDay.toString()} onValueChange={(value) => setCloseDay(parseInt(value))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {weekDays.map((day) => (
                    <SelectItem key={day.value} value={day.value.toString()}>
                      {day.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Select value={closeDay.toString()} onValueChange={(value) => setCloseDay(parseInt(value))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 28 }, (_, i) => i + 1).map((day) => (
                    <SelectItem key={day} value={day.toString()}>
                      Dia {day}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>Auto-geração de Períodos</Label>
            <p className="text-sm text-muted-foreground">
              Criar períodos automaticamente no dia configurado
            </p>
          </div>
          <Switch checked={autoGenerate} onCheckedChange={setAutoGenerate} />
        </div>

        <Button onClick={handleSave} disabled={isUpdating} className="w-full">
          {isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Salvar Configurações
        </Button>
      </CardContent>
    </Card>
  );
};
