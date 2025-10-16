import React, { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DndContext, DragEndEvent, MouseSensor, TouchSensor, useSensor, useSensors, PointerSensor, closestCenter, MeasuringStrategy } from '@dnd-kit/core';
import { DraggableAppointmentBlock } from './DraggableAppointmentBlock';
import { DroppableTimeSlot } from './DroppableTimeSlot';
import { AppointmentMoveConfirmDialog } from './AppointmentMoveConfirmDialog';
import { AppointmentConflictDialog } from './AppointmentConflictDialog';
import AgendaSidebar from './AgendaSidebar';
import { ClientSelectorModal } from './ClientSelectorModal';
import NewAppointmentForm from './NewAppointmentForm';
import { CreatePixPayment } from '@/components/CreatePixPayment';
import { CreatePointPayment } from '@/components/CreatePointPayment';
import CreateWalkInPayment from '@/components/CreateWalkInPayment';
import { PaymentStatusBadge } from '@/utils/paymentStatus';
import { 
  useScheduleExceptions, 
  ExceptionEditingState, 
  ScheduleException,
  generateSlotsFromSchedule,
  groupContiguousSlots,
  TimeSlot as ExceptionTimeSlot
} from '@/hooks/useScheduleExceptions';
import { ScheduleExceptionToolbar } from './ScheduleExceptionToolbar';
import { 
  Calendar,
  ChevronLeft, 
  ChevronRight, 
  Plus,
  Clock,
  User,
  Scissors,
  MoreHorizontal,
  Filter,
  CalendarDays,
  Star,
  Phone,
  UserCheck,
  Users,
  CreditCard,
  QrCode,
  Maximize,
  Minimize,
  ZoomIn,
  ZoomOut,
  Move,
  RefreshCw
} from 'lucide-react';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from '@/components/ui/alert-dialog';
import { useEmployees } from '@/hooks/useEmployees';
import { useServices } from '@/hooks/useServices';
import { useAppointments } from '@/hooks/useAppointments';
import { useClientDetails } from '@/hooks/useClientDetails';
import { useToast } from '@/hooks/use-toast';
import { format, addDays, subDays, startOfWeek, addWeeks, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { 
  getAgendaContainerClasses,
  getTimelineContainerClasses,
  getTimelineGridClasses,
  getTimelineHeaderClasses,
  getTimelineColumnsClasses,
  getTimeColumnClasses,
  getEmployeeColumnClasses,
  getTimeSlotClasses,
  getEmployeeSlotClasses
} from '@/utils/agendaMode';

interface AgendaViewProps {
  barbershopId: string;
  appointments: any[];
  onAppointmentCreate?: () => void;
  onAppointmentUpdate?: () => void;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
}

interface TimeSlot {
  time: string;
  hour: number;
  minute: number;
}

const AgendaView: React.FC<AgendaViewProps> = ({
  barbershopId,
  appointments,
  onAppointmentCreate,
  onAppointmentUpdate,
  isFullscreen = false,
  onToggleFullscreen
}) => {
  console.log('🔄 AgendaView rendered with appointments:', appointments);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [currentWeek, setCurrentWeek] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [showNewAppointmentDialog, setShowNewAppointmentDialog] = useState(false);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<{ time: string; employeeId: string } | null>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [appointmentToCancel, setAppointmentToCancel] = useState<string | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [appointmentToEdit, setAppointmentToEdit] = useState<any | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [showClientSelector, setShowClientSelector] = useState(false);
  const [showClientTypeSelection, setShowClientTypeSelection] = useState(false);
  const [isVisitorClient, setIsVisitorClient] = useState(false);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [selectedAppointmentForPayment, setSelectedAppointmentForPayment] = useState<any | null>(null);
  const [paymentTab, setPaymentTab] = useState('pix');
  const [editFormData, setEditFormData] = useState({
    client_name: '',
    client_phone: '',
    service_id: '',
    employee_id: '',
    appointment_date: '',
    start_time: '',
    end_time: '',
    status: '',
    notes: ''
  });
  const [zoomLevel, setZoomLevel] = useState(1);
  const [scrollPosition, setScrollPosition] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0, scrollLeft: 0, scrollTop: 0 });
  const [pendingUpdates, setPendingUpdates] = useState(0);
  
  // Exception mode states - MULTI-EMPLOYEE SYSTEM
  const [isExceptionMode, setIsExceptionMode] = useState(false);
  const [exceptionEditing, setExceptionEditing] = useState<Record<string, {
    baseSlots: string[];
    blockedSlots: Set<string>;
  }>>({});
  const [isDraggingException, setIsDraggingException] = useState(false);
  const [isDraggingToBlock, setIsDraggingToBlock] = useState<boolean>(true);
  
  // Drag and drop states
  const [showMoveConfirmDialog, setShowMoveConfirmDialog] = useState(false);
  const [pendingMove, setPendingMove] = useState<{
    appointmentId: string;
    appointment: any;
    newEmployeeId: string;
    newStartTime: string;
    newDate: string;
    oldEmployeeName: string;
    newEmployeeName: string;
  } | null>(null);

  // Conflict resolution states
  const [showConflictDialog, setShowConflictDialog] = useState(false);
  const [conflictData, setConflictData] = useState<{
    conflictingAppointment: any;
    newAppointmentTime: string;
    newAppointmentDate: string;
    newAppointmentDuration: number;
    pendingAction: 'move' | 'create';
    moveData?: any;
  } | null>(null);

  const { employees, loading: employeesLoading } = useEmployees(barbershopId);
  const { services, loading: servicesLoading } = useServices(barbershopId);
  const { updateAppointmentStatus } = useAppointments(barbershopId);
  const { clientDetails, loading: clientLoading } = useClientDetails(editFormData.client_phone, barbershopId);
  const { toast } = useToast();
  
  // Schedule exceptions hook
  const dateStr = format(selectedDate, 'yyyy-MM-dd');
  const { 
    exceptions, 
    isLoading: exceptionsLoading, 
    saveExceptions, 
    isSaving,
    getExceptionForEmployee
  } = useScheduleExceptions(barbershopId, dateStr);

  // Setup realtime subscription for new appointments
  useEffect(() => {
    console.log('🔔 Setting up realtime subscription for appointments');
    
    const channel = supabase
      .channel('agenda-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'appointments',
          filter: `barbershop_id=eq.${barbershopId}`
        },
        (payload) => {
          console.log('🔔 Appointment change detected:', payload);
          setPendingUpdates(prev => prev + 1);
        }
      )
      .subscribe();

    return () => {
      console.log('🔕 Cleaning up realtime subscription');
      supabase.removeChannel(channel);
    };
  }, [barbershopId]);

  // Setup realtime subscription for employee_breaks
  useEffect(() => {
    const breaksChannel = supabase
      .channel('breaks-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'employee_breaks',
        },
        (payload) => {
          console.log('🔔 Employee break change detected:', payload);
          setPendingUpdates(prev => prev + 1);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(breaksChannel);
    };
  }, [barbershopId]);

  const handleRefresh = () => {
    console.log('🔄 Refreshing appointments');
    setPendingUpdates(0);
    onAppointmentUpdate?.();
  };

  // Global mouseup listener para finalizar drag de exceções
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (isDraggingException) {
        setIsDraggingException(false);
      }
    };

    document.addEventListener('mouseup', handleGlobalMouseUp);
    return () => {
      document.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [isDraggingException]);

  // Configure DnD sensors - only activate when dragging appointment blocks, not for scroll
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Require 8px movement before activating drag
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 200, // Require 200ms press before activating
        tolerance: 5,
      },
    })
  );

  // Check for conflicts with existing appointments
  const checkForConflicts = (employeeId: string, date: string, startTime: string, endTime: string, excludeAppointmentId?: string) => {
    const startMinutes = parseInt(startTime.split(':')[0]) * 60 + parseInt(startTime.split(':')[1]);
    const endMinutes = parseInt(endTime.split(':')[0]) * 60 + parseInt(endTime.split(':')[1]);
    
    return filteredDayAppointments.find(apt => {
      if (apt.id === excludeAppointmentId) return false;
      if (apt.employee_id !== employeeId) return false;
      if (apt.appointment_date !== date) return false;
      if (apt.status === 'cancelled' || apt.status === 'no_show') return false;
      
      const aptStartMinutes = parseInt(apt.start_time.split(':')[0]) * 60 + parseInt(apt.start_time.split(':')[1]);
      const aptEndMinutes = parseInt(apt.end_time.split(':')[0]) * 60 + parseInt(apt.end_time.split(':')[1]);
      
      // Check for overlap
      return startMinutes < aptEndMinutes && endMinutes > aptStartMinutes;
    });
  };

  // Handle drag end - check for conflicts first
  const handleDragEnd = (event: DragEndEvent) => {
    if (isExceptionMode) {
      toast({
        title: 'Modo exceção ativo',
        description: 'Não é possível mover agendamentos enquanto estiver gerenciando exceções.',
        variant: 'destructive',
      });
      return;
    }
    
    const { active, over } = event;
    
    if (!over || !active.data.current) return;
    
    const appointmentData = active.data.current.appointment;
    const dropData = over.data.current;
    
    // Don't do anything if dropped on same position
    if (
      dropData.employeeId === appointmentData.employee_id &&
      dropData.time === appointmentData.start_time.substring(0, 5) &&
      dropData.date === appointmentData.appointment_date
    ) {
      return;
    }
    
    // Calculate new end time based on service duration
    const service = services?.find(s => s.id === appointmentData.service_id);
    const durationMinutes = service?.duration_minutes || 60;
    const [hours, minutes] = dropData.time.split(':').map(Number);
    const endDate = new Date(2000, 0, 1, hours, minutes + durationMinutes);
    const newEndTime = `${endDate.getHours().toString().padStart(2, '0')}:${endDate.getMinutes().toString().padStart(2, '0')}`;
    
    // Check for conflicts
    const conflict = checkForConflicts(
      dropData.employeeId, 
      dropData.date, 
      dropData.time, 
      newEndTime,
      appointmentData.id
    );
    
    if (conflict) {
      // Show conflict resolution dialog
      setConflictData({
        conflictingAppointment: conflict,
        newAppointmentTime: dropData.time,
        newAppointmentDate: dropData.date,
        newAppointmentDuration: durationMinutes,
        pendingAction: 'move',
        moveData: {
          appointmentId: appointmentData.id,
          appointment: appointmentData,
          newEmployeeId: dropData.employeeId,
          newStartTime: dropData.time + ':00',
          newDate: dropData.date
        }
      });
      setShowConflictDialog(true);
      return;
    }
    
    const oldEmployeeName = employees?.find(e => e.id === appointmentData.employee_id)?.name || 'N/A';
    const newEmployeeName = employees?.find(e => e.id === dropData.employeeId)?.name || 'N/A';
    
    // Show confirmation dialog
    setPendingMove({
      appointmentId: appointmentData.id,
      appointment: appointmentData,
      newEmployeeId: dropData.employeeId,
      newStartTime: dropData.time + ':00',
      newDate: dropData.date,
      oldEmployeeName,
      newEmployeeName
    });
    setShowMoveConfirmDialog(true);
  };

  // Conflict resolution handlers
  const handleCancelConflicting = async () => {
    if (!conflictData) return;

    try {
      await updateAppointmentStatus(conflictData.conflictingAppointment.id, 'cancelled');
      
      // Proceed with the original action
      if (conflictData.pendingAction === 'move' && conflictData.moveData) {
        await proceedWithMove(conflictData.moveData);
      }
      
      toast({
        title: 'Conflito resolvido',
        description: 'O agendamento conflitante foi cancelado.',
      });
    } catch (error) {
      console.error('Error cancelling conflicting appointment:', error);
      toast({
        title: 'Erro ao resolver conflito',
        description: 'Não foi possível cancelar o agendamento.',
        variant: 'destructive'
      });
    }
  };

  const handleReduceDuration = async () => {
    if (!conflictData || conflictData.pendingAction !== 'move' || !conflictData.moveData) return;

    try {
      // Calculate new end time to not conflict
      const conflictStartMinutes = parseInt(conflictData.conflictingAppointment.start_time.split(':')[0]) * 60 + 
                                    parseInt(conflictData.conflictingAppointment.start_time.split(':')[1]);
      const [newHours, newMinutes] = conflictData.newAppointmentTime.split(':').map(Number);
      const newStartMinutes = newHours * 60 + newMinutes;
      const reducedDuration = conflictStartMinutes - newStartMinutes;
      
      const endMinutes = newStartMinutes + reducedDuration;
      const endHours = Math.floor(endMinutes / 60);
      const endMins = endMinutes % 60;
      const newEndTime = `${endHours.toString().padStart(2, '0')}:${endMins.toString().padStart(2, '0')}:00`;

      await supabase
        .from('appointments')
        .update({
          employee_id: conflictData.moveData.newEmployeeId,
          start_time: conflictData.moveData.newStartTime,
          end_time: newEndTime,
          appointment_date: conflictData.moveData.newDate,
          updated_at: new Date().toISOString()
        })
        .eq('id', conflictData.moveData.appointmentId);

      toast({
        title: 'Agendamento ajustado',
        description: 'A duração foi reduzida para evitar conflito.',
      });

      onAppointmentUpdate?.();
    } catch (error) {
      console.error('Error reducing duration:', error);
      toast({
        title: 'Erro ao ajustar duração',
        description: 'Não foi possível ajustar o agendamento.',
        variant: 'destructive'
      });
    }
  };

  const handleMoveConflicting = async () => {
    if (!conflictData) return;

    try {
      // Calculate new time for conflicting appointment (after the new one ends)
      const [newHours, newMinutes] = conflictData.newAppointmentTime.split(':').map(Number);
      const newStartMinutes = newHours * 60 + newMinutes;
      const newEndMinutes = newStartMinutes + conflictData.newAppointmentDuration;
      
      const movedStartHours = Math.floor(newEndMinutes / 60);
      const movedStartMins = newEndMinutes % 60;
      const movedStartTime = `${movedStartHours.toString().padStart(2, '0')}:${movedStartMins.toString().padStart(2, '0')}:00`;
      
      // Calculate moved end time
      const conflictDuration = conflictData.conflictingAppointment.services?.duration_minutes || 60;
      const movedEndMinutes = newEndMinutes + conflictDuration;
      const movedEndHours = Math.floor(movedEndMinutes / 60);
      const movedEndMins = movedEndMinutes % 60;
      const movedEndTime = `${movedEndHours.toString().padStart(2, '0')}:${movedEndMins.toString().padStart(2, '0')}:00`;

      // Move the conflicting appointment
      await supabase
        .from('appointments')
        .update({
          start_time: movedStartTime,
          end_time: movedEndTime,
          updated_at: new Date().toISOString()
        })
        .eq('id', conflictData.conflictingAppointment.id);

      // Proceed with the original move
      if (conflictData.pendingAction === 'move' && conflictData.moveData) {
        await proceedWithMove(conflictData.moveData);
      }

      toast({
        title: 'Conflito resolvido',
        description: 'Os agendamentos foram reorganizados.',
      });
    } catch (error) {
      console.error('Error moving conflicting appointment:', error);
      toast({
        title: 'Erro ao reorganizar',
        description: 'Não foi possível mover o agendamento.',
        variant: 'destructive'
      });
    }
  };

  // Helper function to proceed with move after conflict resolution
  const proceedWithMove = async (moveData: any) => {
    const service = services?.find(s => s.id === moveData.appointment.service_id);
    const durationMinutes = service?.duration_minutes || 60;
    const [hours, minutes] = moveData.newStartTime.split(':').map(Number);
    const endDate = new Date(2000, 0, 1, hours, minutes + durationMinutes);
    const newEndTime = `${endDate.getHours().toString().padStart(2, '0')}:${endDate.getMinutes().toString().padStart(2, '0')}:00`;

    await supabase
      .from('appointments')
      .update({
        employee_id: moveData.newEmployeeId,
        start_time: moveData.newStartTime,
        end_time: newEndTime,
        appointment_date: moveData.newDate,
        updated_at: new Date().toISOString()
      })
      .eq('id', moveData.appointmentId);

    onAppointmentUpdate?.();
  };

  // Confirm move and update database
  const confirmMove = async () => {
    if (!pendingMove) return;

    try {
      const service = services?.find(s => s.id === pendingMove.appointment.service_id);
      const durationMinutes = service?.duration_minutes || 60;
      const [hours, minutes] = pendingMove.newStartTime.split(':').map(Number);
      const endDate = new Date(2000, 0, 1, hours, minutes + durationMinutes);
      const newEndTime = `${endDate.getHours().toString().padStart(2, '0')}:${endDate.getMinutes().toString().padStart(2, '0')}:00`;

      const { error } = await supabase
        .from('appointments')
        .update({
          employee_id: pendingMove.newEmployeeId,
          start_time: pendingMove.newStartTime,
          end_time: newEndTime,
          appointment_date: pendingMove.newDate,
          updated_at: new Date().toISOString()
        })
        .eq('id', pendingMove.appointmentId);

      if (error) throw error;

      toast({
        title: 'Agendamento movido!',
        description: 'O agendamento foi alterado com sucesso.',
      });

      // Notify parent to refetch
      onAppointmentUpdate?.();
      
      setShowMoveConfirmDialog(false);
      setPendingMove(null);
    } catch (error) {
      console.error('Error moving appointment:', error);
      toast({
        title: 'Erro ao mover agendamento',
        description: 'Não foi possível mover o agendamento. Tente novamente.',
        variant: 'destructive'
      });
    }
  };

  // Get active employees (MUST be before timeSlots)
  const activeEmployees = useMemo(() => {
    const allActive = employees?.filter(emp => emp.status === 'active') || [];
    if (selectedEmployee === 'all') {
      return allActive;
    }
    return allActive.filter(emp => emp.id === selectedEmployee);
  }, [employees, selectedEmployee]);

  // Helper function to generate default slots
  const generateDefaultSlots = (): TimeSlot[] => {
    const slots: TimeSlot[] = [];
    for (let hour = 8; hour <= 20; hour++) {
      for (let minute = 0; minute < 60; minute += 10) {
        if (hour === 20 && minute > 0) break;
        slots.push({
          time: `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`,
          hour,
          minute
        });
      }
    }
    return slots;
  };

  // Generate time slots dynamically based on employee schedules
  const timeSlots: TimeSlot[] = useMemo(() => {
    if (!employees || employees.length === 0) {
      return generateDefaultSlots();
    }

    const dayOfWeek = selectedDate.getDay();
    let earliestStart = '23:59';
    let latestEnd = '00:00';

    activeEmployees.forEach(employee => {
      const schedules = (employee as any).employee_schedules || [];
      const daySchedule = schedules.find((s: any) => s.day_of_week === dayOfWeek && s.is_active);
      
      if (daySchedule) {
        if (daySchedule.start_time < earliestStart) earliestStart = daySchedule.start_time;
        if (daySchedule.end_time > latestEnd) latestEnd = daySchedule.end_time;
      }
    });

    if (earliestStart === '23:59' || latestEnd === '00:00') {
      return generateDefaultSlots();
    }

    const startHour = parseInt(earliestStart.split(':')[0]);
    const startMinute = Math.floor(parseInt(earliestStart.split(':')[1]) / 10) * 10;

    const slots: TimeSlot[] = [];
    let currentHour = startHour;
    let currentMinute = startMinute;

    while (currentHour < 24) {
      slots.push({
        time: `${currentHour.toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')}`,
        hour: currentHour,
        minute: currentMinute
      });

      currentMinute += 10;
      if (currentMinute >= 60) {
        currentMinute = 0;
        currentHour++;
      }
    }

    return slots;
  }, [employees, activeEmployees, selectedDate]);

  // Verifica se um horário está em uma pausa do funcionário
  const isTimeInBreak = React.useCallback((time: string, employeeId: string): boolean => {
    const employee = activeEmployees.find(e => e.id === employeeId);
    if (!employee) return false;

    const breaks = (employee as any).employee_breaks || [];
    const dayOfWeek = selectedDate.getDay();
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    const timeMinutes = parseInt(time.split(':')[0]) * 60 + parseInt(time.split(':')[1]);

    // Verificar pausas do dia da semana ou da data específica
    const activeBreaks = breaks.filter((b: any) => {
      if (!b.is_active) return false;
      
      // Pausa para data específica
      if (b.specific_date && b.specific_date === dateStr) return true;
      
      // Pausa recorrente para dia da semana
      if (b.day_of_week === dayOfWeek) return true;
      
      return false;
    });

    // Verificar se o horário está dentro de alguma pausa
    return activeBreaks.some((breakItem: any) => {
      const breakStart = parseInt(breakItem.start_time.split(':')[0]) * 60 + parseInt(breakItem.start_time.split(':')[1]);
      const breakEnd = parseInt(breakItem.end_time.split(':')[0]) * 60 + parseInt(breakItem.end_time.split(':')[1]);
      return timeMinutes >= breakStart && timeMinutes < breakEnd;
    });
  }, [activeEmployees, selectedDate]);

  // Retorna o tipo de bloqueio de um slot
  const getSlotBlockType = React.useCallback((time: string, employeeId: string): 'break' | 'out-of-schedule' | 'exception' | null => {
    const employee = activeEmployees.find(e => e.id === employeeId);
    if (!employee) return null;

    const dayOfWeek = selectedDate.getDay();
    const timeMinutes = parseInt(time.split(':')[0]) * 60 + parseInt(time.split(':')[1]);

    // Verificar se está em uma exceção que bloqueia
    const exception = getExceptionForEmployee(employeeId);
    if (exception && exception.available_slots) {
      const isAvailable = exception.available_slots.some((slot: ExceptionTimeSlot) => {
        const slotStartMinutes = parseInt(slot.start.split(':')[0]) * 60 + parseInt(slot.start.split(':')[1]);
        const slotEndMinutes = parseInt(slot.end.split(':')[0]) * 60 + parseInt(slot.end.split(':')[1]);
        return timeMinutes >= slotStartMinutes && timeMinutes < slotEndMinutes;
      });
      if (!isAvailable) return 'exception';
    }

    // Verificar se está em pausa
    if (isTimeInBreak(time, employeeId)) {
      return 'break';
    }

    // Verificar se está fora do expediente
    const schedules = (employee as any).employee_schedules || [];
    const daySchedule = schedules.find((s: any) => s.day_of_week === dayOfWeek && s.is_active);
    
    if (!daySchedule) return 'out-of-schedule';

    const startMinutes = parseInt(daySchedule.start_time.split(':')[0]) * 60 + parseInt(daySchedule.start_time.split(':')[1]);
    const endMinutes = parseInt(daySchedule.end_time.split(':')[0]) * 60 + parseInt(daySchedule.end_time.split(':')[1]);

    if (timeMinutes < startMinutes || timeMinutes >= endMinutes) {
      return 'out-of-schedule';
    }

    return null; // Disponível
  }, [activeEmployees, selectedDate, getExceptionForEmployee, isTimeInBreak]);

  // Retorna informações da pausa para tooltip
  const getBreakInfo = React.useCallback((time: string, employeeId: string): string | null => {
    const employee = activeEmployees.find(e => e.id === employeeId);
    if (!employee) return null;

    const breaks = (employee as any).employee_breaks || [];
    const dayOfWeek = selectedDate.getDay();
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    const timeMinutes = parseInt(time.split(':')[0]) * 60 + parseInt(time.split(':')[1]);

    const activeBreak = breaks.find((b: any) => {
      if (!b.is_active) return false;
      
      const matchesDate = (b.specific_date && b.specific_date === dateStr) || b.day_of_week === dayOfWeek;
      if (!matchesDate) return false;

      const breakStart = parseInt(b.start_time.split(':')[0]) * 60 + parseInt(b.start_time.split(':')[1]);
      const breakEnd = parseInt(b.end_time.split(':')[0]) * 60 + parseInt(b.end_time.split(':')[1]);
      
      return timeMinutes >= breakStart && timeMinutes < breakEnd;
    });

    if (activeBreak) {
      return `${activeBreak.title} (${activeBreak.start_time.substring(0, 5)} - ${activeBreak.end_time.substring(0, 5)})`;
    }

    return null;
  }, [activeEmployees, selectedDate]);

  const isSlotAvailable = React.useCallback((time: string, employeeId: string): boolean => {
    const dayOfWeek = selectedDate.getDay();
    const employee = activeEmployees.find(e => e.id === employeeId);
    if (!employee) return false;

    const timeMinutes = parseInt(time.split(':')[0]) * 60 + parseInt(time.split(':')[1]);
    
    // PRIORIDADE 1: Se está em modo de exceção, usar estado de edição
    if (isExceptionMode && exceptionEditing[employeeId]) {
      // TODOS os slots são considerados parte da base
      // Disponibilidade = !bloqueado
      return !exceptionEditing[employeeId].blockedSlots.has(time);
    }
    
    // PRIORIDADE 2: Verificar exceção salva
    const exception = getExceptionForEmployee(employeeId);
    if (exception && exception.available_slots) {
      const isAvailable = exception.available_slots.some((slot: ExceptionTimeSlot) => {
        const slotStartMinutes = parseInt(slot.start.split(':')[0]) * 60 + parseInt(slot.start.split(':')[1]);
        const slotEndMinutes = parseInt(slot.end.split(':')[0]) * 60 + parseInt(slot.end.split(':')[1]);
        return timeMinutes >= slotStartMinutes && timeMinutes < slotEndMinutes;
      });
      return isAvailable;
    }

    // PRIORIDADE 3: Verificar PAUSAS
    // Se está em pausa, o horário é INDISPONÍVEL
    if (isTimeInBreak(time, employeeId)) {
      return false;
    }

    // PRIORIDADE 4: Verificar horário normal do funcionário
    const schedules = (employee as any).employee_schedules || [];
    const daySchedule = schedules.find((s: any) => s.day_of_week === dayOfWeek && s.is_active);
    
    if (!daySchedule) return false;

    const startMinutes = parseInt(daySchedule.start_time.split(':')[0]) * 60 + parseInt(daySchedule.start_time.split(':')[1]);
    const endMinutes = parseInt(daySchedule.end_time.split(':')[0]) * 60 + parseInt(daySchedule.end_time.split(':')[1]);

    return timeMinutes >= startMinutes && timeMinutes < endMinutes;
  }, [selectedDate, activeEmployees, exceptions, isExceptionMode, exceptionEditing, getExceptionForEmployee, isTimeInBreak]);

  // Filter appointments for selected date
  const dayAppointments = useMemo(() => {
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    console.log('🗓️ Filtering appointments for date:', dateStr);
    console.log('📋 All appointments:', appointments);
    const filtered = appointments.filter(apt => {
      console.log('🔍 Checking appointment:', apt.appointment_date, 'vs', dateStr);
      return apt.appointment_date === dateStr;
    });
    console.log('✅ Filtered appointments for', dateStr, ':', filtered);
    return filtered;
  }, [appointments, selectedDate]);

  // Filter appointments by status (cancelled removed from agenda, but kept in history)
  const filteredDayAppointments = useMemo(() => {
    let filtered = dayAppointments;
    
    // Apply status filter only if specific status is selected
    if (selectedStatus !== 'all') {
      filtered = filtered.filter(apt => apt.status === selectedStatus);
    }
    
    // Remove cancelled from agenda view (they stay in history)
    // Keep no_show appointments visible with gray background
    filtered = filtered.filter(apt => apt.status !== 'cancelled');
    
    return filtered;
  }, [dayAppointments, selectedStatus]);

  // Calculate next appointment time for each employee
  const getNextAppointmentTime = (employeeId: string) => {
    const empAppointments = filteredDayAppointments
      .filter(apt => apt.employee_id === employeeId && apt.status !== 'cancelled' && apt.status !== 'no_show')
      .sort((a, b) => a.start_time.localeCompare(b.start_time));
    
    const now = new Date();
    const currentTime = format(now, 'HH:mm');
    
    const nextApt = empAppointments.find(apt => apt.start_time > currentTime);
    return nextApt ? nextApt.start_time : null;
  };

  // Get appointment for specific time slot and employee
  const getAppointmentForSlot = (time: string, employeeId: string) => {
    const appointment = filteredDayAppointments.find(apt => {
      const startTime = apt.start_time.substring(0, 5); // Remove seconds if present
      const endTime = apt.end_time.substring(0, 5); // Remove seconds if present
      const matches = apt.employee_id === employeeId && 
        startTime <= time && 
        endTime > time;
      
      if (matches) {
        console.log('🎯 Found appointment for slot', time, 'employee', employeeId, ':', apt);
      }
      
      return matches;
    });
    
    return appointment;
  };

  // Calculate appointment duration in slots
  const getAppointmentDuration = (appointment: any) => {
    const startTime = appointment.start_time;
    const endTime = appointment.end_time;
    
    const startMinutes = parseInt(startTime.split(':')[0]) * 60 + parseInt(startTime.split(':')[1]);
    const endMinutes = parseInt(endTime.split(':')[0]) * 60 + parseInt(endTime.split(':')[1]);
    
    return Math.ceil((endMinutes - startMinutes) / 10); // Duration in 10-minute slots
  };

  // Get service by ID
  const getServiceById = (serviceId: string) => {
    return services?.find(service => service.id === serviceId);
  };

  // Navigation functions
  const goToPreviousDay = () => {
    setSelectedDate(prev => subDays(prev, 1));
  };

  const goToNextDay = () => {
    setSelectedDate(prev => addDays(prev, 1));
  };

  const goToToday = () => {
    setSelectedDate(new Date());
  };

  // Handle time slot click
  const handleTimeSlotClick = (time: string, employeeId: string) => {
    const existingAppointment = getAppointmentForSlot(time, employeeId);
    if (!existingAppointment) {
      setSelectedTimeSlot({ time, employeeId });
      setShowNewAppointmentDialog(true);
    }
  };

  // Show cancel confirmation dialog
  const showCancelConfirmation = (appointmentId: string) => {
    setAppointmentToCancel(appointmentId);
    setShowCancelDialog(true);
  };

  // Show edit dialog
  const showEditAppointment = (appointment: any) => {
    setAppointmentToEdit(appointment);
    setEditFormData({
      client_name: appointment.client_name || '',
      client_phone: appointment.client_phone || '',
      service_id: appointment.service_id || '',
      employee_id: appointment.employee_id || '',
      appointment_date: appointment.appointment_date || '',
      start_time: appointment.start_time || '',
      end_time: appointment.end_time || '',
      status: appointment.status || '',
      notes: appointment.notes || ''
    });
    setIsEditMode(true);
    setShowEditDialog(true);
    setShowClientTypeSelection(false);
  };

  // Handle edit form submission
  const handleEditSubmit = async () => {
    if (!appointmentToEdit) return;

    try {
      const { error } = await supabase
        .from('appointments')
        .update({
          client_name: editFormData.client_name,
          client_phone: editFormData.client_phone,
          service_id: editFormData.service_id,
          employee_id: editFormData.employee_id,
          appointment_date: editFormData.appointment_date,
          start_time: editFormData.start_time,
          end_time: editFormData.end_time,
          status: editFormData.status,
          notes: editFormData.notes
        })
        .eq('id', appointmentToEdit.id);

      if (error) throw error;
      
      toast({
        title: 'Agendamento atualizado',
        description: 'As alterações foram salvas com sucesso.',
      });
      
      // Trigger parent update
      if (onAppointmentUpdate) {
        onAppointmentUpdate();
      }
      
      setShowEditDialog(false);
      setAppointmentToEdit(null);
      setIsEditMode(false);
    } catch (error) {
      console.error('Error updating appointment:', error);
      toast({
        title: 'Erro ao atualizar',
        description: 'Não foi possível salvar as alterações. Tente novamente.',
        variant: 'destructive',
      });
    }
  };

  // Handle opening payment dialog
  const handleOpenPaymentDialog = (appointment: any) => {
    setSelectedAppointmentForPayment(appointment);
    setShowPaymentDialog(true);
  };

  // Handle payment creation
  const handlePaymentCreated = () => {
    setShowPaymentDialog(false);
    setSelectedAppointmentForPayment(null);
    if (onAppointmentUpdate) {
      onAppointmentUpdate();
    }
  };

  // ========== EXCEPTION MODE HANDLERS - MULTI-EMPLOYEE SYSTEM ==========
  
  const toggleExceptionMode = () => {
    if (isExceptionMode) {
      // Sair do modo de exceção
      setExceptionEditing({});
      setIsDraggingException(false);
      setIsExceptionMode(false);
    } else {
      // Entrar no modo de exceção para TODOS os funcionários
      if (!employees || employees.length === 0) {
        toast({
          title: 'Sem funcionários',
          description: 'Cadastre funcionários antes de criar exceções.',
          variant: 'destructive',
        });
        return;
      }

      const editingState: Record<string, { baseSlots: string[]; blockedSlots: Set<string>; }> = {};
      
      employees.forEach(employee => {
        if (employee.status !== 'active') return;

        // Gerar TODOS os slots do dia (00:00 - 23:50)
        const allDaySlots = generateSlotsFromSchedule("00:00", "23:50");
        
        // Buscar horário normal
        const dayOfWeek = selectedDate.getDay();
        const schedule = (employee as any).employee_schedules?.find((s: any) => s.day_of_week === dayOfWeek && s.is_active);
        
        const blockedSlots = new Set<string>();
        
        if (schedule) {
          // Marcar como bloqueados todos os slots FORA do horário normal
          const normalSlots = generateSlotsFromSchedule(schedule.start_time, schedule.end_time);
          const normalSlotsSet = new Set(normalSlots);
          
          allDaySlots.forEach(slot => {
            // Bloquear se está fora do expediente
            if (!normalSlotsSet.has(slot)) {
              blockedSlots.add(slot);
            }
            // OU bloquear se está em uma pausa
            else if (isTimeInBreak(slot, employee.id)) {
              blockedSlots.add(slot);
            }
          });
        } else {
          // Se não tem horário, bloquear o dia inteiro
          allDaySlots.forEach(slot => blockedSlots.add(slot));
        }
        
        // Carregar exceção salva (se houver)
        const existingException = getExceptionForEmployee(employee.id);
        if (existingException && existingException.available_slots) {
          blockedSlots.clear();
          
          const availableSlotTimes = new Set<string>();
          existingException.available_slots.forEach((slot: ExceptionTimeSlot) => {
            const slots = generateSlotsFromSchedule(slot.start, slot.end);
            slots.forEach(s => availableSlotTimes.add(s));
          });
          
          // Bloquear tudo que NÃO está em available_slots
          allDaySlots.forEach(slot => {
            if (!availableSlotTimes.has(slot)) {
              blockedSlots.add(slot);
            }
          });
        }
        
        editingState[employee.id] = {
          baseSlots: allDaySlots,
          blockedSlots,
        };
      });
      
      setExceptionEditing(editingState);
      setIsExceptionMode(true);
      
      const activeCount = Object.keys(editingState).length;
      toast({
        title: 'Modo de exceção ativado',
        description: `Editando exceções para ${activeCount} funcionário(s). 🟢 Verde = disponível | 🔴 Vermelho = bloqueado`,
      });
    }
  };

  const handleSlotMouseDown = (employeeId: string, time: string, e: React.MouseEvent) => {
    if (!isExceptionMode || !exceptionEditing[employeeId]) return;
    
    e.preventDefault();
    
    const wasBlocked = exceptionEditing[employeeId].blockedSlots.has(time);
    setIsDraggingToBlock(!wasBlocked); // Se estava bloqueado, arrasta para desbloquear
    
    // Toggle imediato
    setExceptionEditing(prev => {
      const newBlockedSlots = new Set(prev[employeeId].blockedSlots);
      if (newBlockedSlots.has(time)) {
        newBlockedSlots.delete(time);
      } else {
        newBlockedSlots.add(time);
      }
      
      return {
        ...prev,
        [employeeId]: {
          ...prev[employeeId],
          blockedSlots: newBlockedSlots,
        },
      };
    });
    
    setIsDraggingException(true);
  };

  const handleSlotMouseEnter = (employeeId: string, time: string) => {
    if (!isExceptionMode || !isDraggingException || !exceptionEditing[employeeId]) return;
    
    setExceptionEditing(prev => {
      const newBlockedSlots = new Set(prev[employeeId].blockedSlots);
      
      if (isDraggingToBlock) {
        newBlockedSlots.add(time);
      } else {
        newBlockedSlots.delete(time);
      }
      
      return {
        ...prev,
        [employeeId]: {
          ...prev[employeeId],
          blockedSlots: newBlockedSlots,
        },
      };
    });
  };

  const handleSaveExceptions = async () => {
    if (Object.keys(exceptionEditing).length === 0) {
      toast({
        title: 'Nada para salvar',
        description: 'Nenhuma alteração foi feita.',
        variant: 'destructive',
      });
      return;
    }
    
    try {
      // Salvar exceção para CADA funcionário editado
      const savePromises = Object.entries(exceptionEditing).map(([employeeId, state]) => {
        const availableSlots = state.baseSlots.filter(slot => !state.blockedSlots.has(slot));
        const availableRanges = groupContiguousSlots(availableSlots);
        
        return saveExceptions({ 
          employeeId, 
          availableSlots: availableRanges 
        });
      });
      
      await Promise.all(savePromises);
      
      // Limpar estado
      setExceptionEditing({});
      setIsDraggingException(false);
      setIsExceptionMode(false);
      
      toast({
        title: 'Exceções salvas!',
        description: `Exceções atualizadas para ${Object.keys(exceptionEditing).length} funcionário(s).`,
      });
    } catch (error: any) {
      toast({
        title: 'Erro ao salvar',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleCancelExceptions = () => {
    setExceptionEditing({});
    setIsExceptionMode(false);
    setIsDraggingException(false);
    
    toast({
      title: 'Cancelado',
      description: 'As alterações foram descartadas.',
    });
  };

  const isSlotBlocked = (employeeId: string, time: string): boolean => {
    if (isExceptionMode && exceptionEditing[employeeId]) {
      return exceptionEditing[employeeId].blockedSlots.has(time);
    }
    return false;
  };

  // Handle appointment cancellation
  const handleCancelAppointment = async () => {
    
    try {
      await updateAppointmentStatus(appointmentToCancel, 'cancelled');
      toast({
        title: 'Agendamento cancelado',
        description: 'O agendamento foi cancelado com sucesso.',
      });
      
      // Trigger parent update
      if (onAppointmentUpdate) {
        onAppointmentUpdate();
      }
    } catch (error) {
      console.error('Error cancelling appointment:', error);
      toast({
        title: 'Erro ao cancelar',
        description: 'Não foi possível cancelar o agendamento. Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setShowCancelDialog(false);
      setAppointmentToCancel(null);
    }
  };

  // Handle status change
  const handleStatusChange = async (appointmentId: string, newStatus: string) => {
    try {
      await updateAppointmentStatus(appointmentId, newStatus);
      toast({
        title: 'Status atualizado',
        description: `Agendamento marcado como ${getStatusLabel(newStatus)}.`,
      });
      
      // Trigger parent update
      if (onAppointmentUpdate) {
        onAppointmentUpdate();
      }
    } catch (error) {
      console.error('Error updating appointment status:', error);
      toast({
        title: 'Erro ao atualizar status',
        description: 'Não foi possível atualizar o status. Tente novamente.',
        variant: 'destructive',
      });
    }
  };

  // Get status label for toast messages
  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'Feito';
      case 'pending':
        return 'Marcado';
      case 'cancelled':
        return 'Cancelado';
      case 'no_show':
        return 'Cliente não apareceu';
      default:
        return status;
    }
  };

  if (employeesLoading || servicesLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando agenda...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={getAgendaContainerClasses(isFullscreen)}>
      {/* Exception Mode Toolbar */}
      <ScheduleExceptionToolbar
        isExceptionMode={isExceptionMode}
        onToggleMode={toggleExceptionMode}
        onSave={handleSaveExceptions}
        onCancel={handleCancelExceptions}
        pendingCount={Object.values(exceptionEditing).reduce((total, state) => total + state.blockedSlots.size, 0)}
        isSaving={isSaving}
        selectedDate={selectedDate}
        activeEmployees={activeEmployees}
      />
      
      {/* Header */}
      <div className={cn(
        "bg-white border-b border-gray-200 px-4 lg:px-6 py-2",
        isExceptionMode && "mt-20"
      )}>
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full lg:w-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowNewAppointmentDialog(true)}
              className="bg-blue-600 text-white border-blue-600 hover:bg-blue-700 w-full sm:w-auto"
              disabled={isExceptionMode}
            >
              <Plus className="h-4 w-4 mr-2" />
              Novo
            </Button>
            
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Button
                variant="ghost"
                size="sm"
                onClick={goToPreviousDay}
                className="flex-shrink-0"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              
              <div className="text-center flex-1 min-w-0">
                <h2 className="text-sm lg:text-lg font-semibold text-gray-900 truncate">
                  {format(selectedDate, "EEEE, dd 'de' MMM, yyyy", { locale: ptBR })}
                </h2>
              </div>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={goToNextDay}
                className="flex-shrink-0"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={goToToday}
                className="ml-2 hidden sm:block"
              >
                Hoje
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                className="ml-2 relative"
                title="Atualizar agenda"
              >
                <RefreshCw className="h-4 w-4" />
                {pendingUpdates > 0 && (
                  <Badge 
                    className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 bg-red-500 text-white text-xs"
                  >
                    {pendingUpdates > 9 ? '9+' : pendingUpdates}
                  </Badge>
                )}
              </Button>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full lg:w-auto">
            <select 
              value={selectedEmployee}
              onChange={(e) => setSelectedEmployee(e.target.value)}
              className="amazon-select px-3 py-2 text-sm rounded-lg w-full sm:w-auto"
            >
              <option value="all">Todos os profissionais</option>
              {(employees?.filter(emp => emp.status === 'active') || []).map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.name}
                </option>
              ))}
            </select>
            <select 
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="amazon-select px-3 py-2 text-sm rounded-lg w-full sm:w-auto"
            >
              <option value="all">Todos os status</option>
              <option value="pending">Marcados</option>
              <option value="confirmed">Feitos</option>
              <option value="cancelled">Cancelados</option>
              <option value="no_show">Cliente não apareceu</option>
            </select>
            <Button 
              variant="outline" 
              size="sm" 
              className="amazon-button hidden lg:flex items-center gap-2"
            >
              <Filter className="h-4 w-4" />
              Mais filtros
            </Button>
            
            {/* Fullscreen Toggle - Reposicionado */}
            {onToggleFullscreen && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={onToggleFullscreen}
                className="amazon-button flex items-center gap-2"
                title={isFullscreen ? "Sair da tela cheia (Esc)" : "Tela cheia (F11)"}
              >
                {isFullscreen ? (
                  <>
                    <Minimize className="h-4 w-4" />
                    <span className="hidden sm:inline">Sair</span>
                  </>
                ) : (
                  <>
                    <Maximize className="h-4 w-4" />
                    <span className="hidden sm:inline">Tela cheia</span>
                  </>
                )}
              </Button>
            )}
            
            {/* Zoom Controls - Melhorados */}
            <div className="zoom-controls hidden lg:flex items-center gap-0 rounded-lg overflow-hidden">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setZoomLevel(Math.max(0.5, zoomLevel - 0.1))}
                className="h-9 w-9 p-0 hover:bg-blue-50 hover:text-blue-600 transition-colors duration-200 rounded-none border-r border-gray-200"
                title="Diminuir zoom (Ctrl + Scroll para baixo)"
              >
                <ZoomOut className="h-4 w-4" />
              </Button>
              <button 
                onClick={() => setZoomLevel(1)}
                className="px-3 py-2 text-sm font-medium text-gray-700 hover:text-blue-600 hover:bg-blue-50 transition-colors duration-200 min-w-[60px] border-r border-gray-200"
                title="Resetar zoom (100%)"
              >
                {Math.round(zoomLevel * 100)}%
              </button>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setZoomLevel(Math.min(3, zoomLevel + 0.1))}
                className="h-9 w-9 p-0 hover:bg-blue-50 hover:text-blue-600 transition-colors duration-200 rounded-none"
                title="Aumentar zoom (Ctrl + Scroll para cima)"
              >
                <ZoomIn className="h-4 w-4" />
              </Button>
            </div>
            
            {/* Drag Help Indicator - Melhorado */}
            {!isFullscreen && (
              <div className="drag-indicator hidden lg:flex items-center gap-2 px-3 py-2 text-xs rounded-lg">
                <Move className="h-3 w-3" />
                <span>Arraste para navegar</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <DndContext 
        sensors={sensors} 
        onDragEnd={handleDragEnd}
        collisionDetection={closestCenter}
        measuring={{
          droppable: {
            strategy: MeasuringStrategy.Always,
          },
        }}
        modifiers={[
          // Modifier to compensate for zoom scale
          ({ transform }) => ({
            ...transform,
            x: transform.x / (isFullscreen ? zoomLevel : 1),
            y: transform.y / (isFullscreen ? zoomLevel : 1),
          })
        ]}
      >
        <div className="flex flex-col lg:flex-row h-[calc(100vh-120px)]">
          {/* Agenda Grid */}
          <div 
            className={`flex-1 overflow-hidden order-2 lg:order-1 ${isDragging ? 'cursor-grabbing select-none' : 'cursor-grab'}`}
            style={{ 
              scrollBehavior: isDragging ? 'auto' : 'smooth'
            }}
            onMouseDown={(e) => {
              // Só inicia o drag se não for em um elemento interativo ou draggable appointment
              const target = e.target as HTMLElement;
              if (
                target.closest('button') || 
                target.closest('select') || 
                target.closest('[role="button"]') ||
                target.closest('[role="listbox"]') ||
                target.closest('[role="option"]') ||
                target.closest('[data-radix-select-trigger]') ||
                target.closest('[data-radix-select-content]') ||
                target.closest('.appointment-block') ||
                target.closest('[data-dnd-draggable]')
              ) {
                return;
              }
              
              // No fullscreen, usa o container pai que tem overflow: auto
              const scrollContainer = isFullscreen ? e.currentTarget : e.currentTarget.firstElementChild as HTMLElement;
              if (!scrollContainer) return;
              
              setIsDragging(true);
              setDragStart({
                x: e.clientX,
                y: e.clientY,
                scrollLeft: scrollContainer.scrollLeft,
                scrollTop: scrollContainer.scrollTop
              });
              e.currentTarget.style.cursor = 'grabbing';
              // NÃO chama preventDefault para não bloquear o DnD
            }}
          onMouseMove={(e) => {
            if (!isDragging || !dragStart) return;
            // Só previne default se realmente está fazendo scroll drag
            const target = e.target as HTMLElement;
            if (!target.closest('[data-dnd-draggable]')) {
              e.preventDefault();
            }
            
            const x = e.clientX - dragStart.x;
            const y = e.clientY - dragStart.y;
            
            // No fullscreen, usa o container pai que tem overflow: auto
            const scrollContainer = isFullscreen ? e.currentTarget : e.currentTarget.firstElementChild as HTMLElement;
            if (!scrollContainer) return;
            
            // SCROLL HORIZONTAL SEMPRE (principal funcionalidade)
            scrollContainer.scrollLeft = dragStart.scrollLeft - x;
            
            // SCROLL VERTICAL opcional se movimento for significativo
            if (Math.abs(y) > 10) {
              scrollContainer.scrollTop = dragStart.scrollTop - y;
            }
          }}
          onMouseUp={(e) => {
            setIsDragging(false);
            e.currentTarget.style.cursor = 'grab';
          }}
          onMouseLeave={(e) => {
            setIsDragging(false);
            e.currentTarget.style.cursor = 'grab';
          }}
        >
          <div 
            className={getTimelineContainerClasses(isFullscreen, false)}
            onWheel={(e) => {
              if (e.ctrlKey || e.metaKey) {
                e.preventDefault();
                const delta = e.deltaY > 0 ? -0.1 : 0.1;
                const newZoom = Math.max(0.5, Math.min(3, zoomLevel + delta));
                setZoomLevel(newZoom);
              } else if (e.shiftKey) {
                // Scroll horizontal com Shift + Wheel
                e.preventDefault();
                // No fullscreen, usa o container pai
                const scrollContainer = isFullscreen ? e.currentTarget.parentElement : e.currentTarget;
                if (scrollContainer) {
                  scrollContainer.scrollLeft += e.deltaY;
                }
              }
            }}
            onKeyDown={(e) => {
              // Atalhos de teclado estilo Amazon
              if (e.key === 'Escape' && isFullscreen && onToggleFullscreen) {
                onToggleFullscreen();
              } else if (e.key === 'F11' && onToggleFullscreen) {
                e.preventDefault();
                onToggleFullscreen();
              } else if ((e.ctrlKey || e.metaKey) && e.key === '0') {
                e.preventDefault();
                setZoomLevel(1);
              } else if ((e.ctrlKey || e.metaKey) && e.key === '+') {
                e.preventDefault();
                setZoomLevel(Math.min(3, zoomLevel + 0.1));
              } else if ((e.ctrlKey || e.metaKey) && e.key === '-') {
                e.preventDefault();
                setZoomLevel(Math.max(0.5, zoomLevel - 0.1));
              }
            }}
            tabIndex={0}
          >
            <div className="relative">
              {/* Employee Headers - STICKY (outside transform context) */}
              <div 
                className={`${getTimelineHeaderClasses(isFullscreen)} ${isFullscreen ? 'sticky top-0 z-50' : ''}`}
                style={{
                  transform: isFullscreen ? `scale(${zoomLevel})` : undefined,
                  transformOrigin: 'top left',
                }}
              >
                <div className={getTimelineColumnsClasses(isFullscreen)}>
                  <div className={getTimeColumnClasses(isFullscreen)}></div>
                  {activeEmployees.map((employee) => {
                    const nextTime = getNextAppointmentTime(employee.id);
                    return (
                        <div 
                          key={employee.id} 
                          className={getEmployeeColumnClasses(isFullscreen)}
                        >
                        <div className="flex items-center gap-2 lg:gap-3">
                          <Avatar className="w-8 h-8 lg:w-10 lg:h-10 flex-shrink-0">
                            <AvatarImage src={employee.avatar_url} />
                            <AvatarFallback className="bg-blue-500 text-white text-xs lg:text-sm">
                              {employee.name.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0 flex-1">
                            <h3 className="font-semibold text-gray-900 text-sm lg:text-base truncate">{employee.name}</h3>
                            {nextTime && (
                              <p className="text-xs lg:text-sm text-gray-600 truncate">Próximo: {nextTime}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Time Grid - WITH TRANSFORM for zoom */}
              <div 
                className="bg-white"
                style={{
                  transform: isFullscreen ? `scale(${zoomLevel})` : undefined,
                  transformOrigin: 'top left',
                }}
              >
                {timeSlots.map((slot, slotIndex) => (
                  <div 
                    key={slot.time} 
                    className={`border-b border-gray-100 hover:bg-gray-50 ${getTimelineColumnsClasses(isFullscreen)}`}
                  >
                    {/* Time Column */}
                    <div className={getTimeSlotClasses(isFullscreen)}>
                      <span className="text-xs lg:text-sm text-gray-600 font-mono">{slot.time}</span>
                    </div>
                    
                    {/* Employee Columns */}
                    {activeEmployees.map((employee) => {
                      const appointment = getAppointmentForSlot(slot.time, employee.id);
                      const isFirstSlotOfAppointment = appointment && appointment.start_time.substring(0, 5) === slot.time;
                      const available = isSlotAvailable(slot.time, employee.id);
                      const isBlocked = isSlotBlocked(employee.id, slot.time);
                      const blockType = getSlotBlockType(slot.time, employee.id);
                      const breakInfo = getBreakInfo(slot.time, employee.id);
                      
                      return (
                        <div 
                          key={`${slot.time}-${employee.id}`}
                          className={cn(
                            getEmployeeSlotClasses(isFullscreen),
                            // Modo EXCEÇÃO: Verde (disponível) ou Vermelho (bloqueado)
                            isExceptionMode && exceptionEditing[employee.id] && isBlocked && "bg-red-100/90 border border-red-300 hover:bg-red-200/90 cursor-crosshair transition-colors",
                            isExceptionMode && exceptionEditing[employee.id] && !isBlocked && "bg-green-50/50 border border-green-300 hover:bg-green-100/50 cursor-crosshair transition-colors",
                            // Modo NORMAL: Diferentes tipos de bloqueio
                            !isExceptionMode && blockType === 'break' && "bg-amber-50/80 border-l-2 border-amber-400 relative",
                            !isExceptionMode && blockType === 'exception' && "bg-orange-50 border-l-2 border-orange-400",
                            !isExceptionMode && blockType === 'out-of-schedule' && "bg-gray-100/80 relative",
                          )}
                          title={breakInfo || undefined}
                          onMouseDown={(e) => handleSlotMouseDown(employee.id, slot.time, e)}
                          onMouseEnter={() => handleSlotMouseEnter(employee.id, slot.time)}
                        >
                          {/* Indicador visual de pausa */}
                          {!isExceptionMode && blockType === 'break' && (
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                              <Clock className="w-3 h-3 text-amber-600 opacity-30" />
                            </div>
                          )}
                          
                          {isFirstSlotOfAppointment ? (
                            <DraggableAppointmentBlock
                              appointment={appointment}
                              service={getServiceById(appointment.service_id)}
                              employee={activeEmployees.find(emp => emp.id === appointment.employee_id)}
                              duration={getAppointmentDuration(appointment)}
                              onClick={() => console.log('Appointment clicked:', appointment.id)}
                              onEdit={() => showEditAppointment(appointment)}
                              onCancel={() => showCancelConfirmation(appointment.id)}
                              onStatusChange={handleStatusChange}
                              onPayment={() => handleOpenPaymentDialog(appointment)}
                              isFullscreen={isFullscreen}
                            />
                          ) : !appointment ? (
                            <DroppableTimeSlot
                              slotId={`slot-${slot.time}-${employee.id}`}
                              time={slot.time}
                              employeeId={employee.id}
                              date={format(selectedDate, 'yyyy-MM-dd')}
                              isFullscreen={isFullscreen}
                              onClick={isExceptionMode ? undefined : () => handleTimeSlotClick(slot.time, employee.id)}
                              disabled={isExceptionMode ? false : !available}
                              isExceptionMode={isExceptionMode}
                            />
                          ) : (
                            <div className="h-0" />
                          )}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

          {/* Sidebar */}
          <div className="order-1 lg:order-2 h-64 lg:h-full overflow-hidden">
            <AgendaSidebar
              selectedDate={selectedDate}
              onDateSelect={setSelectedDate}
              appointments={appointments}
              employees={activeEmployees}
              services={services || []}
            />
          </div>
        </div>
      </DndContext>

      {/* New Appointment Dialog */}
      <Dialog open={showNewAppointmentDialog} onOpenChange={setShowNewAppointmentDialog}>
        <DialogContent className="max-w-4xl w-[95vw] max-h-[90vh] overflow-y-auto p-0">
          <DialogHeader className="p-6 pb-0">
            <DialogTitle>Novo Agendamento</DialogTitle>
          </DialogHeader>
          <div className="p-6 pt-0">
            <NewAppointmentForm
              selectedTimeSlot={selectedTimeSlot}
              employees={activeEmployees}
              services={services || []}
              barbershopId={barbershopId}
              onSuccess={(appointment) => {
                setShowNewAppointmentDialog(false);
                setSelectedTimeSlot(null);
                if (onAppointmentCreate) {
                  onAppointmentCreate(appointment);
                }
                toast({
                  title: "Agendamento criado!",
                  description: "O agendamento foi criado com sucesso.",
                });
              }}
              onCancel={() => {
                setShowNewAppointmentDialog(false);
                setSelectedTimeSlot(null);
              }}
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Appointment Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-4xl w-[95vw] max-h-[90vh] overflow-y-auto p-0">
          <DialogHeader className="p-6 pb-0">
            <DialogTitle>Editar Agendamento</DialogTitle>
          </DialogHeader>
          {appointmentToEdit && (
            <div className="p-6 pt-0">
              <div className="space-y-6">
                {/* Client Information Section */}
                <div className="bg-gray-50 rounded-lg p-4 space-y-4">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <h3 className="text-lg font-semibold text-gray-900">Informações do Cliente</h3>
                  </div>

                  {showClientTypeSelection ? (
                    <div className="space-y-4">
                      <h4 className="font-medium text-gray-900">Tipo de Cliente</h4>
                      <div className="grid grid-cols-1 gap-3">
                        <Button
                          variant="outline"
                          className="h-auto p-4 text-left justify-start"
                          onClick={() => {
                            setShowClientTypeSelection(false);
                            setIsVisitorClient(false); // Explicitamente define como não-visitante
                            setShowClientSelector(true);
                          }}
                        >
                          <div>
                            <div className="font-medium">Selecionar/cadastrar cliente no sistema</div>
                            <div className="text-sm text-gray-600">Cliente com cadastro e histórico</div>
                          </div>
                        </Button>
                        <Button
                          variant="outline"
                          className="h-auto p-4 text-left justify-start"
                          onClick={() => {
                            setShowClientTypeSelection(false);
                            setIsVisitorClient(true); // Explicitamente define como visitante
                            setEditFormData({
                              ...editFormData,
                              client_name: '',
                              client_phone: ''
                            });
                          }}
                        >
                          <div>
                            <div className="font-medium">Cliente visitante</div>
                            <div className="text-sm text-gray-600">Cliente sem cadastro no sistema</div>
                          </div>
                        </Button>
                      </div>
                    </div>
                  ) : !isVisitorClient ? (
                    <div className="space-y-4">
                      {clientLoading ? (
                        <div className="text-center py-4 text-gray-500">
                          Carregando informações do cliente...
                        </div>
                      ) : clientDetails?.isRegistered ? (
                        <div>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <Avatar className="w-12 h-12">
                                <AvatarFallback className="bg-blue-100 text-blue-600">
                                  {clientDetails.name.charAt(0).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <div className="flex items-center gap-2">
                                  <h3 className="font-semibold text-gray-900">{clientDetails.name}</h3>
                                  <div className="flex items-center gap-1 text-sm text-gray-600">
                                    <Phone className="h-3 w-3" />
                                    {clientDetails.phone}
                                  </div>
                                </div>
                                <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200 mt-1">
                                  <User className="h-3 w-3 mr-1" />
                                  Cadastrado
                                </Badge>
                              </div>
                            </div>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => setShowClientTypeSelection(true)}
                              className="flex items-center gap-2"
                            >
                              <User className="h-4 w-4" />
                              Alterar Cliente
                            </Button>
                          </div>

                          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-4">
                            <div className="bg-white p-3 rounded-lg border border-gray-200">
                              <div className="text-xs text-gray-500 mb-1">Total Agendamentos</div>
                              <div className="text-2xl font-bold text-gray-900">{clientDetails.totalAppointments}</div>
                            </div>
                            <div className="bg-white p-3 rounded-lg border border-gray-200">
                              <div className="text-xs text-gray-500 mb-1">Cliente desde</div>
                              <div className="text-sm font-semibold text-gray-900">
                                {clientDetails.clientSince ? format(new Date(clientDetails.clientSince), 'MMM yyyy', { locale: ptBR }) : 'N/A'}
                              </div>
                            </div>
                            <div className="bg-white p-3 rounded-lg border border-gray-200">
                              <div className="text-xs text-gray-500 mb-1">Total Gasto</div>
                              <div className="text-xl font-bold text-green-600">
                                {clientDetails.recentAppointments ? 
                                  `R$ ${clientDetails.recentAppointments
                                    .filter((apt: any) => apt.status === 'completed')
                                    .reduce((sum: number, apt: any) => sum + (apt.service?.price || 0), 0)
                                    .toFixed(2)}` 
                                  : 'R$ 0,00'}
                              </div>
                            </div>
                            <div className="bg-white p-3 rounded-lg border border-gray-200">
                              <div className="text-xs text-gray-500 mb-1">Status</div>
                              {clientDetails.hasActiveSubscription ? (
                                <Badge className="bg-green-100 text-green-700 border-green-300">
                                  Assinante
                                </Badge>
                              ) : (
                                <Badge variant="outline">Regular</Badge>
                              )}
                            </div>
                          </div>

                          {clientDetails.hasActiveSubscription && (
                            <div className="p-4 my-4 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl">
                              <div className="flex items-center gap-2 mb-3">
                                <Star className="h-5 w-5 text-green-600" />
                                <h5 className="font-semibold text-green-900">Assinatura Ativa</h5>
                              </div>
                              <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                  <span className="text-green-700">Membro há:</span>
                                  <span className="font-semibold ml-2 text-green-900">
                                    {clientDetails.clientSince ? 
                                      `${Math.floor((new Date().getTime() - new Date(clientDetails.clientSince).getTime()) / (1000 * 60 * 60 * 24))} dias` 
                                      : 'N/A'}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-green-700">Tempo restante:</span>
                                  <span className="font-semibold ml-2 text-green-900">
                                    {clientDetails.subscriptionEndDate ? 
                                      `${Math.max(0, Math.ceil((new Date(clientDetails.subscriptionEndDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)))} dias` 
                                      : 'N/A'}
                                  </span>
                                </div>
                              </div>
                            </div>
                          )}

                          {clientDetails.recentAppointments && clientDetails.recentAppointments.length > 0 && (
                            <div className="space-y-3">
                              <h5 className="text-sm font-semibold text-gray-900">Últimos Agendamentos</h5>
                              <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                                {clientDetails.recentAppointments.slice(0, 3).map((apt: any) => (
                                  <div key={apt.id} className="bg-white p-4 rounded-xl border border-gray-200 hover:shadow-md transition-shadow">
                                    <div className="flex items-start justify-between mb-2">
                                      <div className="flex-1">
                                        <div className="font-semibold text-gray-900 text-sm mb-1">
                                          {apt.service?.name || 'Serviço'}
                                        </div>
                                        <div className="text-xs text-gray-500 mb-2">
                                          {format(new Date(apt.appointment_date), "dd 'de' MMM", { locale: ptBR })} • {apt.start_time}
                                        </div>
                                      </div>
                                      <Badge 
                                        variant={
                                          apt.status === 'completed' ? 'default' : 
                                          apt.status === 'confirmed' ? 'secondary' :
                                          apt.status === 'cancelled' ? 'destructive' : 
                                          'outline'
                                        }
                                        className="text-xs shrink-0"
                                      >
                                        {apt.status === 'completed' ? '✓ Feito' : 
                                         apt.status === 'confirmed' ? 'Confirmado' :
                                         apt.status === 'cancelled' ? '✗ Cancelado' : 
                                         apt.status}
                                      </Badge>
                                    </div>
                                    <div className="text-xs text-gray-600 flex items-center gap-1">
                                      <User className="h-3 w-3" />
                                      {apt.employee?.name || 'Profissional'}
                                    </div>
                                    {apt.service?.price && (
                                      <div className="mt-2 pt-2 border-t border-gray-100">
                                        <span className="text-sm font-bold text-green-600">
                                          R$ {apt.service.price.toFixed(2)}
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        // Cliente não encontrado - mostrar como visitante
                        <div className="space-y-4 p-4 bg-orange-50 rounded-lg border border-orange-200">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <Avatar className="w-12 h-12">
                                <AvatarFallback className="bg-orange-100 text-orange-600">
                                  <User className="h-6 w-6" />
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <div className="flex items-center gap-2">
                                  <h3 className="font-semibold text-gray-900">{editFormData.client_name || 'Cliente Visitante'}</h3>
                                  <Badge variant="secondary" className="text-xs bg-orange-100 text-orange-800 border-orange-300">
                                    Visitante
                                  </Badge>
                                </div>
                                <div className="flex items-center gap-1 text-sm text-gray-600">
                                  <Phone className="h-3 w-3" />
                                  {editFormData.client_phone}
                                </div>
                              </div>
                            </div>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => setShowClientTypeSelection(true)}
                              className="flex items-center gap-2"
                            >
                              <User className="h-4 w-4" />
                              Alterar Cliente
                            </Button>
                          </div>
                          
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                              <label className="text-sm font-medium text-gray-700">Nome do Cliente</label>
                              <input
                                type="text"
                                value={editFormData.client_name}
                                onChange={(e) => setEditFormData(prev => ({ ...prev, client_name: e.target.value }))}
                                placeholder="Nome do cliente"
                                className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                              />
                            </div>
                            <div>
                              <label className="text-sm font-medium text-gray-700">Telefone</label>
                              <input
                                type="tel"
                                value={editFormData.client_phone}
                                onChange={(e) => setEditFormData(prev => ({ ...prev, client_phone: e.target.value }))}
                                placeholder="(00) 00000-0000"
                                className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                              />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : isVisitorClient ? (
                    <div className="space-y-4 p-4 bg-orange-50 rounded-lg border border-orange-200">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Avatar className="w-12 h-12">
                            <AvatarFallback className="bg-orange-100 text-orange-600">
                              <User className="h-6 w-6" />
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold text-gray-900">{editFormData.client_name}</h3>
                              <Badge variant="secondary" className="text-xs bg-orange-100 text-orange-800 border-orange-300">
                                Visitante
                              </Badge>
                            </div>
                            <div className="flex items-center gap-1 text-sm text-gray-600">
                              <Phone className="h-3 w-3" />
                              {editFormData.client_phone}
                            </div>
                          </div>
                        </div>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => setShowClientTypeSelection(true)}
                          className="flex items-center gap-2"
                        >
                          <User className="h-4 w-4" />
                          Alterar Cliente
                        </Button>
                      </div>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-medium text-gray-700">Nome do Cliente</label>
                          <input
                            type="text"
                            value={editFormData.client_name}
                            onChange={(e) => setEditFormData(prev => ({ ...prev, client_name: e.target.value }))}
                            placeholder="Nome do cliente"
                            className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-700">Telefone</label>
                          <input
                            type="text"
                            value={editFormData.client_phone}
                            onChange={(e) => setEditFormData(prev => ({ ...prev, client_phone: e.target.value }))}
                            placeholder="(11) 99999-9999"
                            className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                          />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="text-center py-8 text-gray-500 flex-1">
                          {clientLoading ? (
                            <div className="flex items-center justify-center">
                              <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mr-2"></div>
                              Carregando informações do cliente...
                            </div>
                          ) : (
                            "Selecione um tipo de cliente para continuar"
                          )}
                        </div>
                      </div>
                      <Button 
                        variant="outline" 
                        onClick={() => setShowClientTypeSelection(true)}
                        className="w-full"
                      >
                        <User className="h-4 w-4 mr-2" />
                        Alterar Cliente
                      </Button>
                    </div>
                  )}
                </div>

                {/* Edit Form Fields - Service, Employee, Date, Time, Status, Notes */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Serviço</label>
                    <select
                      value={editFormData.service_id}
                      onChange={(e) => setEditFormData(prev => ({ ...prev, service_id: e.target.value }))}
                      className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white z-50"
                    >
                      <option value="">Selecione um serviço</option>
                      {services?.filter(service => service.active).map(service => (
                        <option key={service.id} value={service.id}>
                          {service.name} - R$ {service.price}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Profissional</label>
                    <select
                      value={editFormData.employee_id}
                      onChange={(e) => setEditFormData(prev => ({ ...prev, employee_id: e.target.value }))}
                      className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white z-50"
                    >
                      <option value="">Selecione um profissional</option>
                      {activeEmployees.map(employee => (
                        <option key={employee.id} value={employee.id}>
                          {employee.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Data</label>
                    <input
                      type="date"
                      value={editFormData.appointment_date}
                      onChange={(e) => setEditFormData(prev => ({ ...prev, appointment_date: e.target.value }))}
                      className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Horário</label>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="time"
                        value={editFormData.start_time}
                        onChange={(e) => setEditFormData(prev => ({ ...prev, start_time: e.target.value }))}
                        className="mt-1 w-full px-2 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      />
                      <input
                        type="time"
                        value={editFormData.end_time}
                        onChange={(e) => setEditFormData(prev => ({ ...prev, end_time: e.target.value }))}
                        className="mt-1 w-full px-2 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700">Status</label>
                  <select
                    value={editFormData.status}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, status: e.target.value }))}
                    className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white z-50"
                  >
                    <option value="pending">Marcado</option>
                    <option value="confirmed">Feito</option>
                    <option value="cancelled">Cancelado</option>
                    <option value="no_show">Cliente não apareceu</option>
                  </select>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700">Observações</label>
                  <textarea
                    value={editFormData.notes}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, notes: e.target.value }))}
                    className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Observações do agendamento"
                    rows={3}
                  />
                </div>

                <div className="flex flex-col sm:flex-row justify-end gap-2 pt-4">
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setShowEditDialog(false);
                      setAppointmentToEdit(null);
                      setIsEditMode(false);
                    }}
                    className="w-full sm:w-auto"
                  >
                    Cancelar
                  </Button>
                  {appointmentToEdit?.payment_status !== 'paid' && (
                    <Button 
                      variant="outline"
                      onClick={() => {
                        handleOpenPaymentDialog(appointmentToEdit);
                        setShowEditDialog(false);
                      }}
                      className="w-full sm:w-auto bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100"
                    >
                      <CreditCard className="h-4 w-4 mr-2" />
                      Gerar Pagamento
                    </Button>
                  )}
                  <Button
                    variant="default"
                    onClick={handleEditSubmit}
                    className="bg-blue-600 hover:bg-blue-700 w-full sm:w-auto"
                  >
                    Salvar Alterações
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Client Selector Modal */}
      <ClientSelectorModal
        open={showClientSelector}
        onOpenChange={setShowClientSelector}
        barbershopId={barbershopId}
        currentPhone={editFormData.client_phone}
        onClientSelect={(client) => {
          setEditFormData(prev => ({
            ...prev,
            client_name: client.name,
            client_phone: client.phone
          }));
          setIsVisitorClient(false);
          setShowClientTypeSelection(false);
        }}
      />

      {/* Payment Modal */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Gerar Pagamento</DialogTitle>
          </DialogHeader>
          {selectedAppointmentForPayment && (
            <div className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-2">Detalhes do Agendamento</h4>
                <div className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
                  <div>
                    <span className="text-gray-600">Cliente:</span>
                    <span className="font-medium ml-2">{selectedAppointmentForPayment.client_name}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Telefone:</span>
                    <span className="ml-2">{selectedAppointmentForPayment.client_phone}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Serviço:</span>
                    <span className="ml-2">{getServiceById(selectedAppointmentForPayment.service_id)?.name}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Valor:</span>
                    <span className="font-medium ml-2">R$ {getServiceById(selectedAppointmentForPayment.service_id)?.price}</span>
            </div>
          </div>
        </div>

              <Tabs value={paymentTab} onValueChange={setPaymentTab}>
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="pix">PIX</TabsTrigger>
                  <TabsTrigger value="card">Link de Pagamento</TabsTrigger>
                  <TabsTrigger value="point">Maquininha</TabsTrigger>
                </TabsList>

                <TabsContent value="pix">
                  <CreatePixPayment
                    barbershopId={barbershopId}
                    services={services || []}
                    employees={employees || []}
                    selectedAppointment={selectedAppointmentForPayment}
                    onPaymentCreated={handlePaymentCreated}
                    onTabChange={setPaymentTab}
                    onModalClose={() => setShowPaymentDialog(false)}
                  />
                </TabsContent>

                <TabsContent value="card">
                  <CreateWalkInPayment
                    barbershopId={barbershopId}
                    services={services || []}
                    employees={employees || []}
                    selectedAppointment={selectedAppointmentForPayment}
                    onPaymentCreated={handlePaymentCreated}
                    mode="payment_link"
                  />
                </TabsContent>

                <TabsContent value="point">
                  <CreatePointPayment
                    barbershopId={barbershopId}
                    services={services || []}
                    employees={employees || []}
                    selectedAppointment={selectedAppointmentForPayment}
                    onPaymentCreated={handlePaymentCreated}
                  />
                </TabsContent>
              </Tabs>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Cancel Confirmation Dialog */}
      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar Agendamento</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja cancelar este agendamento? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setShowCancelDialog(false);
              setAppointmentToCancel(null);
            }}>
              Não, manter agendamento
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleCancelAppointment}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Sim, cancelar agendamento
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Appointment Move Confirmation Dialog */}
      {pendingMove && (
        <AppointmentMoveConfirmDialog
          open={showMoveConfirmDialog}
          onOpenChange={setShowMoveConfirmDialog}
          onConfirm={confirmMove}
          appointment={pendingMove.appointment}
          oldEmployee={pendingMove.oldEmployeeName}
          newEmployee={pendingMove.newEmployeeName}
          oldTime={pendingMove.appointment?.start_time?.substring(0, 5)}
          newTime={pendingMove.newStartTime?.substring(0, 5)}
          oldDate={pendingMove.appointment?.appointment_date}
          newDate={pendingMove.newDate}
        />
      )}

      {/* Appointment Conflict Resolution Dialog */}
      {conflictData && (
        <AppointmentConflictDialog
          isOpen={showConflictDialog}
          onClose={() => {
            setShowConflictDialog(false);
            setConflictData(null);
          }}
          conflictingAppointment={conflictData.conflictingAppointment}
          newAppointmentTime={conflictData.newAppointmentTime}
          newAppointmentDate={conflictData.newAppointmentDate}
          newAppointmentDuration={conflictData.newAppointmentDuration}
          onCancelConflicting={handleCancelConflicting}
          onReduceDuration={handleReduceDuration}
          onMoveConflicting={handleMoveConflicting}
        />
      )}
    </div>
  );
};

export default AgendaView;
