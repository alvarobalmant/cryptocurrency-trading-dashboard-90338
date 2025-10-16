import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

export type EmployeeAnalytics = {
  employeeId: string;
  employeeName: string;
  totalAppointments: number;
  confirmedAppointments: number;
  pendingAppointments: number;
  cancelledAppointments: number;
  totalRevenue: number;
  confirmedRevenue: number;
  pendingRevenue: number;
  cancelledRevenue: number;
  totalHours: number;
  averageServiceTime: number;
  status: string;
  topServices: Array<{
    serviceName: string;
    count: number;
    revenue: number;
  }>;
  hoursByDayOfWeek?: number[];        // [dom, seg, ter, qua, qui, sex, sab] - horas trabalhadas
  availableHoursByDayOfWeek?: number[]; // [dom, seg, ter, qua, qui, sex, sab] - horas disponíveis
};

export type BarbershopAnalytics = {
  // Revenue by status and payment
  receivedRevenue: number; // confirmed + paid
  pendingRevenue: number; // confirmed + pending payment
  futureRevenue: number; // pending appointments
  lostRevenue: number; // cancelled appointments
  
  // Owner's revenue (after commissions)
  ownerReceivedRevenue: number; // received - paid commissions
  ownerPendingRevenue: number; // pending - pending commissions  
  ownerProjectedRevenue: number; // total expected - all commissions
  
  // Legacy fields (for backward compatibility)
  totalRevenue: number;
  confirmedRevenue: number;
  cancelledRevenue: number;
  totalAppointments: number;
  confirmedAppointments: number;
  pendingAppointments: number;
  cancelledAppointments: number;
  totalHoursWorked: number;
  
  employeeAnalytics: EmployeeAnalytics[];
  periodStart: string;
  periodEnd: string;
};

