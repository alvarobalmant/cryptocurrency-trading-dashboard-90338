import { useState, useEffect } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

// Safe logging helpers
const logError = (message: string, error?: any) => {
  const safeError = typeof error === 'object' && error.message ? 
    { message: error.message, code: error.code } : 
    { error: String(error) };
  console.error(`[ERROR] ${message}`, safeError);
};

const logSecurity = (action: string, details: { userId?: string, barbershopId?: string, status: 'success' | 'failure' }) => {
  console.log(`[SECURITY] ${action}`, {
    timestamp: new Date().toISOString(),
    userId: details.userId || 'anonymous',
    barbershopId: details.barbershopId || null,
    status: details.status
  });
};

export interface ClientProfile {
  id: string;
  user_id: string;
  name: string;
  phone: string;
  barbershop_id: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface ExistingProfile {
  barbershop_id: string;
  barbershop_name: string;
  client_name: string;
  phone: string;
  notes?: string;
}

export const useNativeClientAuth = (barbershopId?: string) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [clientProfile, setClientProfile] = useState<ClientProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // DEBUG: Remove in production
  const isDevelopment = import.meta.env.DEV;
  
  if (isDevelopment) {
    console.log('🔄 useNativeClientAuth:', { barbershopId, userId: user?.id, loading });
  }

