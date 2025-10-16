import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Eye, EyeOff, Mail, Lock, User, CheckCircle2, Inbox } from 'lucide-react';

const Auth = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isSignUp, setIsSignUp] = useState(true);
  const [emailSent, setEmailSent] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState('');
  const { signIn, signUp } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const checkUserBarbershops = async (userId: string) => {
    try {
      const { data, error } = await supabase.rpc('get_safe_barbershops_list', {
        user_id_param: userId
      });
      
      if (error) throw error;
      return data && data.length > 0;
    } catch (error) {
      console.error('Error checking barbershops:', error);
      return false;
    }
  };

  const handleSignIn = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    const { error } = await signIn(email, password);

    if (error) {
      toast({
        title: 'Erro no login',
        description: error.message,
        variant: 'destructive',
      });
      setIsLoading(false);
    } else {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const hasBarbershops = await checkUserBarbershops(user.id);
        if (hasBarbershops) {
          navigate('/dashboard');
        } else {
          navigate('/setup');
        }
      }
    }
  };

  const handleSignUp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    const name = formData.get('name') as string;
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    const { error } = await signUp(email, password, { 
      data: { 
        name
      } 
    });

    if (error) {
      toast({
        title: 'Erro no cadastro',
        description: error.message,
        variant: 'destructive',
      });
      setIsLoading(false);
    } else {
      setRegisteredEmail(email);
      setEmailSent(true);
      setIsLoading(false);
    }
  };

  // Tela de confirmação de e-mail
  if (emailSent) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 flex items-center justify-center p-4">
        {/* Header */}
        <div className="absolute top-0 left-0 right-0 p-6">
          <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <span className="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg text-white font-bold text-lg">
              B+
            </span>
            <span className="font-display text-2xl font-bold text-gray-900">
              Barber<span className="text-indigo-500">+</span>
            </span>
          </Link>
        </div>

        {/* Success Card */}
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-xl p-8 space-y-6">
            {/* Success Icon */}
            <div className="flex justify-center">
              <div className="relative">
                <div className="flex items-center justify-center w-20 h-20 bg-gradient-to-br from-green-400 to-green-600 rounded-full shadow-lg">
                  <CheckCircle2 className="w-10 h-10 text-white" />
                </div>
                <div className="absolute -bottom-2 -right-2 flex items-center justify-center w-12 h-12 bg-gradient-to-br from-indigo-400 to-purple-600 rounded-full shadow-lg">
                  <Inbox className="w-6 h-6 text-white" />
                </div>
              </div>
            </div>

            {/* Title */}
            <div className="text-center space-y-2">
              <h1 className="text-2xl font-bold text-gray-900">
                Cadastro realizado com sucesso! 🎉
              </h1>
              <p className="text-gray-600">
                Estamos quase lá! Falta só mais um passo.
              </p>
            </div>

            {/* Email Info */}
            <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl p-6 space-y-3">
              <div className="flex items-start gap-3">
                <Mail className="w-5 h-5 text-indigo-600 mt-0.5 flex-shrink-0" />
                <div className="space-y-1">
                  <p className="text-sm font-medium text-gray-900">
                    Enviamos um e-mail de confirmação para:
                  </p>
                  <p className="text-base font-semibold text-indigo-600 break-all">
                    {registeredEmail}
                  </p>
                </div>
              </div>
            </div>

            {/* Instructions */}
            <div className="space-y-4">
              <div className="space-y-3">
                <h3 className="font-semibold text-gray-900">Para continuar:</h3>
                <ol className="space-y-2 text-sm text-gray-600">
                  <li className="flex items-start gap-2">
                    <span className="flex items-center justify-center w-6 h-6 bg-indigo-100 text-indigo-600 rounded-full font-semibold text-xs flex-shrink-0">
                      1
                    </span>
                    <span>Abra seu e-mail e procure por uma mensagem do Barber+</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="flex items-center justify-center w-6 h-6 bg-indigo-100 text-indigo-600 rounded-full font-semibold text-xs flex-shrink-0">
                      2
                    </span>
                    <span>Clique no link de confirmação</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="flex items-center justify-center w-6 h-6 bg-indigo-100 text-indigo-600 rounded-full font-semibold text-xs flex-shrink-0">
                      3
                    </span>
                    <span>Pronto! Você será redirecionado automaticamente</span>
                  </li>
                </ol>
              </div>

              {/* Help Text */}
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <p className="text-xs text-amber-800">
                  <strong>Não recebeu o e-mail?</strong> Verifique sua caixa de spam ou lixo eletrônico. 
                  O e-mail pode levar alguns minutos para chegar.
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-3 pt-4">
              <Button
                onClick={() => {
                  setEmailSent(false);
                  setIsSignUp(false);
                }}
                className="w-full h-12 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-semibold rounded-lg shadow-md hover:shadow-lg transition-all"
              >
                Já confirmei, fazer login
              </Button>
              
              <Button
                variant="outline"
                onClick={() => {
                  setEmailSent(false);
                  setRegisteredEmail('');
                }}
                className="w-full h-12 border-2 border-gray-300 hover:bg-gray-50"
              >
                Voltar ao cadastro
              </Button>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-6 text-center text-xs text-gray-500">
            <p>© 2024 Barber+. Todos os direitos reservados.</p>
          </div>
        </div>
      </div>
    );
  }

  // Tela de login/cadastro
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 flex items-center justify-center p-4">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 p-6">
        <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          <span className="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg text-white font-bold text-lg">
            B+
          </span>
          <span className="font-display text-2xl font-bold text-gray-900">
            Barber<span className="text-indigo-500">+</span>
          </span>
        </Link>
      </div>

      {/* Main Card */}
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl p-8 space-y-6">
          {/* Logo e Título */}
          <div className="text-center space-y-2">
            <div className="flex justify-center mb-4">
              <span className="flex items-center justify-center w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl text-white font-bold text-2xl shadow-lg">
                B+
              </span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">
              {isSignUp ? 'Criar uma conta no Barber+' : 'Entrar no Barber+'}
            </h1>
            <p className="text-sm text-gray-600">
              {isSignUp 
                ? 'Preencha os dados abaixo para começar. Todos os campos são obrigatórios.' 
                : 'Entre com seu e-mail e senha para acessar sua conta.'}
            </p>
          </div>

          {/* Formulário de Cadastro */}
          {isSignUp ? (
            <form onSubmit={handleSignUp} className="space-y-4">
              {/* Nome Completo */}
              <div className="space-y-2">
                <Label htmlFor="name" className="text-sm font-medium text-gray-700">
                  Nome completo
                </Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <Input
                    id="name"
                    name="name"
                    type="text"
                    placeholder="Digite seu nome completo"
                    required
                    className="pl-10 h-12 border-gray-300 focus:border-indigo-500 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* E-mail */}
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium text-gray-700">
                  E-mail
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="seuemail@exemplo.com"
                    required
                    className="pl-10 h-12 border-gray-300 focus:border-indigo-500 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Senha */}
              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium text-gray-700">
                  Senha
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Crie uma senha forte"
                    required
                    minLength={6}
                    className="pl-10 pr-10 h-12 border-gray-300 focus:border-indigo-500 focus:ring-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                <p className="text-xs text-gray-500">Mínimo de 6 caracteres</p>
              </div>

              {/* Termos */}
              <div className="text-xs text-gray-600 text-center">
                Ao clicar em "Continuar", você concorda com os{' '}
                <a href="#" className="text-indigo-600 hover:underline">Termos</a>. Para obter mais informações sobre como processamos seus dados pessoais, consulte nossa{' '}
                <a href="#" className="text-indigo-600 hover:underline">Política de Privacidade</a>.
              </div>

              {/* Botão Continuar */}
              <Button
                type="submit"
                disabled={isLoading}
                className="w-full h-12 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-semibold rounded-lg shadow-md hover:shadow-lg transition-all"
              >
                {isLoading ? 'Criando conta...' : 'Continuar'}
              </Button>

              {/* Link para Login */}
              <div className="text-center text-sm">
                <span className="text-gray-600">Já tem uma conta? </span>
                <button
                  type="button"
                  onClick={() => setIsSignUp(false)}
                  className="text-indigo-600 hover:underline font-medium"
                >
                  Entrar
                </button>
              </div>
            </form>
          ) : (
            /* Formulário de Login */
            <form onSubmit={handleSignIn} className="space-y-4">
              {/* E-mail */}
              <div className="space-y-2">
                <Label htmlFor="login-email" className="text-sm font-medium text-gray-700">
                  E-mail
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <Input
                    id="login-email"
                    name="email"
                    type="email"
                    placeholder="seuemail@exemplo.com"
                    required
                    className="pl-10 h-12 border-gray-300 focus:border-indigo-500 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Senha */}
              <div className="space-y-2">
                <Label htmlFor="login-password" className="text-sm font-medium text-gray-700">
                  Senha
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <Input
                    id="login-password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Digite sua senha"
                    required
                    className="pl-10 pr-10 h-12 border-gray-300 focus:border-indigo-500 focus:ring-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {/* Esqueci a senha */}
              <div className="text-right">
                <a href="#" className="text-sm text-indigo-600 hover:underline">
                  Esqueceu a senha?
                </a>
              </div>

              {/* Botão Entrar */}
              <Button
                type="submit"
                disabled={isLoading}
                className="w-full h-12 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-semibold rounded-lg shadow-md hover:shadow-lg transition-all"
              >
                {isLoading ? 'Entrando...' : 'Entrar'}
              </Button>

              {/* Link para Cadastro */}
              <div className="text-center text-sm">
                <span className="text-gray-600">Não tem uma conta? </span>
                <button
                  type="button"
                  onClick={() => setIsSignUp(true)}
                  className="text-indigo-600 hover:underline font-medium"
                >
                  Criar conta
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Footer */}
        <div className="mt-6 text-center text-xs text-gray-500">
          <p>© 2024 Barber+. Todos os direitos reservados.</p>
        </div>
      </div>
    </div>
  );
};

export default Auth;
