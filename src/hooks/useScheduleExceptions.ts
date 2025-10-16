import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface TimeSlot {
  start: string; // "HH:mm"
  end: string;   // "HH:mm"
}

export interface ScheduleException {
  id: string;
  employee_id: string;
  barbershop_id: string;
  exception_date: string;
  time_start: string;
  time_end: string;
  available_slots: TimeSlot[];
  reason?: string;
}

export interface ExceptionEditingState {
  employeeId: string;
  baseSlots: string[]; // Array de horários normais do funcionário ["09:00", "09:10", ...]
  blockedSlots: Set<string>; // Slots que o usuário bloqueou
}

export const useScheduleExceptions = (barbershopId: string, date: string) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: exceptions, isLoading, refetch } = useQuery({
    queryKey: ['schedule-exceptions', barbershopId, date],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('schedule_exceptions')
        .select('*')
        .eq('barbershop_id', barbershopId)
        .eq('exception_date', date)
        .order('time_start');

      if (error) throw error;
      return data as ScheduleException[];
    },
    enabled: !!barbershopId && !!date,
  });

  const saveMutation = useMutation({
    mutationFn: async ({ employeeId, availableSlots }: { employeeId: string; availableSlots: TimeSlot[] }) => {
      // Se não houver slots disponíveis, deletar exceção (equivale a dia totalmente bloqueado)
      if (availableSlots.length === 0) {
        await supabase
          .from('schedule_exceptions')
          .delete()
          .eq('employee_id', employeeId)
          .eq('barbershop_id', barbershopId)
          .eq('exception_date', date);
        return null;
      }

      // Usar UPSERT para criar ou atualizar exceção (idempotente)
      const { data, error } = await supabase
        .from('schedule_exceptions')
        .upsert({
          employee_id: employeeId,
          barbershop_id: barbershopId,
          exception_date: date,
          time_start: availableSlots[0]?.start || null,
          time_end: availableSlots[availableSlots.length - 1]?.end || null,
          available_slots: availableSlots,
        }, {
          onConflict: 'employee_id,exception_date'
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedule-exceptions', barbershopId, date] });
      toast({
        title: 'Exceções salvas!',
        description: 'As exceções de horário foram aplicadas com sucesso.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro ao salvar exceções',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (exceptionId: string) => {
      const { error } = await supabase
        .from('schedule_exceptions')
        .delete()
        .eq('id', exceptionId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedule-exceptions', barbershopId, date] });
      toast({
        title: 'Exceção removida',
        description: 'A exceção foi removida com sucesso.',
      });
    },
  });

  // Função helper para obter exceção de um funcionário específico
  const getExceptionForEmployee = (employeeId: string): ScheduleException | null => {
    if (!exceptions) return null;
    return exceptions.find(e => e.employee_id === employeeId) || null;
  };

  return {
    exceptions: exceptions || [],
    isLoading,
    refetch,
    saveExceptions: saveMutation.mutate,
    deleteException: deleteMutation.mutate,
    isSaving: saveMutation.isPending,
    getExceptionForEmployee,
  };
};

// Funções auxiliares para manipulação de slots
export function generateSlotsFromSchedule(startTime: string, endTime: string): string[] {
  const slots: string[] = [];
  const [startHour, startMin] = startTime.split(':').map(Number);
  const [endHour, endMin] = endTime.split(':').map(Number);
  
  const start = new Date(2000, 0, 1, startHour, startMin);
  const end = new Date(2000, 0, 1, endHour, endMin);
  
  let current = new Date(start);
  while (current < end) {
    const hours = current.getHours().toString().padStart(2, '0');
    const minutes = current.getMinutes().toString().padStart(2, '0');
    slots.push(`${hours}:${minutes}`);
    current.setMinutes(current.getMinutes() + 10);
  }
  
  return slots;
}

export function groupContiguousSlots(slots: string[]): TimeSlot[] {
  if (slots.length === 0) return [];
  
  const sorted = [...slots].sort((a, b) => a.localeCompare(b));
  const groups: TimeSlot[] = [];
  
  let start = sorted[0];
  let prevSlot = sorted[0];
  
  for (let i = 1; i <= sorted.length; i++) {
    const currentSlot = sorted[i];
    
    if (i === sorted.length || !isConsecutive(prevSlot, currentSlot)) {
      // Finalizar grupo atual
      const [hours, minutes] = prevSlot.split(':').map(Number);
      const endDate = new Date(2000, 0, 1, hours, minutes + 10);
      const end = `${endDate.getHours().toString().padStart(2, '0')}:${endDate.getMinutes().toString().padStart(2, '0')}`;
      
      groups.push({ start, end });
      start = currentSlot;
    }
    
    prevSlot = currentSlot;
  }
  
  return groups;
}

function isConsecutive(slot1: string, slot2: string): boolean {
  const [h1, m1] = slot1.split(':').map(Number);
  const [h2, m2] = slot2.split(':').map(Number);
  
  const date1 = new Date(2000, 0, 1, h1, m1);
  date1.setMinutes(date1.getMinutes() + 10);
  
  const date2 = new Date(2000, 0, 1, h2, m2);
  
  return date1.getTime() === date2.getTime();
}
