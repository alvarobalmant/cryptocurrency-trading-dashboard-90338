import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertCircle, TrendingUp, Info, X, Check, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';

interface Insight {
  id: string;
  title: string;
  description: string;
  severity: 'info' | 'warning' | 'critical' | 'opportunity';
  insight_type: string;
  recommendations: any[];
  confidence_score: number;
  potential_revenue_impact: number | null;
  read_at: string | null;
  dismissed: boolean;
  action_taken: boolean;
  target_entity_type: string | null;
  target_entity_id: string | null;
}

interface InsightCardProps {
  insight: Insight;
  onMarkAsRead: () => void;
  onDismiss: (reason?: string) => void;
  onMarkActionTaken: (notes?: string) => void;
}

export const InsightCard = ({ insight, onMarkAsRead, onDismiss, onMarkActionTaken }: InsightCardProps) => {
  const [expanded, setExpanded] = useState(false);

  const severityConfig = {
    critical: { icon: AlertCircle, bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', badge: 'bg-red-100 text-red-800' },
    opportunity: { icon: TrendingUp, bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-700', badge: 'bg-green-100 text-green-800' },
    warning: { icon: AlertCircle, bg: 'bg-yellow-50', border: 'border-yellow-200', text: 'text-yellow-700', badge: 'bg-yellow-100 text-yellow-800' },
    info: { icon: Info, bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', badge: 'bg-blue-100 text-blue-800' }
  };

  const config = severityConfig[insight.severity];
  const Icon = config.icon;

  const handleCardClick = () => {
    if (!insight.read_at) onMarkAsRead();
    setExpanded(!expanded);
  };

  return (
    <Card className={cn('transition-all hover:shadow-md cursor-pointer', config.bg, config.border, !insight.read_at && 'ring-2 ring-primary/20')} onClick={handleCardClick}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 flex-1">
            <Icon className={cn('h-5 w-5 mt-0.5', config.text)} />
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-semibold text-lg">{insight.title}</h3>
                {!insight.read_at && <Badge variant="secondary" className="text-xs">Novo</Badge>}
                {insight.action_taken && <Badge variant="outline" className="text-xs bg-green-50">✓ Ação tomada</Badge>}
              </div>

              <div className="flex items-center gap-2 flex-wrap text-xs text-muted-foreground">
                <Badge className={config.badge}>{insight.severity.toUpperCase()}</Badge>
                <Badge variant="outline">{insight.insight_type}</Badge>
                {insight.confidence_score && <><span>•</span><span>Confiança: {(insight.confidence_score * 100).toFixed(0)}%</span></>}
                {insight.potential_revenue_impact && <><span>•</span><span className="text-green-600 font-medium">+R$ {insight.potential_revenue_impact.toFixed(0)}</span></>}
              </div>

              <p className="text-sm text-muted-foreground">{insight.description}</p>
            </div>
          </div>

          <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}>
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </div>
      </CardHeader>

      {expanded && (
        <CardContent className="space-y-4">
          {insight.recommendations && insight.recommendations.length > 0 && (
            <div>
              <h4 className="font-semibold mb-2">Recomendações:</h4>
              <ul className="space-y-2">
                {insight.recommendations.map((rec: any, idx: number) => (
                  <li key={idx} className="flex gap-2 text-sm">
                    <span className="text-primary font-bold">{idx + 1}.</span>
                    <div className="flex-1">
                      <p className="font-medium">{rec.action}</p>
                      {rec.impact && <div className="flex gap-3 mt-1 text-xs text-muted-foreground">
                        <span>Impacto: {rec.impact}</span>
                        {rec.effort && <span>Esforço: {rec.effort}</span>}
                        {rec.timeframe && <span>Prazo: {rec.timeframe}</span>}
                      </div>}
                      {rec.expectedResult && <p className="text-xs text-green-600 mt-1">→ {rec.expectedResult}</p>}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex gap-2 pt-4 border-t">
            {!insight.action_taken && (
              <Button size="sm" variant="default" onClick={(e) => { e.stopPropagation(); onMarkActionTaken(); }}>
                <Check className="h-4 w-4 mr-1" />
                Marcar como implementado
              </Button>
            )}
            {!insight.dismissed && (
              <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); onDismiss(); }}>
                <X className="h-4 w-4 mr-1" />
                Dispensar
              </Button>
            )}
          </div>
        </CardContent>
      )}
    </Card>
  );
};
