import React from 'react';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, User, AlertTriangle, X, Scissors, ArrowRight } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ConflictingAppointment {
  id: string;
  client_name: string;
  start_time: string;
  end_time: string;
  appointment_date: string;
  services?: {
    name: string;
    duration_minutes: number;
  };
}

interface AppointmentConflictDialogProps {
  isOpen: boolean;
  onClose: () => void;
  conflictingAppointment: ConflictingAppointment | null;
  newAppointmentTime: string;
  newAppointmentDate: string;
  newAppointmentDuration: number;
  onCancelConflicting: () => void;
  onReduceDuration: () => void;
  onMoveConflicting: () => void;
}

export const AppointmentConflictDialog: React.FC<AppointmentConflictDialogProps> = ({
  isOpen,
  onClose,
  conflictingAppointment,
  newAppointmentTime,
  newAppointmentDate,
  newAppointmentDuration,
  onCancelConflicting,
  onReduceDuration,
  onMoveConflicting,
}) => {
  if (!conflictingAppointment) return null;

  const calculateNewEndTime = () => {
    const [hours, minutes] = newAppointmentTime.split(':').map(Number);
    const conflictStartMinutes = parseInt(conflictingAppointment.start_time.split(':')[0]) * 60 + 
                                  parseInt(conflictingAppointment.start_time.split(':')[1]);
    const newStartMinutes = hours * 60 + minutes;
    const maxDuration = conflictStartMinutes - newStartMinutes;
    
    const endMinutes = newStartMinutes + maxDuration;
    const endHours = Math.floor(endMinutes / 60);
    const endMins = endMinutes % 60;
    
    return `${endHours.toString().padStart(2, '0')}:${endMins.toString().padStart(2, '0')}`;
  };

  const calculateMovedTime = () => {
    const [hours, minutes] = newAppointmentTime.split(':').map(Number);
    const startMinutes = hours * 60 + minutes;
    const endMinutes = startMinutes + newAppointmentDuration;
    const endHours = Math.floor(endMinutes / 60);
    const endMins = endMinutes % 60;
    
    return `${endHours.toString().padStart(2, '0')}:${endMins.toString().padStart(2, '0')}`;
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent className="max-w-2xl">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-orange-600">
            <AlertTriangle className="h-5 w-5" />
            Conflito de Horário Detectado
          </AlertDialogTitle>
          <AlertDialogDescription className="text-base">
            O horário escolhido entra em conflito com um agendamento existente.
          </AlertDialogDescription>
        </AlertDialogHeader>

        {/* Conflicting Appointment Details */}
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 space-y-2">
          <h4 className="font-semibold text-gray-900 flex items-center gap-2">
            <User className="h-4 w-4" />
            Agendamento Existente
          </h4>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="flex items-center gap-2 text-gray-700">
              <User className="h-3 w-3" />
              <span className="font-medium">{conflictingAppointment.client_name}</span>
            </div>
            <div className="flex items-center gap-2 text-gray-700">
              <Calendar className="h-3 w-3" />
              <span>{format(parseISO(conflictingAppointment.appointment_date), 'dd/MM/yyyy', { locale: ptBR })}</span>
            </div>
            <div className="flex items-center gap-2 text-gray-700">
              <Clock className="h-3 w-3" />
              <span>{conflictingAppointment.start_time.substring(0, 5)} - {conflictingAppointment.end_time.substring(0, 5)}</span>
            </div>
            {conflictingAppointment.services && (
              <div className="flex items-center gap-2 text-gray-700">
                <Scissors className="h-3 w-3" />
                <span>{conflictingAppointment.services.name}</span>
              </div>
            )}
          </div>
        </div>

        {/* Resolution Options */}
        <div className="space-y-3">
          <h4 className="font-semibold text-gray-900">Como deseja resolver?</h4>
          
          {/* Option 1: Cancel conflicting */}
          <Button
            variant="outline"
            className="w-full justify-start text-left h-auto py-4 hover:bg-red-50 hover:border-red-300"
            onClick={() => {
              onCancelConflicting();
              onClose();
            }}
          >
            <div className="flex items-start gap-3 w-full">
              <X className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <div className="font-semibold text-gray-900">Cancelar agendamento existente</div>
                <div className="text-sm text-gray-600">
                  O agendamento de {conflictingAppointment.client_name} será cancelado
                </div>
              </div>
            </div>
          </Button>

          {/* Option 2: Reduce duration */}
          <Button
            variant="outline"
            className="w-full justify-start text-left h-auto py-4 hover:bg-blue-50 hover:border-blue-300"
            onClick={() => {
              onReduceDuration();
              onClose();
            }}
          >
            <div className="flex items-start gap-3 w-full">
              <Scissors className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <div className="font-semibold text-gray-900">Reduzir duração do novo agendamento</div>
                <div className="text-sm text-gray-600">
                  Terminar às {calculateNewEndTime()} para não conflitar
                </div>
              </div>
            </div>
          </Button>

          {/* Option 3: Move conflicting */}
          <Button
            variant="outline"
            className="w-full justify-start text-left h-auto py-4 hover:bg-green-50 hover:border-green-300"
            onClick={() => {
              onMoveConflicting();
              onClose();
            }}
          >
            <div className="flex items-start gap-3 w-full">
              <ArrowRight className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <div className="font-semibold text-gray-900">Mover agendamento existente</div>
                <div className="text-sm text-gray-600">
                  Reagendar {conflictingAppointment.client_name} para {calculateMovedTime()}
                </div>
              </div>
            </div>
          </Button>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar tudo</AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
