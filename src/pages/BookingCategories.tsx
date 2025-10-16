import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ArrowLeft, Folder, Users } from 'lucide-react';
import { supabasePublic } from '@/integrations/supabase/publicClient';

const BookingCategories = () => {
  const { barbershopSlug } = useParams();
  const navigate = useNavigate();
  const [categories, setCategories] = useState<any[]>([]);
  const [barbershop, setBarbershop] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBarbershopAndCategories();
  }, [barbershopSlug]);

  const fetchBarbershopAndCategories = async () => {
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

      // Fetch categories with service count
      const { data: categoriesData, error: categoriesError } = await supabasePublic
        .from('service_categories')
        .select(`
          *,
          services(count)
        `)
        .eq('barbershop_id', barbershopData[0].id)
        .order('order_index', { ascending: true });

      if (categoriesError) throw categoriesError;
      setCategories(categoriesData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCategorySelect = (categoryId: string) => {
    navigate(`/booking/${barbershopSlug}/services?category=${categoryId}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  if (!barbershop || categories.length === 0) {
    navigate(`/booking/${barbershopSlug}/services`);
    return null;
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
              onClick={() => navigate('/')}
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
            <h2 className="text-3xl font-bold mb-2">Escolha o tipo de serviço</h2>
            <p className="text-muted-foreground">
              Selecione a categoria de serviço que você deseja
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {categories.map((category) => (
              <Card 
                key={category.id} 
                className="cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-105"
                onClick={() => handleCategorySelect(category.id)}
              >
                <CardHeader className="text-center">
                  <div className="mx-auto mb-4">
                    {category.avatar_url ? (
                      <Avatar className="h-16 w-16">
                        <AvatarImage src={category.avatar_url} />
                        <AvatarFallback>
                          <Folder className="h-8 w-8" />
                        </AvatarFallback>
                      </Avatar>
                    ) : (
                      <div 
                        className="h-16 w-16 rounded-full flex items-center justify-center mx-auto"
                        style={{ backgroundColor: category.color }}
                      >
                        <Folder className="h-8 w-8 text-white" />
                      </div>
                    )}
                  </div>
                  <CardTitle className="text-xl">{category.name}</CardTitle>
                  {category.slogan && (
                    <p className="text-sm text-muted-foreground font-medium">
                      {category.slogan}
                    </p>
                  )}
                  {category.description && (
                    <CardDescription>{category.description}</CardDescription>
                  )}
                </CardHeader>
                <CardContent className="text-center">
                  <Badge variant="secondary" className="gap-1">
                    <Users className="h-3 w-3" />
                    {(Array.isArray(category.services) ? (category.services[0]?.count ?? category.services.length) : 0) || 0} serviços
                  </Badge>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="mt-8 text-center">
            <Button
              variant="outline"
              onClick={() => navigate(`/booking/${barbershopSlug}/services?all=1`)}
            >
              Ver todos os serviços
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default BookingCategories;