import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useBarbershops } from '@/hooks/useBarbershops';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { EditBarbershopDialog } from '@/components/EditBarbershopDialog';
import MercadoPagoConfig from '@/components/MercadoPagoConfig';
import { useToast } from '@/hooks/use-toast';
import { Scissors, LogOut, ArrowLeft, Link2, Copy, Trash2, AlertTriangle } from 'lucide-react';

const BarbershopSettings = () => {
  const { barbershopId } = useParams();
  const { user, signOut } = useAuth();
  const { barbershops, loading, deleteBarbershop } = useBarbershops();
  const [currentBarbershop, setCurrentBarbershop] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && barbershops.length > 0 && barbershopId) {
      const barbershop = barbershops.find(b => b.id === barbershopId);
      setCurrentBarbershop(barbershop || null);
    }
  }, [loading, barbershops, barbershopId]);

  const getPlanColor = (plan: string | null) => {
    switch (plan) {
      case 'basic': return 'secondary';
      case 'premium': return 'default';
      case 'enterprise': return 'destructive';
      default: return 'secondary';
    }
  };

  const getPlanLabel = (plan: string | null) => {
    switch (plan) {
      case 'basic': return 'Básico';
      case 'premium': return 'Premium';
      case 'enterprise': return 'Enterprise';
      default: return 'Básico';
    }
  };

  const copyBookingLink = (slug: string) => {
    const bookingLink = `${window.location.origin}/booking/${slug}`;
    navigator.clipboard.writeText(bookingLink);
    toast({
      title: 'Link copiado!',
      description: 'Link de agendamento copiado para a área de transferência.',
    });
  };

  const handleDeleteBarbershop = async () => {
    if (!currentBarbershop) return;
    
    setIsDeleting(true);
    try {
      await deleteBarbershop(currentBarbershop.id);
      toast({
        title: 'Barbearia excluída!',
        description: 'A barbearia foi removida do sistema.',
      });
      navigate('/barbershops');
    } catch (error: any) {
      toast({
        title: 'Erro ao excluir barbearia',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <Scissors className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!currentBarbershop) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Barbearia não encontrada</h2>
          <Button onClick={() => navigate('/barbershops')}>
            Voltar para Minhas Barbearias
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/barbershops')}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
            <div className="flex items-center gap-2">
              <Scissors className="h-6 w-6 text-primary" />
              <h1 className="text-xl font-bold">BarberHive</h1>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">
              Olá, {user?.user_metadata?.full_name || user?.email}
            </span>
            <Button variant="outline" size="sm" onClick={signOut}>
              <LogOut className="h-4 w-4 mr-2" />
              Sair
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-2">Configurações da Barbearia</h2>
          <p className="text-muted-foreground">
            Gerencie as informações e configurações de {currentBarbershop.name}
          </p>
        </div>

        {/* Barbershop Info Card */}
        <Card className="mb-8">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <Scissors className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg">{currentBarbershop.name}</CardTitle>
              </div>
              <Badge variant={getPlanColor(currentBarbershop.plan_type)}>
                {getPlanLabel(currentBarbershop.plan_type)}
              </Badge>
            </div>
            {currentBarbershop.slogan && (
              <CardDescription>{currentBarbershop.slogan}</CardDescription>
            )}
          </CardHeader>
          
          <CardContent>
            <div className="space-y-2 text-sm text-muted-foreground mb-4">
              {currentBarbershop.address && (
                <p>📍 {currentBarbershop.address}</p>
              )}
              {currentBarbershop.phone && (
                <p>📞 {currentBarbershop.phone}</p>
              )}
              {currentBarbershop.email && (
                <p>✉️ {currentBarbershop.email}</p>
              )}
            </div>
            
            {/* Booking Link */}
            <div className="bg-muted p-3 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Link2 className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">Link de agendamento</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyBookingLink(currentBarbershop.slug)}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Compartilhe com seus clientes: barberhive.com/booking/{currentBarbershop.slug}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* MercadoPago Configuration */}
        <MercadoPagoConfig 
          barbershop={currentBarbershop} 
          onUpdate={() => window.location.reload()} 
        />

        {/* Edit Section */}
        <Card>
          <CardHeader>
            <CardTitle>Editar Informações</CardTitle>
            <CardDescription>
              Atualize os dados e configurações desta barbearia
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-center">
                <EditBarbershopDialog barbershop={currentBarbershop} />
              </div>
              
              {/* Danger Zone */}
              <Alert className="border-destructive/50 text-destructive dark:border-destructive [&>svg]:text-destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="flex items-center justify-between">
                  <span>
                    <strong>Zona de Perigo:</strong> Esta ação não pode ser desfeita. 
                    Todos os dados desta barbearia serão perdidos permanentemente.
                  </span>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" size="sm">
                        <Trash2 className="h-4 w-4 mr-2" />
                        Excluir Barbearia
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Esta ação não pode ser desfeita. Isso excluirá permanentemente a barbearia 
                          <strong> "{currentBarbershop.name}" </strong> e removerá todos os dados 
                          associados de nossos servidores.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction 
                          onClick={handleDeleteBarbershop}
                          disabled={isDeleting}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          {isDeleting ? 'Excluindo...' : 'Sim, excluir'}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </AlertDescription>
              </Alert>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default BarbershopSettings;