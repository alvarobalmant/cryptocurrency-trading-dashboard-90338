import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Clock, Calendar as CalendarIcon, Plus, Trash2, Coffee, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

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

interface ScheduleManagerProps {
  employeeId: string;
}

const DAYS_OF_WEEK = [
  { value: 0, label: 'Domingo' },
  { value: 1, label: 'Segunda' },
  { value: 2, label: 'Terça' },
  { value: 3, label: 'Quarta' },
  { value: 4, label: 'Quinta' },
  { value: 5, label: 'Sexta' },
  { value: 6, label: 'Sábado' }
];

const ScheduleManager: React.FC<ScheduleManagerProps> = ({ employeeId }) => {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [breaks, setBreaks] = useState<Break[]>([]);
  const [loading, setLoading] = useState(true);
  const [newSchedule, setNewSchedule] = useState({
    day_of_week: '',
    start_time: '',
    end_time: ''
  });
  const [newBreak, setNewBreak] = useState({
    break_type: 'daily' as 'daily' | 'specific_date',
    title: '',
    start_time: '',
    end_time: '',
    day_of_week: '',
    specific_date: ''
  });
  const [selectedDate, setSelectedDate] = useState<Date>();
  const { toast } = useToast();

  useEffect(() => {
    fetchSchedulesAndBreaks();
  }, [employeeId]);

  const fetchSchedulesAndBreaks = async () => {
    try {
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

  const handleCreateSchedule = async () => {
    if (!newSchedule.day_of_week || !newSchedule.start_time || !newSchedule.end_time) {
      toast({
        title: 'Erro',
        description: 'Preencha todos os campos do horário.',
        variant: 'destructive'
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('employee_schedules')
        .insert({
          employee_id: employeeId,
          day_of_week: parseInt(newSchedule.day_of_week),
          start_time: newSchedule.start_time,
          end_time: newSchedule.end_time
        });

      if (error) throw error;

      setNewSchedule({ day_of_week: '', start_time: '', end_time: '' });
      fetchSchedulesAndBreaks();
      toast({
        title: 'Sucesso!',
        description: 'Horário adicionado com sucesso.'
      });
    } catch (error) {
      console.error('Erro ao criar horário:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível criar o horário.',
        variant: 'destructive'
      });
    }
  };

  const handleCreateBreak = async () => {
    if (!newBreak.title || !newBreak.start_time || !newBreak.end_time) {
      toast({
        title: 'Erro',
        description: 'Preencha todos os campos da pausa.',
        variant: 'destructive'
      });
      return;
    }

    if (newBreak.break_type === 'daily' && !newBreak.day_of_week) {
      toast({
        title: 'Erro',
        description: 'Selecione o dia da semana para pausas diárias.',
        variant: 'destructive'
      });
      return;
    }

    if (newBreak.break_type === 'specific_date' && (!selectedDate || !newBreak.specific_date)) {
      toast({
        title: 'Erro',
        description: 'Selecione uma data específica.',
        variant: 'destructive'
      });
      return;
    }

    try {
      const breakData = {
        employee_id: employeeId,
        break_type: newBreak.break_type,
        title: newBreak.title,
        start_time: newBreak.start_time,
        end_time: newBreak.end_time,
        ...(newBreak.break_type === 'daily' 
          ? { day_of_week: parseInt(newBreak.day_of_week) }
          : { specific_date: newBreak.specific_date })
      };

      const { error } = await supabase
        .from('employee_breaks')
        .insert(breakData);

      if (error) throw error;

      setNewBreak({
        break_type: 'daily',
        title: '',
        start_time: '',
        end_time: '',
        day_of_week: '',
        specific_date: ''
      });
      setSelectedDate(undefined);
      fetchSchedulesAndBreaks();
      toast({
        title: 'Sucesso!',
        description: 'Pausa adicionada com sucesso.'
      });
    } catch (error) {
      console.error('Erro ao criar pausa:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível criar a pausa.',
        variant: 'destructive'
      });
    }
  };

  const handleToggleSchedule = async (scheduleId: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('employee_schedules')
        .update({ is_active: !isActive })
        .eq('id', scheduleId);

      if (error) throw error;

      fetchSchedulesAndBreaks();
    } catch (error) {
      console.error('Erro ao alterar horário:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível alterar o horário.',
        variant: 'destructive'
      });
    }
  };

  const handleToggleBreak = async (breakId: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('employee_breaks')
        .update({ is_active: !isActive })
        .eq('id', breakId);

      if (error) throw error;

      fetchSchedulesAndBreaks();
    } catch (error) {
      console.error('Erro ao alterar pausa:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível alterar a pausa.',
        variant: 'destructive'
      });
    }
  };

  const handleDeleteSchedule = async (scheduleId: string) => {
    try {
      const { error } = await supabase
        .from('employee_schedules')
        .delete()
        .eq('id', scheduleId);

      if (error) throw error;

      fetchSchedulesAndBreaks();
      toast({
        title: 'Sucesso!',
        description: 'Horário removido com sucesso.'
      });
    } catch (error) {
      console.error('Erro ao deletar horário:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível remover o horário.',
        variant: 'destructive'
      });
    }
  };

  const handleDeleteBreak = async (breakId: string) => {
    try {
      const { error } = await supabase
        .from('employee_breaks')
        .delete()
        .eq('id', breakId);

      if (error) throw error;

      fetchSchedulesAndBreaks();
      toast({
        title: 'Sucesso!',
        description: 'Pausa removida com sucesso.'
      });
    } catch (error) {
      console.error('Erro ao deletar pausa:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível remover a pausa.',
        variant: 'destructive'
      });
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Carregando horários...
          </CardTitle>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="schedules" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="schedules">Horários de Trabalho</TabsTrigger>
          <TabsTrigger value="breaks">Pausas</TabsTrigger>
        </TabsList>

        <TabsContent value="schedules" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Horários de Trabalho
              </CardTitle>
              <CardDescription>
                Configure os dias e horários em que você trabalha
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Add new schedule form */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-muted rounded-lg">
                <div>
                  <Label htmlFor="day">Dia da semana</Label>
                  <Select value={newSchedule.day_of_week} onValueChange={(value) => setNewSchedule({ ...newSchedule, day_of_week: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {DAYS_OF_WEEK.map(day => (
                        <SelectItem key={day.value} value={day.value.toString()}>
                          {day.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="start">Início</Label>
                  <Input
                    id="start"
                    type="time"
                    value={newSchedule.start_time}
                    onChange={(e) => setNewSchedule({ ...newSchedule, start_time: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="end">Fim</Label>
                  <Input
                    id="end"
                    type="time"
                    value={newSchedule.end_time}
                    onChange={(e) => setNewSchedule({ ...newSchedule, end_time: e.target.value })}
                  />
                </div>
                <div className="flex items-end">
                  <Button onClick={handleCreateSchedule} className="w-full">
                    <Plus className="h-4 w-4 mr-2" />
                    Adicionar
                  </Button>
                </div>
              </div>

              {/* Existing schedules */}
              <div className="space-y-2">
                {schedules.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Nenhum horário configurado ainda.</p>
                    <p className="text-sm">Adicione seus horários de trabalho acima.</p>
                  </div>
                ) : (
                  schedules.map((schedule) => (
                    <div key={schedule.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-4">
                        <Badge variant={schedule.is_active ? 'default' : 'secondary'}>
                          {DAYS_OF_WEEK.find(d => d.value === schedule.day_of_week)?.label}
                        </Badge>
                        <span className="font-medium">
                          {schedule.start_time} - {schedule.end_time}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={schedule.is_active}
                          onCheckedChange={() => handleToggleSchedule(schedule.id, schedule.is_active)}
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteSchedule(schedule.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="breaks" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Coffee className="h-5 w-5" />
                Pausas
              </CardTitle>
              <CardDescription>
                Configure intervalos e pausas durante o trabalho
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Add new break form */}
              <div className="p-4 bg-muted rounded-lg space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Tipo de pausa</Label>
                    <Select value={newBreak.break_type} onValueChange={(value: 'daily' | 'specific_date') => setNewBreak({ ...newBreak, break_type: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="daily">Diária (recorrente)</SelectItem>
                        <SelectItem value="specific_date">Data específica</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Título da pausa</Label>
                    <Input
                      placeholder="Ex: Almoço, Intervalo"
                      value={newBreak.title}
                      onChange={(e) => setNewBreak({ ...newBreak, title: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {newBreak.break_type === 'daily' ? (
                    <div>
                      <Label>Dia da semana</Label>
                      <Select value={newBreak.day_of_week} onValueChange={(value) => setNewBreak({ ...newBreak, day_of_week: value })}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent>
                          {DAYS_OF_WEEK.map(day => (
                            <SelectItem key={day.value} value={day.value.toString()}>
                              {day.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ) : (
                    <div>
                      <Label>Data específica</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full justify-start text-left font-normal",
                              !selectedDate && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {selectedDate ? format(selectedDate, "PPP", { locale: ptBR }) : "Selecione uma data"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar
                            mode="single"
                            selected={selectedDate}
                            onSelect={(date) => {
                              setSelectedDate(date);
                              if (date) {
                                setNewBreak({ ...newBreak, specific_date: format(date, 'yyyy-MM-dd') });
                              }
                            }}
                            initialFocus
                            className="p-3 pointer-events-auto"
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  )}
                  <div>
                    <Label>Início</Label>
                    <Input
                      type="time"
                      value={newBreak.start_time}
                      onChange={(e) => setNewBreak({ ...newBreak, start_time: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Fim</Label>
                    <Input
                      type="time"
                      value={newBreak.end_time}
                      onChange={(e) => setNewBreak({ ...newBreak, end_time: e.target.value })}
                    />
                  </div>
                </div>

                <Button onClick={handleCreateBreak} className="w-full">
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar Pausa
                </Button>
              </div>

              {/* Existing breaks */}
              <div className="space-y-2">
                {breaks.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Coffee className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Nenhuma pausa configurada ainda.</p>
                    <p className="text-sm">Adicione intervalos e pausas acima.</p>
                  </div>
                ) : (
                  breaks.map((breakItem) => (
                    <div key={breakItem.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-4">
                        <Badge variant={breakItem.break_type === 'daily' ? 'default' : 'outline'}>
                          {breakItem.break_type === 'daily' ? 'Diária' : 'Data específica'}
                        </Badge>
                        <div>
                          <p className="font-medium">{breakItem.title}</p>
                          <p className="text-sm text-muted-foreground">
                            {breakItem.start_time} - {breakItem.end_time}
                            {breakItem.break_type === 'daily' && breakItem.day_of_week !== null && (
                              ` - ${DAYS_OF_WEEK.find(d => d.value === breakItem.day_of_week)?.label}`
                            )}
                            {breakItem.break_type === 'specific_date' && breakItem.specific_date && (
                              ` - ${format(new Date(breakItem.specific_date), "dd/MM/yyyy", { locale: ptBR })}`
                            )}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={breakItem.is_active}
                          onCheckedChange={() => handleToggleBreak(breakItem.id, breakItem.is_active)}
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteBreak(breakItem.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ScheduleManager;
