import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface InsightFiltersProps {
  onFilterSeverity: (severity: string[]) => void;
  onFilterType: (type: string[]) => void;
  onShowDismissed: (show: boolean) => void;
  currentSeverity: string[];
  currentType: string[];
  showDismissed: boolean;
}

export const InsightFilters = ({
  onFilterSeverity,
  currentSeverity,
  showDismissed,
  onShowDismissed
}: InsightFiltersProps) => {
  const toggleSeverity = (sev: string) => {
    if (currentSeverity.includes(sev)) {
      const filtered = currentSeverity.filter(s => s !== sev);
      onFilterSeverity(filtered.length === 0 ? ['all'] : filtered);
    } else {
      onFilterSeverity([...currentSeverity.filter(s => s !== 'all'), sev]);
    }
  };

  return (
    <div className="flex flex-wrap gap-3 items-center">
      <span className="text-sm font-medium">Filtros:</span>
      
      <div className="flex gap-2">
        <Button
          size="sm"
          variant={currentSeverity.includes('critical') ? 'default' : 'outline'}
          onClick={() => toggleSeverity('critical')}
        >
          <Badge className="bg-red-100 text-red-800 mr-1">Crítico</Badge>
        </Button>
        <Button
          size="sm"
          variant={currentSeverity.includes('opportunity') ? 'default' : 'outline'}
          onClick={() => toggleSeverity('opportunity')}
        >
          <Badge className="bg-green-100 text-green-800 mr-1">Oportunidade</Badge>
        </Button>
        <Button
          size="sm"
          variant={currentSeverity.includes('warning') ? 'default' : 'outline'}
          onClick={() => toggleSeverity('warning')}
        >
          <Badge className="bg-yellow-100 text-yellow-800 mr-1">Aviso</Badge>
        </Button>
        <Button
          size="sm"
          variant={currentSeverity.includes('info') ? 'default' : 'outline'}
          onClick={() => toggleSeverity('info')}
        >
          <Badge className="bg-blue-100 text-blue-800 mr-1">Info</Badge>
        </Button>
      </div>

      <Button
        size="sm"
        variant={showDismissed ? 'default' : 'outline'}
        onClick={() => onShowDismissed(!showDismissed)}
      >
        {showDismissed ? 'Ocultar' : 'Mostrar'} Dispensados
      </Button>
    </div>
  );
};
