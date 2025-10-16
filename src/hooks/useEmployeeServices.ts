import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { Database } from '@/integrations/supabase/types';

export type EmployeeService = Database['public']['Tables']['employee_services']['Row'];
type EmployeeServiceInsert = Database['public']['Tables']['employee_services']['Insert'];

export type EmployeeWithServices = {
  employee: Database['public']['Tables']['employees']['Row'];
  services: Database['public']['Tables']['services']['Row'][];
};

export const useEmployeeServices = (barbershopId?: string) => {
  const [employeeServices, setEmployeeServices] = useState<EmployeeService[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const fetchEmployeeServices = async () => {
    if (!user || !barbershopId) return;

    try {
      const { data, error } = await supabase
        .from('employee_services')
        .select(`
          *,
          employees!inner(barbershop_id),
          services(*)
        `)
        .eq('employees.barbershop_id', barbershopId);

      if (error) throw error;
      setEmployeeServices(data || []);
    } catch (error) {
      console.error('Error fetching employee services:', error);
    } finally {
      setLoading(false);
    }
  };

  const assignServiceToEmployee = async (employeeId: string, serviceId: string) => {
    const { data, error } = await supabase
      .from('employee_services')
      .insert([
        {
          employee_id: employeeId,
          service_id: serviceId,
        },
      ])
      .select()
      .single();

    if (error) throw error;
    
    setEmployeeServices(prev => [data, ...prev]);
    return data;
  };

  const removeServiceFromEmployee = async (employeeId: string, serviceId: string) => {
    const { error } = await supabase
      .from('employee_services')
      .delete()
      .eq('employee_id', employeeId)
      .eq('service_id', serviceId);

    if (error) throw error;

    setEmployeeServices(prev => 
      prev.filter(es => !(es.employee_id === employeeId && es.service_id === serviceId))
    );
  };

  const getEmployeesWithServices = async () => {
    if (!barbershopId) return [];

    const { data: employees, error: employeesError } = await supabase
      .from('employees')
      .select('*')
      .eq('barbershop_id', barbershopId);

    if (employeesError) throw employeesError;

    const employeesWithServices: EmployeeWithServices[] = [];

    for (const employee of employees || []) {
      const { data: services, error: servicesError } = await supabase
        .from('employee_services')
        .select(`
          services(*)
        `)
        .eq('employee_id', employee.id);

      if (servicesError) throw servicesError;

      employeesWithServices.push({
        employee,
        services: services?.map(s => s.services).filter(Boolean) || [],
      });
    }

    return employeesWithServices;
  };

  useEffect(() => {
    fetchEmployeeServices();
  }, [user, barbershopId]);

  return {
    employeeServices,
    loading,
    assignServiceToEmployee,
    removeServiceFromEmployee,
    getEmployeesWithServices,
    refetch: fetchEmployeeServices,
  };
};