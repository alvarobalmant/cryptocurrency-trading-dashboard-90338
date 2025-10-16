import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { useMercadoPago } from '@/hooks/useMercadoPago';
import { useMercadoPagoCredentials } from '@/hooks/useMercadoPagoCredentials';
import { CheckCircle, XCircle, Edit, CreditCard, Smartphone, QrCode, Shield } from 'lucide-react';

interface MercadoPagoConfigProps {
  barbershop: {
    id: string;
    name: string;
    mercadopago_enabled?: boolean;
  };
  onUpdate: () => void;
}

const MercadoPagoConfig = ({ barbershop, onUpdate }: MercadoPagoConfigProps) => {
  const [accessToken, setAccessToken] = useState('');
  const [publicKey, setPublicKey] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [maskedCredentials, setMaskedCredentials] = useState({
    access_token_masked: '',
    public_key_masked: '',
    has_access_token: false,
    has_public_key: false,
  });
  const { loading, validateCredentials } = useMercadoPago();
  const { 
    loading: credentialsLoading, 
    getMaskedCredentials, 
    updateCredentials, 
    disableCredentials 
  } = useMercadoPagoCredentials();

  useEffect(() => {
    if (barbershop.mercadopago_enabled) {
      loadMaskedCredentials();
    }
  }, [barbershop]);

  const loadMaskedCredentials = async () => {
    try {
      const masked = await getMaskedCredentials(barbershop.id);
      setMaskedCredentials(masked);
    } catch (error) {
      console.error('Error loading masked credentials:', error);
    }
  };

  const handleSave = async () => {
    try {
      // First validate credentials
      await validateCredentials({ accessToken, publicKey });
      
      // Then save them securely
      await updateCredentials(barbershop.id, {
        accessToken,
        publicKey,
      });
      
      setIsEditing(false);
      setAccessToken('');
      setPublicKey('');
      await loadMaskedCredentials();
      onUpdate();
    } catch (error) {
      // Error handled by hooks
    }
  };

  const handleDisable = async () => {
    try {
      await disableCredentials(barbershop.id);
      setAccessToken('');
      setPublicKey('');
      setIsEditing(false);
      setMaskedCredentials({
        access_token_masked: '',
        public_key_masked: '',
        has_access_token: false,
        has_public_key: false,
      });
      onUpdate();
    } catch (error) {
      // Error handled by hook
    }
  };

  const isConfigured = barbershop.mercadopago_enabled && maskedCredentials.has_access_token;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-primary" />
            <CardTitle>Integração MercadoPago</CardTitle>
            <Shield className="h-4 w-4 text-green-600" />
          </div>
          {isConfigured && (
            <Badge variant="default" className="flex items-center gap-1">
              <CheckCircle className="h-3 w-3" />
              Configurado
            </Badge>
          )}
        </div>
        <CardDescription>
          Configure sua conta do MercadoPago para aceitar pagamentos digitais de forma segura
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {!isConfigured && (
          <Alert>
            <Shield className="h-4 w-4" />
            <AlertDescription>
              Para usar pagamentos digitais, configure suas credenciais do MercadoPago de forma segura.
              <br />
              <strong>Como obter suas credenciais:</strong>
              <br />
              1. Acesse <a href="https://www.mercadopago.com.br/developers" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">MercadoPago Developers</a>
              <br />
              2. Faça login em sua conta
              <br />
              3. Vá em "Suas integrações" → "Suas aplicações"
              <br />
              4. Crie uma nova aplicação ou use uma existente
              <br />
              5. Copie o "Access Token" e a "Public Key"
              <br />
              <em className="text-sm text-muted-foreground">
                🔒 Suas credenciais são criptografadas e nunca expostas no frontend.
              </em>
            </AlertDescription>
          </Alert>
        )}

        {isConfigured && !isEditing && (
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 border rounded-lg bg-green-50">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <span className="font-medium text-green-800">MercadoPago Configurado</span>
                <Shield className="h-4 w-4 text-green-600" />
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditing(true)}
                >
                  <Edit className="h-4 w-4 mr-1" />
                  Editar
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDisable}
                  disabled={credentialsLoading}
                >
                  Desabilitar
                </Button>
              </div>
            </div>

            <div className="grid gap-4">
              <div>
                <Label className="text-sm font-medium text-gray-700 flex items-center gap-1">
                  <Shield className="h-3 w-3" />
                  Access Token (Protegido)
                </Label>
                <div className="mt-1 p-2 bg-gray-50 rounded border text-sm font-mono">
                  {maskedCredentials.has_access_token ? 
                    maskedCredentials.access_token_masked : 
                    'Não configurado'
                  }
                </div>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-700 flex items-center gap-1">
                  <Shield className="h-3 w-3" />
                  Public Key (Protegida)
                </Label>
                <div className="mt-1 p-2 bg-gray-50 rounded border text-sm font-mono">
                  {maskedCredentials.has_public_key ? 
                    maskedCredentials.public_key_masked : 
                    'Não configurado'
                  }
                </div>
              </div>
            </div>

            <Alert>
              <Shield className="h-4 w-4" />
              <AlertDescription className="text-sm">
                🔒 <strong>Segurança:</strong> Suas credenciais são criptografadas e nunca expostas completamente no frontend. 
                Apenas versões mascaradas são exibidas para sua proteção.
              </AlertDescription>
            </Alert>

            <div className="bg-muted p-4 rounded-lg">
              <h4 className="font-medium mb-2 flex items-center gap-2">
                <QrCode className="h-4 w-4" />
                Funcionalidades Disponíveis
              </h4>
              <ul className="space-y-1 text-sm text-muted-foreground">
                <li className="flex items-center gap-2">
                  <CreditCard className="h-3 w-3" />
                  Links de pagamento para agendamentos
                </li>
                <li className="flex items-center gap-2">
                  <QrCode className="h-3 w-3" />
                  Pagamentos via PIX instantâneo
                </li>
                <li className="flex items-center gap-2">
                  <Smartphone className="h-3 w-3" />
                  Integração com maquininhas Point
                </li>
              </ul>
            </div>
          </div>
        )}

        {(!isConfigured || isEditing) && (
          <div className="space-y-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="accessToken" className="flex items-center gap-1">
                  <Shield className="h-3 w-3" />
                  Access Token (Produção)
                </Label>
                <Input
                  id="accessToken"
                  placeholder="APP_USR-..."
                  value={accessToken}
                  onChange={(e) => setAccessToken(e.target.value)}
                  type="password"
                />
                <p className="text-xs text-muted-foreground">
                  Token privado para transações. Nunca será exposto no frontend.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="publicKey" className="flex items-center gap-1">
                  <Shield className="h-3 w-3" />
                  Public Key (Produção)
                </Label>
                <Input
                  id="publicKey"
                  placeholder="APP_USR-..."
                  value={publicKey}
                  onChange={(e) => setPublicKey(e.target.value)}
                  type="password"
                />
                <p className="text-xs text-muted-foreground">
                  Chave pública para identificação da aplicação.
                </p>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={handleSave}
                  disabled={!accessToken || !publicKey || loading || credentialsLoading}
                  className="w-full"
                >
                  {(loading || credentialsLoading) ? 'Validando...' : 'Salvar e Validar'}
                </Button>
                {isEditing && (
                  <Button variant="outline" onClick={() => {
                    setIsEditing(false);
                    setAccessToken('');
                    setPublicKey('');
                  }}>
                    Cancelar
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default MercadoPagoConfig;