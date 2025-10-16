import { useParams } from "react-router-dom";
import { CommissionsOverview } from "@/components/commissions/CommissionsOverview";
import { CommissionsTable } from "@/components/commissions/CommissionsTable";

const BarbershopCommissions = () => {
  const { barbershopId } = useParams<{ barbershopId: string }>();

  if (!barbershopId) {
    return <div>ID da barbearia não encontrado</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Comissões</h1>
        <p className="text-muted-foreground">
          Gerencie as comissões dos funcionários da sua barbearia
        </p>
      </div>

      <CommissionsOverview barbershopId={barbershopId} />
      <CommissionsTable barbershopId={barbershopId} />
    </div>
  );
};

export default BarbershopCommissions;
