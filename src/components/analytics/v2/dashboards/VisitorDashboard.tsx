import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, Calendar, TrendingUp, CheckCircle2, XCircle, Clock, Repeat, DollarSign } from 'lucide-react';
import { KpiCard } from '../KpiCard';

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
};

interface VisitorDetail {
  visitorPhone: string;
  visitorName: string;
  totalAppointments: number;
  confirmedAppointments: number;
  pendingAppointments: number;
  cancelledAppointments: number;
  noShowAppointments: number;
  queueReservedAppointments: number;
  daysSinceLastAppointment: number;
  visitFrequency: number;
  isRecurring: boolean;
  conversionPotential: 'high' | 'medium' | 'low';
}

interface VisitorDashboardProps {
  visitorAnalytics?: {
    totalVisitors: number;
    totalAppointments: number;
    totalConfirmedAppointments: number;
    recurringVisitors: number;
    conversionOpportunities: number;
  };
  visitors?: VisitorDetail[];
}

export const VisitorDashboard = ({ visitorAnalytics, visitors = [] }: VisitorDashboardProps) => {
  if (!visitorAnalytics && visitors.length === 0) {
    return (
      <div className="flex items-center justify-center p-8">
        <p className="text-muted-foreground">Dados de visitantes não disponíveis</p>
      </div>
    );
  }

  // Separar visitantes por status de appointment
  const confirmedVisitors = visitors.filter(v => v.confirmedAppointments > 0)
    .sort((a, b) => b.confirmedAppointments - a.confirmedAppointments);
  const pendingVisitors = visitors.filter(v => v.pendingAppointments > 0 && v.confirmedAppointments === 0);
  const cancelledVisitors = visitors.filter(v => v.cancelledAppointments > 0 && v.confirmedAppointments === 0);

  const renderVisitorList = (visitorList: VisitorDetail[], statusType: 'confirmed' | 'pending' | 'cancelled') => {
    if (visitorList.length === 0) {
      return (
        <div className="text-center py-4 text-muted-foreground text-sm">
          Nenhum visitante nesta categoria
        </div>
      );
    }

    const getStatusBadge = () => {
      switch (statusType) {
        case 'confirmed':
          return { icon: CheckCircle2, label: 'Confirmados', className: 'bg-green-500/10 text-green-600 border-green-500/20' };
        case 'pending':
          return { icon: Clock, label: 'Pendentes', className: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20' };
        case 'cancelled':
          return { icon: XCircle, label: 'Cancelados', className: 'bg-red-500/10 text-red-600 border-red-500/20' };
      }
    };

    const status = getStatusBadge();
    const StatusIcon = status.icon;

    return (
      <div className="space-y-3">
        {visitorList.slice(0, 10).map((visitor, index) => (
          <div 
            key={visitor.visitorPhone} 
            className="flex items-center justify-between p-3 bg-muted/20 rounded-lg border border-border/50"
          >
            <div className="flex items-center gap-3 flex-1">
              <Badge variant="outline" className="w-7 h-7 flex items-center justify-center text-xs font-bold">
                #{index + 1}
              </Badge>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm text-foreground truncate">
                  {visitor.visitorName}
                </p>
                {visitor.variantNames && visitor.variantNames.length > 1 && (
                  <p className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                    Também usado: {visitor.variantNames.slice(1).join(', ')}
                  </p>
                )}
                <p className="text-xs text-muted-foreground">{visitor.visitorPhone}</p>
                {visitor.variantPhones && visitor.variantPhones.length > 1 && (
                  <p className="text-xs text-muted-foreground">
                    Variações: {visitor.variantPhones.filter(p => p !== visitor.visitorPhone).slice(0, 2).join(', ')}
                  </p>
                )}
              </div>
            </div>
            <div className="flex-1 ml-4">
              {/* BADGES DE STATUS DE APPOINTMENT */}
              <div className="flex flex-wrap gap-1 mb-2">
                {visitor.confirmedAppointments > 0 && (
                  <Badge variant="outline" className="text-xs bg-green-500/10 text-green-700 border-green-500/30">
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                    {visitor.confirmedAppointments} Confirmado{visitor.confirmedAppointments > 1 ? 's' : ''}
                  </Badge>
                )}
                {visitor.pendingAppointments > 0 && (
                  <Badge variant="outline" className="text-xs bg-yellow-500/10 text-yellow-700 border-yellow-500/30">
                    <Clock className="w-3 h-3 mr-1" />
                    {visitor.pendingAppointments} Pendente{visitor.pendingAppointments > 1 ? 's' : ''}
                  </Badge>
                )}
                {visitor.cancelledAppointments > 0 && (
                  <Badge variant="outline" className="text-xs bg-red-500/10 text-red-700 border-red-500/30">
                    <XCircle className="w-3 h-3 mr-1" />
                    {visitor.cancelledAppointments} Cancelado{visitor.cancelledAppointments > 1 ? 's' : ''}
                  </Badge>
                )}
                {visitor.noShowAppointments > 0 && (
                  <Badge variant="outline" className="text-xs bg-gray-500/10 text-gray-700 border-gray-500/30">
                    {visitor.noShowAppointments} No-show
                  </Badge>
                )}
              </div>
              
              {/* BADGES DE STATUS DE PAGAMENTO */}
              <div className="flex flex-wrap gap-1">
                {visitor.paidPayments > 0 && (
                  <Badge variant="outline" className="text-xs border-green-600 text-green-700">
                    💰 {visitor.paidPayments} Pago{visitor.paidPayments > 1 ? 's' : ''}
                  </Badge>
                )}
                {visitor.pendingPayments > 0 && (
                  <Badge variant="outline" className="text-xs border-yellow-600 text-yellow-700">
                    ⏳ {visitor.pendingPayments} Pendente{visitor.pendingPayments > 1 ? 's' : ''}
                  </Badge>
                )}
                {visitor.failedPayments > 0 && (
                  <Badge variant="outline" className="text-xs border-red-600 text-red-700">
                    ❌ {visitor.failedPayments} Falhou
                  </Badge>
                )}
              </div>
            </div>
            
            {/* DADOS FINANCEIROS */}
            <div className="text-right ml-4 min-w-[140px]">
              <p className="text-lg font-bold text-green-600">
                {formatCurrency(visitor.totalPaidValue)}
              </p>
              <p className="text-xs text-muted-foreground">Total Pago</p>
              
              {visitor.totalPendingValue > 0 && (
                <>
                  <p className="text-sm font-semibold text-yellow-600 mt-1">
                    {formatCurrency(visitor.totalPendingValue)}
                  </p>
                  <p className="text-xs text-muted-foreground">Pendente</p>
                </>
              )}
              
              <div className="mt-2 pt-2 border-t border-border/50">
                <p className="text-xs text-muted-foreground">
                  Ticket Médio
                </p>
                <p className="text-sm font-bold">{formatCurrency(visitor.averageTicket)}</p>
              </div>
              
              <p className="text-xs text-muted-foreground mt-2">
                Última visita: {visitor.daysSinceLastAppointment === 0 ? 'Hoje' : 
                               visitor.daysSinceLastAppointment === 1 ? 'Ontem' :
                               `${visitor.daysSinceLastAppointment} dias`}
              </p>
              
              {visitor.lastPaidDate && (
                <p className="text-xs text-green-600">
                  Último pago: {visitor.daysSinceLastPaidVisit === 0 ? 'Hoje' : 
                                visitor.daysSinceLastPaidVisit === 1 ? 'Ontem' :
                                `${visitor.daysSinceLastPaidVisit} dias`}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      {visitorAnalytics && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          <KpiCard
            title="Total de Visitantes"
            value={visitorAnalytics.totalVisitors}
            icon={Users}
            color="blue"
            subtitle="Telefones únicos"
          />
          
          <KpiCard
            title="Receita Total"
            value={formatCurrency(visitorAnalytics.totalRevenue)}
            icon={DollarSign}
            color="green"
            subtitle={`${visitorAnalytics.totalPaidPayments} pagamentos`}
          />
          
          <KpiCard
            title="Ticket Médio"
            value={formatCurrency(visitorAnalytics.averageTicket)}
            icon={TrendingUp}
            color="purple"
            subtitle="Por visitante"
          />
          
          <KpiCard
            title="Visitantes Recorrentes"
            value={visitorAnalytics.recurringVisitors}
            icon={Repeat}
            color="orange"
            subtitle="2+ visitas confirmadas"
          />
          
          <KpiCard
            title="Receita Pendente"
            value={formatCurrency(visitorAnalytics.totalPendingRevenue)}
            icon={Clock}
            color="yellow"
            subtitle="Aguardando pagamento"
          />
        </div>
      )}

      {/* Visitantes com Agendamentos Confirmados */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-green-600" />
            Visitantes com Agendamentos Confirmados ({confirmedVisitors.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {renderVisitorList(confirmedVisitors, 'confirmed')}
        </CardContent>
      </Card>

      {/* Visitantes com Agendamentos Pendentes */}
      {pendingVisitors.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-yellow-600" />
              Visitantes com Agendamentos Pendentes ({pendingVisitors.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {renderVisitorList(pendingVisitors, 'pending')}
          </CardContent>
        </Card>
      )}

      {/* Visitantes com Agendamentos Cancelados */}
      {cancelledVisitors.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <XCircle className="w-5 h-5 text-red-600" />
              Visitantes com Agendamentos Cancelados ({cancelledVisitors.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {renderVisitorList(cancelledVisitors, 'cancelled')}
          </CardContent>
        </Card>
      )}
    </div>
  );
};
