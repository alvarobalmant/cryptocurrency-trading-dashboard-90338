import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { Database } from '@/integrations/supabase/types';

export type Employee = Database['public']['Tables']['employees']['Row'];
type EmployeeInsert = Database['public']['Tables']['employees']['Insert'];
type EmployeeUpdate = Database['public']['Tables']['employees']['Update'];

export const useEmployees = (barbershopId?: string) => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const fetchEmployees = async () => {
    if (!user || !barbershopId) return;

    try {
      const { data, error } = await supabase
        .from('employees')
        .select(`
          *,
          employee_schedules (
            day_of_week,
            start_time,
            end_time,
            is_active
          ),
          employee_breaks (
            id,
            start_time,
            end_time,
            title,
            break_type,
            day_of_week,
            specific_date,
            is_active
          )
        `)
        .eq('barbershop_id', barbershopId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      // Filter out deleted employees for normal operations, but keep them in database
      const activeEmployees = (data || []).filter(emp => emp.status !== 'deleted');
      setEmployees(activeEmployees);
    } catch (error) {
      console.error('Error fetching employees:', error);
    } finally {
      setLoading(false);
    }
  };

  const createEmployee = async (employeeData: Omit<EmployeeInsert, 'barbershop_id'>) => {
    if (!user || !barbershopId) throw new Error('User not authenticated or barbershop not selected');

    const { data, error } = await supabase
      .from('employees')
      .insert([
        {
          ...employeeData,
          barbershop_id: barbershopId,
          status: 'active', // Direct creation means active immediately
        },
      ])
      .select()
      .single();

    if (error) throw error;
    
    setEmployees(prev => [data, ...prev]);
    return data;
  };

  const updateEmployee = async (id: string, updates: EmployeeUpdate) => {
    const { data, error } = await supabase
      .from('employees')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    setEmployees(prev => 
      prev.map(employee => employee.id === id ? data : employee)
    );
    return data;
  };

  const deleteEmployee = async (id: string) => {
    // Soft delete - change status to 'deleted' instead of removing from database
    // This preserves historical data for analytics
    const { data, error } = await supabase
      .from('employees')
      .update({ status: 'deleted' })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    // Update local state to remove from active employees list
    setEmployees(prev => 
      prev.filter(employee => employee.id !== id)
    );
    
    return data;
  };

  useEffect(() => {
    fetchEmployees();

    if (!barbershopId) return;

    const channel = supabase
      .channel('employees-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'employees',
          filter: `barbershop_id=eq.${barbershopId}`,
        },
        () => {
          fetchEmployees();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, barbershopId]);

  return {
    employees,
    loading,
    createEmployee,
    updateEmployee,
    deleteEmployee,
    refetch: fetchEmployees,
  };
};