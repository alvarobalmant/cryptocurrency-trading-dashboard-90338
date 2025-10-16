import barberPlusLogo from '@/assets/barber-plus-logo.png';
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
import { Scissors, LogOut, ArrowLeft, Link2, Copy, Trash2, AlertTriangle, Settings, MapPin, Phone, Mail, ExternalLink } from 'lucide-react';
import { getUserDisplayName } from '@/lib/utils';

const BarbershopSettingsNew = () => {
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
      case 'basic': return 'bg-blue-100 text-blue-800';
      case 'premium': return 'bg-purple-100 text-purple-800';
      case 'enterprise': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600">Carregando configurações...</p>
        </div>
      </div>
    );
  }

  if (!currentBarbershop) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center max-w-md">
          <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
            <Scissors className="w-8 h-8 text-gray-400" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Barbearia não encontrada</h2>
          <p className="text-gray-600 mb-6">A barbearia que você está procurando não existe ou foi removida.</p>
          <Button 
            onClick={() => navigate('/barbershops')}
            className="bg-blue-600 hover:bg-blue-700 text-white border-0"
          >
            Voltar para Minhas Barbearias
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/barbershops')}
                className="border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Voltar
              </Button>
              <div className="flex items-center space-x-2">
                <img src={barberPlusLogo} alt="Barber+" className="h-8 md:h-10 w-auto" />
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">
                Olá, {getUserDisplayName(user)}
              </span>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={signOut}
                className="border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Sair
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="flex items-center space-x-2 mb-2">
            <Settings className="h-6 w-6 text-gray-400" />
            <h2 className="text-2xl font-semibold text-gray-900">Configurações</h2>
          </div>
          <p className="text-gray-600">
            Gerencie as informações e configurações de {currentBarbershop.name}
          </p>
        </div>

        <div className="space-y-6">
          {/* Barbershop Info Card */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Scissors className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">{currentBarbershop.name}</h3>
                    {currentBarbershop.slogan && (
                      <p className="text-sm text-gray-600">{currentBarbershop.slogan}</p>
                    )}
                  </div>
                </div>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPlanColor(currentBarbershop.plan_type)}`}>
                  {getPlanLabel(currentBarbershop.plan_type)}
                </span>
              </div>
            </div>
            
            <div className="px-6 py-4">
              <div className="space-y-3 mb-6">
                {currentBarbershop.address && (
                  <div className="flex items-center space-x-3 text-sm text-gray-600">
                    <MapPin className="h-4 w-4 text-gray-400" />
                    <span>{currentBarbershop.address}</span>
                  </div>
                )}
                {currentBarbershop.phone && (
                  <div className="flex items-center space-x-3 text-sm text-gray-600">
                    <Phone className="h-4 w-4 text-gray-400" />
                    <span>{currentBarbershop.phone}</span>
                  </div>
                )}
                {currentBarbershop.email && (
                  <div className="flex items-center space-x-3 text-sm text-gray-600">
                    <Mail className="h-4 w-4 text-gray-400" />
                    <span>{currentBarbershop.email}</span>
                  </div>
                )}
              </div>
              
              {/* Booking Link */}
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <Link2 className="h-4 w-4 text-blue-600" />
                    <span className="text-sm font-medium text-gray-900">Link de agendamento</span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyBookingLink(currentBarbershop.slug)}
                    className="border-gray-300 text-gray-700 hover:bg-gray-50"
                  >
                    <Copy className="h-4 w-4 mr-1" />
                    Copiar
                  </Button>
                </div>
                <div className="flex items-center space-x-2">
                  <code className="text-xs text-gray-600 bg-white px-2 py-1 rounded border">
                    barberplus.com/booking/{currentBarbershop.slug}
                  </code>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(`/booking/${currentBarbershop.slug}`, '_blank')}
                    className="border-gray-300 text-gray-700 hover:bg-gray-50"
                  >
                    <ExternalLink className="h-3 w-3" />
                  </Button>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Compartilhe este link com seus clientes para que possam fazer agendamentos online
                </p>
              </div>
            </div>
          </div>

          {/* MercadoPago Configuration */}
          <MercadoPagoConfig 
            barbershop={currentBarbershop} 
            onUpdate={() => window.location.reload()} 
          />

          {/* Edit Section */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Editar informações</h3>
              <p className="text-sm text-gray-600 mt-1">
                Atualize os dados e configurações desta barbearia
              </p>
            </div>
            
            <div className="px-6 py-4">
              <div className="flex justify-start">
                <EditBarbershopDialog barbershop={currentBarbershop} />
              </div>
            </div>
          </div>

          {/* Danger Zone */}
          <div className="bg-white rounded-lg shadow-sm border border-red-200">
            <div className="px-6 py-4 border-b border-red-200 bg-red-50">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="h-5 w-5 text-red-600" />
                <h3 className="text-lg font-medium text-red-900">Zona de perigo</h3>
              </div>
              <p className="text-sm text-red-700 mt-1">
                Ações irreversíveis que podem resultar na perda permanente de dados
              </p>
            </div>
            
            <div className="px-6 py-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h4 className="text-sm font-medium text-gray-900 mb-1">
                    Excluir barbearia
                  </h4>
                  <p className="text-sm text-gray-600">
                    Esta ação não pode ser desfeita. Todos os dados desta barbearia, incluindo agendamentos, 
                    clientes e funcionários, serão perdidos permanentemente.
                  </p>
                </div>
                <div className="ml-6">
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="border-red-300 text-red-700 hover:bg-red-50 hover:border-red-400"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Excluir barbearia
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle className="text-lg font-medium text-gray-900">
                          Confirmar exclusão
                        </AlertDialogTitle>
                        <AlertDialogDescription className="text-gray-600">
                          Esta ação não pode ser desfeita. Isso excluirá permanentemente a barbearia 
                          <strong className="text-gray-900"> "{currentBarbershop.name}" </strong> e removerá todos os dados 
                          associados de nossos servidores, incluindo:
                          <br /><br />
                          • Todos os agendamentos
                          <br />
                          • Informações de clientes
                          <br />
                          • Dados de funcionários
                          <br />
                          • Configurações de pagamento
                          <br />
                          • Histórico de transações
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel className="border-gray-300 text-gray-700 hover:bg-gray-50">
                          Cancelar
                        </AlertDialogCancel>
                        <AlertDialogAction 
                          onClick={handleDeleteBarbershop}
                          disabled={isDeleting}
                          className="bg-red-600 hover:bg-red-700 text-white border-0"
                        >
                          {isDeleting ? 'Excluindo...' : 'Sim, excluir permanentemente'}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default BarbershopSettingsNew;
