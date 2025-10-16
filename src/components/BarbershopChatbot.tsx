import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Bot, Send, User, Loader2, MessageCircle, X, Trash2 } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface BarbershopChatbotProps {
  barbershopId: string;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export const BarbershopChatbot = ({ 
  barbershopId, 
  isOpen: externalIsOpen, 
  onOpenChange 
}: BarbershopChatbotProps) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: 'Olá! 👋 Sou o assistente virtual da barbearia. Como posso ajudar você hoje? Posso te ajudar a agendar um horário, consultar nossos serviços ou tirar dúvidas!'
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const prevBarbershopIdRef = useRef<string>(barbershopId);

  const isOpen = externalIsOpen ?? internalIsOpen;
  const setIsOpen = onOpenChange ?? setInternalIsOpen;

  // Recuperar ou criar sessão ao abrir o chat
  useEffect(() => {
    // Detectar mudança de barbearia e resetar estado
    if (prevBarbershopIdRef.current !== barbershopId) {
      console.log(`🔄 Barbearia mudou: ${prevBarbershopIdRef.current} → ${barbershopId}`);
      
      // Limpar localStorage da barbearia anterior
      if (prevBarbershopIdRef.current) {
        localStorage.removeItem(`chat_session_${prevBarbershopIdRef.current}`);
        console.log('🗑️ LocalStorage da barbearia anterior limpo');
      }
      
      setSessionId(null);
      setMessages([{
        role: 'assistant',
        content: 'Olá! 👋 Sou o assistente virtual da barbearia. Como posso ajudar você hoje? Posso te ajudar a agendar um horário, consultar nossos serviços ou tirar dúvidas!'
      }]);
      prevBarbershopIdRef.current = barbershopId;
    }
    
    const initSession = async () => {
      if (!isOpen) return;
      
      try {
        console.log(`🔄 Inicializando sessão para barbearia: ${barbershopId}`);
        
        // ============================================
        // TENTAR RECUPERAR SESSÃO DO LOCALSTORAGE
        // ============================================
        const savedSessionId = localStorage.getItem(`chat_session_${barbershopId}`);

        if (savedSessionId) {
          console.log('📂 SessionId recuperado do localStorage:', savedSessionId);
          
          // Verificar se sessão ainda é válida
          const { data: existingSession } = await supabase
            .from('chat_sessions')
            .select('id, status, last_message_at')
            .eq('id', savedSessionId)
            .eq('barbershop_id', barbershopId)
            .eq('status', 'active')
            .gte('last_message_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
            .maybeSingle();

          if (existingSession) {
            setSessionId(savedSessionId);
            console.log('✅ Sessão válida encontrada no localStorage');
            
            // Carregar histórico
            const { data: messages } = await supabase
              .from('chat_messages')
              .select('role, content')
              .eq('session_id', savedSessionId)
              .order('created_at', { ascending: true })
              .limit(20);
            
            if (messages && messages.length > 0) {
              setMessages(messages.map(m => ({
                role: m.role as 'user' | 'assistant',
                content: m.content
              })));
              console.log(`📜 ${messages.length} mensagens carregadas do histórico`);
            }
            
            return; // Sessão recuperada com sucesso
          } else {
            console.log('⚠️ Sessão do localStorage inválida ou expirada');
            localStorage.removeItem(`chat_session_${barbershopId}`);
          }
        }

        // ============================================
        // BUSCAR OU CRIAR NOVA SESSÃO NO BANCO
        // ============================================
        console.log('🔍 Buscando sessão ativa no banco...');
        
        const { data: existingSession } = await supabase
          .from('chat_sessions')
          .select('id')
          .eq('barbershop_id', barbershopId)
          .eq('status', 'active')
          .gte('last_message_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
          .order('last_message_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        
        if (existingSession) {
          setSessionId(existingSession.id);
          localStorage.setItem(`chat_session_${barbershopId}`, existingSession.id);
          console.log('📂 Sessão existente encontrada:', existingSession.id);
          
          // Carregar histórico
          const { data: chatMessages } = await supabase
            .from('chat_messages')
            .select('role, content')
            .eq('session_id', existingSession.id)
            .order('created_at', { ascending: true })
            .limit(20);
          
          if (chatMessages && chatMessages.length > 0) {
            setMessages(chatMessages.map(m => ({
              role: m.role as 'user' | 'assistant',
              content: m.content
            })));
            console.log(`📜 ${chatMessages.length} mensagens carregadas`);
          }
        } else {
          // Criar nova sessão
          console.log('✨ Criando nova sessão...');
          
          const { data: newSession, error: sessionError } = await supabase
            .from('chat_sessions')
            .insert({
              barbershop_id: barbershopId,
              session_data: { source: 'web' },
              status: 'active'
            })
            .select()
            .single();
          
          if (sessionError) {
            console.error('❌ Erro ao criar sessão:', sessionError);
          } else {
            setSessionId(newSession.id);
            localStorage.setItem(`chat_session_${barbershopId}`, newSession.id);
            console.log('✨ Nova sessão criada:', newSession.id);
          }
        }
      } catch (error) {
        console.error('❌ Erro ao inicializar sessão:', error);
      }
    };
    
    initSession();
  }, [isOpen, barbershopId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;
    
    // Validação: Garantir que temos sessionId
    if (!sessionId) {
      toast({
        title: 'Erro',
        description: 'Sessão não inicializada. Tente reabrir o chat.',
        variant: 'destructive'
      });
      return;
    }

    const userMessage = input.trim();
    setInput('');
    
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setLoading(true);

    try {
      // Salvar mensagem do usuário
      if (sessionId) {
        await supabase.from('chat_messages').insert({
          session_id: sessionId,
          role: 'user',
          content: userMessage,
          metadata: { 
            source: 'web',
            timestamp: new Date().toISOString()
          }
        });
      }

      const { data, error } = await supabase.functions.invoke('barbershop-chatbot', {
        body: {
          message: userMessage,
          barbershopId,
          conversationHistory: messages.map(m => ({
            role: m.role,
            content: m.content
          })),
          sessionId // ← Pass sessionId
        }
      });

      if (error) throw error;

      const aiMessage = data.message;
      setMessages(prev => [...prev, { role: 'assistant', content: aiMessage }]);

      // ============================================
      // SALVAR SESSIONID NO LOCALSTORAGE
      // ============================================
      if (data.sessionId) {
        // Se sessionId mudou ou é novo, atualizar
        if (data.sessionId !== sessionId) {
          setSessionId(data.sessionId);
          localStorage.setItem(`chat_session_${barbershopId}`, data.sessionId);
          console.log('💾 SessionId salvo no localStorage:', data.sessionId);
        }
      }

      // Se houve uma ação de agendamento bem-sucedida
      if (data.actionResult?.success && data.actionResult.appointment) {
        toast.success('Agendamento criado com sucesso! ✅');
      }

    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
      toast.error('Erro ao processar mensagem. Tente novamente.');
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Desculpe, tive um problema ao processar sua mensagem. Pode tentar novamente?'
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const clearHistory = async () => {
    try {
      if (sessionId) {
        // Deletar todas as mensagens da sessão atual
        const { error } = await supabase
          .from('chat_messages')
          .delete()
          .eq('session_id', sessionId);

        if (error) throw error;
        
        // Marcar sessão como concluída
        await supabase
          .from('chat_sessions')
          .update({ status: 'completed' })
          .eq('id', sessionId);
      }

      // Limpar localStorage
      localStorage.removeItem(`chat_session_${barbershopId}`);
      
      // Resetar estado local
      setSessionId(null);
      setMessages([{
        role: 'assistant',
        content: 'Olá! 👋 Sou o assistente virtual da barbearia. Como posso ajudar você hoje? Posso te ajudar a agendar um horário, consultar nossos serviços ou tirar dúvidas!'
      }]);

      toast.success('Histórico limpo com sucesso!');
      
      // Criar nova sessão
      const { data: newSession, error: sessionError } = await supabase
        .from('chat_sessions')
        .insert({
          barbershop_id: barbershopId,
          session_data: { source: 'web' },
          status: 'active'
        })
        .select()
        .single();
      
      if (!sessionError && newSession) {
        setSessionId(newSession.id);
        localStorage.setItem(`chat_session_${barbershopId}`, newSession.id);
      }
      
    } catch (error) {
      console.error('Erro ao limpar histórico:', error);
      toast.error('Erro ao limpar histórico. Tente novamente.');
    }
  };

  if (!isOpen) {
    return (
      <Button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg z-50"
        size="icon"
      >
        <MessageCircle className="h-6 w-6" />
      </Button>
    );
  }

  return (
    <Card className="fixed bottom-6 right-6 w-96 h-[600px] shadow-2xl z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-primary to-primary/80">
        <div className="flex items-center gap-2">
          <Bot className="h-5 w-5 text-primary-foreground" />
          <div>
            <h3 className="font-semibold text-primary-foreground">Assistente Virtual</h3>
            <p className="text-xs text-primary-foreground/80">Online agora</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="text-primary-foreground hover:bg-primary-foreground/20"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Limpar histórico de chat?</AlertDialogTitle>
                <AlertDialogDescription>
                  Isso irá apagar todas as mensagens desta conversa e criar uma nova sessão. Esta ação não pode ser desfeita.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={clearHistory} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                  Limpar
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsOpen(false)}
            className="text-primary-foreground hover:bg-primary-foreground/20"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        <div className="space-y-4">
          {messages.map((message, index) => (
            <div
              key={index}
              className={cn(
                "flex gap-2",
                message.role === 'user' ? 'justify-end' : 'justify-start'
              )}
            >
              {message.role === 'assistant' && (
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <Bot className="h-4 w-4 text-primary" />
                </div>
              )}
              
              <div
                className={cn(
                  "max-w-[75%] rounded-2xl px-4 py-2",
                  message.role === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted'
                )}
              >
                <p className="text-sm whitespace-pre-wrap">{message.content}</p>
              </div>

              {message.role === 'user' && (
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                  <User className="h-4 w-4 text-primary-foreground" />
                </div>
              )}
            </div>
          ))}
          
          {loading && (
            <div className="flex gap-2 justify-start">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <Bot className="h-4 w-4 text-primary" />
              </div>
              <div className="bg-muted rounded-2xl px-4 py-2">
                <Loader2 className="h-4 w-4 animate-spin" />
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="p-4 border-t">
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Digite sua mensagem..."
            disabled={loading}
            className="flex-1"
          />
          <Button
            onClick={sendMessage}
            disabled={loading || !input.trim()}
            size="icon"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Pressione Enter para enviar
        </p>
      </div>
    </Card>
  );
};
