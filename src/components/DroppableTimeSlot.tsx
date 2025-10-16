import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { cn } from '@/lib/utils';

interface DroppableTimeSlotProps {
  slotId: string;
  time: string;
  employeeId: string;
  date: string;
  isFullscreen?: boolean;
  onClick?: () => void;
  disabled?: boolean;
  isExceptionMode?: boolean;
}

export const DroppableTimeSlot: React.FC<DroppableTimeSlotProps> = ({
  slotId,
  time,
  employeeId,
  date,
  isFullscreen,
  onClick,
  disabled = false,
  isExceptionMode = false,
}) => {
  const { isOver, setNodeRef } = useDroppable({
    id: slotId,
    data: {
      type: 'timeslot',
      time,
      employeeId,
      date
    },
    disabled: disabled || isExceptionMode
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "h-8 lg:h-10 transition-colors",
        isFullscreen && "lg:h-12",
        !isExceptionMode && disabled && "cursor-not-allowed bg-gray-100/80 relative before:content-[''] before:absolute before:inset-0 before:bg-black/5 before:pointer-events-none",
        !isExceptionMode && !disabled && "cursor-pointer hover:bg-blue-50",
        !isExceptionMode && isOver && !disabled && "bg-blue-100 border-2 border-blue-400 border-dashed rounded-md",
      )}
      onClick={disabled && !isExceptionMode ? undefined : onClick}
      data-droppable="true"
    />
  );
};
