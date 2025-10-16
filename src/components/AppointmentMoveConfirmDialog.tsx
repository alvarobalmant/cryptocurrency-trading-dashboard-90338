import React from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Clock, User, Calendar } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface AppointmentMoveConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  appointment?: any;
  oldEmployee?: string;
  newEmployee?: string;
  oldTime?: string;
  newTime?: string;
  oldDate?: string;
  newDate?: string;
}

export const AppointmentMoveConfirmDialog: React.FC<AppointmentMoveConfirmDialogProps> = ({
  open,
  onOpenChange,
  onConfirm,
  appointment,
  oldEmployee,
  newEmployee,
  oldTime,
  newTime,
  oldDate,
  newDate
}) => {
  if (!appointment) return null;

  const hasEmployeeChange = oldEmployee !== newEmployee;
  const hasTimeChange = oldTime !== newTime;
  const hasDateChange = oldDate !== newDate;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Confirmar alteração de agendamento</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-4">
              <div>
                <p className="font-medium text-gray-900 mb-2">Cliente: {appointment.client_name}</p>
                <p className="text-sm text-gray-600">Serviço: {appointment.services?.name || 'N/A'}</p>
              </div>

              <div className="space-y-3 border-t pt-3">
                {hasEmployeeChange && (
                  <div className="flex items-start gap-3">
                    <User className="h-5 w-5 text-blue-600 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-700">Profissional</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="bg-red-50 text-red-700">
                          {oldEmployee}
                        </Badge>
                        <span className="text-gray-400">→</span>
                        <Badge variant="outline" className="bg-green-50 text-green-700">
                          {newEmployee}
                        </Badge>
                      </div>
                    </div>
                  </div>
                )}

                {hasTimeChange && (
                  <div className="flex items-start gap-3">
                    <Clock className="h-5 w-5 text-blue-600 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-700">Horário</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="bg-red-50 text-red-700">
                          {oldTime}
                        </Badge>
                        <span className="text-gray-400">→</span>
                        <Badge variant="outline" className="bg-green-50 text-green-700">
                          {newTime}
                        </Badge>
                      </div>
                    </div>
                  </div>
                )}

                {hasDateChange && (
                  <div className="flex items-start gap-3">
                    <Calendar className="h-5 w-5 text-blue-600 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-700">Data</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="bg-red-50 text-red-700">
                          {oldDate}
                        </Badge>
                        <span className="text-gray-400">→</span>
                        <Badge variant="outline" className="bg-green-50 text-green-700">
                          {newDate}
                        </Badge>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <p className="text-sm text-gray-600 bg-amber-50 border border-amber-200 rounded p-3">
                ⚠️ Esta ação irá mover o agendamento. Confirme se deseja continuar.
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} className="bg-blue-600 hover:bg-blue-700">
            Confirmar alteração
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
