import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import type { EmployeeAnalytics } from './useAnalytics';

// ====== ENTERPRISE METRICS INTERFACES ======

export interface CashFlowData {
  // Entradas
  receivedRevenue: number;        // confirmed + paid
  pendingRevenue: number;         // confirmed + pending payment
  futureRevenue: number;          // pending appointments
  lostRevenue: number;            // cancelled + no_show + failed
  subscriptionMRR: number;
  
  // Saídas
  paidCommissions: number;
  productCosts: number;
  purchaseOrderCosts: number;
  saasCosts: number;
  
  // Métricas
  netCashFlow: number;
  burnRate: number;
  runway: number;
  cashOnHand: number;
  projectedCashFlow: number;
}

export interface ProfitabilityData {
  grossRevenue: number;
  netRevenue: number;
  cogs: number;
  laborCosts: number;
  operationalCosts: number;
  grossProfit: number;
  grossMargin: number;
  netProfit: number;
  netMargin: number;
  ebitda: number;
}

export interface ClientMetrics {
  avgAppointmentsPerClient: number;
  avgRevenuePerAppointment: number;
  avgClientLifespan: number;
  clv: number;
  cac: number;
  ltv_cac_ratio: number;
  retentionRate: number;
  churnRate: number;
  repeatRate: number;
  newClients: number;
  returningClients: number;
  vipClients: number;
  atRiskClients: number;
  totalUniqueClients: number;
}

export interface OperationalMetrics {
  employeeUtilization: number;
  avgWaitTime: number;
  appointmentsPerDay: number;
  revenuePerHour: number;
  servicesPerEmployee: number;
  noShowRate: number;
  cancellationRate: number;
  onTimeRate: number;
  inventoryTurnover: number;
  stockoutRate: number;
}

export interface RevenueBySource {
  services: number;
  products: number;
  subscriptions: number;
  tabs: number;
}

export interface PaymentMethodBreakdown {
  pix: number;
  card: number;
  cash: number;
  subscription: number;
}

export interface ComprehensiveAnalytics {
  cashFlow: CashFlowData;
  profitability: ProfitabilityData;
  clients: ClientMetrics;
  operational: OperationalMetrics;
  revenueBySource: RevenueBySource;
  paymentMethods: PaymentMethodBreakdown;
  employeeAnalytics: EmployeeAnalytics[];
  periodStart: string;
  periodEnd: string;
  historicalData: {
    monthlyRevenue: Array<[string, number]>;
    monthlyCosts: Array<[string, number]>;
    monthlyMargins: Array<{ month: string; grossMargin: number }>;
    monthlyClients: Array<[string, number]>;
    monthlyNewClients: Array<[string, number]>;
    monthlyCAC: Array<[string, number]>;
    monthlyCLV: Array<[string, number]>;
    cohorts: Array<{
      month: string;
      newClients: number;
      retentionByMonth: number[];
    }>;
    segmentCLV: {
      vip: number;
      regular: number;
      new: number;
    };
  };
}