  // Timeout de segurança reduzido e melhorado
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (loading) {
        if (isDevelopment) {
          console.warn('⚠️ Auth loading timeout reached, setting loading = false');
        }
        setLoading(false);
      }
    }, 3000); // Reduzido para 3 segundos

    return () => clearTimeout(timeoutId);
  }, [loading]);

  // Verificar perfis existentes em outras barbearias
  const checkExistingProfiles = async (userId: string, currentBarbershopId: string): Promise<ExistingProfile[]> => {
    try {
      const { data, error } = await supabase
        .rpc('get_user_profiles_in_other_barbershops', {
          p_user_id: userId,
          p_current_barbershop_id: currentBarbershopId
        });

      if (error) {
        logError('Error checking existing profiles', error);
        return [];
      }

      return data || [];
    } catch (error) {
      logError('Error checking existing profiles', error);
      return [];
    }
  };

  // Garantir que o perfil existe para esta barbearia
  const ensureClientProfile = async (userId: string, currentBarbershopId: string, phone: string, sourceBarbershopId?: string, customName?: string): Promise<void> => {
    try {
      if (isDevelopment) {
        console.log('🔧 ensureClientProfile:', { userId, currentBarbershopId, phone, sourceBarbershopId, customName });
      }

      // Verificar se já existe perfil para esta barbearia
      const { data: existingProfile } = await supabase
        .from('client_profiles')
        .select('*')
        .eq('user_id', userId)
        .eq('barbershop_id', currentBarbershopId)
        .maybeSingle();

      if (existingProfile) {
        if (isDevelopment) {
          console.log('✅ Profile already exists:', existingProfile);
        }
        setClientProfile(existingProfile);
        return;
      }

      if (isDevelopment) {
        console.log('🆕 Creating new profile via RPC...');
      }

      // Criar perfil usando função do banco
      const { data: newProfileId, error } = await supabase
        .rpc('create_client_profile_from_existing', {
          p_user_id: userId,
          p_barbershop_id: currentBarbershopId,
          p_phone: phone,
          p_source_barbershop_id: sourceBarbershopId || null,
          p_custom_name: customName || null
        });

      if (error) {
        logError('Error creating client profile', error);
        // Tentar carregar o perfil mesmo assim (pode ter sido criado em tentativa anterior
        // ou o conflito é porque já existe)
        await loadClientProfile(userId);
        return;
      }

      if (isDevelopment) {
        console.log('✅ Profile created with ID:', newProfileId);
      }

      // Recarregar perfil
      await loadClientProfile(userId);
    } catch (error) {
      logError('Error ensuring client profile', error);
    }
  };

  // Carregar dados do perfil do cliente
  const loadClientProfile = async (userId: string) => {
    if (isDevelopment) {
      console.log('📊 loadClientProfile:', { userId, barbershopId });
    }
    
    if (!barbershopId) {
      if (isDevelopment) {
        console.log('❌ Sem barbershopId, pulando carregamento do perfil');
      }
      return;
    }
    
    try {
      const { data, error } = await supabase
        .from('client_profiles')
        .select('*')
        .eq('user_id', userId)
        .eq('barbershop_id', barbershopId)
        .maybeSingle();

      if (error) {
        logError('Error loading client profile', error);
        return;
      }

      if (isDevelopment) {
        console.log('📊 Profile loaded:', { data, userId, barbershopId });
      }

      logSecurity('profile_loaded', { userId, barbershopId, status: 'success' });
      setClientProfile(data);
    } catch (error) {
      logError('Error loading client profile', error);
    }
  };

  // Configurar listeners de autenticação
  useEffect(() => {
    if (isDevelopment) {
      console.log('🚀 Setting up auth listeners, barbershopId:', barbershopId);
    }
    
    // Listener para mudanças de autenticação
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (isDevelopment) {
          console.log('🔄 Auth state change:', { event, userId: session?.user?.id, barbershopId });
        }
        
        setSession(session);
        setUser(session?.user ?? null);
        
        // Só carrega profile se há barbershopId E usuário
        if (session?.user && barbershopId) {
          await loadClientProfile(session.user.id);
        } else {
          setClientProfile(null);
        }
        
        if (isDevelopment) {
          console.log('✅ Auth loading complete from listener, setting loading to false');
        }
        setLoading(false);
      }
    );

    // Verificar sessão inicial com timeout
    const checkInitialSession = async () => {
      if (isDevelopment) {
        console.log('🔍 Checking initial session...');
      }
      
      try {
        // Timeout mais agressivo para evitar travamento
        const sessionPromise = supabase.auth.getSession();
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Session check timeout')), 3000)
        );
        
        const { data: { session } } = await Promise.race([sessionPromise, timeoutPromise]) as any;
        if (isDevelopment) {
          console.log('📋 Initial session:', { userId: session?.user?.id, barbershopId });
        }
        
        setSession(session);
        setUser(session?.user ?? null);
        
        // Só carrega profile se há barbershopId E usuário
        if (session?.user && barbershopId) {
          await loadClientProfile(session.user.id);
        } else if (!session?.user) {
          if (isDevelopment) {
            console.log('👤 No user in session');
          }
        } else if (!barbershopId) {
          if (isDevelopment) {
            console.log('🏪 No barbershopId provided, skipping profile load');
          }
        }
      } catch (error) {
        logError('Erro ao verificar sessão ou timeout', error);
        // Em caso de erro/timeout, assume que não há usuário autenticado
        setSession(null);
        setUser(null);
        setClientProfile(null);
      } finally {
        if (isDevelopment) {
          console.log('✅ Initial session check complete, setting loading to false');
        }
        setLoading(false);
      }
    };

    checkInitialSession();

    return () => subscription.unsubscribe();
  }, [barbershopId]);

  // Registrar novo cliente
  const register = async (name: string, phone: string) => {
    if (!barbershopId) throw new Error('ID da barbearia não encontrado');

    // Validações
    if (!name.trim() || name.trim().length < 2) {
      throw new Error('Nome deve ter pelo menos 2 caracteres');
    }
    
    if (!phone || phone.length < 10) {
      throw new Error('Telefone deve ter pelo menos 10 dígitos');
    }

    try {
      // Limpar telefone e formatar para E.164 (+55...)
      const cleanPhone = phone.replace(/\D/g, ''); // Remove tudo que não é dígito
      const formattedPhone = cleanPhone.startsWith('55') ? `+${cleanPhone}` : `+55${cleanPhone}`;
      
      // Enviar OTP via Supabase nativo com Twilio Verify
      const { error: otpError } = await supabase.auth.signInWithOtp({
        phone: formattedPhone,
        options: {
          channel: 'sms'
        }
      });

      if (otpError) throw otpError;

      return { success: true, message: 'Código enviado por SMS' };
    } catch (error: any) {
      logError('Error during registration', error);
      throw new Error(error.message || 'Erro ao enviar código de verificação');
    }
  };

  // Verificar código OTP e criar perfil
  const verifyPhone = async (phone: string, code: string, name?: string) => {
    if (!barbershopId) throw new Error('ID da barbearia não encontrado');

    try {
      // Limpar telefone e formatar para E.164 (+55...)
      const cleanPhone = phone.replace(/\D/g, ''); // Remove tudo que não é dígito
      const formattedPhone = cleanPhone.startsWith('55') ? `+${cleanPhone}` : `+55${cleanPhone}`;
      
      // Verificar OTP via Supabase nativo
      const { data, error } = await supabase.auth.verifyOtp({
        phone: formattedPhone,
        token: code,
        type: 'sms'
      });

      if (error) throw error;

      if (data.user && name) {
        // Criar perfil do cliente se for primeiro login
        const { data: existingProfile } = await supabase
          .from('client_profiles')
          .select('*')
          .eq('user_id', data.user.id)
          .eq('barbershop_id', barbershopId)
          .maybeSingle();

        if (!existingProfile) {
          const { error: profileError } = await supabase
            .from('client_profiles')
            .insert({
              user_id: data.user.id,
              name: name.trim(),
              phone: formattedPhone,
              barbershop_id: barbershopId
            });

          if (profileError) {
            logError('Error creating profile', profileError);
            if (!profileError.message.includes('duplicate key')) {
              throw profileError;
            }
          }
        }

        // Recarregar perfil
        await loadClientProfile(data.user.id);
      }

      return { success: true, user: data.user, session: data.session };
    } catch (error: any) {
      logError('Error verifying phone', error);
      throw new Error(error.message || 'Código inválido ou expirado');
    }
  };

  // Login existente
  const login = async (phone: string) => {
    try {
      // Limpar telefone e formatar para E.164 (+55...)
      const cleanPhone = phone.replace(/\D/g, ''); // Remove tudo que não é dígito
      const formattedPhone = cleanPhone.startsWith('55') ? `+${cleanPhone}` : `+55${cleanPhone}`;
      
      const { error } = await supabase.auth.signInWithOtp({
        phone: formattedPhone,
        options: {
          channel: 'sms'
        }
      });

      if (error) throw error;

      return { success: true, message: 'Código enviado por SMS' };
    } catch (error: any) {
      logError('Error during login', error);
      throw new Error(error.message || 'Erro ao enviar código de verificação');
    }
  };

  // Logout
  const logout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      logError('Error during logout', error);
    }
    setClientProfile(null);
  };

  // CORRIGIDO: Para clientes autenticados via telefone, isAuthenticated não depende de clientProfile se não há barbershopId definido
  const isAuthenticated = !!user && !!session && (barbershopId ? !!clientProfile : true);

  if (isDevelopment) {
    console.log('📊 Auth status:', { 
      hasUser: !!user, 
      hasSession: !!session, 
      hasProfile: !!clientProfile,
      barbershopId,
      isAuthenticated,
      loading,
      requiresProfile: !!barbershopId
    });
  }

  return {
    user,
    session,
    clientProfile,
    isAuthenticated,
    loading,
    register,
    verifyPhone,
    login,
    logout,
    refreshAuth: () => user?.id ? loadClientProfile(user.id) : Promise.resolve(),
    checkExistingProfiles: (userId: string, currentBarbershopId: string) => checkExistingProfiles(userId, currentBarbershopId),
    ensureClientProfile: (userId: string, currentBarbershopId: string, phone: string, sourceBarbershopId?: string, customName?: string) => 
      ensureClientProfile(userId, currentBarbershopId, phone, sourceBarbershopId, customName)
  };
};