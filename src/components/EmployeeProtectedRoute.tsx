import { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Scissors } from 'lucide-react';

interface EmployeeProtectedRouteProps {
  children: React.ReactNode;
}

const EmployeeProtectedRoute = ({ children }: EmployeeProtectedRouteProps) => {
  const { user, loading: authLoading } = useAuth();
  const [isEmployee, setIsEmployee] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const location = useLocation();

  useEffect(() => {
    const checkEmployeeStatus = async () => {
      if (!user?.email) {
        setIsEmployee(false);
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('employees')
          .select('id')
          .eq('email', user.email)
          .eq('status', 'active')
          .single();

        if (error) {
          setIsEmployee(false);
        } else {
          setIsEmployee(true);
        }
      } catch (error) {
        setIsEmployee(false);
      } finally {
        setLoading(false);
      }
    };

    if (!authLoading) {
      checkEmployeeStatus();
    }
  }, [user, authLoading]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex items-center gap-2">
          <Scissors className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Verificando acesso...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  if (isEmployee === false) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

export default EmployeeProtectedRoute;