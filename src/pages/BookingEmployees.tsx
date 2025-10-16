import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { supabasePublic } from '@/integrations/supabase/publicClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Users } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

type Employee = {
  id: string;
  name: string;
  avatar_url?: string;
};

export default function BookingEmployees() {
  const { barbershopSlug } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);

  const { service, barbershop } = location.state || {};

  useEffect(() => {
    if (!service || !barbershop) {
      navigate(`/booking/${barbershopSlug}`);
      return;
    }

    const fetchEmployees = async () => {
      try {
        // Fetch employees who can perform this service
        const { data: employeeServices, error } = await supabasePublic
          .from('employee_services')
          .select(`
            employees!inner (
              id,
              name,
              avatar_url,
              status
            )
          `)
          .eq('service_id', service.id);

        if (error) throw error;

        const activeEmployees = employeeServices
          ?.map(es => es.employees)
          ?.filter(emp => emp?.status === 'active') || [];

        setEmployees(activeEmployees);
      } catch (error) {
        console.error('Error fetching employees:', error);
        toast({
          title: 'Erro',
          description: 'Não foi possível carregar os profissionais.',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    fetchEmployees();
  }, [service, barbershop, barbershopSlug, navigate, toast]);

  const handleEmployeeSelect = (employee: Employee | null) => {
    navigate(`/booking/${barbershopSlug}/schedule`, {
      state: { 
        service,
        barbershop,
        employee 
      }
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando profissionais...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            {barbershop?.avatar_url ? (
              <img 
                src={barbershop.avatar_url} 
                alt={barbershop.name}
                className="w-16 h-16 rounded-full object-cover"
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                <Users className="h-8 w-8 text-primary" />
              </div>
            )}
          </div>
          <h1 className="text-3xl font-bold mb-2">{barbershop?.name}</h1>
          {barbershop?.slogan && (
            <p className="text-muted-foreground mb-2">{barbershop.slogan}</p>
          )}
          <p className="text-muted-foreground">Serviço: {service?.name}</p>
        </div>

        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-semibold mb-6 text-center">Escolha seu profissional</h2>
          
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {/* No preference option */}
            <Card className="hover:shadow-lg transition-shadow cursor-pointer border-2 border-dashed">
              <CardHeader className="text-center">
                <div className="mx-auto mb-4">
                  <Users className="h-12 w-12 text-muted-foreground" />
                </div>
                <CardTitle className="text-lg">Sem preferência</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-center mb-4">
                  Qualquer profissional disponível
                </p>
                <Button 
                  onClick={() => handleEmployeeSelect(null)}
                  className="w-full"
                  variant="outline"
                >
                  Continuar
                </Button>
              </CardContent>
            </Card>

            {/* Employee options */}
            {employees.map((employee) => (
              <Card key={employee.id} className="hover:shadow-lg transition-shadow cursor-pointer">
                <CardHeader className="text-center">
                  <Avatar className="h-16 w-16 mx-auto mb-4">
                    <AvatarImage src={employee.avatar_url} />
                    <AvatarFallback>
                      {employee.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <CardTitle className="text-lg">{employee.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <Button 
                    onClick={() => handleEmployeeSelect(employee)}
                    className="w-full"
                  >
                    Escolher profissional
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>

          {employees.length === 0 && (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">
                Nenhum profissional disponível para este serviço no momento.
              </p>
              <Button 
                onClick={() => navigate(`/booking/${barbershopSlug}`)}
                variant="outline"
              >
                Voltar aos serviços
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}