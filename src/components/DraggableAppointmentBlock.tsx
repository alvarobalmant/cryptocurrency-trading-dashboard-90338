import React from 'react';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import AppointmentBlock from './AppointmentBlock';

interface DraggableAppointmentBlockProps {
  appointment: any;
  service?: any;
  employee?: any;
  duration: number;
  onClick?: () => void;
  onEdit?: () => void;
  onCancel?: () => void;
  onStatusChange?: (appointmentId: string, newStatus: string) => void;
  onPayment?: () => void;
  isFullscreen?: boolean;
}

export const DraggableAppointmentBlock: React.FC<DraggableAppointmentBlockProps> = (props) => {
  const { appointment } = props;
  
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `appointment-${appointment.id}`,
    data: {
      type: 'appointment',
      appointment: appointment,
      originalEmployeeId: appointment.employee_id,
      originalStartTime: appointment.start_time,
      originalDate: appointment.appointment_date
    }
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.5 : 1,
    cursor: isDragging ? 'grabbing' : 'grab',
    zIndex: isDragging ? 1000 : 20,
    touchAction: 'none', // Previne scroll durante drag em touch devices
  };

  return (
    <div 
      ref={setNodeRef} 
      style={style}
      {...listeners}
      {...attributes}
      className="touch-none"
      data-dnd-draggable="true"
    >
      <AppointmentBlock {...props} />
    </div>
  );
};
