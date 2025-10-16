import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { User, LogOut } from "lucide-react";
import { useNativeClientAuth } from "@/hooks/useNativeClientAuth";
import { ClientAuthDialog } from "@/components/ClientAuthDialog";

interface BookingAuthOptionsProps {
  barbershopId: string;
  barbershopName: string;
  onContinueWithoutLogin: () => void;
  onAuthSuccess: (client: any) => void;
}

export function BookingAuthOptions({ 
  barbershopId, 
  barbershopName, 
  onContinueWithoutLogin, 
  onAuthSuccess 
}: BookingAuthOptionsProps) {
  const [showAuthDialog, setShowAuthDialog] = useState(false);
  const [authMode, setAuthMode] = useState<'signup' | 'login'>('signup');
  
  const { isAuthenticated, clientProfile, logout } = useNativeClientAuth(barbershopId);

  if (isAuthenticated && clientProfile) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Bem-vindo de volta!
          </CardTitle>
          <CardDescription>
            Você está logado como {clientProfile.name}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm text-muted-foreground">
            Telefone: {clientProfile.phone}
            <span className="ml-2 text-green-600">✓ Verificado</span>
          </div>
          
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={logout}
              className="flex items-center gap-2"
            >
              <LogOut className="h-4 w-4" />
              Sair
            </Button>
            <Button 
              onClick={() => onAuthSuccess(clientProfile)}
              className="flex-1"
            >
              Continuar
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle>Como você gostaria de continuar?</CardTitle>
          <CardDescription>
            Faça login para um agendamento mais rápido ou continue como visitante
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button 
            onClick={() => {
              setAuthMode('login');
              setShowAuthDialog(true);
            }}
            className="w-full"
            variant="default"
          >
            <User className="mr-2 h-4 w-4" />
            Entrar na minha conta
          </Button>
          
          <Button 
            onClick={() => {
              setAuthMode('signup');
              setShowAuthDialog(true);
            }}
            className="w-full"
            variant="outline"
          >
            Criar nova conta
          </Button>
          
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                Ou
              </span>
            </div>
          </div>
          
          <Button 
            onClick={onContinueWithoutLogin}
            variant="ghost"
            className="w-full"
          >
            Continuar como visitante
          </Button>
        </CardContent>
      </Card>

      <Dialog open={showAuthDialog} onOpenChange={setShowAuthDialog}>
        <DialogContent className="sm:max-w-md">
          <ClientAuthDialog
            barbershopId={barbershopId}
            barbershopName={barbershopName}
            mode={authMode}
            onSuccess={(client) => {
              setShowAuthDialog(false);
              onAuthSuccess(client);
            }}
            initialStep={authMode === 'login' ? 'login' : 'phone'}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}

export default BookingAuthOptions;