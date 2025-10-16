import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Activity, Calendar, DollarSign, Search, X } from 'lucide-react';
import { HistoryCard } from './HistoryCard';

interface HistoryListProps {
  records: any[];
  historySortBy: 'transaction' | 'appointment';
  onSortChange: () => void;
  onStatusChange: (id: string, status: string) => void;
  onDetailsClick: (id: string, type: 'appointment' | 'payment') => void;
  getEmployeeName: (id: string) => string;
  onClearFilters: () => void;
}

export const HistoryList = ({
  records,
  historySortBy,
  onSortChange,
  onStatusChange,
  onDetailsClick,
  getEmployeeName,
  onClearFilters,
}: HistoryListProps) => {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            <div>
              <CardTitle>Histórico ({records.length})</CardTitle>
              <CardDescription>
                {records.length === 0 ? 'Nenhum registro encontrado' : 
                 `${records.length} registro${records.length !== 1 ? 's' : ''} encontrado${records.length !== 1 ? 's' : ''}`}
              </CardDescription>
            </div>
          </div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={onSortChange}
          >
            {historySortBy === 'transaction' ? (
              <>
                <DollarSign className="h-4 w-4 mr-2" />
                Transação
              </>
            ) : (
              <>
                <Calendar className="h-4 w-4 mr-2" />
                Agendamento
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {records.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto mb-4 bg-muted rounded-2xl flex items-center justify-center">
              <Search className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Nenhum resultado encontrado</h3>
            <p className="text-muted-foreground text-sm mb-4">
              Tente ajustar os filtros para ver mais resultados.
            </p>
            <Button onClick={onClearFilters} variant="outline" size="sm">
              <X className="h-4 w-4 mr-2" />
              Limpar Filtros
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {records.map((record) => (
              <HistoryCard
                key={record.id}
                record={record}
                historySortBy={historySortBy}
                onStatusChange={onStatusChange}
                onDetailsClick={onDetailsClick}
                getEmployeeName={getEmployeeName}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
