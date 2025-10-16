import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabasePublic } from '@/integrations/supabase/publicClient';
import { Button } from '@/components/ui/button';

const BookingEntry = () => {
  const { barbershopSlug } = useParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'notfound' | 'ok'>('loading');
  const [errorMsg, setErrorMsg] = useState<string>('');
  useEffect(() => {
    const go = async () => {
      if (!barbershopSlug) {
        setStatus('notfound');
        setErrorMsg('Slug inválido');
        return;
      }
      try {
        console.log('🔍 BookingEntry: Searching for barbershop with slug:', barbershopSlug);
        
        // SECURE: Use security definer function for public booking access
        const { data, error } = await supabasePublic.rpc('get_barbershop_for_booking', {
          barbershop_identifier: barbershopSlug
        });

        console.log('📊 BookingEntry: Barbershop query result:', { data, error });

        if (error) {
          console.error('❌ BookingEntry: Database error:', error);
          setStatus('notfound');
          setErrorMsg('Barbearia não encontrada. Verifique o link.');
          return;
        }

        if (!data || data.length === 0) {
          console.warn('⚠️ BookingEntry: No barbershop found with slug:', barbershopSlug);
          setStatus('notfound');
          setErrorMsg('Barbearia não encontrada. Verifique o link.');
          return;
        }

        const barbershopData = data[0];
        document.title = `${barbershopData.name} | Agendamento`;

        if (barbershopData.show_categories_in_booking) {
          navigate(`/booking/${barbershopSlug}/categories`, { replace: true });
        } else {
          navigate(`/booking/${barbershopSlug}/services`, { replace: true });
        }
      } catch (e: any) {
        console.error('💥 BookingEntry: Unexpected error:', e);
        setStatus('notfound');
        const msg = e?.message || 'Erro ao carregar a barbearia.';
        setErrorMsg(msg.includes('406') ? 'Barbearia não encontrada.' : msg);
        return;
      }
    };
    go();
  }, [barbershopSlug, navigate]);

  if (status === 'notfound') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-3">
          <p className="text-muted-foreground">Barbearia não encontrada.</p>
          {barbershopSlug && (
            <p className="text-xs text-muted-foreground">Slug: {barbershopSlug}</p>
          )}
          <Button variant="outline" onClick={() => navigate('/')}>Voltar para a página inicial</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <p className="text-muted-foreground">Carregando agendamento...</p>
    </div>
  );
};

export default BookingEntry;
