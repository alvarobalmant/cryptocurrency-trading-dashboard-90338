import { useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Search, Calendar, Clock, User, Scissors } from 'lucide-react';
import { format, parseISO, differenceInMinutes } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Appointment {
  id: string;
  appointment_date: string;
  start_time: string;
  status: string;
  client_name: string;
  client_phone: string;
  services?: { name: string };
  employees?: { name: string };
}

interface AppointmentSelectorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointments: Appointment[];
  onSelect: (appointmentId: string) => void;
}

export default function AppointmentSelectorModal({
  open,
  onOpenChange,
  appointments,
  onSelect,
}: AppointmentSelectorModalProps) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('all');

  const now = new Date();

  const filteredAppointments = useMemo(() => {
    let filtered = appointments.filter((apt) => {
      // Excluir cancelados e no-show
      if (['cancelled', 'no_show'].includes(apt.status)) return false;

      // Filtro de busca
      if (search) {
        const searchLower = search.toLowerCase();
        const matchesSearch =
          apt.client_name.toLowerCase().includes(searchLower) ||
          apt.client_phone.includes(search) ||
          apt.services?.name.toLowerCase().includes(searchLower) ||
          apt.employees?.name.toLowerCase().includes(searchLower);
        
        if (!matchesSearch) return false;
      }

      // Filtro de status
      if (statusFilter !== 'all' && apt.status !== statusFilter) {
        return false;
      }

      // Filtro de data
      if (dateFilter !== 'all') {
        const aptDate = parseISO(apt.appointment_date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (dateFilter === 'today') {
          const aptDateOnly = new Date(aptDate);
          aptDateOnly.setHours(0, 0, 0, 0);
          if (aptDateOnly.getTime() !== today.getTime()) return false;
        } else if (dateFilter === 'future') {
          if (aptDate < today) return false;
        } else if (dateFilter === 'past') {
          if (aptDate >= today) return false;
        }
      }

      return true;
    });

    // Ordenar por proximidade do horário atual
    filtered.sort((a, b) => {
      const dateTimeA = parseISO(`${a.appointment_date}T${a.start_time}`);
      const dateTimeB = parseISO(`${b.appointment_date}T${b.start_time}`);
      const diffA = Math.abs(differenceInMinutes(dateTimeA, now));
      const diffB = Math.abs(differenceInMinutes(dateTimeB, now));
      return diffA - diffB;
    });

    return filtered;
  }, [appointments, search, statusFilter, dateFilter, now]);

  const handleSelect = (appointmentId: string) => {
    onSelect(appointmentId);
    onOpenChange(false);
    setSearch('');
    setStatusFilter('all');
    setDateFilter('all');
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
      pending: { label: 'Pendente', variant: 'secondary' },
      confirmed: { label: 'Confirmado', variant: 'default' },
      completed: { label: 'Concluído', variant: 'outline' },
      queue_reserved: { label: 'Reservado', variant: 'secondary' },
    };

    const statusInfo = statusMap[status] || { label: status, variant: 'outline' };
    return <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Selecionar Agendamento</DialogTitle>
          <DialogDescription>
            Busque e selecione um agendamento para vincular à comanda
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Busca */}
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por cliente, telefone, serviço ou profissional..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Filtros */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="pending">Pendente</SelectItem>
                  <SelectItem value="confirmed">Confirmado</SelectItem>
                  <SelectItem value="completed">Concluído</SelectItem>
                  <SelectItem value="queue_reserved">Reservado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Data</Label>
              <Select value={dateFilter} onValueChange={setDateFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="today">Hoje</SelectItem>
                  <SelectItem value="future">Futuras</SelectItem>
                  <SelectItem value="past">Passadas</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Lista de agendamentos */}
          <ScrollArea className="h-[400px] pr-4">
            {filteredAppointments.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
                <Calendar className="h-12 w-12 mb-2 opacity-20" />
                <p>Nenhum agendamento encontrado</p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredAppointments.map((apt) => {
                  const aptDateTime = parseISO(`${apt.appointment_date}T${apt.start_time}`);
                  const diff = differenceInMinutes(aptDateTime, now);
                  const timeLabel = diff < 0 
                    ? `há ${Math.abs(diff)} min` 
                    : diff < 60 
                    ? `em ${diff} min`
                    : `em ${Math.floor(diff / 60)}h`;

                  return (
                    <Button
                      key={apt.id}
                      variant="outline"
                      className="w-full h-auto p-4 justify-start hover:bg-accent"
                      onClick={() => handleSelect(apt.id)}
                    >
                      <div className="flex flex-col items-start gap-2 w-full">
                        <div className="flex items-center justify-between w-full">
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">{apt.client_name}</span>
                          </div>
                          {getStatusBadge(apt.status)}
                        </div>
                        
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {format(parseISO(apt.appointment_date), "dd/MM/yyyy", { locale: ptBR })}
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {apt.start_time} ({timeLabel})
                          </div>
                          <div className="flex items-center gap-1">
                            <Scissors className="h-3 w-3" />
                            {apt.services?.name}
                          </div>
                          <div className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {apt.employees?.name}
                          </div>
                        </div>
                      </div>
                    </Button>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}
