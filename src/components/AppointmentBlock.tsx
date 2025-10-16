import React, { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Clock, User, Scissors, Phone, MapPin, Check, X, CreditCard } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PaymentStatusBadge } from '@/utils/paymentStatus';

interface AppointmentBlockProps {
  appointment: {
    id: string;
    client_name: string;
    client_phone?: string;
    start_time: string;
    end_time: string;
    status: 'pending' | 'confirmed' | 'cancelled' | 'no_show';
    payment_status?: string;
    service_id: string;
    employee_id: string;
  };
  service?: {
    name: string;
    price: number;
    duration: number;
  };
  employee?: {
    name: string;
    color?: string;
  };
  duration: number; // Duration in 10-minute slots
  onClick?: () => void;
  onEdit?: () => void;
  onCancel?: () => void;
  onStatusChange?: (appointmentId: string, newStatus: string) => void;
  onPayment?: () => void;
  isFullscreen?: boolean;
}

const AppointmentBlock: React.FC<AppointmentBlockProps> = ({
  appointment,
  service,
  employee,
  duration,
  onClick,
  onEdit,
  onCancel,
  onStatusChange,
  onPayment,
  isFullscreen = false
}) => {
  const [isEditingStatus, setIsEditingStatus] = useState(false);
  // Get status colors
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'bg-green-100 border-green-300 text-green-800';
      case 'pending':
        return 'bg-yellow-100 border-yellow-300 text-yellow-800';
      case 'cancelled':
        return 'bg-red-100 border-red-300 text-red-800';
      case 'no_show':
        return 'bg-gray-100 border-gray-300 text-gray-800';
      case 'queue_reserved':
        return 'bg-amber-50 border-amber-400 text-amber-900 border-dashed';
      default:
        return 'bg-gray-100 border-gray-300 text-gray-800';
    }
  };

  // Get status label
  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'Feito';
      case 'pending':
        return 'Marcado';
      case 'cancelled':
        return 'Cancelado';
      case 'no_show':
        return 'Cliente não apareceu';
      case 'queue_reserved':
        return 'Fila Virtual';
      default:
        return status;
    }
  };

  // Calculate height based on duration
  // Fullscreen: h-12 = 48px
  // Normal desktop (lg): h-10 = 40px
  // Normal mobile: h-8 = 32px
  const slotHeight = isFullscreen 
    ? 48 
    : (window.innerWidth >= 1024 ? 40 : 32);
  const height = duration * slotHeight;

  const handleStatusChange = (newStatus: string) => {
    if (onStatusChange) {
      onStatusChange(appointment.id, newStatus);
    }
    setIsEditingStatus(false);
  };

  const statusOptions = [
    { value: 'pending', label: 'Marcado', color: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
    { value: 'confirmed', label: 'Feito', color: 'bg-green-50 text-green-700 border-green-200' },
    { value: 'cancelled', label: 'Cancelado', color: 'bg-red-50 text-red-700 border-red-200' },
    { value: 'no_show', label: 'Cliente não apareceu', color: 'bg-gray-50 text-gray-700 border-gray-200' }
  ];

  return (
    <div
      className={cn(
        'absolute inset-x-1 inset-y-0 rounded-lg p-2 cursor-pointer transition-all duration-200 border-l-4 appointment-block group',
        'hover:shadow-md hover:z-30',
        getStatusColor(appointment.status)
      )}
      style={{ height: `${height}px`, zIndex: 20 }}
      onClick={() => { 
        onClick?.(); 
        if (onStatusChange) {
          setIsEditingStatus(!isEditingStatus);
        }
      }}
    >
      {/* Header with client name and status */}
      <div className="flex items-start justify-between mb-1">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-semibold text-gray-900 truncate">
              {appointment.client_name}
            </h4>
            {appointment.status === 'queue_reserved' && (
              <Clock className="h-4 w-4 text-amber-600 animate-pulse" />
            )}
          </div>
        </div>
        
        {/* Status Badge or Status Editor */}
        {isEditingStatus ? (
          <div className="flex items-center gap-1 ml-1 flex-shrink-0 z-20">
            <Select 
              value={appointment.status} 
              onValueChange={handleStatusChange}
              open={true}
              onOpenChange={(open) => {
                if (!open) {
                  setIsEditingStatus(false);
                }
              }}
            >
              <SelectTrigger className="h-6 w-24 text-xs p-1 border-blue-300 bg-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="z-50 bg-white border shadow-lg">
                {statusOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value} className="text-xs">
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : (
          <Badge 
            variant="outline" 
            className={cn(
              'text-xs h-5 ml-1 flex-shrink-0',
              appointment.status === 'confirmed' && 'bg-green-50 text-green-700 border-green-200',
              appointment.status === 'pending' && 'bg-yellow-50 text-yellow-700 border-yellow-200',
              appointment.status === 'cancelled' && 'bg-red-50 text-red-700 border-red-200',
              appointment.status === 'no_show' && 'bg-gray-50 text-gray-700 border-gray-200',
              appointment.status === 'queue_reserved' && 'bg-amber-50 text-amber-700 border-amber-300 border-dashed animate-pulse'
            )}
          >
            {getStatusLabel(appointment.status)}
          </Badge>
        )}
      </div>

      {/* Service information */}
      {service && (
        <div className="flex items-center gap-1 mb-1">
          <Scissors className="h-3 w-3 text-gray-500 flex-shrink-0" />
          <span className="text-xs text-gray-600 truncate">{service.name}</span>
        </div>
      )}

      {/* Time information */}
      <div className="flex items-center gap-1 mb-1">
        <Clock className="h-3 w-3 text-gray-500 flex-shrink-0" />
        <span className="text-xs text-gray-600 font-mono">
          {appointment.start_time} - {appointment.end_time}
        </span>
      </div>

      {/* Employee information */}
      {employee && (
        <div className="flex items-center gap-1 mb-1">
          <User className="h-3 w-3 text-gray-500 flex-shrink-0" />
          <span className="text-xs text-gray-600 truncate">{employee.name}</span>
        </div>
      )}

      {/* Phone information (if available and space permits) */}
      {appointment.client_phone && duration >= 4 && (
        <div className="flex items-center gap-1 mb-1">
          <Phone className="h-3 w-3 text-gray-500 flex-shrink-0" />
          <span className="text-xs text-gray-500 truncate">{appointment.client_phone}</span>
        </div>
      )}

      {/* Payment status badge */}
      {appointment.payment_status && duration >= 3 && (
        <div className="mt-1">
          <PaymentStatusBadge 
            data={{
              payment_status: appointment.payment_status,
              payment_method: appointment.payment_method,
              status: appointment.status,
              is_subscription_appointment: appointment.is_subscription_appointment
            }} 
            onClick={onPayment}
          />
        </div>
      )}

      {/* Price information (if available and space permits) */}
      {service?.price && duration >= 3 && (
        <div className="text-xs font-semibold text-green-600 mt-1">
          R$ {service.price.toFixed(2)}
        </div>
      )}

      {/* Payment status indicator dot */}
      {appointment.payment_status && (
        <div className="absolute top-1 right-1">
          <div className={cn(
            'w-2 h-2 rounded-full',
            appointment.payment_status === 'paid' && 'bg-green-500',
            appointment.payment_status === 'pending' && 'bg-yellow-500',
            appointment.payment_status === 'failed' && 'bg-red-500'
          )} />
        </div>
      )}

      {/* Hover actions */}
      {!isEditingStatus && (
        <div className="absolute inset-0 bg-black/5 backdrop-blur-sm rounded-lg transition-all duration-300 flex items-center justify-center opacity-0 group-hover:opacity-100">
          <div className="flex flex-col gap-1 p-1">
            {onEdit && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit();
                }}
                className="px-3 py-1.5 bg-card border border-border rounded-md text-xs font-medium text-card-foreground hover:bg-accent hover:text-accent-foreground transition-all duration-200 shadow-sm min-w-[70px] text-center"
              >
                Editar
              </button>
            )}
            {onPayment && appointment.payment_status !== 'paid' && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onPayment();
                }}
                className="px-3 py-1.5 bg-primary text-primary-foreground rounded-md text-xs font-medium hover:bg-primary/90 transition-all duration-200 shadow-sm flex items-center justify-center gap-1 min-w-[70px]"
              >
                <CreditCard className="h-3 w-3" />
                Pagar
              </button>
            )}
            {onCancel && appointment.status !== 'cancelled' && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onCancel();
                }}
                className="px-3 py-1.5 bg-destructive text-destructive-foreground rounded-md text-xs font-medium hover:bg-destructive/90 transition-all duration-200 shadow-sm min-w-[70px] text-center"
              >
                Cancelar
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AppointmentBlock;
