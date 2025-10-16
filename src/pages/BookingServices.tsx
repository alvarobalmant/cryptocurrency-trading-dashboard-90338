import { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ArrowLeft, Clock, DollarSign, Folder } from 'lucide-react';
import { supabasePublic } from '@/integrations/supabase/publicClient';

const BookingServices = () => {
  const { barbershopSlug } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const categoryId = searchParams.get('category');
  const showAllParam = searchParams.get('all');
  const showAll = showAllParam === '1' || (showAllParam ?? '').toLowerCase() === 'true';
  const [services, setServices] = useState<any[]>([]);
  const [barbershop, setBarbershop] = useState<any>(null);
  const [category, setCategory] = useState<any>(null);
  const [hasCategories, setHasCategories] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBarbershopAndServices();
  }, [barbershopSlug, categoryId]);

  const fetchBarbershopAndServices = async () => {
    if (!barbershopSlug) return;

    try {
      // SECURE: Use security definer function for public booking access
      const { data: barbershopData, error: barbershopError } = await supabasePublic.rpc('get_barbershop_for_booking', {
        barbershop_identifier: barbershopSlug
      });

      if (barbershopError) throw barbershopError;
      
      if (!barbershopData || barbershopData.length === 0) {
        throw new Error('Barbearia não encontrada');
      }
      
      setBarbershop(barbershopData[0]);

      // Check if there are categories to avoid redirect loops
      const { data: cats, error: catsError } = await supabasePublic
        .from('service_categories')
        .select('id')
        .eq('barbershop_id', barbershopData[0].id)
        .limit(1);
      if (catsError) throw catsError;
      setHasCategories((cats?.length ?? 0) > 0);

      // If category filtering is enabled and we have a category, fetch category info
      if (categoryId && barbershopData[0].show_categories_in_booking && !showAll) {
        const { data: categoryData, error: categoryError } = await supabasePublic
          .from('service_categories')
          .select('*')
          .eq('id', categoryId)
          .single();

        if (categoryError) throw categoryError;
        setCategory(categoryData);
      }

      // Fetch services
      let servicesQuery = supabasePublic
        .from('services')
        .select('*')
        .eq('barbershop_id', barbershopData[0].id)
        .eq('active', true);

      // Filter by category if specified
      if (categoryId && !showAll) {
        servicesQuery = servicesQuery.eq('category_id', categoryId);
      }

      const { data: servicesData, error: servicesError } = await servicesQuery;

      if (servicesError) throw servicesError;
      setServices(servicesData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleServiceSelect = (service: any) => {
    navigate(`/booking/${barbershopSlug}/employees`, {
      state: {
        service,
        barbershop,
      },
    });
  };

  const handleBack = () => {
    if (categoryId && barbershop?.show_categories_in_booking && !showAll) {
      navigate(`/booking/${barbershopSlug}/categories`);
    } else {
      navigate('/');
    }
  };

  const shouldShowCategorySelection = () => {
    return barbershop?.show_categories_in_booking && !categoryId && hasCategories === true && !showAll;
  };

  useEffect(() => {
    if (barbershop && hasCategories && shouldShowCategorySelection()) {
      navigate(`/booking/${barbershopSlug}/categories`);
    }
  }, [barbershop, hasCategories, barbershopSlug, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  if (!barbershop) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Barbearia não encontrada.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBack}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-3">
              <Avatar className="h-8 w-8">
                <AvatarImage src={barbershop.avatar_url} />
                <AvatarFallback>{barbershop.name.charAt(0)}</AvatarFallback>
              </Avatar>
              <div>
                <h1 className="font-semibold">{barbershop.name}</h1>
                {barbershop.slogan && (
                  <p className="text-sm text-muted-foreground">{barbershop.slogan}</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            {category ? (
              <>
                <div className="flex items-center justify-center gap-3 mb-4">
                  {category.avatar_url ? (
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={category.avatar_url} />
                      <AvatarFallback>
                        <Folder className="h-6 w-6" />
                      </AvatarFallback>
                    </Avatar>
                  ) : (
                    <div 
                      className="h-12 w-12 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: category.color }}
                    >
                      <Folder className="h-6 w-6 text-white" />
                    </div>
                  )}
                  <div>
                    <h2 className="text-3xl font-bold">{category.name}</h2>
                    {category.slogan && (
                      <p className="text-muted-foreground font-medium">{category.slogan}</p>
                    )}
                  </div>
                </div>
                {category.description && (
                  <p className="text-muted-foreground">{category.description}</p>
                )}
              </>
            ) : (
              <>
                <h2 className="text-3xl font-bold mb-2">Escolha seu serviço</h2>
                <p className="text-muted-foreground">
                  Selecione o serviço que você deseja agendar
                </p>
              </>
            )}
          </div>

          {services.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Nenhum serviço disponível.</p>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {services.map((service) => (
                <Card 
                  key={service.id} 
                  className="cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-105"
                  onClick={() => handleServiceSelect(service)}
                >
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
                      <div className="flex items-center gap-2 font-semibold text-lg text-primary">
                        <DollarSign className="h-4 w-4" />
                        <span>R$ {service.price}</span>
                      </div>
                    </div>
                    <Button className="w-full">
                      Escolher serviço
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default BookingServices;