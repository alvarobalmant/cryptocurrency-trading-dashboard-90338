import { HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';

export interface MetricHelpContent {
  title: string;
  definition: string;
  formula: string;
  example: string;
  dataSource: string;
  calculation?: string;
}

interface MetricTooltipProps {
  content: MetricHelpContent;
}

export const MetricTooltip = ({ content }: MetricTooltipProps) => {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 rounded-full hover:bg-muted"
        >
          <HelpCircle className="h-4 w-4 text-muted-foreground" />
          <span className="sr-only">Ajuda sobre {content.title}</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">{content.title}</DialogTitle>
          <DialogDescription className="text-base">
            {content.definition}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          <div>
            <h4 className="font-semibold text-sm mb-2 text-foreground">📐 Fórmula de Cálculo</h4>
            <div className="bg-muted/50 rounded-lg p-3">
              <code className="text-sm font-mono">{content.formula}</code>
            </div>
          </div>

          <Separator />

          <div>
            <h4 className="font-semibold text-sm mb-2 text-foreground">💡 Exemplo Prático</h4>
            <p className="text-sm text-muted-foreground">{content.example}</p>
          </div>

          {content.calculation && (
            <>
              <Separator />
              <div>
                <h4 className="font-semibold text-sm mb-2 text-foreground">🔢 Como é Calculado</h4>
                <div className="text-sm text-muted-foreground whitespace-pre-line">
                  {content.calculation}
                </div>
              </div>
            </>
          )}

          <Separator />

          <div>
            <h4 className="font-semibold text-sm mb-2 text-foreground">📊 Fonte dos Dados</h4>
            <p className="text-sm text-muted-foreground">{content.dataSource}</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};