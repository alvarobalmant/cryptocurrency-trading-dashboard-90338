import { useParams } from "react-router-dom";
import { PeriodsConfiguration } from "@/components/commissions/periods/PeriodsConfiguration";
import { PeriodsOverview } from "@/components/commissions/periods/PeriodsOverview";
import { PeriodsTable } from "@/components/commissions/periods/PeriodsTable";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useCommissionSettings } from "@/hooks/useCommissionSettings";
import { useCommissionPeriods } from "@/hooks/useCommissionPeriods";
import { Calendar, Loader2, RefreshCw } from "lucide-react";

const BarbershopCommissionPeriods = () => {
  const { barbershopId } = useParams<{ barbershopId: string }>();

  if (!barbershopId) {
    return <div>ID da barbearia não encontrado</div>;
  }

  const { generatePeriodsNow, isGenerating } = useCommissionSettings(barbershopId);
  const { periods } = useCommissionPeriods(barbershopId);
  
  const processingPeriods = periods.filter(p => 
    p.status === 'pending_signature' || p.status === 'draft'
  );
  const paidPeriods = periods.filter(p => p.status === 'paid');

  return (
    <div className="container mx-auto p-4 md:p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-primary/10">
              <Calendar className="h-6 w-6 text-primary" />
            </div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
              Comissões Periódicas
            </h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Gerencie e acompanhe os períodos de comissão dos funcionários
          </p>
        </div>
        <Button 
          onClick={() => generatePeriodsNow()} 
          disabled={isGenerating}
          size="lg"
          className="w-full md:w-auto"
        >
          {isGenerating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Gerando...
            </>
          ) : (
            <>
              <RefreshCw className="mr-2 h-4 w-4" />
              Gerar Períodos
            </>
          )}
        </Button>
      </div>

      {/* Configuration */}
      <PeriodsConfiguration barbershopId={barbershopId} />

      {/* Overview Cards */}
      <PeriodsOverview barbershopId={barbershopId} />
      
      {/* Periods Tables */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Processing Periods */}
        <Card className="overflow-hidden">
          <div className="bg-muted/50 px-6 py-4 border-b">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-lg">Em Processamento</h3>
                <p className="text-sm text-muted-foreground">
                  Períodos aguardando pagamento
                </p>
              </div>
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-warning/10 text-warning font-bold">
                {processingPeriods.length}
              </div>
            </div>
          </div>
          <div className="p-6">
            <PeriodsTable barbershopId={barbershopId} statusFilter="pending_signature" compact />
          </div>
        </Card>

        {/* Paid Periods */}
        <Card className="overflow-hidden">
          <div className="bg-muted/50 px-6 py-4 border-b">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-lg">Pagos</h3>
                <p className="text-sm text-muted-foreground">
                  Períodos já quitados
                </p>
              </div>
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-success/10 text-success font-bold">
                {paidPeriods.length}
              </div>
            </div>
          </div>
          <div className="p-6">
            <PeriodsTable barbershopId={barbershopId} statusFilter="paid" compact />
          </div>
        </Card>
      </div>

      {/* All Periods */}
      <Card className="overflow-hidden">
        <div className="bg-muted/50 px-6 py-4 border-b">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-lg">Todos os Períodos</h3>
              <p className="text-sm text-muted-foreground">
                Histórico completo de comissões
              </p>
            </div>
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 text-primary font-bold">
              {periods.length}
            </div>
          </div>
        </div>
        <div className="p-6">
          <PeriodsTable barbershopId={barbershopId} />
        </div>
      </Card>
    </div>
  );
};

export default BarbershopCommissionPeriods;
