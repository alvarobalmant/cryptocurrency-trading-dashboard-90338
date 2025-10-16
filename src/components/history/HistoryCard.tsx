import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, User, Phone, Clock, Scissors, QrCode, CreditCard, ExternalLink } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { PaymentStatusBadge } from '@/utils/paymentStatus';

interface HistoryCardProps {
  record: any;
  historySortBy: 'transaction' | 'appointment';
  onStatusChange: (id: string, status: string) => void;
  onDetailsClick: (id: string, type: 'appointment' | 'payment') => void;
  getEmployeeName: (id: string) => string;
}

export const HistoryCard = ({
  record,
  historySortBy,
  onStatusChange,
  onDetailsClick,
  getEmployeeName,
}: HistoryCardProps) => {
  const getStatusBadge = (status: string) => {
    const variants = {
      pending: { label: 'Marcado', className: 'bg-orange-100 text-orange-800 border-orange-200' },
      confirmed: { label: 'Feito', className: 'bg-blue-100 text-blue-800 border-blue-200' },
      cancelled: { label: 'Cancelado', className: 'bg-red-100 text-red-800 border-red-200' },
      no_show: { label: 'Não apareceu', className: 'bg-gray-100 text-gray-800 border-gray-200' }
    };
    
    const config = variants[status as keyof typeof variants] || variants.pending;
    return <Badge className={config.className}>{config.label}</Badge>;
  };

  return (
    <Card className={`hover:shadow-md transition-all ${
      record.type === 'payment' ? 'border-blue-200 bg-blue-50/30' : ''
    }`}>
      <CardContent className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <Badge 
            variant={record.type === 'appointment' ? 'default' : 'secondary'}
            className={record.type === 'appointment' ? 
              'bg-blue-100 text-blue-800 border-blue-200' : 
              'bg-green-100 text-green-800 border-green-200'
            }
          >
            {record.type === 'appointment' ? (
              <>
                <Calendar className="h-3 w-3 mr-1" />
                Agendamento
              </>
            ) : (
              <>
                {record.data.payment_method === 'pix' && <QrCode className="h-3 w-3 mr-1" />}
                {record.data.payment_method === 'point' && <CreditCard className="h-3 w-3 mr-1" />}
                {!record.data.payment_method && <ExternalLink className="h-3 w-3 mr-1" />}
                Walk-in
              </>
            )}
          </Badge>
          
          <div className="text-right">
            <p className="text-xs text-muted-foreground">
              {historySortBy === 'transaction' ? 'Transação' : 'Agendamento'}
            </p>
            <p className="text-sm font-medium">
              {format(parseISO(
                historySortBy === 'transaction' ? 
                  record.operation_date.split('T')[0] : 
                  record.date
              ), 'dd/MM/yyyy', { locale: ptBR })}
            </p>
          </div>
        </div>
        
        {/* Client Info */}
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 bg-gradient-to-br from-primary to-primary/60 rounded-full flex items-center justify-center flex-shrink-0">
            <span className="text-primary-foreground text-sm font-medium">
              {record.client_name.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold truncate">{record.client_name}</p>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Phone className="h-3 w-3" />
              {record.client_phone}
            </p>
          </div>
        </div>
        
        {/* Details Grid */}
        <div className="grid grid-cols-2 gap-3 mb-3 text-xs">
          <div className="flex items-center gap-1 text-muted-foreground">
            <User className="h-3 w-3" />
            <span className="truncate">
              {getEmployeeName(record.employee_id)}
            </span>
          </div>
          
          <div className="flex items-center gap-1 text-muted-foreground">
            <Clock className="h-3 w-3" />
            <span>
              {record.time}
              {record.type === 'appointment' && record.data.end_time && 
                ` - ${record.data.end_time}`
              }
            </span>
          </div>
        </div>
        
        {/* Status and Payment */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 flex-wrap">
            {getStatusBadge(record.status)}
            <PaymentStatusBadge 
              data={{
                payment_status: record.payment_status,
                payment_method: record.payment_method,
                status: record.status,
                is_subscription_appointment: record.data.is_subscription_appointment
              }} 
            />
          </div>
          
          {record.data.services?.price && (
            <div className="text-right">
              <p className="text-sm font-bold text-green-600">
                R$ {Number(record.data.services.price).toFixed(2)}
              </p>
            </div>
          )}
        </div>
        
        {/* Service/Notes */}
        {(record.data.services?.name || record.notes) && (
          <div className="flex items-center gap-2 mb-3 p-2 bg-muted rounded-lg">
            <Scissors className="h-3 w-3 text-muted-foreground flex-shrink-0" />
            <span className="text-xs text-muted-foreground truncate">
              {record.data.services?.name || record.notes || 'Sem descrição'}
            </span>
          </div>
        )}
        
        {/* Actions */}
        <div className="flex gap-2">
          {record.type === 'appointment' && (
            <Select
              value={record.status}
              onValueChange={(value) => onStatusChange(record.id, value)}
            >
              <SelectTrigger className="flex-1 h-9 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Marcado</SelectItem>
                <SelectItem value="confirmed">Feito</SelectItem>
                <SelectItem value="cancelled">Cancelado</SelectItem>
                <SelectItem value="no_show">Não apareceu</SelectItem>
              </SelectContent>
            </Select>
          )}
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => onDetailsClick(record.id, record.type)}
            className="text-xs"
          >
            Detalhes
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
