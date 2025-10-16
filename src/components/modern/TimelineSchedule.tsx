import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Clock, 
  Coffee, 
  Edit3, 
  Zap,
  Sun,
  Moon,
  Briefcase,
  Settings,
  Trash2,
  X
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import InlineTimeEditor from './InlineTimeEditor';

interface Schedule {
  id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_active: boolean;
}

interface Break {
  id: string;
  break_type: 'daily' | 'specific_date';
  title: string;
  start_time: string;
  end_time: string;
  day_of_week?: number | null;
  specific_date?: string | null;
  is_active: boolean;
}

interface TimelineScheduleProps {
  employeeId: string;
}

const DAYS_OF_WEEK = [
  { value: 0, label: 'Domingo', short: 'DOM' },
  { value: 1, label: 'Segunda-feira', short: 'SEG' },
  { value: 2, label: 'Terça-feira', short: 'TER' },
  { value: 3, label: 'Quarta-feira', short: 'QUA' },
  { value: 4, label: 'Quinta-feira', short: 'QUI' },
  { value: 5, label: 'Sexta-feira', short: 'SEX' },
  { value: 6, label: 'Sábado', short: 'SAB' }
];

const TEMPLATES = [
  {
    id: 'commercial',
    name: 'Comercial',
    icon: Briefcase,
    description: 'Seg-Sex: 9h-18h • Sab: 9h-14h',
    color: 'blue',
    schedules: [
      { day: 1, start: '09:00', end: '18:00' },
      { day: 2, start: '09:00', end: '18:00' },
      { day: 3, start: '09:00', end: '18:00' },
      { day: 4, start: '09:00', end: '18:00' },
      { day: 5, start: '09:00', end: '18:00' },
      { day: 6, start: '09:00', end: '14:00' }
    ],
    breaks: [
      { title: 'Almoço', start: '12:00', end: '13:00', days: [1, 2, 3, 4, 5] }
    ]
  },
  {
    id: 'morning',
    name: 'Matutino',
    icon: Sun,
    description: 'Seg-Sab: 6h-14h',
    color: 'orange',
    schedules: [
      { day: 1, start: '06:00', end: '14:00' },
      { day: 2, start: '06:00', end: '14:00' },
      { day: 3, start: '06:00', end: '14:00' },
      { day: 4, start: '06:00', end: '14:00' },
      { day: 5, start: '06:00', end: '14:00' },
      { day: 6, start: '06:00', end: '14:00' }
    ],
    breaks: [
      { title: 'Café', start: '09:00', end: '09:15', days: [1, 2, 3, 4, 5, 6] },
      { title: 'Almoço', start: '12:00', end: '12:30', days: [1, 2, 3, 4, 5, 6] }
    ]
  },
  {
    id: 'evening',
    name: 'Vespertino',
    icon: Moon,
    description: 'Seg-Sex: 13h-21h • Sab: 9h-17h',
    color: 'purple',
    schedules: [
      { day: 1, start: '13:00', end: '21:00' },
      { day: 2, start: '13:00', end: '21:00' },
      { day: 3, start: '13:00', end: '21:00' },
      { day: 4, start: '13:00', end: '21:00' },
      { day: 5, start: '13:00', end: '21:00' },
      { day: 6, start: '09:00', end: '17:00' }
    ],
    breaks: [
      { title: 'Lanche', start: '17:00', end: '17:30', days: [1, 2, 3, 4, 5] }
    ]
  }
];

const BREAK_TYPES = [
  { id: 'lunch', name: 'Almoço', duration: 60, color: 'orange' },
  { id: 'coffee', name: 'Café', duration: 15, color: 'amber' },
  { id: 'snack', name: 'Lanche', duration: 30, color: 'yellow' },
  { id: 'personal', name: 'Pessoal', duration: 30, color: 'blue' },
  { id: 'medical', name: 'Consulta', duration: 60, color: 'red' }
];

