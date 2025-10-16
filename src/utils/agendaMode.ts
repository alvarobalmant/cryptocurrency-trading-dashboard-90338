// Utilitários para gerenciamento dos modos da agenda (tela cheia vs normal)

export const AGENDA_MODES = {
  FULLSCREEN: 'fullscreen',
  NORMAL: 'normal'
} as const;

export type AgendaMode = typeof AGENDA_MODES[keyof typeof AGENDA_MODES];

/**
 * Retorna as classes CSS apropriadas para o container da agenda
 */
export const getAgendaContainerClasses = (isFullscreen: boolean): string => {
  const baseClasses = 'h-full bg-gray-50';
  const modeClass = isFullscreen ? 'agenda-fullscreen' : 'agenda-normal';
  
  return `${baseClasses} ${modeClass}`;
};

/**
 * Retorna as classes CSS para o container da timeline
 */
export const getTimelineContainerClasses = (isFullscreen: boolean, isDragging: boolean): string => {
  const baseDragClasses = isDragging ? 'cursor-grabbing select-none' : 'cursor-grab';
  // Timeline container já tem overflow configurado no CSS
  const scrollClasses = isFullscreen 
    ? 'scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-100'
    : 'overflow-x-auto overflow-y-auto';
  
  return `h-full transition-all duration-200 ${scrollClasses} ${baseDragClasses}`;
};

/**
 * Retorna as classes CSS para o grid da timeline
 */
export const getTimelineGridClasses = (isFullscreen: boolean): string => {
  // CSS já define as larguras apropriadas
  return "timeline-grid";
};

/**
 * Retorna as classes CSS para o header da timeline
 */
export const getTimelineHeaderClasses = (isFullscreen: boolean): string => {
  const baseClasses = 'bg-white border-b border-gray-200 sticky top-0 z-30';
  const modeClass = isFullscreen ? '' : 'timeline-header';
  
  return `${baseClasses} ${modeClass}`;
};

/**
 * Retorna as classes CSS para as colunas da timeline
 */
export const getTimelineColumnsClasses = (isFullscreen: boolean): string => {
  return "flex"; // Sempre usa flex para manter posicionamento correto dos agendamentos
};

/**
 * Retorna as classes CSS para a coluna de tempo
 */
export const getTimeColumnClasses = (isFullscreen: boolean): string => {
  const baseClasses = 'p-1 lg:p-2 border-r border-gray-200 bg-gray-50 text-center flex items-center justify-center';
  const sizeClasses = isFullscreen ? 'w-20' : 'w-16';
  
  return `${baseClasses} ${sizeClasses}`;
};

/**
 * Retorna as classes CSS para a coluna do funcionário
 */
export const getEmployeeColumnClasses = (isFullscreen: boolean): string => {
  const baseClasses = 'p-1 lg:p-2 border-r border-gray-200';
  const sizeClasses = isFullscreen ? 'flex-1 min-w-[200px]' : 'flex-1 min-w-[140px]';
  
  return `${baseClasses} ${sizeClasses}`;
};

/**
 * Retorna as classes CSS para o slot de tempo
 */
export const getTimeSlotClasses = (isFullscreen: boolean): string => {
  const baseClasses = 'border-r border-gray-200 p-1 lg:p-2 text-center flex items-center justify-center';
  const sizeClasses = isFullscreen ? 'w-20 h-12' : 'w-16 h-10';
  
  return `${baseClasses} ${sizeClasses}`;
};

/**
 * Retorna as classes CSS para o slot do funcionário
 */
export const getEmployeeSlotClasses = (isFullscreen: boolean): string => {
  const baseClasses = 'border-r border-gray-200 relative';
  const sizeClasses = isFullscreen ? 'flex-1 min-w-[200px] h-12' : 'flex-1 min-w-[140px] h-10';
  
  return `${baseClasses} ${sizeClasses}`;
};

/**
 * Aplica ou remove a classe agenda-fullscreen do body
 */
export const toggleFullscreenBodyClass = (isFullscreen: boolean): void => {
  if (isFullscreen) {
    document.body.classList.add('agenda-fullscreen');
  } else {
    document.body.classList.remove('agenda-fullscreen');
  }
};

/**
 * Configurações específicas de layout para cada modo
 */
export const getLayoutConfig = (isFullscreen: boolean) => {
  return {
    showZoomControls: isFullscreen,
    showDragIndicator: !isFullscreen,
    timeSlotHeight: isFullscreen ? 40 : 35,
    minColumnWidth: isFullscreen ? 150 : 120,
    headerHeight: isFullscreen ? 80 : 60,
    appointmentBlockPadding: isFullscreen ? 2 : 1
  };
};

/**
 * Configurações de responsividade baseadas no modo
 */
export const getResponsiveConfig = (isFullscreen: boolean) => {
  return {
    mobile: {
      timeColumnWidth: isFullscreen ? 60 : 50,
      employeeColumnMinWidth: isFullscreen ? 100 : 80,
      appointmentFontSize: isFullscreen ? '0.75rem' : '0.65rem',
      timeSlotHeight: isFullscreen ? 35 : 30
    },
    tablet: {
      timeColumnWidth: isFullscreen ? 80 : 60,
      employeeColumnMinWidth: isFullscreen ? 120 : 100,
      appointmentFontSize: isFullscreen ? '0.875rem' : '0.75rem',
      timeSlotHeight: isFullscreen ? 40 : 35
    },
    desktop: {
      timeColumnWidth: isFullscreen ? 80 : 80,
      employeeColumnMinWidth: isFullscreen ? 200 : 120,
      appointmentFontSize: isFullscreen ? '1rem' : '0.875rem',
      timeSlotHeight: isFullscreen ? 40 : 40
    }
  };
};