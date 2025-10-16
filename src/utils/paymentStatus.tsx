import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Clock, XCircle, AlertTriangle, CreditCard, Banknote, RefreshCw } from 'lucide-react';

export interface PaymentStatusData {
  payment_status?: string;
  payment_method?: string;
  status?: string;
  is_subscription_appointment?: boolean;
}

export const getPaymentStatusInfo = (data: PaymentStatusData) => {
  const { payment_status, payment_method, status, is_subscription_appointment } = data;
  
  // Se foi cancelado, não mostrar status de pagamento
  if (status === 'cancelled') {
    return null;
  }
  
  // Determinar o status de pagamento
  switch (payment_status) {
    case 'paid':
      if (is_subscription_appointment) {
        return {
          variant: 'default' as const,
          className: 'bg-purple-100 text-purple-800 border-purple-200 cursor-pointer hover:bg-purple-200',
          icon: <CheckCircle2 className="h-3 w-3 mr-1" />,
          label: 'Pago (Assinatura)',
          clickable: true
        };
      } else if (payment_method === 'manual') {
        return {
          variant: 'default' as const,
          className: 'bg-green-100 text-green-800 border-green-200 cursor-pointer hover:bg-green-200',
          icon: <Banknote className="h-3 w-3 mr-1" />,
          label: 'Pago (Manual)',
          clickable: true
        };
      } else if (payment_method) {
        return {
          variant: 'default' as const,
          className: 'bg-green-100 text-green-800 border-green-200 cursor-pointer hover:bg-green-200',
          icon: <CreditCard className="h-3 w-3 mr-1" />,
          label: 'Pago (Online)',
          clickable: true
        };
      } else {
        return {
          variant: 'default' as const,
          className: 'bg-green-100 text-green-800 border-green-200 cursor-pointer hover:bg-green-200',
          icon: <CheckCircle2 className="h-3 w-3 mr-1" />,
          label: 'Pago',
          clickable: true
        };
      }
      
    case 'processing':
      return {
        variant: 'secondary' as const,
        className: 'bg-yellow-100 text-yellow-800 border-yellow-200 cursor-pointer hover:bg-yellow-200',
        icon: <Clock className="h-3 w-3 mr-1" />,
        label: 'Processando',
        clickable: true
      };
      
    case 'failed':
      return {
        variant: 'destructive' as const,
        className: 'bg-red-100 text-red-800 border-red-200 cursor-pointer hover:bg-red-200',
        icon: <XCircle className="h-3 w-3 mr-1" />,
        label: 'Falhou',
        clickable: true
      };
      
    case 'refunded':
      return {
        variant: 'outline' as const,
        className: 'bg-gray-100 text-gray-800 border-gray-300 cursor-pointer hover:bg-gray-200',
        icon: <RefreshCw className="h-3 w-3 mr-1" />,
        label: 'Reembolsado',
        clickable: true
      };
      
    case 'cancelled':
      return {
        variant: 'outline' as const,
        className: 'bg-gray-100 text-gray-800 border-gray-300',
        icon: <XCircle className="h-3 w-3 mr-1" />,
        label: 'Cancelado',
        clickable: false
      };
      
    default:
      // Se não há status de pagamento, mas o agendamento foi confirmado, pode ter sido pago fora do sistema
      if (status === 'confirmed') {
        return {
          variant: 'outline' as const,
          className: 'bg-blue-50 text-blue-800 border-blue-200',
          icon: <AlertTriangle className="h-3 w-3 mr-1" />,
          label: 'Não Informado',
          clickable: false
        };
      }
      
      return {
        variant: 'outline' as const,
        className: 'bg-gray-50 text-gray-700 border-gray-200',
        icon: <Clock className="h-3 w-3 mr-1" />,
        label: 'Pendente',
        clickable: false
      };
  }
};

export const PaymentStatusBadge = ({ 
  data, 
  onClick 
}: { 
  data: PaymentStatusData;
  onClick?: () => void;
}) => {
  const statusInfo = getPaymentStatusInfo(data);
  
  if (!statusInfo) {
    return null;
  }
  
  const handleClick = () => {
    if (statusInfo.clickable && onClick) {
      onClick();
    }
  };
  
  return (
    <Badge 
      variant={statusInfo.variant} 
      className={statusInfo.className}
      onClick={handleClick}
    >
      {statusInfo.icon}
      {statusInfo.label}
    </Badge>
  );
};