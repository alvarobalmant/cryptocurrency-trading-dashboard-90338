import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

const EmployeeRedirect = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const checkAndRedirectEmployee = async () => {
      // CRITICAL: Never interfere with booking flow
      if (location.pathname.startsWith('/booking/')) {
        console.log('🚫 EmployeeRedirect: Skipping check for booking route');
        return;
      }

      // Only check users with email (phone-only users are clients)
      if (!user?.email) {
        console.log('🚫 EmployeeRedirect: No email, user is a client');
        return;
      }

      // Don't redirect if already on employee page
      if (location.pathname.startsWith('/employees/')) return;

      // Don't redirect if on auth page
      if (location.pathname === '/auth') return;

      // Don't redirect if on employee invitation page
      if (location.pathname.includes('/employee/invite/')) return;

      // Don't check on homepage (Index.tsx handles this)
      if (location.pathname === '/') return;

      console.log('🔍 EmployeeRedirect: Checking employee status for:', user.email);

      try {
        const { data: employee, error } = await supabase
          .from('employees')
          .select('slug')
          .eq('email', user.email)
          .eq('status', 'active')
          .maybeSingle();

        if (error) {
          console.log('⚠️ EmployeeRedirect: Error checking employee status:', error);
          return;
        }

        if (employee?.slug) {
          console.log('✅ EmployeeRedirect: Redirecting to employee dashboard:', employee.slug);
          navigate(`/employees/${employee.slug}`, { replace: true });
        } else {
          console.log('ℹ️ EmployeeRedirect: User is not an active employee');
        }
      } catch (error) {
        console.log('⚠️ EmployeeRedirect: Unexpected error:', error);
      }
    };

    // Only check after user is loaded
    if (user) {
      checkAndRedirectEmployee();
    }
  }, [user, navigate, location.pathname]);

  return null;
};

export default EmployeeRedirect;