import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, ArrowLeft } from "lucide-react";
import { useNativeClientAuth, ExistingProfile } from "@/hooks/useNativeClientAuth";
import { ExistingProfileDialog } from "./ExistingProfileDialog";

interface ClientAuthDialogProps {
  barbershopId: string;
  barbershopName: string;
  onSuccess: (client: any) => void;
  mode?: 'signup' | 'login';
  initialPhone?: string;
  initialName?: string;
  initialStep?: 'phone' | 'verification' | 'login';
}

export function ClientAuthDialog({ 
  barbershopId, 
  barbershopName, 
  onSuccess, 
  mode = 'signup',
  initialPhone = '',
  initialName = '',
  initialStep = mode === 'login' ? 'login' : 'phone'
}: ClientAuthDialogProps) {
  const [step, setStep] = useState<'phone' | 'verification' | 'login'>(initialStep);
  const [formData, setFormData] = useState({
    name: initialName,
    phone: initialPhone,
    code: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [attemptsLeft, setAttemptsLeft] = useState(3);
  const [isNewUser, setIsNewUser] = useState(false);
  const [existingProfiles, setExistingProfiles] = useState<ExistingProfile[]>([]);
  const [showExistingProfileDialog, setShowExistingProfileDialog] = useState(false);
  const [pendingVerification, setPendingVerification] = useState<{
    phone: string;
    code: string;
    userId: string;
  } | null>(null);

  const { register, verifyPhone, login, checkExistingProfiles, ensureClientProfile } = useNativeClientAuth(barbershopId);

  const formatPhoneNumber = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 11) {
      return numbers.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
    }
    return value;
  };

  const handleSignUp = async () => {
    if (!formData.name.trim() || !formData.phone.trim()) {
      setError('Nome e telefone são obrigatórios');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const result = await register(formData.name, formData.phone.replace(/\D/g, ''));
      if (result.success) {
        setIsNewUser(true);
        setStep('verification');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async () => {
    if (!formData.phone.trim()) {
      setError('Telefone é obrigatório');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const result = await login(formData.phone.replace(/\D/g, ''));
      if (result.success) {
        setIsNewUser(false);
        setStep('verification');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!formData.code.trim()) {
      setError('Digite o código de verificação');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const result = await verifyPhone(
        formData.phone.replace(/\D/g, ''),
        formData.code,
        isNewUser ? formData.name : undefined
      );
      
      if (result.success && result.user) {
        // Verificar se existem perfis em outras barbearias
        const profiles = await checkExistingProfiles(result.user.id, barbershopId);
        
        if (profiles.length > 0) {
          // Mostrar diálogo para reutilizar dados
          setExistingProfiles(profiles);
          setPendingVerification({
            phone: formData.phone.replace(/\D/g, ''),
            code: formData.code,
            userId: result.user.id
          });
          setShowExistingProfileDialog(true);
        } else {
          // Garantir que o perfil existe para esta barbearia
          await ensureClientProfile(result.user.id, barbershopId, formData.phone.replace(/\D/g, ''));
          onSuccess({ 
            id: result.user.id, 
            phone: formData.phone, 
            name: formData.name || 'Cliente'
          });
        }
      }
    } catch (err: any) {
      setError(err.message);
      if (err.message.includes('tentativas') || err.message.includes('inválido')) {
        setAttemptsLeft(prev => Math.max(0, prev - 1));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleUseExistingProfile = async (sourceBarbershopId: string, clientName: string) => {
    if (!pendingVerification) return;

    console.log('🔄 handleUseExistingProfile:', { sourceBarbershopId, clientName, pendingVerification });

    setLoading(true);
    try {
      await ensureClientProfile(
        pendingVerification.userId,
        barbershopId,
        pendingVerification.phone,
        sourceBarbershopId
      );
      
      console.log('✅ Profile ensured, calling onSuccess');
      
      onSuccess({ 
        id: pendingVerification.userId, 
        phone: formData.phone, 
        name: clientName
      });
    } catch (error) {
      console.error('❌ Error in handleUseExistingProfile:', error);
      setError('Erro ao criar perfil');
    } finally {
      setLoading(false);
      setShowExistingProfileDialog(false);
    }
  };

  const handleCreateNewProfile = async (customName: string) => {
    if (!pendingVerification) return;

    setLoading(true);
    try {
      await ensureClientProfile(
        pendingVerification.userId,
        barbershopId,
        pendingVerification.phone,
        undefined,
        customName
      );
      
      onSuccess({ 
        id: pendingVerification.userId, 
        phone: formData.phone, 
        name: customName
      });
    } catch (error) {
      setError('Erro ao criar perfil');
    } finally {
      setLoading(false);
      setShowExistingProfileDialog(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    if (field === 'phone') {
      setFormData(prev => ({ ...prev, [field]: formatPhoneNumber(value) }));
    } else {
      setFormData(prev => ({ ...prev, [field]: value }));
    }
    setError('');
  };

  if (step === 'login') {
    return (
      <>
        <Card className="w-full max-w-md mx-auto">
          <CardHeader>
            <CardTitle>Login</CardTitle>
            <CardDescription>
              Digite seu telefone para receber um código por SMS
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="phone">Telefone</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                placeholder="(00) 00000-0000"
                maxLength={15}
              />
            </div>

            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={() => setStep('phone')}
                className="flex-1"
              >
                Cadastrar-se
              </Button>
              <Button 
                onClick={handleSignIn}
                disabled={loading}
                className="flex-1"
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Enviar Código
              </Button>
            </div>
          </CardContent>
        </Card>

        <ExistingProfileDialog
          open={showExistingProfileDialog}
          onClose={() => setShowExistingProfileDialog(false)}
          existingProfiles={existingProfiles}
          barbershopName={barbershopName}
          onUseExisting={handleUseExistingProfile}
          onCreateNew={handleCreateNewProfile}
        />
      </>
    );
  }

  if (step === 'phone') {
    return (
      <>
        <Card className="w-full max-w-md mx-auto">
          <CardHeader>
            <CardTitle>Criar Conta</CardTitle>
            <CardDescription>
              Digite seus dados para receber um código por SMS
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="name">Nome completo</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="Seu nome completo"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Telefone</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                placeholder="(00) 00000-0000"
                maxLength={15}
              />
            </div>

            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={() => setStep('login')}
                className="flex-1"
              >
                Já tenho conta
              </Button>
              <Button 
                onClick={handleSignUp}
                disabled={loading}
                className="flex-1"
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Enviar Código
              </Button>
            </div>
          </CardContent>
        </Card>

        <ExistingProfileDialog
          open={showExistingProfileDialog}
          onClose={() => setShowExistingProfileDialog(false)}
          existingProfiles={existingProfiles}
          barbershopName={barbershopName}
          onUseExisting={handleUseExistingProfile}
          onCreateNew={handleCreateNewProfile}
        />
      </>
    );
  }

  return (
    <>
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle>Verificação SMS</CardTitle>
          <CardDescription>
            Digite o código de 6 dígitos enviado para {formData.phone}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="code">Código de verificação</Label>
            <Input
              id="code"
              value={formData.code}
              onChange={(e) => handleInputChange('code', e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="000000"
              maxLength={6}
              className="text-center text-2xl tracking-widest"
            />
          </div>

          {attemptsLeft < 3 && (
            <p className="text-sm text-muted-foreground">
              Tentativas restantes: {attemptsLeft}
            </p>
          )}

          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={() => setStep(isNewUser ? 'phone' : 'login')}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar
            </Button>
            <Button 
              onClick={handleVerifyCode}
              disabled={loading || formData.code.length !== 6}
              className="flex-1"
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Verificar
            </Button>
          </div>
        </CardContent>
      </Card>

      <ExistingProfileDialog
        open={showExistingProfileDialog}
        onClose={() => setShowExistingProfileDialog(false)}
        existingProfiles={existingProfiles}
        barbershopName={barbershopName}
        onUseExisting={handleUseExistingProfile}
        onCreateNew={handleCreateNewProfile}
      />
    </>
  );
}

export default ClientAuthDialog;