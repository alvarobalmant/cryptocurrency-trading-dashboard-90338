import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { 
  Clock, 
  Coffee, 
  Plus, 
  Minus, 
  Check, 
  X,
  ChevronUp,
  ChevronDown
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Break {
  id?: string;
  title: string;
  start_time: string;
  end_time: string;
}

interface InlineTimeEditorProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: { start_time: string; end_time: string; breaks: Break[] }) => void;
  initialData: {
    start_time: string;
    end_time: string;
    breaks: Break[];
  };
  dayName: string;
}

const BREAK_PRESETS = [
  { name: 'Almoço', duration: 60, icon: '🍽️' },
  { name: 'Café', duration: 15, icon: '☕' },
  { name: 'Lanche', duration: 30, icon: '🥪' },
  { name: 'Descanso', duration: 20, icon: '😴' },
  { name: 'Personalizado', duration: 30, icon: '⚙️', isCustom: true }
];

export default function InlineTimeEditor({ 
  isOpen, 
  onClose, 
  onSave, 
  initialData, 
  dayName 
}: InlineTimeEditorProps) {
  const [data, setData] = useState(initialData);
  const [showBreakPresets, setShowBreakPresets] = useState(false);
  const [showCustomBreak, setShowCustomBreak] = useState(false);
  const [customBreak, setCustomBreak] = useState({
    name: '',
    duration: 30,
    startTime: '12:00'
  });
  
  useEffect(() => {
    setData(initialData);
  }, [initialData, isOpen]);

  const adjustTime = (field: 'start_time' | 'end_time', minutes: number) => {
    const currentTime = data[field];
    const [hours, mins] = currentTime.split(':').map(Number);
    const totalMinutes = hours * 60 + mins + minutes;
    
    // Limitar entre 0 e 1439 minutos (23:59)
    const clampedMinutes = Math.max(0, Math.min(1439, totalMinutes));
    const newHours = Math.floor(clampedMinutes / 60);
    const newMins = clampedMinutes % 60;
    
    const newTime = `${newHours.toString().padStart(2, '0')}:${newMins.toString().padStart(2, '0')}`;
    
    setData(prev => ({
      ...prev,
      [field]: newTime
    }));
  };

  const addBreakPreset = (preset: typeof BREAK_PRESETS[0]) => {
    if (preset.isCustom) {
      setShowCustomBreak(true);
      setShowBreakPresets(false);
      return;
    }

    const startTime = '12:00';
    const endTime = addMinutesToTime(startTime, preset.duration);
    
    setData(prev => ({
      ...prev,
      breaks: [...prev.breaks, {
        title: preset.name,
        start_time: startTime,
        end_time: endTime
      }]
    }));
    setShowBreakPresets(false);
  };

  const addCustomBreak = () => {
    if (!customBreak.name.trim()) return;

    const endTime = addMinutesToTime(customBreak.startTime, customBreak.duration);
    
    setData(prev => ({
      ...prev,
      breaks: [...prev.breaks, {
        title: customBreak.name,
        start_time: customBreak.startTime,
        end_time: endTime
      }]
    }));
    
    setCustomBreak({ name: '', duration: 30, startTime: '12:00' });
    setShowCustomBreak(false);
  };

  const addMinutesToTime = (time: string, minutes: number): string => {
    const [hours, mins] = time.split(':').map(Number);
    const totalMinutes = hours * 60 + mins + minutes;
    const newHours = Math.floor(totalMinutes / 60);
    const newMins = totalMinutes % 60;
    return `${newHours.toString().padStart(2, '0')}:${newMins.toString().padStart(2, '0')}`;
  };

  const removeBreak = (index: number) => {
    setData(prev => ({
      ...prev,
      breaks: prev.breaks.filter((_, i) => i !== index)
    }));
  };

  const updateBreak = (index: number, field: keyof Break, value: string) => {
    setData(prev => ({
      ...prev,
      breaks: prev.breaks.map((breakItem, i) => 
        i === index ? { ...breakItem, [field]: value } : breakItem
      )
    }));
  };

  const handleSave = () => {
    onSave(data);
    onClose();
  };

  const formatTime = (time: string) => {
    return time.replace(':', 'h');
  };

  const parseTimeDisplay = (timeStr: string) => {
    if (!timeStr || typeof timeStr !== 'string') {
      return { hours: '00', minutes: '00' };
    }
    const [hours = '00', minutes = '00'] = timeStr.split(':');
    return { 
      hours: hours.padStart(2, '0'), 
      minutes: minutes.padStart(2, '0') 
    };
  };

  const updateTimeFromDisplay = (field: 'start_time' | 'end_time', hours: string, minutes: string) => {
    const paddedHours = hours.padStart(2, '0');
    const paddedMinutes = minutes.padStart(2, '0');
    const newTime = `${paddedHours}:${paddedMinutes}`;
    
    setData(prev => ({
      ...prev,
      [field]: newTime
    }));
  };

  const getWorkDuration = () => {
    const start = timeToMinutes(data.start_time);
    const end = timeToMinutes(data.end_time);
    const duration = end - start;
    const hours = Math.floor(duration / 60);
    const minutes = duration % 60;
    return `${hours}h${minutes > 0 ? ` ${minutes}min` : ''}`;
  };

  const timeToMinutes = (time: string): number => {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-auto overflow-hidden transform transition-all duration-200 scale-100">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-t-2xl p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold">✏️ Editar {dayName}</h3>
              <p className="text-indigo-100 text-sm mt-1">
                Duração: {getWorkDuration()}
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-white hover:bg-white/20 rounded-full w-8 h-8 p-0"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Horários Principais */}
          <div className="space-y-4">
            <h4 className="font-semibold text-slate-900 flex items-center">
              <Clock className="w-4 h-4 mr-2 text-indigo-600" />
              Horário de Trabalho
            </h4>
            
            <div className="grid grid-cols-2 gap-4">
              {/* Início */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-600">Início</label>
                <div className="relative">
                  <div className="bg-slate-50 rounded-xl p-4 border-2 border-slate-200 focus-within:border-indigo-300 transition-colors">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-1">
                        <div className="relative">
                          <input
                            type="text"
                            value={parseTimeDisplay(data.start_time).hours}
                            onChange={(e) => {
                              const value = e.target.value.replace(/\D/g, '').slice(0, 2);
                              if (value === '') {
                                updateTimeFromDisplay('start_time', '00', parseTimeDisplay(data.start_time).minutes);
                              } else {
                                const hours = Math.min(23, parseInt(value) || 0).toString().padStart(2, '0');
                                updateTimeFromDisplay('start_time', hours, parseTimeDisplay(data.start_time).minutes);
                              }
                            }}
                            onFocus={(e) => e.target.select()}
                            onKeyDown={(e) => {
                              if (e.key === 'Tab' || e.key === 'Enter') {
                                e.preventDefault();
                                const target = e.target as HTMLElement;
                                const minutesInput = target.parentElement?.parentElement?.querySelector('input[type="text"]:nth-of-type(2)') as HTMLInputElement;
                                minutesInput?.focus();
                              }
                            }}
                            className="text-3xl font-bold text-slate-900 bg-transparent border-0 outline-0 w-16 text-center focus:ring-0 focus:outline-none"
                            maxLength={2}
                            placeholder="00"
                            autoComplete="off"
                          />
                          <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-8 h-0.5 bg-slate-300"></div>
                        </div>
                        <span className="text-2xl font-bold text-slate-400">h</span>
                        <div className="relative">
                          <input
                            type="text"
                            value={parseTimeDisplay(data.start_time).minutes}
                            onChange={(e) => {
                              const value = e.target.value.replace(/\D/g, '').slice(0, 2);
                              if (value === '') {
                                updateTimeFromDisplay('start_time', parseTimeDisplay(data.start_time).hours, '00');
                              } else {
                                const minutes = Math.min(59, parseInt(value) || 0).toString().padStart(2, '0');
                                updateTimeFromDisplay('start_time', parseTimeDisplay(data.start_time).hours, minutes);
                              }
                            }}
                            onFocus={(e) => e.target.select()}
                            className="text-3xl font-bold text-slate-900 bg-transparent border-0 outline-0 w-16 text-center focus:ring-0 focus:outline-none"
                            maxLength={2}
                            placeholder="00"
                            autoComplete="off"
                          />
                          <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-8 h-0.5 bg-slate-300"></div>
                        </div>
                      </div>
                      <div className="flex flex-col space-y-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => adjustTime('start_time', 15)}
                          className="h-7 w-7 p-0 hover:bg-indigo-100 rounded-md"
                        >
                          <ChevronUp className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => adjustTime('start_time', -15)}
                          className="h-7 w-7 p-0 hover:bg-indigo-100 rounded-md"
                        >
                          <ChevronDown className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    <Input
                      type="time"
                      value={data.start_time}
                      onChange={(e) => setData(prev => ({ ...prev, start_time: e.target.value }))}
                      className="border-0 bg-transparent text-center text-sm text-slate-500"
                    />
                  </div>
                </div>
              </div>

              {/* Fim */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-600">Fim</label>
                <div className="relative">
                  <div className="bg-slate-50 rounded-xl p-4 border-2 border-slate-200 focus-within:border-indigo-300 transition-colors">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-1">
                        <div className="relative">
                          <input
                            type="text"
                            value={parseTimeDisplay(data.end_time).hours}
                            onChange={(e) => {
                              const value = e.target.value.replace(/\D/g, '').slice(0, 2);
                              if (value === '') {
                                updateTimeFromDisplay('end_time', '00', parseTimeDisplay(data.end_time).minutes);
                              } else {
                                const hours = Math.min(23, parseInt(value) || 0).toString().padStart(2, '0');
                                updateTimeFromDisplay('end_time', hours, parseTimeDisplay(data.end_time).minutes);
                              }
                            }}
                            onFocus={(e) => e.target.select()}
                            className="text-3xl font-bold text-slate-900 bg-transparent border-0 outline-0 w-16 text-center focus:ring-0 focus:outline-none"
                            maxLength={2}
                            placeholder="00"
                            autoComplete="off"
                          />
                          <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-8 h-0.5 bg-slate-300"></div>
                        </div>
                        <span className="text-2xl font-bold text-slate-400">h</span>
                        <div className="relative">
                          <input
                            type="text"
                            value={parseTimeDisplay(data.end_time).minutes}
                            onChange={(e) => {
                              const value = e.target.value.replace(/\D/g, '').slice(0, 2);
                              if (value === '') {
                                updateTimeFromDisplay('end_time', parseTimeDisplay(data.end_time).hours, '00');
                              } else {
                                const minutes = Math.min(59, parseInt(value) || 0).toString().padStart(2, '0');
                                updateTimeFromDisplay('end_time', parseTimeDisplay(data.end_time).hours, minutes);
                              }
                            }}
                            onFocus={(e) => e.target.select()}
                            className="text-3xl font-bold text-slate-900 bg-transparent border-0 outline-0 w-16 text-center focus:ring-0 focus:outline-none"
                            maxLength={2}
                            placeholder="00"
                            autoComplete="off"
                          />
                          <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-8 h-0.5 bg-slate-300"></div>
                        </div>
                      </div>
                      <div className="flex flex-col space-y-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => adjustTime('end_time', 15)}
                          className="h-7 w-7 p-0 hover:bg-indigo-100 rounded-md"
                        >
                          <ChevronUp className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => adjustTime('end_time', -15)}
                          className="h-7 w-7 p-0 hover:bg-indigo-100 rounded-md"
                        >
                          <ChevronDown className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    <Input
                      type="time"
                      value={data.end_time}
                      onChange={(e) => setData(prev => ({ ...prev, end_time: e.target.value }))}
                      className="border-0 bg-transparent text-center text-sm text-slate-500"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Pausas */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-slate-900 flex items-center">
                <Coffee className="w-4 h-4 mr-2 text-orange-600" />
                Pausas
              </h4>
              <Popover open={showBreakPresets} onOpenChange={setShowBreakPresets}>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="text-xs">
                    <Plus className="w-3 h-3 mr-1" />
                    Adicionar
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-48 p-2">
                  <div className="space-y-1">
                    {BREAK_PRESETS.map((preset, index) => (
                      <Button
                        key={index}
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start text-xs"
                        onClick={() => addBreakPreset(preset)}
                      >
                        <span className="mr-2">{preset.icon}</span>
                        {preset.name} {!preset.isCustom && `(${preset.duration}min)`}
                      </Button>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-3 max-h-32 overflow-y-auto">
              {data.breaks.length === 0 ? (
                <div className="text-center py-4 text-slate-400 text-sm">
                  <Coffee className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  Nenhuma pausa configurada
                </div>
              ) : (
                data.breaks.map((breakItem, index) => (
                  <div key={index} className="bg-orange-50 rounded-lg p-3 border border-orange-200">
                    <div className="flex items-center justify-between mb-2">
                      <Input
                        placeholder="Nome da pausa"
                        value={breakItem.title}
                        onChange={(e) => updateBreak(index, 'title', e.target.value)}
                        className="text-sm font-medium border-0 bg-transparent p-0 h-auto"
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeBreak(index)}
                        className="text-red-500 hover:text-red-700 h-6 w-6 p-0"
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Input
                        type="time"
                        value={breakItem.start_time}
                        onChange={(e) => updateBreak(index, 'start_time', e.target.value)}
                        className="text-xs h-8"
                      />
                      <span className="text-slate-400 text-xs">até</span>
                      <Input
                        type="time"
                        value={breakItem.end_time}
                        onChange={(e) => updateBreak(index, 'end_time', e.target.value)}
                        className="text-xs h-8"
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 rounded-b-2xl p-4 flex items-center justify-between">
          <Button
            variant="outline"
            onClick={onClose}
            className="text-slate-600"
          >
            <X className="w-4 h-4 mr-2" />
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            <Check className="w-4 h-4 mr-2" />
            Salvar
          </Button>
        </div>

        {/* Modal de Pausa Personalizada */}
        {showCustomBreak && (
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 rounded-2xl">
            <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-sm">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-semibold text-slate-900">⚙️ Pausa Personalizada</h4>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowCustomBreak(false)}
                  className="h-6 w-6 p-0"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-slate-600 mb-2 block">
                    Nome da Pausa
                  </label>
                  <Input
                    placeholder="Ex: Reunião, Intervalo..."
                    value={customBreak.name}
                    onChange={(e) => setCustomBreak(prev => ({ ...prev, name: e.target.value }))}
                  />
                </div>
                
                <div>
                  <label className="text-sm font-medium text-slate-600 mb-2 block">
                    Hora de Início
                  </label>
                  <Input
                    type="time"
                    value={customBreak.startTime}
                    onChange={(e) => setCustomBreak(prev => ({ ...prev, startTime: e.target.value }))}
                    className="h-8"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-600 mb-2 block">
                    Duração (minutos)
                  </label>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCustomBreak(prev => ({ ...prev, duration: Math.max(5, prev.duration - 5) }))}
                      className="h-8 w-8 p-0"
                    >
                      <Minus className="w-3 h-3" />
                    </Button>
                    <Input
                      type="number"
                      min="5"
                      max="480"
                      value={customBreak.duration}
                      onChange={(e) => setCustomBreak(prev => ({ ...prev, duration: parseInt(e.target.value) || 30 }))}
                      className="text-center h-8"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCustomBreak(prev => ({ ...prev, duration: Math.min(480, prev.duration + 5) }))}
                      className="h-8 w-8 p-0"
                    >
                      <Plus className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center justify-between mt-6 pt-4 border-t">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowCustomBreak(false)}
                >
                  Cancelar
                </Button>
                <Button
                  size="sm"
                  onClick={addCustomBreak}
                  disabled={!customBreak.name.trim()}
                  className="bg-orange-600 hover:bg-orange-700"
                >
                  <Plus className="w-3 h-3 mr-1" />
                  Adicionar
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
