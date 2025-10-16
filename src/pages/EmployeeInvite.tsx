import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useEmployeeInvitations } from '@/hooks/useEmployeeInvitations';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { UserCheck, Loader2 } from 'lucide-react';

const EmployeeInvite = () => {
  const { barbershopSlug, token } = useParams();
  const navigate = useNavigate();
  const { getInvitationByToken, acceptInvitation } = useEmployeeInvitations();
  const { signUp, signIn, user } = useAuth();
  const { toast } = useToast();
  
  const [invitation, setInvitation] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [isNewUser, setIsNewUser] = useState(true);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    name: '',
    phone: '',
  });

  useEffect(() => {
    const loadInvitation = async () => {
      if (!token) return;
      
      try {
        const invitationData = await getInvitationByToken(token);
        setInvitation(invitationData);
        setFormData(prev => ({
          ...prev,
          email: invitationData.email,
          name: invitationData.name,
          phone: invitationData.phone || '',
        }));
      } catch (error: any) {
        toast({
          title: 'Convite inválido',
          description: 'Este convite pode ter expirado ou já foi usado.',
          variant: 'destructive',
        });
        navigate('/');
      } finally {
        setLoading(false);
      }
    };

    loadInvitation();
  }, [token]);

  // If user is already logged in, show association option
  useEffect(() => {
    if (user && invitation && !accepting && isNewUser) {
      setIsNewUser(false); // Switch to login mode for existing users
    }
  }, [user, invitation]);

  const handleAcceptInvitation = async () => {
    if (!token) return;
    
    setAccepting(true);
    try {
      const result = await acceptInvitation(token);
      toast({
        title: 'Convite aceito!',
        description: 'Bem-vindo à equipe! Você já pode acessar sua área.',
      });
      
      // Add a small delay to ensure the employee record is fully created
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Redirect to generic employee route; a global redirector will send to the correct slug
      navigate('/employee');
    } catch (error: any) {
      toast({
        title: 'Erro ao aceitar convite',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setAccepting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isNewUser) {
      if (formData.password !== formData.confirmPassword) {
        toast({
          title: 'Erro',
          description: 'As senhas não coincidem.',
          variant: 'destructive',
        });
        return;
      }

      if (formData.password.length < 6) {
        toast({
          title: 'Erro',
          description: 'A senha deve ter pelo menos 6 caracteres.',
          variant: 'destructive',
        });
        return;
      }
    }

    setAccepting(true);
    try {
      if (isNewUser) {
        // Create account with email confirmation disabled via admin API
        const { error } = await signUp(formData.email, formData.password, formData.name, true);
        if (error) throw error;
        
        // Accept invitation after account creation
        await handleAcceptInvitation();
      } else {
        const { error } = await signIn(formData.email, formData.password);
        if (error) throw error;
        
        // Accept invitation after successful login
        await handleAcceptInvitation();
      }
    } catch (error: any) {
      toast({
        title: isNewUser ? 'Erro ao criar conta' : 'Erro ao fazer login',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setAccepting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Carregando convite...</p>
        </div>
      </div>
    );
  }

  if (accepting) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Processando convite...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <UserCheck className="h-12 w-12 mx-auto text-primary mb-4" />
          <CardTitle>Convite para {invitation?.barbershops?.name}</CardTitle>
          <CardDescription>
            Você foi convidado para trabalhar como funcionário. 
            {isNewUser ? ' Crie sua conta para aceitar o convite.' : ' Faça login para aceitar o convite.'}
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          {user ? (
            // User is already logged in - show association option
            <div className="text-center space-y-4">
              <p className="text-sm text-muted-foreground">
                Você está logado como <strong>{user.email}</strong>
              </p>
              <p className="text-sm">
                Deseja associar este convite de funcionário à sua conta atual?
              </p>
              <Button onClick={handleAcceptInvitation} className="w-full" disabled={accepting}>
                {accepting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Processando...
                  </>
                ) : (
                  'Aceitar Convite'
                )}
              </Button>
            </div>
          ) : (
            <>
              <div className="mb-4 text-center">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsNewUser(!isNewUser)}
                >
                  {isNewUser ? 'Já tem conta? Fazer login' : 'Não tem conta? Criar conta'}
                </Button>
              </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                disabled
                required
              />
            </div>

            {isNewUser && (
              <div className="space-y-2">
                <Label htmlFor="name">Nome Completo</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  required
                />
              </div>
            )}

            {isNewUser && (
              <div className="space-y-2">
                <Label htmlFor="phone">Telefone</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                required
                minLength={6}
              />
            </div>

            {isNewUser && (
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirmar Senha</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                  required
                  minLength={6}
                />
              </div>
            )}

              <Button type="submit" className="w-full" disabled={accepting}>
                {accepting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Processando...
                  </>
                ) : (
                  isNewUser ? 'Criar Conta e Aceitar Convite' : 'Fazer Login e Aceitar Convite'
                )}
              </Button>
            </form>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default EmployeeInvite;