export const useAnalytics = (barbershopId?: string, startDate?: string, endDate?: string, includeDeletedEmployees = false) => {
  const [analytics, setAnalytics] = useState<BarbershopAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchAnalytics = async () => {
    if (!barbershopId) return;

    try {
      setLoading(true);

      // Set default date range to include past 30 days and next 30 days
      const today = new Date();
      const end = endDate || new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]; // 30 days ahead
      const start = startDate || new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]; // 30 days back

      // Fetch appointments data (including all statuses for comprehensive analysis)
      const { data: appointmentsData, error: appointmentsError } = await supabase
        .from('appointments')
        .select('*')
        .eq('barbershop_id', barbershopId)
        .gte('appointment_date', start)
        .lte('appointment_date', end);

      if (appointmentsError) {
        console.error('Error fetching appointments:', appointmentsError);
        throw appointmentsError;
      }

      console.log('Appointments data:', appointmentsData);

      // Fetch employees and commission payments data
      const employeesQuery = supabase
        .from('employees')
        .select('id, name, commission_percentage, status')
        .eq('barbershop_id', barbershopId);
      
      if (!includeDeletedEmployees) {
        employeesQuery.eq('status', 'active');
      }
      
      const [
        { data: allEmployeesData, error: employeesError },
        { data: commissionPaymentsData, error: commissionPaymentsError }
      ] = await Promise.all([
        employeesQuery,
        supabase
          .from('commission_payments')
          .select('employee_id, amount, status')
          .eq('barbershop_id', barbershopId)
      ]);

      if (employeesError) {
        console.error('Error fetching employees:', employeesError);
        throw employeesError;
      }

      if (commissionPaymentsError) {
        console.error('Error fetching commission payments:', commissionPaymentsError);
        throw commissionPaymentsError;
      }

      console.log('Employees data:', allEmployeesData);

      const { data: servicesData, error: servicesError } = await supabase
        .from('services')
        .select('id, name, price, duration_minutes')
        .eq('barbershop_id', barbershopId);

      if (servicesError) {
        console.error('Error fetching services:', servicesError);
        throw servicesError;
      }

      console.log('Services data:', servicesData);

      // Create lookup maps 
      const employeesMap = new Map(allEmployeesData?.map(emp => [emp.id, emp]) || []);
      const servicesMap = new Map(servicesData?.map(srv => [srv.id, srv]) || []);
      
      // Create commission payments map by employee
      const commissionPaymentsMap = new Map<string, { paid: number; cancelled: number }>();
      commissionPaymentsData?.forEach(payment => {
        if (!commissionPaymentsMap.has(payment.employee_id)) {
          commissionPaymentsMap.set(payment.employee_id, { paid: 0, cancelled: 0 });
        }
        const empPayments = commissionPaymentsMap.get(payment.employee_id)!;
        
        if (payment.status === 'paid') {
          empPayments.paid += Number(payment.amount) || 0;
        } else if (payment.status === 'cancelled') {
          empPayments.cancelled += Number(payment.amount) || 0;
        }
      });

      // Calculate analytics with status breakdown
      const employeeStatsMap = new Map<string, {
        employeeId: string;
        employeeName: string;
        commissionPercentage: number;
        appointments: number;
        confirmedAppointments: number;
        pendingAppointments: number;
        cancelledAppointments: number;
        revenue: number;
        confirmedRevenue: number;
        pendingRevenue: number;
        receivedRevenue: number; // confirmed + paid
        hours: number;
        services: Map<string, { name: string; count: number; revenue: number }>;
        status: string;
      }>();

      // Revenue categories
      let receivedRevenue = 0; // confirmed + paid
      let pendingRevenue = 0; // confirmed + pending payment
      let futureRevenue = 0; // pending appointments
      let lostRevenue = 0; // cancelled
      
      // Legacy totals
      let totalRevenue = 0;
      let confirmedRevenue = 0;
      let cancelledRevenue = 0;
      let totalAppointments = 0;
      let confirmedAppointments = 0;
      let pendingAppointments = 0;
      let cancelledAppointments = 0;
      let totalHours = 0;

      // Initialize employees in the map based on filter preference
      allEmployeesData?.forEach(employee => {
        // Skip if not including deleted employees and employee is deleted
        if (!includeDeletedEmployees && employee.status === 'deleted') {
          return;
        }
        
        if (!employeeStatsMap.has(employee.id)) {
          employeeStatsMap.set(employee.id, {
            employeeId: employee.id,
            employeeName: employee.name,
            commissionPercentage: Number(employee.commission_percentage) || 0,
            appointments: 0,
            confirmedAppointments: 0,
            pendingAppointments: 0,
            cancelledAppointments: 0,
            revenue: 0,
            confirmedRevenue: 0,
            pendingRevenue: 0,
            cancelledRevenue: 0,
            receivedRevenue: 0,
            hours: 0,
            services: new Map(),
            status: employee.status,
          });
        }
      });

      // Process appointments with proper filtering
      appointmentsData?.forEach((appointment) => {
        let employee = employeesMap.get(appointment.employee_id);
        const service = servicesMap.get(appointment.service_id);
        
        // Skip appointments from deleted employees if not including them
        if (!includeDeletedEmployees && employee?.status === 'deleted') {
          return;
        }
        
        // If employee doesn't exist and we're including deleted employees, create a ghost record
        if (!employee && includeDeletedEmployees) {
          console.log('Creating ghost employee record for deleted employee:', appointment.employee_id);
          
          const estimatedCommission = 30; // Default 30% commission for deleted employees
          
          employee = {
            id: appointment.employee_id,
            name: `Funcionário Excluído (${appointment.employee_id.slice(0, 8)})`,
            commission_percentage: estimatedCommission,
            status: 'deleted'
          };
          employeesMap.set(appointment.employee_id, employee);
        } else if (!employee) {
          // Skip appointments from unknown employees when not including deleted
          return;
        }
        
        console.log('Processing appointment:', {
          appointmentId: appointment.id,
          employeeId: appointment.employee_id,
          serviceId: appointment.service_id,
          employee: employee ? employee.name : 'NOT FOUND',
          service: service ? service.name : 'NOT FOUND'
        });
        
        if (!service) {
          console.warn('Skipping appointment - missing service:', {
            hasEmployee: !!employee,
            hasService: !!service,
            appointment
          });
          return;
        }

        const revenue = Number(service.price) || 0;
        const duration = service.duration_minutes || 0;
        const hours = duration / 60;
        const appointmentStatus = appointment.status || 'pending';
        const paymentStatus = appointment.payment_status || 'pending';

        // Update overall stats
        totalRevenue += revenue;
        totalHours += hours;
        totalAppointments += 1;

        // New revenue categorization
        if (appointmentStatus === 'confirmed' && paymentStatus === 'paid') {
          receivedRevenue += revenue; // Dinheiro que realmente entrou
        } else if (appointmentStatus === 'confirmed' && paymentStatus === 'pending') {
          pendingRevenue += revenue; // Serviços feitos mas não pagos
        } else if (appointmentStatus === 'pending') {
          futureRevenue += revenue; // Agendamentos futuros
        } else if (appointmentStatus === 'cancelled' || appointmentStatus === 'no_show' || paymentStatus === 'failed') {
          lostRevenue += revenue; // Cancelamentos/falhas
        }

        // Legacy status-specific stats
        if (appointmentStatus === 'confirmed') {
          confirmedRevenue += revenue;
          confirmedAppointments += 1;
        } else if (appointmentStatus === 'pending') {
          pendingAppointments += 1;
        } else if (appointmentStatus === 'cancelled' || appointmentStatus === 'no_show') {
          cancelledRevenue += revenue;
          cancelledAppointments += 1;
        }

        // Initialize employee in stats map if not exists
        if (!employeeStatsMap.has(employee.id)) {
          employeeStatsMap.set(employee.id, {
            employeeId: employee.id,
            employeeName: employee.name,
            commissionPercentage: Number(employee.commission_percentage) || 0,
            appointments: 0,
            confirmedAppointments: 0,
            pendingAppointments: 0,
            cancelledAppointments: 0,
            revenue: 0,
            confirmedRevenue: 0,
            pendingRevenue: 0,
            cancelledRevenue: 0,
            receivedRevenue: 0,
            hours: 0,
            services: new Map(),
            status: employee.status,
          });
        }

        const empStats = employeeStatsMap.get(employee.id)!;
        empStats.appointments += 1;
        empStats.revenue += revenue;
        empStats.hours += hours;

        // Update employee revenue categories
        if (appointmentStatus === 'confirmed' && paymentStatus === 'paid') {
          empStats.receivedRevenue += revenue;
        }

        // Update employee status-specific stats
        if (appointmentStatus === 'confirmed') {
          empStats.confirmedAppointments += 1;
          empStats.confirmedRevenue += revenue;
        } else if (appointmentStatus === 'pending') {
          empStats.pendingAppointments += 1;
          empStats.pendingRevenue += revenue;
        } else if (appointmentStatus === 'cancelled' || appointmentStatus === 'no_show') {
          empStats.cancelledAppointments += 1;
          empStats.cancelledRevenue += revenue;
        }

        // Track services
        if (!empStats.services.has(service.id)) {
          empStats.services.set(service.id, {
            name: service.name,
            count: 0,
            revenue: 0,
          });
        }
        
        const serviceStats = empStats.services.get(service.id)!;
        serviceStats.count += 1;
        serviceStats.revenue += revenue;
      });

      console.log('Final employee stats:', Array.from(employeeStatsMap.values()));

      // Convert to analytics format - include ALL employees with activity (active, inactive, deleted)
      const employeeAnalytics: EmployeeAnalytics[] = Array.from(employeeStatsMap.values())
        .filter(empStats => {
          // Show employees with appointments
          return empStats.appointments > 0;
        })
        .map(empStats => {
          // Get top 3 services
          const topServices = Array.from(empStats.services.values())
            .sort((a, b) => b.revenue - a.revenue)
            .slice(0, 3)
            .map(service => ({
              serviceName: service.name,
              count: service.count,
              revenue: service.revenue,
            }));

          return {
            employeeId: empStats.employeeId,
            employeeName: empStats.employeeName,
            totalAppointments: empStats.appointments,
            confirmedAppointments: empStats.confirmedAppointments,
            pendingAppointments: empStats.pendingAppointments,
            cancelledAppointments: empStats.cancelledAppointments,
            totalRevenue: empStats.revenue,
            confirmedRevenue: empStats.confirmedRevenue,
            pendingRevenue: empStats.pendingRevenue,
            cancelledRevenue: empStats.cancelledRevenue || 0,
            totalHours: empStats.hours,
            averageServiceTime: empStats.appointments > 0 ? empStats.hours / empStats.appointments : 0,
            status: empStats.status,
            topServices,
          };
        });

      console.log('Analytics calculation:', {
        totalRevenue,
        totalAppointments: appointmentsData?.length || 0,
        totalEmployees: employeeAnalytics.length,
        employeeAnalytics
      });
      
      const finalAnalytics = {
        // New clearer revenue categories
        receivedRevenue,
        pendingRevenue,
        futureRevenue,
        lostRevenue,
        
        // Owner's revenue calculations
        ownerReceivedRevenue: receivedRevenue,
        ownerPendingRevenue: pendingRevenue,
        ownerProjectedRevenue: receivedRevenue + pendingRevenue + futureRevenue,
        
        // Legacy fields for backward compatibility
        totalRevenue,
        confirmedRevenue,
        cancelledRevenue,
        totalAppointments,
        confirmedAppointments,
        pendingAppointments,
        cancelledAppointments,
        totalHoursWorked: totalHours,
        employeeAnalytics,
        
        periodStart: start,
        periodEnd: end,
      };

      console.log('Final analytics:', finalAnalytics);
      setAnalytics(finalAnalytics);

    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [barbershopId, startDate, endDate]);

  return {
    analytics,
    loading,
    refetch: fetchAnalytics,
  };
};