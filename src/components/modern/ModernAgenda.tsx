import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useBarbershops } from '@/hooks/useBarbershops';
import { useAppointments } from '@/hooks/useAppointments';
import AgendaView from '@/components/AgendaView';
import { useToast } from '@/hooks/use-toast';
import { RefreshCw, Calendar } from 'lucide-react';

const ModernAgenda = () => {
  const { barbershopId } = useParams();
  const { barbershops, loading: barbershopsLoading } = useBarbershops();
  const { appointments, loading: appointmentsLoading, refetch } = useAppointments(barbershopId);
  const [currentBarbershop, setCurrentBarbershop] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const { toast } = useToast();

  React.useEffect(() => {
    if (!barbershopsLoading && barbershops.length > 0 && barbershopId) {
      const barbershop = barbershops.find(b => b.id === barbershopId);
      setCurrentBarbershop(barbershop || null);
    }
  }, [barbershopsLoading, barbershops, barbershopId]);

  // Handle fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  // Handle fullscreen toggle - Tela cheia real do navegador
  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        // Entra em tela cheia
        const element = document.documentElement;
        if (element.requestFullscreen) {
          await element.requestFullscreen();
        } else if (element.webkitRequestFullscreen) {
          // Safari
          await element.webkitRequestFullscreen();
        } else if (element.msRequestFullscreen) {
          // IE/Edge
          await element.msRequestFullscreen();
        } else if (element.mozRequestFullScreen) {
          // Firefox
          await element.mozRequestFullScreen();
        }
        
        // Adiciona classe para esconder elementos desnecessários
        document.body.classList.add('agenda-fullscreen');
      } else {
        // Sai da tela cheia
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        } else if (document.webkitExitFullscreen) {
          // Safari
          await document.webkitExitFullscreen();
        } else if (document.msExitFullscreen) {
          // IE/Edge
          await document.msExitFullscreen();
        } else if (document.mozCancelFullScreen) {
          // Firefox
          await document.mozCancelFullScreen();
        }
        
        // Remove classe quando sai da tela cheia
        document.body.classList.remove('agenda-fullscreen');
      }
    } catch (error) {
      console.error('Erro ao alternar tela cheia:', error);
      toast({
        title: 'Erro na tela cheia',
        description: 'Não foi possível alternar para tela cheia. Tente usar F11.',
        variant: 'destructive',
      });
    }
  };

  const handlePaymentCreated = () => {
    refetch();
    toast({
      title: 'Pagamento criado!',
      description: 'O link de pagamento foi aberto em uma nova aba.',
    });
  };

  if (barbershopsLoading || appointmentsLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-primary rounded-3xl flex items-center justify-center mx-auto mb-4">
            <RefreshCw className="h-8 w-8 text-primary-foreground animate-spin" />
          </div>
          <h2 className="text-xl font-semibold text-foreground mb-2">Carregando agenda...</h2>
          <p className="text-muted-foreground">Aguarde enquanto carregamos suas informações</p>
        </div>
      </div>
    );
  }

  if (!currentBarbershop) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-destructive rounded-3xl flex items-center justify-center mx-auto mb-4">
            <Calendar className="h-8 w-8 text-destructive-foreground" />
          </div>
          <h2 className="text-xl font-semibold text-foreground mb-2">Barbearia não encontrada</h2>
          <p className="text-muted-foreground">
            A barbearia solicitada não foi encontrada ou você não tem acesso a ela.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`${isFullscreen ? 'fixed inset-0 z-50 bg-white' : 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8'}`}>
      <div className={`${isFullscreen ? 'h-full w-full bg-white p-0 m-0 overflow-hidden' : 'bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200/60 shadow-lg overflow-hidden'}`}>
        <AgendaView
          barbershopId={barbershopId}
          appointments={appointments}
          onAppointmentCreate={refetch}
          onAppointmentUpdate={refetch}
          isFullscreen={isFullscreen}
          onToggleFullscreen={toggleFullscreen}
        />
      </div>
    </div>
  );
};

export default ModernAgenda;