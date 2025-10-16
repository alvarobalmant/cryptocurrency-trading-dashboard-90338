import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Scissors } from 'lucide-react';

// Landing page components
import Header from '@/components/landing/Header';
import Hero from '@/components/landing/Hero';
import Dashboard from '@/components/landing/Dashboard';
import Features from '@/components/landing/Features';
import CaseStudies from '@/components/landing/CaseStudies';
import Pricing from '@/components/landing/Pricing';
import Reviews from '@/components/landing/Reviews';
import CTA from '@/components/landing/CTA';
import Footer from '@/components/landing/Footer';
import WhatsAppFAB from '@/components/landing/WhatsAppFAB';

const IndexNew = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    const checkUserType = async () => {
      if (!loading && user && location.pathname === '/' && !checking) {
        console.log('🔍 Index: Checking user type for:', user.email || user.phone);
        setChecking(true);
        try {
          if (!user.email) {
            console.log('👤 Index: Cliente autenticado via telefone detectado, permitindo navegação livre');
            setChecking(false);
            return;
          }

          const { data: barbershops, error: barbershopsError } = await supabase.rpc('get_safe_barbershops_list', {
            user_id_param: user.id
          });

          if (barbershopsError) {
            console.error('❌ Index: Error fetching barbershops:', barbershopsError);
            setChecking(false);
            return;
          }

          if (barbershops && barbershops.length > 0) {
            console.log('🏪 Index: User has barbershops, redirecting to first barbershop overview');
            navigate(`/barbershop/${barbershops[0].id}/overview`, { replace: true });
            return;
          }

          const { data: employee, error: employeeError } = await supabase
            .from('employees')
            .select('slug')
            .eq('email', user.email)
            .eq('status', 'active')
            .maybeSingle();

          if (employeeError) {
            console.error('❌ Index: Error checking employee status:', employeeError);
            setChecking(false);
            return;
          }

          if (employee?.slug) {
            console.log('👨‍💼 Index: User is employee, redirecting to employee dashboard');
            navigate(`/employees/${employee.slug}`, { replace: true });
            return;
          }

          console.log('✅ Index: Cliente autenticado detectado, permanece na página inicial');
        } catch (error) {
          console.error('❌ Index: Unexpected error:', error);
        } finally {
          setChecking(false);
        }
      }
    };

    checkUserType();
  }, [user, loading, navigate, checking, location.pathname]);

  if (loading || checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <Scissors className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <Header />
      <main id="topo">
        <Hero />
        <Dashboard />
        <Features />
        <CaseStudies />
        <Pricing />
        <Reviews />
        <CTA />
      </main>
      <Footer />
      <WhatsAppFAB />
    </div>
  );
};

export default IndexNew;