export const useComprehensiveAnalytics = (
  barbershopId?: string,
  startDate?: string,
  endDate?: string
) => {
  return useQuery({
    queryKey: ['comprehensive-analytics', barbershopId, startDate, endDate],
    queryFn: async () => {
      if (!barbershopId) throw new Error('Barbershop ID required');

      const today = new Date();
      const end = endDate || new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const start = startDate || new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      // Calculate historical period (last 6 months)
      const sixMonthsAgo = new Date(start);
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      const historicalStart = sixMonthsAgo.toISOString().split('T')[0];

      // Fetch all data in parallel for maximum performance
      const [
        appointmentsRes,
        paymentsRes,
        productsRes,
        inventoryTransactionsRes,
        purchaseOrdersRes,
        tabsRes,
        tabItemsRes,
        clientSubscriptionsRes,
        barbershopSubscriptionsRes,
        commissionPaymentsRes,
        commissionPeriodsRes,
        employeesRes,
        servicesRes,
        clientProfilesRes,
        historicalAppointmentsRes,
        historicalPaymentsRes,
        historicalCommissionsRes,
        historicalPeriodsRes,
        employeeSchedulesRes
      ] = await Promise.all([
        supabase.from('appointments').select('*').eq('barbershop_id', barbershopId).gte('appointment_date', start).lte('appointment_date', end),
        supabase.from('payments').select('*').eq('barbershop_id', barbershopId).gte('created_at', start).lte('created_at', end),
        supabase.from('products').select('*').eq('barbershop_id', barbershopId),
        supabase.from('inventory_transactions').select('*').eq('barbershop_id', barbershopId).gte('created_at', start).lte('created_at', end),
        supabase.from('purchase_orders').select('*').eq('barbershop_id', barbershopId).gte('created_at', start).lte('created_at', end),
        supabase.from('tabs').select('*').eq('barbershop_id', barbershopId).gte('created_at', start).lte('created_at', end),
        supabase.from('tab_items').select('*, tabs!inner(barbershop_id, created_at)').eq('tabs.barbershop_id', barbershopId),
        supabase.from('client_subscriptions').select('*').eq('barbershop_id', barbershopId).gte('created_at', start).lte('created_at', end),
        supabase.from('barbershop_subscriptions').select('*').eq('barbershop_id', barbershopId).gte('created_at', start).lte('created_at', end),
        supabase.from('commission_payments').select('*').eq('barbershop_id', barbershopId),
        supabase.from('commission_periods').select('*').eq('barbershop_id', barbershopId),
        supabase.from('employees').select('*').eq('barbershop_id', barbershopId),
        supabase.from('services').select('*').eq('barbershop_id', barbershopId),
        supabase.from('client_profiles').select('*').eq('barbershop_id', barbershopId),
        supabase.from('appointments').select('*').eq('barbershop_id', barbershopId).gte('appointment_date', historicalStart).lte('appointment_date', end),
        supabase.from('payments').select('*').eq('barbershop_id', barbershopId).gte('created_at', historicalStart).lte('created_at', end),
        supabase.from('commission_payments').select('*').eq('barbershop_id', barbershopId).gte('created_at', historicalStart).lte('created_at', end),
        supabase.from('commission_periods').select('*').eq('barbershop_id', barbershopId).gte('created_at', historicalStart).lte('created_at', end),
        supabase.from('employee_schedules').select('employee_id, day_of_week, start_time, end_time, is_active').eq('is_active', true)
      ]);

      const appointments = appointmentsRes.data || [];
      const payments = paymentsRes.data || [];
      const products = productsRes.data || [];
      const inventoryTransactions = inventoryTransactionsRes.data || [];
      const purchaseOrders = purchaseOrdersRes.data || [];
      const tabs = tabsRes.data || [];
      const tabItems = tabItemsRes.data || [];
      const clientSubscriptions = clientSubscriptionsRes.data || [];
      const barbershopSubscriptions = barbershopSubscriptionsRes.data || [];
      const commissionPayments = commissionPaymentsRes.data || [];
      const commissionPeriods = commissionPeriodsRes.data || [];
      const employees = employeesRes.data || [];
      const services = servicesRes.data || [];
      const clientProfiles = clientProfilesRes.data || [];
      const historicalAppointments = historicalAppointmentsRes.data || [];
      const historicalPayments = historicalPaymentsRes.data || [];
      const historicalCommissions = historicalCommissionsRes.data || [];
      const historicalPeriods = historicalPeriodsRes.data || [];
      const employeeSchedules = employeeSchedulesRes.data || [];

      // ===== CALCULATE AVAILABLE HOURS BY DAY OF WEEK =====
      const employeeAvailableHoursMap = new Map<string, number[]>();
      
      employeeSchedules.forEach(schedule => {
        if (!employeeAvailableHoursMap.has(schedule.employee_id)) {
          employeeAvailableHoursMap.set(schedule.employee_id, [0, 0, 0, 0, 0, 0, 0]);
        }
        
        const availableHours = employeeAvailableHoursMap.get(schedule.employee_id)!;
        
        // Calcular horas entre start_time e end_time
        const [startHour, startMin] = schedule.start_time.split(':').map(Number);
        const [endHour, endMin] = schedule.end_time.split(':').map(Number);
        
        const hoursWorked = (endHour + endMin / 60) - (startHour + startMin / 60);
        
        // Somar ao dia da semana correspondente
        availableHours[schedule.day_of_week] += hoursWorked;
      });

      // ===== CASH FLOW CALCULATIONS =====
      const receivedRevenue = payments
        .filter(p => p.status === 'paid' && p.payment_source !== 'subscription')
        .reduce((sum, p) => sum + (Number(p.net_received_amount) || Number(p.amount) || 0), 0);

      const pendingRevenue = appointments
        .filter(a => a.status === 'confirmed' && a.payment_status === 'pending')
        .reduce((sum, a) => {
          const service = services.find(s => s.id === a.service_id);
          return sum + (Number(service?.price) || 0);
        }, 0);

      const futureRevenue = appointments
        .filter(a => a.status === 'pending')
        .reduce((sum, a) => {
          const service = services.find(s => s.id === a.service_id);
          return sum + (Number(service?.price) || 0);
        }, 0);

      const lostRevenue = appointments
        .filter(a => a.status === 'cancelled' || a.status === 'no_show' || a.payment_status === 'failed')
        .reduce((sum, a) => {
          const service = services.find(s => s.id === a.service_id);
          return sum + (Number(service?.price) || 0);
        }, 0);

      const subscriptionMRR = clientSubscriptions
        .filter(s => s.status === 'active')
        .reduce((sum, s) => sum + (Number(s.amount_paid) || 0), 0);

    // Comissões pagas = pagamentos individuais + períodos pagos
    const individualPayments = commissionPayments
      .filter(c => c.status === 'paid' && !c.commission_period_id)
      .reduce((sum, c) => sum + (Number(c.amount) || 0), 0);

    const periodPayments = commissionPeriods
      .filter(p => p.status === 'paid')
      .reduce((sum, p) => sum + (Number(p.net_amount) || 0), 0);

    const paidCommissions = individualPayments + periodPayments;

      const productCosts = inventoryTransactions
        .filter(t => t.transaction_type === 'OUT')
        .reduce((sum, t) => sum + (Number(t.unit_cost) || 0) * (Number(t.quantity) || 0), 0);

      const purchaseOrderCosts = purchaseOrders
        .filter(po => po.status === 'completed' || po.status === 'received')
        .reduce((sum, po) => sum + (Number(po.total) || 0), 0);

      const saasCosts = barbershopSubscriptions
        .filter(s => s.status === 'paid')
        .reduce((sum, s) => sum + (Number(s.amount_paid) || 0), 0);

      const totalOutflow = paidCommissions + productCosts + purchaseOrderCosts + saasCosts;
      const netCashFlow = receivedRevenue - totalOutflow;
      const burnRate = totalOutflow / ((new Date(end).getTime() - new Date(start).getTime()) / (30 * 24 * 60 * 60 * 1000));
      // Cash on Hand = Receita Paga - Custos Pagos (dinheiro realmente disponível)
      const cashOnHand = receivedRevenue - totalOutflow;
      const runway = burnRate > 0 ? cashOnHand / burnRate : 999;

      const cashFlow: CashFlowData = {
        receivedRevenue,
        pendingRevenue,
        futureRevenue,
        lostRevenue,
        subscriptionMRR,
        paidCommissions,
        productCosts,
        purchaseOrderCosts,
        saasCosts,
        netCashFlow,
        burnRate,
        runway,
        cashOnHand,
        projectedCashFlow: netCashFlow + futureRevenue
      };

      // ===== PROFITABILITY CALCULATIONS =====
      // CORRIGIDO: Usar apenas payments PAID
      const paidPayments = payments.filter(p => p.status === 'paid' && (Number(p.amount) || 0) > 0);
      const confirmedRevenue = paidPayments.reduce((sum, p) => 
        sum + (Number(p.net_received_amount) || Number(p.amount) || 0), 0
      );
      const grossRevenue = confirmedRevenue + pendingRevenue + futureRevenue;
      const netRevenue = confirmedRevenue;
      const cogs = productCosts;
      
      // Labor costs = comissões pagas + comissões pendentes
      const pendingIndividualCommissions = commissionPayments
        .filter(c => c.status === 'pending' && !c.commission_period_id)
        .reduce((sum, c) => sum + (Number(c.amount) || 0), 0);
      
      const laborCosts = paidCommissions + pendingIndividualCommissions;
      const operationalCosts = saasCosts + purchaseOrderCosts;
      const grossProfit = grossRevenue - cogs;
      const grossMargin = grossRevenue > 0 ? (grossProfit / grossRevenue) * 100 : 0;
      const netProfit = netRevenue - cogs - laborCosts - operationalCosts;
      const netMargin = netRevenue > 0 ? (netProfit / netRevenue) * 100 : 0;
      const ebitda = grossProfit - laborCosts;

      const profitability: ProfitabilityData = {
        grossRevenue,
        netRevenue,
        cogs,
        laborCosts,
        operationalCosts,
        grossProfit,
        grossMargin,
        netProfit,
        netMargin,
        ebitda
      };

      // ===== CLIENT METRICS CALCULATIONS =====
      const totalUniqueClients = new Set(appointments.map(a => a.client_phone)).size;
      const avgAppointmentsPerClient = totalUniqueClients > 0 ? appointments.length / totalUniqueClients : 0;
      const avgRevenuePerAppointment = appointments.length > 0 ? confirmedRevenue / appointments.length : 0;
      
      // Calculate real avgClientLifespan
      const clientLifespans = Array.from(
        historicalAppointments.reduce((map, a) => {
          const existing = map.get(a.client_phone) || { first: a.appointment_date, last: a.appointment_date };
          map.set(a.client_phone, {
            first: a.appointment_date < existing.first ? a.appointment_date : existing.first,
            last: a.appointment_date > existing.last ? a.appointment_date : existing.last
          });
          return map;
        }, new Map())
      ).map(([_, dates]) => {
        const months = (new Date(dates.last).getTime() - new Date(dates.first).getTime()) / (30 * 24 * 60 * 60 * 1000);
        return Math.max(1, months);
      });
      const avgClientLifespan = clientLifespans.length > 0 
        ? clientLifespans.reduce((sum, val) => sum + val, 0) / clientLifespans.length 
        : 6;

      // Calculate clientsWithMultipleAppointments first
      const clientsWithMultipleAppointments = Array.from(
        appointments.reduce((map, a) => {
          const count = map.get(a.client_phone) || 0;
          map.set(a.client_phone, count + 1);
          return map;
        }, new Map<string, number>())
      ).filter(([_, count]) => count > 1).length;

      const retentionRate = totalUniqueClients > 0 ? (clientsWithMultipleAppointments / totalUniqueClients) * 100 : 0;
      const churnRate = 100 - retentionRate;
      const repeatRate = retentionRate;

      const newClients = Array.from(
        appointments.reduce((map, a) => {
          const count = map.get(a.client_phone) || 0;
          map.set(a.client_phone, count + 1);
          return map;
        }, new Map<string, number>())
      ).filter(([_, count]) => count === 1).length;

      const returningClients = clientsWithMultipleAppointments;

      // Calculate CLV and CAC after newClients is defined
      const clv = avgAppointmentsPerClient * avgRevenuePerAppointment * avgClientLifespan;
      const marketingCost = grossRevenue * 0.10;
      const cac = newClients > 0 ? marketingCost / newClients : 0;
      const ltv_cac_ratio = cac > 0 ? clv / cac : 0;

      // VIP clients: top 20% by revenue
      const clientRevenue = appointments.reduce((map, a) => {
        const service = services.find(s => s.id === a.service_id);
        const revenue = Number(service?.price) || 0;
        const current = map.get(a.client_phone) || 0;
        map.set(a.client_phone, current + revenue);
        return map;
      }, new Map<string, number>());

      const sortedClients = Array.from(clientRevenue.entries()).sort((a, b) => b[1] - a[1]);
      const vipClients = Math.ceil(sortedClients.length * 0.2);

      // At-risk clients: no appointment in last 60 days
      const sixtyDaysAgo = new Date();
      sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
      const recentClients = new Set(
        appointments
          .filter(a => new Date(a.appointment_date) > sixtyDaysAgo)
          .map(a => a.client_phone)
      );
      const atRiskClients = totalUniqueClients - recentClients.size;

      const clients: ClientMetrics = {
        avgAppointmentsPerClient,
        avgRevenuePerAppointment,
        avgClientLifespan,
        clv,
        cac,
        ltv_cac_ratio,
        retentionRate,
        churnRate,
        repeatRate,
        newClients,
        returningClients,
        vipClients,
        atRiskClients,
        totalUniqueClients
      };

      // ===== OPERATIONAL METRICS =====
      const totalDays = (new Date(end).getTime() - new Date(start).getTime()) / (24 * 60 * 60 * 1000);
      const appointmentsPerDay = totalDays > 0 ? appointments.length / totalDays : 0;
      
      const totalHoursWorked = appointments.reduce((sum, a) => {
        const service = services.find(s => s.id === a.service_id);
        return sum + ((Number(service?.duration_minutes) || 0) / 60);
      }, 0);

      const revenuePerHour = totalHoursWorked > 0 ? grossRevenue / totalHoursWorked : 0;
      const servicesPerEmployee = employees.length > 0 ? appointments.length / employees.length : 0;
      
      const noShowRate = appointments.length > 0
        ? (appointments.filter(a => a.status === 'no_show').length / appointments.length) * 100
        : 0;
      
      const cancellationRate = appointments.length > 0
        ? (appointments.filter(a => a.status === 'cancelled').length / appointments.length) * 100
        : 0;

      const confirmedAppointments = appointments.filter(a => a.status === 'confirmed');
      const onTimeRate = confirmedAppointments.length > 0
        ? (confirmedAppointments.length / (confirmedAppointments.length + appointments.filter(a => a.status === 'no_show').length)) * 100
        : 100;

      // Calculate real employeeUtilization
      const workingDays = totalDays * 6 / 7;
      const hoursPerDay = 9;
      const totalAvailableHours = employees.filter(e => e.status === 'active').length * workingDays * hoursPerDay;
      const employeeUtilization = totalAvailableHours > 0 ? (totalHoursWorked / totalAvailableHours) * 100 : 0;

      // Calculate real avgWaitTime
      const waitTimes: number[] = [];
      const appointmentsByDate = appointments.reduce((map, a) => {
        const date = a.appointment_date;
        if (!map.has(date)) map.set(date, []);
        map.get(date)!.push(a);
        return map;
      }, new Map());

      appointmentsByDate.forEach(dayAppts => {
        const sorted = dayAppts.sort((a, b) => a.start_time.localeCompare(b.start_time));
        for (let i = 1; i < sorted.length; i++) {
          const prevEnd = sorted[i-1].end_time;
          const currStart = sorted[i].start_time;
          const wait = (new Date(`2000-01-01 ${currStart}`).getTime() - new Date(`2000-01-01 ${prevEnd}`).getTime()) / (60 * 1000);
          if (wait > 0) waitTimes.push(wait);
        }
      });

      const avgWaitTime = waitTimes.length > 0 ? waitTimes.reduce((sum, val) => sum + val, 0) / waitTimes.length : 0;
      
      const inventoryTurnover = 6; // Keep simplified for now
      const stockoutRate = 2; // Keep simplified for now

      const operational: OperationalMetrics = {
        employeeUtilization,
        avgWaitTime,
        appointmentsPerDay,
        revenuePerHour,
        servicesPerEmployee,
        noShowRate,
        cancellationRate,
        onTimeRate,
        inventoryTurnover,
        stockoutRate
      };

      // ===== REVENUE BY SOURCE =====
      const servicesRevenue = payments
        .filter(p => p.payment_source === 'direct' || p.payment_source === 'appointment')
        .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

      // Calculate real productsRevenue from tab_items
      const productsRevenue = tabItems
        .filter(item => item.item_type === 'product')
        .reduce((sum, item) => sum + (Number(item.price) || 0), 0);

      const subscriptionsRevenue = clientSubscriptions
        .filter(s => s.status === 'active')
        .reduce((sum, s) => sum + (Number(s.amount_paid) || 0), 0);

      const tabsRevenue = tabs
        .filter(t => t.status === 'closed')
        .reduce((sum, t) => sum + (Number(t.total_amount) || 0), 0);

      const revenueBySource: RevenueBySource = {
        services: servicesRevenue,
        products: productsRevenue,
        subscriptions: subscriptionsRevenue,
        tabs: tabsRevenue
      };

      // ===== PAYMENT METHODS =====
      const paymentsByMethod = payments.reduce((acc, p) => {
        const method = p.payment_method || 'unknown';
        if (method.includes('pix')) acc.pix += Number(p.amount) || 0;
        else if (method.includes('card') || method.includes('credit') || method.includes('debit')) acc.card += Number(p.amount) || 0;
        else if (method.includes('cash') || method.includes('dinheiro')) acc.cash += Number(p.amount) || 0;
        else if (p.payment_source === 'subscription') acc.subscription += Number(p.amount) || 0;
        return acc;
      }, { pix: 0, card: 0, cash: 0, subscription: 0 });

      const paymentMethods: PaymentMethodBreakdown = paymentsByMethod;

      // ===== EMPLOYEE ANALYTICS =====
      const employeesMap = new Map(employees?.map(emp => [emp.id, emp]) || []);
      const servicesMap = new Map(services?.map(srv => [srv.id, srv]) || []);
      
      // Create commission payments map by employee
      const commissionPaymentsMap = new Map<string, { paid: number; cancelled: number }>();
      commissionPayments?.forEach(payment => {
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
        cancelledRevenue: number;
        hours: number;
        services: Map<string, { name: string; count: number; revenue: number }>;
        status: string;
      }>();

      // Initialize employees in the map
      employees?.forEach(employee => {
        if (employee.status === 'active') {
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
            hours: 0,
            services: new Map(),
            status: employee.status,
          });
        }
      });

      // ===== CALCULATE HOURS WORKED BY DAY OF WEEK =====
      const employeeWorkedHoursByDay = new Map<string, number[]>();

      // Process appointments for employee analytics
      appointments?.forEach((appointment) => {
        const employee = employeesMap.get(appointment.employee_id);
        const service = servicesMap.get(appointment.service_id);
        
        if (!employee || employee.status === 'deleted' || !service) return;

        const revenue = Number(service.price) || 0;
        const duration = service.duration_minutes || 0;
        const hours = duration / 60;
        const appointmentStatus = appointment.status || 'pending';
        const paymentStatus = appointment.payment_status || 'pending';
        
        // Track worked hours by day of week (only confirmed/completed)
        if (appointmentStatus === 'confirmed' || appointmentStatus === 'completed') {
          const appointmentDate = new Date(appointment.appointment_date);
          const dayOfWeek = appointmentDate.getDay(); // 0=domingo, 1=segunda, ..., 6=sábado
          
          if (!employeeWorkedHoursByDay.has(employee.id)) {
            employeeWorkedHoursByDay.set(employee.id, [0, 0, 0, 0, 0, 0, 0]);
          }
          
          const workedHours = employeeWorkedHoursByDay.get(employee.id)!;
          workedHours[dayOfWeek] += hours;
        }

        // Initialize employee if not exists
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
            hours: 0,
            services: new Map(),
            status: employee.status,
          });
        }

        const empStats = employeeStatsMap.get(employee.id)!;
        empStats.appointments += 1;
        empStats.revenue += revenue;
        empStats.hours += hours;

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

      // Convert to analytics format
      const employeeAnalytics: EmployeeAnalytics[] = Array.from(employeeStatsMap.values())
        .filter(empStats => {
          const hasAppointments = empStats.appointments > 0;
          const isActiveWithCommission = empStats.status === 'active' && empStats.commissionPercentage > 0;
          return hasAppointments || isActiveWithCommission;
        })
        .map(empStats => {
          const empPayments = commissionPaymentsMap.get(empStats.employeeId) || { paid: 0, cancelled: 0 };
          
          const totalCommissionOnConfirmed = (empStats.confirmedRevenue * empStats.commissionPercentage) / 100;
          const actualPaidCommissions = empPayments.paid;
          const confirmedPendingCommissions = Math.max(0, totalCommissionOnConfirmed - actualPaidCommissions);
          const futureCommissionOnPending = (empStats.pendingRevenue * empStats.commissionPercentage) / 100;
          
          const commissionEarned = actualPaidCommissions + confirmedPendingCommissions;
          const pendingCommission = futureCommissionOnPending;

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
            cancelledRevenue: empStats.cancelledRevenue,
            totalHours: empStats.hours,
            averageServiceTime: empStats.appointments > 0 ? empStats.hours / empStats.appointments : 0,
            commissionEarned,
            pendingCommission,
            commissionPercentage: empStats.commissionPercentage,
            status: empStats.status,
            topServices,
            hoursByDayOfWeek: employeeWorkedHoursByDay.get(empStats.employeeId) || [0, 0, 0, 0, 0, 0, 0],
            availableHoursByDayOfWeek: employeeAvailableHoursMap.get(empStats.employeeId) || [0, 0, 0, 0, 0, 0, 0],
          };
        });

      // ===== HISTORICAL DATA CALCULATIONS =====
      // Group historical data by month
      const monthlyStats = new Map<string, {
        revenue: number;
        costs: number;
        clients: Set<string>;
        newClients: Set<string>;
        appointmentsByClient: Map<string, number>;
      }>();

      historicalAppointments.forEach(appt => {
        const monthKey = appt.appointment_date.substring(0, 7); // YYYY-MM
        if (!monthlyStats.has(monthKey)) {
          monthlyStats.set(monthKey, {
            revenue: 0,
            costs: 0,
            clients: new Set(),
            newClients: new Set(),
            appointmentsByClient: new Map()
          });
        }
        const stats = monthlyStats.get(monthKey)!;
        const service = services.find(s => s.id === appt.service_id);
        const revenue = Number(service?.price) || 0;
        
        stats.revenue += revenue;
        stats.clients.add(appt.client_phone);
        
        // Track appointments per client
        const clientAppts = stats.appointmentsByClient.get(appt.client_phone) || 0;
        stats.appointmentsByClient.set(appt.client_phone, clientAppts + 1);
      });

      // Add costs from historical commissions (payments individuais + períodos)
      historicalCommissions.forEach(comm => {
        const monthKey = comm.created_at.substring(0, 7);
        if (monthlyStats.has(monthKey) && comm.status === 'paid' && !comm.commission_period_id) {
          monthlyStats.get(monthKey)!.costs += Number(comm.amount) || 0;
        }
      });

      // Add costs from historical periods (períodos pagos)
      historicalPeriods.forEach(period => {
        if (period.status === 'paid' && period.paid_at) {
          const monthKey = period.paid_at.substring(0, 7);
          if (monthlyStats.has(monthKey)) {
            monthlyStats.get(monthKey)!.costs += Number(period.net_amount) || 0;
          }
        }
      });

      // Calculate monthly metrics
      const monthlyRevenue: Array<[string, number]> = [];
      const monthlyCosts: Array<[string, number]> = [];
      const monthlyMargins: Array<{ month: string; grossMargin: number }> = [];
      const monthlyClients: Array<[string, number]> = [];
      const monthlyNewClients: Array<[string, number]> = [];
      const monthlyCAC: Array<[string, number]> = [];
      const monthlyCLV: Array<[string, number]> = [];

      const sortedMonths = Array.from(monthlyStats.keys()).sort();
      const allTimeClients = new Set<string>();

      sortedMonths.forEach(month => {
        const stats = monthlyStats.get(month)!;
        const revenue = stats.revenue;
        const costs = stats.costs;
        const grossMargin = revenue > 0 ? ((revenue - costs) / revenue) * 100 : 0;
        
        // Identify new clients (first time seen)
        const newInMonth = Array.from(stats.clients).filter(c => !allTimeClients.has(c));
        newInMonth.forEach(c => allTimeClients.add(c));
        
        const clientCount = stats.clients.size;
        const newClientCount = newInMonth.length;
        const marketingCost = revenue * 0.10;
        const cac = newClientCount > 0 ? marketingCost / newClientCount : 0;
        
        // Calculate CLV for this month
        const avgApptsPerClient = clientCount > 0 ? 
          Array.from(stats.appointmentsByClient.values()).reduce((sum, c) => sum + c, 0) / clientCount : 0;
        const avgRevenuePerAppt = clientCount > 0 ? revenue / clientCount : 0;
        const clv = avgApptsPerClient * avgRevenuePerAppt * avgClientLifespan;
        
        monthlyRevenue.push([month, revenue]);
        monthlyCosts.push([month, costs]);
        monthlyMargins.push({ month, grossMargin });
        monthlyClients.push([month, clientCount]);
        monthlyNewClients.push([month, newClientCount]);
        monthlyCAC.push([month, cac]);
        monthlyCLV.push([month, clv]);
      });

      // Calculate cohort retention analysis (last 6 months)
      const cohorts: Array<{
        month: string;
        newClients: number;
        retentionByMonth: number[];
      }> = [];

      const last6Months = sortedMonths.slice(-6);
      last6Months.forEach((cohortMonth, cohortIndex) => {
        const cohortStats = monthlyStats.get(cohortMonth)!;
        const cohortClients = Array.from(cohortStats.clients).filter(c => {
          // Check if this is the first month for this client
          const firstMonth = sortedMonths.find(m => monthlyStats.get(m)!.clients.has(c));
          return firstMonth === cohortMonth;
        });
        
        const retentionByMonth: number[] = [];
        
        // Calculate retention for subsequent months
        for (let i = 0; i < 6; i++) {
          const futureMonthIndex = cohortIndex + i;
          if (futureMonthIndex < last6Months.length) {
            const futureMonth = last6Months[futureMonthIndex];
            const futureStats = monthlyStats.get(futureMonth)!;
            const retained = cohortClients.filter(c => futureStats.clients.has(c)).length;
            const retentionRate = cohortClients.length > 0 ? (retained / cohortClients.length) * 100 : 0;
            retentionByMonth.push(retentionRate);
          }
        }
        
        cohorts.push({
          month: cohortMonth,
          newClients: cohortClients.length,
          retentionByMonth
        });
      });

      // Calculate real CLV by segment (VIP, Regular, New)
      const vipClientRevenue = sortedClients.slice(0, vipClients).reduce((sum, [_, rev]) => sum + rev, 0);
      const vipAvgRevenue = vipClients > 0 ? vipClientRevenue / vipClients : 0;
      const vipCLV = vipAvgRevenue * avgClientLifespan;
      
      const regularClientRevenue = sortedClients.slice(vipClients, vipClients + returningClients).reduce((sum, [_, rev]) => sum + rev, 0);
      const regularAvgRevenue = returningClients > 0 ? regularClientRevenue / returningClients : 0;
      const regularCLV = regularAvgRevenue * avgClientLifespan;
      
      const newClientRevenue = sortedClients.slice(vipClients + returningClients).reduce((sum, [_, rev]) => sum + rev, 0);
      const newAvgRevenue = newClients > 0 ? newClientRevenue / newClients : 0;
      const newCLV = newAvgRevenue * avgClientLifespan;

      const segmentCLV = {
        vip: vipCLV || clv * 1.5,
        regular: regularCLV || clv,
        new: newCLV || clv * 0.5
      };

      return {
        cashFlow,
        profitability,
        clients,
        operational,
        revenueBySource,
        paymentMethods,
        employeeAnalytics,
        periodStart: start,
        periodEnd: end,
        historicalData: {
          monthlyRevenue,
          monthlyCosts,
          monthlyMargins,
          monthlyClients,
          monthlyNewClients,
          monthlyCAC,
          monthlyCLV,
          cohorts,
          segmentCLV
        }
      } as ComprehensiveAnalytics;
    },
    enabled: !!barbershopId,
    staleTime: 5 * 60 * 1000, // 5 minutes cache
    cacheTime: 10 * 60 * 1000 // 10 minutes
  });
};
