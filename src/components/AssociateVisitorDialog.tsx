import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Link2, User, Phone, AlertTriangle, CheckCircle2, Clock, XCircle } from "lucide-react";
import { Visitor } from "@/hooks/useVisitors";
import { Client } from "@/hooks/useClients";

interface AssociateVisitorDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  visitor: Visitor | null;
  client: Client | null;
  isLoading?: boolean;
}

export const AssociateVisitorDialog = ({
  isOpen,
  onClose,
  onConfirm,
  visitor,
  client,
  isLoading = false
}: AssociateVisitorDialogProps) => {
  if (!visitor || !client) return null;

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent className="max-w-2xl">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-xl font-semibold text-gray-900 flex items-center gap-2">
            <Link2 className="w-5 h-5 text-blue-600" />
            Associar Visitante a Cliente Existente
          </AlertDialogTitle>
          <AlertDialogDescription className="text-gray-600">
            Confirme a associação do visitante ao cliente cadastrado. Todos os agendamentos do visitante serão vinculados ao cliente.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-6 py-4">
          {/* Visitante */}
          <div className="border border-orange-200 rounded-lg p-4 bg-orange-50">
            <div className="flex items-center gap-2 mb-3">
              <Badge variant="outline" className="bg-orange-100 text-orange-800 border-orange-300">
                <AlertTriangle className="w-3 h-3 mr-1" />
                Visitante (não cadastrado)
              </Badge>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-gray-500" />
                <span className="font-medium text-gray-900">{visitor.visitor_name}</span>
              </div>
              
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-gray-500" />
                <span className="text-gray-700">{visitor.visitor_phone}</span>
              </div>

              {visitor.variant_names.length > 0 && (
                <div className="mt-2 pt-2 border-t border-orange-200">
                  <p className="text-xs font-semibold text-orange-800 mb-1">
                    Também usou os nomes:
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {visitor.variant_names.map((name, idx) => (
                      <Badge key={idx} variant="secondary" className="text-xs bg-amber-100 text-amber-900">
                        {name}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-3 pt-3 border-t border-orange-200">
                <p className="text-sm font-medium text-gray-700 mb-2">Agendamentos do visitante:</p>
                <div className="flex flex-wrap gap-2">
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
                  <Badge variant="outline" className="text-xs bg-gray-50 text-gray-700 border-gray-300">
                    Total: {visitor.total_appointments}
                  </Badge>
                </div>
              </div>
            </div>
          </div>

          {/* Seta indicando associação */}
          <div className="flex justify-center">
            <div className="flex items-center gap-2 text-blue-600">
              <div className="h-px w-20 bg-blue-300"></div>
              <Link2 className="w-5 h-5" />
              <div className="h-px w-20 bg-blue-300"></div>
            </div>
          </div>

          {/* Cliente Cadastrado */}
          <div className="border border-green-200 rounded-lg p-4 bg-green-50">
            <div className="flex items-center gap-2 mb-3">
              <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300">
                <CheckCircle2 className="w-3 h-3 mr-1" />
                Cliente Cadastrado
              </Badge>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-gray-500" />
                <span className="font-medium text-gray-900">{client.name}</span>
              </div>
              
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-gray-500" />
                <span className="text-gray-700">{client.phone}</span>
              </div>

              {client.notes && (
                <div className="mt-2 pt-2 border-t border-green-200">
                  <p className="text-xs text-gray-600">{client.notes}</p>
                </div>
              )}
            </div>
          </div>

          {/* Aviso importante */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex gap-3">
              <AlertTriangle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-900">
                <p className="font-semibold mb-1">O que acontecerá:</p>
                <ul className="list-disc list-inside space-y-1 text-blue-800">
                  <li>Todos os {visitor.total_appointments} agendamento{visitor.total_appointments > 1 ? 's' : ''} do visitante serão vinculados ao cliente <strong>{client.name}</strong></li>
                  <li>Os dados do cliente cadastrado serão mantidos</li>
                  <li>O histórico completo ficará unificado</li>
                  <li>Esta ação não pode ser desfeita automaticamente</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel 
            disabled={isLoading}
            className="border-gray-300 text-gray-700 hover:bg-gray-50"
          >
            Cancelar
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isLoading}
            className="bg-green-600 hover:bg-green-700 text-white border-0"
          >
            {isLoading ? (
              <>
                <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Associando...
              </>
            ) : (
              <>
                <Link2 className="w-4 h-4 mr-2" />
                Confirmar Associação
              </>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
