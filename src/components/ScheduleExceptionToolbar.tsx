import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Settings, Save, X, Database } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface ScheduleExceptionToolbarProps {
  isExceptionMode: boolean;
  onToggleMode: () => void;
  onSave: () => void;
  onCancel: () => void;
  pendingCount: number;
  isSaving: boolean;
  selectedDate?: Date;
  activeEmployees?: Array<{ id: string; name: string }>;
}

export const ScheduleExceptionToolbar: React.FC<ScheduleExceptionToolbarProps> = ({
  isExceptionMode,
  onToggleMode,
  onSave,
  onCancel,
  pendingCount,
  isSaving,
  selectedDate,
  activeEmployees,
}) => {
  const { toast } = useToast();
  const [isPreloading, setIsPreloading] = useState(false);

  const handlePreloadCache = async () => {
    try {
      setIsPreloading(true);
      
      const employeeIds = activeEmployees?.map(emp => emp.id) || [];
      // Use format from date-fns to avoid timezone issues
      const date = selectedDate ? format(selectedDate, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd');
      
      console.log('🔧 Preenchendo cache para:', {
        employeeIds,
        selectedDate,
        formattedDate: date
      });
      
      toast({
        title: 'Preenchendo cache...',
        description: `Calculando disponibilidade para ${employeeIds.length} funcionário(s) em ${format(selectedDate || new Date(), 'dd/MM/yyyy')}`,
      });

      const { data, error } = await supabase.functions.invoke('preload-availability-cache', {
        body: {
          employee_ids: employeeIds,
          date: date
        }
      });

      if (error) throw error;

      console.log('📊 Resposta do cache:', data);

      if (data && !data.success && data.errors && data.errors.length > 0) {
        const errorMessages = data.errors.join('\n');
        console.error('❌ Erros ao processar:', data.errors);
        toast({
          title: 'Erro ao preencher cache',
          description: `${data.errors.length} erro(s): ${data.errors[0]}`,
          variant: 'destructive',
        });
        return;
      }

      toast({
        title: 'Cache preenchido!',
        description: `${data.total_records || 0} registro(s) criado(s) para ${data.employees || 0} funcionário(s) na data ${format(selectedDate || new Date(), 'dd/MM/yyyy')}`,
      });
    } catch (error) {
      console.error('❌ Exceção ao preencher cache:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível preencher o cache.',
        variant: 'destructive',
      });
    } finally {
      setIsPreloading(false);
    }
  };

  if (!isExceptionMode) {
    return (
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onToggleMode}
          className="gap-2"
        >
          <Settings className="w-4 h-4" />
          Gerenciar Exceções
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handlePreloadCache}
          disabled={isPreloading}
          className="gap-2 bg-blue-50 hover:bg-blue-100 border-blue-300"
        >
          <Database className="w-4 h-4" />
          {isPreloading ? 'Preenchendo...' : 'Preencher Cache (Temp)'}
        </Button>
      </div>
    );
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-amber-50 border-b-2 border-amber-400 p-4 shadow-lg">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 bg-amber-500 rounded-full animate-pulse" />
          <div>
            <p className="font-semibold text-amber-900">
              Modo de Exceções Ativo
            </p>
            <p className="text-sm text-amber-700">
              🟢 Verde = Disponível (clique para bloquear) | 🔴 Vermelho = Bloqueado (clique para liberar)
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onCancel}
            disabled={isSaving}
            className="gap-2"
          >
            <X className="w-4 h-4" />
            Cancelar
          </Button>
          <Button
            size="sm"
            onClick={onSave}
            disabled={pendingCount === 0 || isSaving}
            className="gap-2 bg-green-600 hover:bg-green-700"
          >
            <Save className="w-4 h-4" />
            {isSaving ? 'Salvando...' : `Salvar${pendingCount > 0 ? ` (${pendingCount})` : ''}`}
          </Button>
        </div>
      </div>
    </div>
  );
};
