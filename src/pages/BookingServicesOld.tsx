import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Clock, DollarSign, Scissors } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

type Service = {
  id: string;
  name: string;
  description: string;
  price: number;
  duration_minutes: number;
};

type Barbershop = {
  id: string;
  name: string;
  slogan: string;
  slug: string;
  avatar_url: string;
};

export default function BookingServices() {
  const { barbershopSlug } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [barbershop, setBarbershop] = useState<Barbershop | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!barbershopSlug) return;

      try {
        // SECURE: Use security definer function for public booking access
        const { data: barbershopData, error: barbershopError } = await supabase.rpc('get_barbershop_for_booking', {
          barbershop_identifier: barbershopSlug
        });

        if (barbershopError) throw barbershopError;
        
        if (!barbershopData || barbershopData.length === 0) {
          console.error('Barbershop not found:', barbershopSlug);
          return;
        }
        
        setBarbershop(barbershopData[0]);

        // Fetch services
        const { data: servicesData, error: servicesError } = await supabase
          .from('services')
          .select('id, name, description, price, duration_minutes')
          .eq('barbershop_id', barbershopData[0].id)
          .eq('active', true);

        if (servicesError) throw servicesError;
        setServices(servicesData || []);
      } catch (error) {
        console.error('Error fetching data:', error);
        toast({
          title: 'Erro',
          description: 'Não foi possível carregar os dados da barbearia.',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [barbershopSlug, toast]);

  const handleServiceSelect = (service: Service) => {
    navigate(`/booking/${barbershopSlug}/employees`, {
      state: { 
        service,
        barbershop 
      }
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando serviços...</p>
        </div>
      </div>
    );
  }

  if (!barbershop) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Barbearia não encontrada</h2>
          <p className="text-muted-foreground">A barbearia que você está procurando não existe.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            {barbershop.avatar_url ? (
              <img 
                src={barbershop.avatar_url} 
                alt={barbershop.name}
                className="w-16 h-16 rounded-full object-cover"
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                <Scissors className="h-8 w-8 text-primary" />
              </div>
            )}
          </div>
          <h1 className="text-3xl font-bold mb-2">{barbershop.name}</h1>
          {barbershop.slogan && (
            <p className="text-muted-foreground">{barbershop.slogan}</p>
          )}
        </div>

        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-semibold mb-6 text-center">Escolha seu serviço</h2>
          
          {services.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Nenhum serviço disponível no momento.</p>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {services.map((service) => (
                <Card key={service.id} className="hover:shadow-lg transition-shadow cursor-pointer">
                  <CardHeader>
                    <CardTitle className="text-lg">{service.name}</CardTitle>
                    {service.description && (
                      <CardDescription>{service.description}</CardDescription>
                    )}
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        <span>{service.duration_minutes} min</span>
                      </div>
                      <div className="flex items-center gap-2 font-semibold">
                        <DollarSign className="h-4 w-4" />
                        <span>R$ {service.price.toFixed(2)}</span>
                      </div>
                    </div>
                    <Button 
                      onClick={() => handleServiceSelect(service)}
                      className="w-full"
                    >
                      Escolher serviço
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}