export default function TimelineSchedule({ employeeId }: TimelineScheduleProps) {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [breaks, setBreaks] = useState<Break[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingDay, setEditingDay] = useState<number | null>(null);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<typeof TEMPLATES[0] | null>(null);
  const [editData, setEditData] = useState({
    start_time: '',
    end_time: '',
    breaks: [] as Array<{id?: string, title: string, start_time: string, end_time: string}>
  });

  const { toast } = useToast();

  useEffect(() => {
    fetchSchedulesAndBreaks();
  }, [employeeId]);

  const fetchSchedulesAndBreaks = async () => {
    try {
      setLoading(true);
      
      const [schedulesResult, breaksResult] = await Promise.all([
        supabase
          .from('employee_schedules')
          .select('*')
          .eq('employee_id', employeeId)
          .order('day_of_week'),
        supabase
          .from('employee_breaks')
          .select('*')
          .eq('employee_id', employeeId)
          .eq('break_type', 'daily')
          .order('day_of_week')
      ]);

      if (schedulesResult.error) throw schedulesResult.error;
      if (breaksResult.error) throw breaksResult.error;

      setSchedules(schedulesResult.data || []);
      setBreaks((breaksResult.data || []).map(breakItem => ({
        ...breakItem,
        break_type: breakItem.break_type as 'daily' | 'specific_date'
      })));
    } catch (error) {
      console.error('Erro ao carregar horários:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os horários.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleTemplateClick = (template: typeof TEMPLATES[0]) => {
    // Verificar se já existem horários configurados
    const hasExistingSchedules = schedules.length > 0;
    
    if (hasExistingSchedules) {
      setSelectedTemplate(template);
      setShowConfirmDialog(true);
    } else {
      applyTemplate(template);
    }
  };

  const confirmApplyTemplate = () => {
    if (selectedTemplate) {
      applyTemplate(selectedTemplate);
      setShowConfirmDialog(false);
      setSelectedTemplate(null);
    }
  };

  const applyTemplate = async (template: typeof TEMPLATES[0]) => {
    try {
      setLoading(true);
      
      if (!employeeId || !template) {
        throw new Error('Dados inválidos para aplicar template');
      }
      
      // Limpar horários existentes
      await supabase
        .from('employee_schedules')
        .delete()
        .eq('employee_id', employeeId);
        
      await supabase
        .from('employee_breaks')
        .delete()
        .eq('employee_id', employeeId)
        .eq('break_type', 'daily');

      // Inserir novos horários
      const scheduleInserts = template.schedules.map(schedule => ({
        employee_id: employeeId,
        day_of_week: schedule.day,
        start_time: schedule.start,
        end_time: schedule.end,
        is_active: true
      }));

      const { error: scheduleError } = await supabase
        .from('employee_schedules')
        .insert(scheduleInserts);

      if (scheduleError) throw scheduleError;

      // Inserir pausas
      const breakInserts: any[] = [];
      template.breaks.forEach(breakTemplate => {
        breakTemplate.days.forEach(day => {
          breakInserts.push({
            employee_id: employeeId,
            break_type: 'daily',
            title: breakTemplate.title,
            start_time: breakTemplate.start,
            end_time: breakTemplate.end,
            day_of_week: day,
            is_active: true
          });
        });
      });

      if (breakInserts.length > 0) {
        const { error: breakError } = await supabase
          .from('employee_breaks')
          .insert(breakInserts);

        if (breakError) throw breakError;
      }

      await fetchSchedulesAndBreaks();
      setShowTemplates(false);
      
      toast({
        title: 'Sucesso!',
        description: `Template "${template.name}" aplicado com sucesso.`
      });
    } catch (error) {
      console.error('Erro ao aplicar template:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      toast({
        title: 'Erro',
        description: `Não foi possível aplicar o template: ${errorMessage}`,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const startEditDay = (dayOfWeek: number) => {
    const daySchedule = schedules.find(s => s.day_of_week === dayOfWeek);
    const dayBreaks = breaks.filter(b => b.day_of_week === dayOfWeek);
    
    setEditData({
      start_time: daySchedule?.start_time || '09:00',
      end_time: daySchedule?.end_time || '18:00',
      breaks: dayBreaks.map(b => ({
        id: b.id,
        title: b.title,
        start_time: b.start_time,
        end_time: b.end_time
      }))
    });
    setEditingDay(dayOfWeek);
  };

  const saveDay = async (data: { start_time: string; end_time: string; breaks: Array<{id?: string, title: string, start_time: string, end_time: string}> }) => {
    if (editingDay === null) return;

    try {
      // Salvar/atualizar horário
      const existingSchedule = schedules.find(s => s.day_of_week === editingDay);
      
      if (existingSchedule) {
        await supabase
          .from('employee_schedules')
          .update({
            start_time: data.start_time,
            end_time: data.end_time
          })
          .eq('id', existingSchedule.id);
      } else {
        await supabase
          .from('employee_schedules')
          .insert({
            employee_id: employeeId,
            day_of_week: editingDay,
            start_time: data.start_time,
            end_time: data.end_time,
            is_active: true
          });
      }

      // Remover pausas antigas do dia
      await supabase
        .from('employee_breaks')
        .delete()
        .eq('employee_id', employeeId)
        .eq('day_of_week', editingDay)
        .eq('break_type', 'daily');

      // Inserir novas pausas
      if (data.breaks.length > 0) {
        const breakInserts = data.breaks.map(breakItem => ({
          employee_id: employeeId,
          break_type: 'daily' as const,
          title: breakItem.title,
          start_time: breakItem.start_time,
          end_time: breakItem.end_time,
          day_of_week: editingDay,
          is_active: true
        }));

        await supabase
          .from('employee_breaks')
          .insert(breakInserts);
      }

      await fetchSchedulesAndBreaks();
      setEditingDay(null);
      
      toast({
        title: 'Sucesso!',
        description: 'Horário atualizado com sucesso.'
      });
    } catch (error) {
      console.error('Erro ao salvar:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível salvar o horário.',
        variant: 'destructive'
      });
    }
  };

  const deleteSchedule = async (dayOfWeek: number) => {
    try {
      const daySchedule = schedules.find(s => s.day_of_week === dayOfWeek);
      if (!daySchedule) return;

      await supabase
        .from('employee_schedules')
        .delete()
        .eq('id', daySchedule.id);

      // Também remover pausas do dia
      await supabase
        .from('employee_breaks')
        .delete()
        .eq('employee_id', employeeId)
        .eq('day_of_week', dayOfWeek)
        .eq('break_type', 'daily');

      await fetchSchedulesAndBreaks();
      
      toast({
        title: 'Sucesso!',
        description: 'Horário removido com sucesso.'
      });
    } catch (error) {
      console.error('Erro ao remover horário:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível remover o horário.',
        variant: 'destructive'
      });
    }
  };

  const getTimelineWidth = (startTime: string, endTime: string): string => {
    const start = timeToMinutes(startTime);
    const end = timeToMinutes(endTime);
    const duration = end - start;
    const percentage = (duration / (12 * 60)) * 100; // 12 horas = 100%
    return `${Math.min(percentage, 100)}%`;
  };

  const getTimelineOffset = (time: string): string => {
    const minutes = timeToMinutes(time);
    const startOfDay = 6 * 60; // 6:00 AM
    const offset = ((minutes - startOfDay) / (12 * 60)) * 100;
    return `${Math.max(offset, 0)}%`;
  };

  const timeToMinutes = (time: string): number => {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-20 bg-slate-200 rounded-xl animate-pulse" />
        <div className="h-96 bg-slate-200 rounded-xl animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-2xl p-8 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">⏰ Meus Horários</h1>
            <p className="text-indigo-100 text-lg">
              Configure seus horários de forma rápida e visual
            </p>
          </div>
          <div className="hidden md:block">
            <div className="w-24 h-24 bg-white/10 rounded-full flex items-center justify-center">
              <Clock className="w-12 h-12 text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* Templates Rápidos */}
      {schedules.length === 0 && (
        <Card className="shadow-lg border-0 bg-gradient-to-br from-blue-50 to-indigo-50">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Zap className="w-5 h-5 text-blue-600" />
              <span>🚀 Configuração Rápida</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {TEMPLATES.map((template) => {
                const Icon = template.icon;
                return (
                  <Button
                    key={template.id}
                    variant="outline"
                    className="h-auto p-6 flex flex-col items-center space-y-3 hover:shadow-lg transition-all duration-200 border-2"
                    onClick={() => {
                      try {
                        applyTemplate(template);
                      } catch (error) {
                        console.error('Erro ao clicar no template:', error);
                        toast({
                          title: 'Erro',
                          description: 'Erro ao aplicar template.',
                          variant: 'destructive'
                        });
                      }
                    }}
                  >
                    <div className={cn(
                      "w-12 h-12 rounded-full flex items-center justify-center",
                      template.color === 'blue' && "bg-blue-100 text-blue-600",
                      template.color === 'orange' && "bg-orange-100 text-orange-600",
                      template.color === 'purple' && "bg-purple-100 text-purple-600"
                    )}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <div className="text-center">
                      <p className="font-semibold text-slate-900">{template.name}</p>
                      <p className="text-xs text-slate-600 mt-1">{template.description}</p>
                    </div>
                  </Button>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Templates Modal */}
      {showTemplates && (
        <Card className="shadow-lg border-0">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Templates Rápidos</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowTemplates(false)}
              >
                <X className="w-4 h-4" />
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {TEMPLATES.map((template) => {
                const Icon = template.icon;
                return (
                  <Button
                    key={template.id}
                    variant="outline"
                    className="h-auto p-6 flex flex-col items-center space-y-3 hover:shadow-lg transition-all duration-200"
                    onClick={() => handleTemplateClick(template)}
                  >
                    <div className={cn(
                      "w-12 h-12 rounded-full flex items-center justify-center",
                      template.color === 'blue' && "bg-blue-100 text-blue-600",
                      template.color === 'orange' && "bg-orange-100 text-orange-600",
                      template.color === 'purple' && "bg-purple-100 text-purple-600"
                    )}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <div className="text-center">
                      <p className="font-semibold text-slate-900">{template.name}</p>
                      <p className="text-xs text-slate-600 mt-1">{template.description}</p>
                    </div>
                  </Button>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Timeline Visual */}
      <Card className="shadow-lg border-0">
        <CardHeader className="bg-slate-50 border-b">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-2">
              <Clock className="w-5 h-5 text-indigo-600" />
              <span>Visão Semanal</span>
            </CardTitle>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowTemplates(!showTemplates)}
              >
                <Settings className="w-4 h-4 mr-2" />
                Templates
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          {/* Escala de Horários */}
          <div className="mb-6">
            <div className="flex justify-between text-xs text-slate-500 mb-2">
              <span>6h</span>
              <span>9h</span>
              <span>12h</span>
              <span>15h</span>
              <span>18h</span>
            </div>
            <div className="h-1 bg-slate-200 rounded-full relative">
              <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-blue-200 to-blue-300 rounded-full opacity-50"></div>
            </div>
          </div>

          {/* Timeline dos Dias */}
          <div className="space-y-4">
            {DAYS_OF_WEEK.map((day) => {
              const daySchedule = schedules.find(s => s.day_of_week === day.value && s.is_active);
              const dayBreaks = breaks.filter(b => b.day_of_week === day.value && b.is_active);
              const isEditing = editingDay === day.value;

              return (
                <div key={day.value} className="group">
                  <div className="flex items-center space-x-4">
                    {/* Dia da Semana */}
                    <div className="w-12 text-center">
                      <div className={cn(
                        "text-xs font-medium px-2 py-1 rounded",
                        daySchedule 
                          ? "bg-green-100 text-green-700" 
                          : "bg-slate-100 text-slate-500"
                      )}>
                        {day.short}
                      </div>
                    </div>

                    {/* Timeline */}
                    <div className="flex-1 relative">
                      {daySchedule ? (
                        <div className="relative h-8 bg-slate-100 rounded-lg overflow-hidden">
                          {/* Barra de Trabalho */}
                          <div
                            className="absolute top-0 h-full bg-gradient-to-r from-green-400 to-green-500 rounded-lg flex items-center justify-center"
                            style={{
                              left: getTimelineOffset(daySchedule.start_time),
                              width: getTimelineWidth(daySchedule.start_time, daySchedule.end_time)
                            }}
                          >
                            <span className="text-white text-xs font-medium">
                              {daySchedule.start_time} - {daySchedule.end_time}
                            </span>
                          </div>

                          {/* Pausas */}
                          {dayBreaks.map((breakItem, index) => (
                            <div
                              key={breakItem.id}
                              className="absolute top-1 h-6 bg-orange-400 rounded border-2 border-white flex items-center justify-center"
                              style={{
                                left: getTimelineOffset(breakItem.start_time),
                                width: getTimelineWidth(breakItem.start_time, breakItem.end_time)
                              }}
                            >
                              <Coffee className="w-3 h-3 text-white" />
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="h-8 bg-slate-100 rounded-lg flex items-center justify-center">
                          <span className="text-slate-400 text-sm">Não trabalho</span>
                        </div>
                      )}
                    </div>

                    {/* Ações */}
                    <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => startEditDay(day.value)}
                        className="text-slate-600 hover:text-slate-900"
                      >
                        <Edit3 className="w-4 h-4" />
                      </Button>
                      {daySchedule && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteSchedule(day.value)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>



      {/* Modal de Confirmação */}
      {showConfirmDialog && selectedTemplate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center">
                  <span className="text-amber-600">⚠️</span>
                </div>
                <span>Confirmar Template</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-slate-600">
                Você já possui horários configurados. Aplicar o template <strong>"{selectedTemplate.name}"</strong> irá 
                <strong> sobrescrever todos os seus horários e pausas atuais</strong>.
              </p>
              <div className="bg-slate-50 p-3 rounded-lg">
                <p className="text-sm text-slate-700">
                  <strong>Template selecionado:</strong> {selectedTemplate.name}
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  {selectedTemplate.description}
                </p>
              </div>
              <p className="text-sm text-slate-600">
                Deseja continuar?
              </p>
            </CardContent>
            <div className="flex justify-end space-x-2 p-6 pt-0">
              <Button
                variant="outline"
                onClick={() => {
                  setShowConfirmDialog(false);
                  setSelectedTemplate(null);
                }}
              >
                Cancelar
              </Button>
              <Button
                onClick={confirmApplyTemplate}
                className="bg-amber-600 hover:bg-amber-700"
              >
                Sim, Sobrescrever
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Editor Inline Moderno */}
      <InlineTimeEditor
        isOpen={editingDay !== null}
        onClose={() => setEditingDay(null)}
        onSave={saveDay}
        initialData={editData}
        dayName={editingDay !== null ? DAYS_OF_WEEK.find(d => d.value === editingDay)?.label || '' : ''}
      />
    </div>
  );
}
