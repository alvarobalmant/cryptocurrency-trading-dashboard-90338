import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Info, CheckCircle2, XCircle, X } from 'lucide-react';
import { useState } from 'react';

interface AlertBannerProps {
  severity: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  action?: string;
  onAction?: () => void;
  dismissible?: boolean;
}

export const AlertBanner = ({
  severity,
  title,
  message,
  action,
  onAction,
  dismissible = true
}: AlertBannerProps) => {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  const icons = {
    info: Info,
    success: CheckCircle2,
    warning: AlertTriangle,
    error: XCircle
  };

  const colorClasses = {
    info: 'border-blue-200 bg-blue-50 text-blue-900',
    success: 'border-green-200 bg-green-50 text-green-900',
    warning: 'border-orange-200 bg-orange-50 text-orange-900',
    error: 'border-red-200 bg-red-50 text-red-900'
  };

  const Icon = icons[severity];

  return (
    <Alert className={`${colorClasses[severity]} relative`}>
      <Icon className="h-4 w-4" />
      <AlertTitle className="font-semibold">{title}</AlertTitle>
      <AlertDescription className="text-sm mt-1">
        {message}
      </AlertDescription>
      <div className="flex items-center gap-2 mt-3">
        {action && onAction && (
          <Button variant="outline" size="sm" onClick={onAction} className="h-8">
            {action}
          </Button>
        )}
        {dismissible && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setDismissed(true)}
            className="ml-auto h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
    </Alert>
  );
};
