import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UserX, Phone, CheckCircle2, Clock, XCircle, AlertTriangle, Link2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Visitor } from "@/hooks/useVisitors";
import { Client } from "@/hooks/useClients";
import { Button } from "@/components/ui/button";

// Helper function to normalize phone numbers for comparison
const normalizePhone = (phone: string): string => {
  if (!phone) return '';
  return phone.replace(/[^0-9]/g, '').replace(/^55/, '');
};

interface VisitorsListProps {
  visitors: Visitor[];
  clients: Client[];
  onConvertToClient?: (visitor: Visitor) => void;
  onAssociateToClient?: (visitor: Visitor, client: Client) => void;
}

export const VisitorsList = ({ visitors, clients, onConvertToClient, onAssociateToClient }: VisitorsListProps) => {
  // Find matching client for each visitor
  const findMatchingClient = (visitor: Visitor): Client | null => {
    const normalizedVisitorPhone = normalizePhone(visitor.visitor_phone);
    return clients.find(client => 
      normalizePhone(client.phone) === normalizedVisitorPhone
    ) || null;
  };

  if (visitors.length === 0) {
    return null;
  }

  return (
    <Card className="border-orange-200 bg-orange-50/30">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-orange-900">
          <UserX className="w-5 h-5 text-orange-600" />
          Clientes Visitantes ({visitors.length})
        </CardTitle>
        <p className="text-sm text-orange-700">
          Pessoas que fizeram agendamentos sem cadastro no sistema
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {visitors.map((visitor) => {
            const matchingClient = findMatchingClient(visitor);
            
            return (
              <div
                key={visitor.visitor_phone}
                className="flex items-start justify-between p-4 bg-white border border-orange-200 rounded-lg hover:shadow-md transition-all"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-medium text-gray-900">
                      {visitor.visitor_name}
                    </h3>
                    <Badge variant="outline" className="bg-orange-100 text-orange-800 border-orange-300">
                      <UserX className="w-3 h-3 mr-1" />
                      Visitante
                    </Badge>
                  </div>

                  {visitor.variant_names.length > 0 && (
                    <div className="mb-2 p-2 bg-amber-50 border border-amber-300 rounded">
                      <p className="text-xs font-semibold text-amber-800 mb-1 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        Também usou os nomes:
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {visitor.variant_names.slice(0, 5).map((name, idx) => (
                          <Badge 
                            key={idx} 
                            variant="secondary" 
                            className="text-xs bg-amber-100 text-amber-900"
                          >
                            {name}
                          </Badge>
                        ))}
                        {visitor.variant_names.length > 5 && (
                          <Badge variant="secondary" className="text-xs bg-amber-100 text-amber-900">
                            +{visitor.variant_names.length - 5} mais
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-4 text-sm text-gray-600 mb-2">
                    <div className="flex items-center gap-1">
                      <Phone className="w-3 h-3" />
                      {visitor.visitor_phone}
                    </div>
                    {visitor.variant_phones.length > 0 && (
                      <span className="text-xs text-gray-500">
                        ({visitor.variant_phones.length} variações)
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-4 text-xs text-gray-500 mb-2">
                    <span>
                      Primeira visita: {format(new Date(visitor.first_appointment_date), "dd/MM/yyyy", { locale: ptBR })}
                    </span>
                    <span>•</span>
                    <span>
                      Última: {visitor.days_since_last_visit === 0 ? 'Hoje' : 
                              visitor.days_since_last_visit === 1 ? 'Ontem' :
                              `${visitor.days_since_last_visit} dias atrás`}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-1">
                    {visitor.confirmed_appointments > 0 && (
                      <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-300">
                        <CheckCircle2 className="w-3 h-3 mr-1" />
                        {visitor.confirmed_appointments} confirmado{visitor.confirmed_appointments > 1 ? 's' : ''}
                      </Badge>
                    )}
                    {visitor.pending_appointments > 0 && (
                      <Badge variant="outline" className="text-xs bg-yellow-50 text-yellow-700 border-yellow-300">
                        <Clock className="w-3 h-3 mr-1" />
                        {visitor.pending_appointments} pendente{visitor.pending_appointments > 1 ? 's' : ''}
                      </Badge>
                    )}
                    {visitor.cancelled_appointments > 0 && (
                      <Badge variant="outline" className="text-xs bg-red-50 text-red-700 border-red-300">
                        <XCircle className="w-3 h-3 mr-1" />
                        {visitor.cancelled_appointments} cancelado{visitor.cancelled_appointments > 1 ? 's' : ''}
                      </Badge>
                    )}
                    {visitor.no_show_appointments > 0 && (
                      <Badge variant="outline" className="text-xs bg-gray-50 text-gray-700 border-gray-300">
                        {visitor.no_show_appointments} no-show
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Botões de Ação */}
                <div className="ml-4 flex flex-col gap-2">
                  {matchingClient ? (
                    <>
                      {/* Cliente Existente Encontrado */}
                      <div className="mb-2 p-2 bg-blue-50 border border-blue-200 rounded text-xs">
                        <p className="font-semibold text-blue-800 flex items-center gap-1 mb-1">
                          <Link2 className="w-3 h-3" />
                          Cliente cadastrado encontrado:
                        </p>
                        <p className="text-blue-700">{matchingClient.name}</p>
                      </div>
                      
                      <Button
                        size="sm"
                        onClick={() => onAssociateToClient?.(visitor, matchingClient)}
                        className="bg-green-600 hover:bg-green-700 text-white border-0 whitespace-nowrap"
                      >
                        <Link2 className="w-3 h-3 mr-1" />
                        Associar a Cliente
                      </Button>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onConvertToClient?.(visitor)}
                        className="border-blue-300 text-blue-700 hover:bg-blue-50 whitespace-nowrap"
                      >
                        Cadastrar Novo
                      </Button>
                    </>
                  ) : (
                    <Button
                      size="sm"
                      onClick={() => onConvertToClient?.(visitor)}
                      className="bg-blue-600 hover:bg-blue-700 text-white border-0 whitespace-nowrap"
                    >
                      Cadastrar Cliente
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};
