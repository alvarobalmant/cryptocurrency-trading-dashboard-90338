import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { supabasePublic } from '@/integrations/supabase/publicClient';
import type { Database } from '@/integrations/supabase/types';

export type Appointment = Database['public']['Tables']['appointments']['Row'] & {
  services?: { id: string; name: string; price: number; duration_minutes?: number } | null;
  employees?: { id: string; name: string } | null;
  client_profiles?: { id: string; name: string; phone: string; notes?: string } | null;
};
 type AppointmentInsert = Database['public']['Tables']['appointments']['Insert'];

export const useAppointments = (barbershopId?: string) => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAppointments = async () => {
    console.log('fetchAppointments called with barbershopId:', barbershopId);
    
    if (!barbershopId) {
      console.log('No barbershopId provided, setting loading to false');
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('appointments')
        .select('*')
        .eq('barbershop_id', barbershopId)
        // Buscar TODOS os status incluindo cancelled e no_show para manter histórico
        .order('appointment_date', { ascending: true });

      if (error) throw error;
      
      // Fetch services, employees and client profiles data separately
      const serviceIds = [...new Set((data || []).map(apt => apt.service_id).filter(Boolean))];
      const employeeIds = [...new Set((data || []).map(apt => apt.employee_id).filter(Boolean))];
      const clientProfileIds = [...new Set((data || []).map(apt => apt.client_profile_id).filter(Boolean))];
      
      const [servicesResponse, employeesResponse, clientProfilesResponse] = await Promise.all([
        serviceIds.length > 0 ? supabase
          .from('services')
          .select('id, name, price, duration_minutes')
          .in('id', serviceIds) : Promise.resolve({ data: [] }),
        employeeIds.length > 0 ? supabase
          .from('employees')
          .select('id, name')
          .in('id', employeeIds) : Promise.resolve({ data: [] }),
        clientProfileIds.length > 0 ? supabase
          .from('client_profiles')
          .select('id, name, phone, notes')
          .in('id', clientProfileIds) : Promise.resolve({ data: [] })
      ]);
      
      const servicesMap = new Map((servicesResponse.data || []).map(s => [s.id, s]));
      const employeesMap = new Map((employeesResponse.data || []).map(e => [e.id, e]));
      const clientProfilesMap = new Map((clientProfilesResponse.data || []).map(c => [c.id, c]));
      
      // Transform the data to match our type structure
      const transformedData = (data || []).map(appointment => {
        const clientProfile = appointment.client_profile_id ? clientProfilesMap.get(appointment.client_profile_id) : null;
        
        return {
          ...appointment,
          // Se houver client_profile associado, usar seus dados ao invés de client_name/client_phone
          client_name: clientProfile?.name || appointment.client_name,
          client_phone: clientProfile?.phone || appointment.client_phone,
          services: appointment.service_id ? servicesMap.get(appointment.service_id) || null : null,
          employees: appointment.employee_id ? employeesMap.get(appointment.employee_id) || null : null,
          client_profiles: clientProfile || null
        };
      });
      
      setAppointments(transformedData);
    } catch (error) {
      console.error('Error fetching appointments:', error);
    } finally {
      setLoading(false);
    }
  };

  const createAppointment = async (appointmentData: Omit<AppointmentInsert, 'barbershop_id'>) => {
    if (!barbershopId) throw new Error('Barbershop not selected');

    console.log('🔄 Creating appointment with data:', {
      ...appointmentData,
      barbershop_id: barbershopId,
    });

    try {
      // Check for active subscription first
      const { data: hasSubscription } = await supabase.rpc('has_active_subscription_by_phone', {
        p_client_phone: appointmentData.client_phone,
        p_barbershop_id: barbershopId,
        p_employee_id: appointmentData.employee_id
      });

      let finalAppointmentData = {
        ...appointmentData,
        barbershop_id: barbershopId,
      };

      // If client has active subscription, mark as paid
      if (hasSubscription) {
        const { data: subscriptionId } = await supabase.rpc('get_active_subscription_for_appointment_by_phone', {
          p_client_phone: appointmentData.client_phone,
          p_barbershop_id: barbershopId,
          p_employee_id: appointmentData.employee_id
        });

        finalAppointmentData = {
          ...finalAppointmentData,
          payment_status: 'paid',
          is_subscription_appointment: true,
          subscription_id: subscriptionId,
        };
      }

      // Use public client for appointment creation to allow unauthenticated users
      const { data, error } = await supabasePublic
        .from('appointments')
        .insert([finalAppointmentData]);

      if (error) {
        console.error('❌ Appointment creation failed:', error);
        throw error;
      }
      
      console.log('✅ Appointment created successfully:', data);
      
      // Don't try to update local state with anonymous inserts since we can't select the data back
      // setAppointments(prev => [...prev, data]);
      return data;
    } catch (error) {
      console.error('💥 Unexpected error during appointment creation:', error);
      throw error;
    }
  };

  const getAvailableSlots = async (employeeId: string, date: string, serviceDurationMinutes: number) => {
    try {
      // Get employee schedule for the day - use public client for unauthenticated access
      const dayOfWeek = new Date(date).getDay();
      const { data: schedule } = await supabasePublic
        .from('employee_schedules')
        .select('*')
        .eq('employee_id', employeeId)
        .eq('day_of_week', dayOfWeek)
        .eq('is_active', true)
        .single();

      if (!schedule) return [];

      // Get existing appointments for the day - use public client
      // Excluir cancelled e no_show pois não bloqueiam horários
      const { data: existingAppointments } = await supabasePublic
        .from('appointments')
        .select('start_time, end_time')
        .eq('employee_id', employeeId)
        .eq('appointment_date', date)
        .in('status', ['pending', 'confirmed', 'queue_reserved']);

      // Generate available slots in 10-minute intervals with fixed times (00, 10, 20, 30, 40, 50)
      const slots = [];
      const [startHour, startMinute] = schedule.start_time.split(':').map(Number);
      const [endHour, endMinute] = schedule.end_time.split(':').map(Number);
      
      const startTotalMinutes = startHour * 60 + startMinute;
      const endTotalMinutes = endHour * 60 + endMinute;
      
      // Start from the first fixed 10-minute interval at or after the schedule start time
      const firstSlotMinute = Math.ceil(startTotalMinutes / 10) * 10;
      
      // Generate slots every 10 minutes with fixed intervals
      for (let currentMinutes = firstSlotMinute; currentMinutes <= endTotalMinutes - serviceDurationMinutes; currentMinutes += 10) {
        const slotStartHour = Math.floor(currentMinutes / 60);
        const slotStartMinute = currentMinutes % 60;
        const slotEndMinutes = currentMinutes + serviceDurationMinutes;
        const slotEndHour = Math.floor(slotEndMinutes / 60);
        const slotEndMinute = slotEndMinutes % 60;
        
        const startTime = `${slotStartHour.toString().padStart(2, '0')}:${slotStartMinute.toString().padStart(2, '0')}`;
        const endTime = `${slotEndHour.toString().padStart(2, '0')}:${slotEndMinute.toString().padStart(2, '0')}`;
        
        // Check if slot conflicts with existing appointments
        const conflictExists = existingAppointments?.some(apt => {
          // Parse appointment times - removing seconds if present
          const aptStartTime = apt.start_time.includes('.') ? apt.start_time.split('.')[0] : apt.start_time;
          const aptEndTime = apt.end_time.includes('.') ? apt.end_time.split('.')[0] : apt.end_time;
          
          const aptStartMinutes = aptStartTime.split(':').slice(0, 2).map(Number).reduce((h, m) => h * 60 + m);
          const aptEndMinutes = aptEndTime.split(':').slice(0, 2).map(Number).reduce((h, m) => h * 60 + m);
          
          // Check for overlap: slot starts before appointment ends AND slot ends after appointment starts
          return currentMinutes < aptEndMinutes && slotEndMinutes > aptStartMinutes;
        });

        if (!conflictExists) {
          slots.push({
            start_time: startTime,
            end_time: endTime,
          });
        }
      }

      return slots;
    } catch (error) {
      console.error('Error getting available slots:', error);
      return [];
    }
  };

  useEffect(() => {
    fetchAppointments();
    
    // Setup realtime subscription for appointments updates
    if (!barbershopId) return;
    
    const channel = supabase
      .channel('appointments-changes')
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to all events (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'appointments',
          filter: `barbershop_id=eq.${barbershopId}`
        },
        (payload) => {
          console.log('🔄 Realtime appointment change:', payload);
          // Refetch appointments to get updated data with relations
          fetchAppointments();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [barbershopId]);

  const updateAppointmentStatus = async (appointmentId: string, status: string) => {
    const { data, error } = await supabase
      .from('appointments')
      .update({ status })
      .eq('id', appointmentId)
      .select()
      .single();

    if (error) throw error;
    
    setAppointments(prev => 
      prev.map(apt => apt.id === appointmentId ? { ...apt, status } : apt)
    );
    return data;
  };

  return {
    appointments,
    loading,
    createAppointment,
    updateAppointmentStatus,
    getAvailableSlots,
    refetch: fetchAppointments,
  };
};