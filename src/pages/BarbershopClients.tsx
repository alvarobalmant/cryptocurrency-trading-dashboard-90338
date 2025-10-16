import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Plus, Search, Phone, Mail, Edit, Trash2, User, Clock, Eye, Link2 } from "lucide-react";
import ClientDetailsDialog from "@/components/ClientDetailsDialog";
import { useBarbershop } from "@/hooks/useBarbershop";
import { useClients, Client, ClientInsert, ClientUpdate } from "@/hooks/useClients";
import { useVisitors, Visitor } from "@/hooks/useVisitors";
import { VisitorsList } from "@/components/VisitorsList";
import { AssociateVisitorDialog } from "@/components/AssociateVisitorDialog";
import { ClientSelectorModal } from "@/components/ClientSelectorModal";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { clientSchema } from "@/schemas/payment";
import { z } from "zod";
import { toast } from "@/hooks/use-toast";

export default function BarbershopClientsNew() {
  const { barbershopId } = useParams<{ barbershopId: string }>();
  
  // Buscar dados da barbearia específica da URL usando função segura
  const { data: currentBarbershop } = useQuery({
    queryKey: ["barbershop", barbershopId],
    queryFn: async () => {
      if (!barbershopId) return null;
      const { data, error } = await supabase.rpc('get_safe_barbershop_data', {
        barbershop_id_param: barbershopId
      });
      if (error) throw error;
      return data?.[0] || null;
    },
    enabled: !!barbershopId,
  });

  const { clients, isLoading, createClient, updateClient, deleteClient } = useClients(barbershopId);
  const { data: visitors, isLoading: visitorsLoading } = useVisitors(barbershopId);
  
  const queryClient = useQueryClient();
  
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [viewingClient, setViewingClient] = useState<Client | null>(null);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  
  // Association state
  const [isAssociateDialogOpen, setIsAssociateDialogOpen] = useState(false);
  const [visitorToAssociate, setVisitorToAssociate] = useState<Visitor | null>(null);
  const [clientToAssociate, setClientToAssociate] = useState<Client | null>(null);
  const [isAssociating, setIsAssociating] = useState(false);
  
  // Form state for creating/converting visitors
  const [isClientSelectorOpen, setIsClientSelectorOpen] = useState(false);
  const [currentVisitor, setCurrentVisitor] = useState<Visitor | null>(null);
  
  // Duplicate detection state
  const [isDuplicateDialogOpen, setIsDuplicateDialogOpen] = useState(false);
  const [duplicateClient, setDuplicateClient] = useState<Client | null>(null);
  
  const [clientForm, setClientForm] = useState<ClientInsert | ClientUpdate>({
    name: "",
    phone: "",
    notes: "",
  });

  // Helpers para normalizar e gerar variações de telefone
  const normalizePhone = (phone: string) => {
    if (!phone) return '';
    const digits = phone.replace(/\D/g, '');
    return digits.startsWith('55') && digits.length > 11 ? digits.slice(2) : digits;
  };

  const buildPhoneVariants = (phone: string) => {
    const variants = new Set<string>();
    
    if (!phone) return [];
    
    variants.add(phone); // Original
    
    const normalized = normalizePhone(phone);
    if (normalized) {
      variants.add(normalized); // Apenas dígitos
      variants.add(`+55${normalized}`); // Com +55
      
      // Se tiver 11 dígitos (celular com DDD), adicionar formatação (XX) XXXXX-XXXX
      if (normalized.length === 11) {
        const formatted = `(${normalized.substring(0, 2)}) ${normalized.substring(2, 7)}-${normalized.substring(7)}`;
        variants.add(formatted);
      }
      
      // Se tiver 10 dígitos (fixo com DDD), adicionar formatação (XX) XXXX-XXXX
      if (normalized.length === 10) {
        const formatted = `(${normalized.substring(0, 2)}) ${normalized.substring(2, 6)}-${normalized.substring(6)}`;
        variants.add(formatted);
      }
      
      // Se começar com +55 e tiver 13 dígitos totais, formatar a parte brasileira
      if (phone.startsWith('+') && normalized.length === 13) {
        const withoutPrefix = normalized.substring(2);
        if (withoutPrefix.length === 11) {
          const formatted = `(${withoutPrefix.substring(0, 2)}) ${withoutPrefix.substring(2, 7)}-${withoutPrefix.substring(7)}`;
          variants.add(formatted);
        }
      }
    }
    
    return Array.from(variants);
  };

  const filteredClients = clients.filter(client =>
    client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.phone.includes(searchTerm)
  );

  const handleCreateClient = async () => {
    try {
      // Validação dos dados
      const validatedData = clientSchema.parse({
        name: clientForm.name?.trim(),
        phone: clientForm.phone?.trim(),
        notes: clientForm.notes?.trim(),
      });

      if (!barbershopId) return;

      // Verificar se já existe cliente com o mesmo telefone normalizado
      const normalizedPhone = normalizePhone(validatedData.phone);
      const existingClient = clients.find(client => 
        normalizePhone(client.phone) === normalizedPhone
      );

      if (existingClient) {
        // Mostrar diálogo de confirmação para associar ao cliente existente
        setDuplicateClient(existingClient);
        setIsDuplicateDialogOpen(true);
        return;
      }

      // Criar novo cliente
      const newClient = await createClient.mutateAsync({
        ...validatedData,
        barbershop_id: barbershopId,
      } as ClientInsert);

      // Se estamos convertendo um visitante, associar automaticamente os appointments
      if (currentVisitor && newClient) {
        setIsAssociating(true);
        try {
          // Gerar todas as variações de telefone
          const phonesSet = new Set<string>();
          buildPhoneVariants(currentVisitor.visitor_phone).forEach(p => phonesSet.add(p));
          currentVisitor.variant_phones.forEach((p) => {
            buildPhoneVariants(p).forEach(v => phonesSet.add(v));
          });
          const phonesToMatch = Array.from(phonesSet);
          
          console.log('🔄 Associando appointments do visitante ao novo cliente:', phonesToMatch);

          // Atualizar appointments sem client_profile_id
          const { data: updatedAppointments, error: updateError } = await supabase
            .from('appointments')
            .update({
              client_profile_id: newClient.id,
              notes: `Associado automaticamente ao criar cliente em ${new Date().toLocaleDateString('pt-BR')}`
            })
            .eq('barbershop_id', barbershopId)
            .is('client_profile_id', null)
            .in('client_phone', phonesToMatch)
            .select();

          if (updateError) throw updateError;

          const updatedCount = updatedAppointments?.length || 0;
          console.log('✅ Appointments associados automaticamente:', updatedCount);

          if (updatedCount > 0) {
            toast({
              title: 'Cliente criado e associado!',
              description: `${updatedCount} agendamento(s) foram vinculados ao novo cliente.`,
            });
          } else {
            toast({
              title: 'Cliente criado com sucesso!',
              description: 'Novo cliente adicionado ao sistema.',
            });
          }

          // Invalidar queries para atualizar listas
          await Promise.all([
            queryClient.invalidateQueries({ queryKey: ['visitors', barbershopId] }),
            queryClient.invalidateQueries({ queryKey: ['clients', barbershopId] }),
          ]);
        } catch (associationError) {
          console.error('Erro ao associar appointments:', associationError);
          toast({
            title: 'Cliente criado com aviso',
            description: 'Cliente foi criado, mas houve um erro ao associar agendamentos automaticamente.',
            variant: 'destructive',
          });
        } finally {
          setIsAssociating(false);
        }
      } else {
        // Cliente criado sem vir de visitante - toast normal
        toast({
          title: 'Cliente criado com sucesso!',
          description: 'Novo cliente adicionado ao sistema.',
        });
      }

      // Limpar formulário e fechar diálogo
      setClientForm({
        name: "",
        phone: "",
        notes: "",
      });
      setCurrentVisitor(null);
      setIsCreateDialogOpen(false);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const firstError = error.issues[0];
        toast({
          title: 'Dados inválidos',
          description: firstError.message,
          variant: 'destructive',
        });
      }
    }
  };

  const handleEditClient = async () => {
    try {
      // Validação com Zod
      const validatedData = clientSchema.parse({
        name: clientForm.name?.trim(),
        phone: clientForm.phone?.trim(),
        notes: clientForm.notes?.trim(),
      });

      if (!editingClient) return;

      await updateClient.mutateAsync({
        id: editingClient.id,
        ...validatedData,
      } as { id: string } & ClientUpdate);

      setClientForm({
        name: "",
        phone: "",
        notes: "",
      });
      setEditingClient(null);
      setIsEditDialogOpen(false);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const firstError = error.issues[0];
        toast({
          title: 'Dados inválidos',
          description: firstError.message,
          variant: 'destructive',
        });
      }
    }
  };

  const handleDeleteClient = async (clientId: string) => {
    await deleteClient.mutateAsync(clientId);
  };

  const openEditDialog = (client: Client) => {
    setEditingClient(client);
    setClientForm({
      name: client.name,
      phone: client.phone,
      notes: client.notes || "",
    });
    setIsEditDialogOpen(true);
  };

  const openDetailsDialog = (client: Client) => {
    setViewingClient(client);
    setIsDetailsDialogOpen(true);
  };

  const handleConvertVisitorToClient = (visitor: Visitor) => {
    setCurrentVisitor(visitor);
    setClientForm({
      name: visitor.visitor_name,
      phone: visitor.visitor_phone,
      notes: visitor.variant_names.length > 0
        ? `Visitante convertido. Nomes anteriores: ${visitor.variant_names.join(', ')}`
        : 'Visitante convertido para cliente cadastrado'
    });
    setIsCreateDialogOpen(true);
  };

  const handleOpenClientSelector = () => {
    setIsClientSelectorOpen(true);
  };

  const handleClientSelected = async (client: Client) => {
    if (!currentVisitor || !barbershopId) return;

    setIsAssociating(true);
    try {
      // Montar todas as variações de telefone do visitante e variantes
      const phonesSet = new Set<string>();
      buildPhoneVariants(currentVisitor.visitor_phone).forEach(p => phonesSet.add(p));
      currentVisitor.variant_phones.forEach((p) => {
        buildPhoneVariants(p).forEach(v => phonesSet.add(v));
      });
      const phonesToMatch = Array.from(phonesSet);
      console.log('Telefones para buscar (selector):', phonesToMatch);

      const { data: updatedAppointments, error } = await supabase
        .from('appointments')
        .update({
          client_profile_id: client.id,
          notes: `Associado automaticamente ao cliente cadastrado em ${new Date().toLocaleDateString('pt-BR')}`
        })
        .eq('barbershop_id', barbershopId)
        .is('client_profile_id', null)
        .in('client_phone', phonesToMatch)
        .select();

      if (error) throw error;

      const updatedCount = updatedAppointments?.length || 0;
      console.log('Appointments atualizados (selector):', updatedCount);

      if (updatedCount === 0) {
        toast({
          title: 'Nenhum agendamento encontrado',
          description: 'Não localizamos agendamentos com esses telefones. Verifique o número e tente novamente.',
        });
        return;
      }

      toast({
        title: 'Visitante associado com sucesso!',
        description: `${updatedCount} agendamento(s) foram vinculados ao cliente ${client.name}.`,
      });

      setIsClientSelectorOpen(false);
      setIsCreateDialogOpen(false);
      setCurrentVisitor(null);
      setClientForm({ name: "", phone: "", notes: "" });

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['visitors', barbershopId] }),
        queryClient.invalidateQueries({ queryKey: ['clients', barbershopId] }),
      ]);
    } catch (error) {
      console.error('Erro ao associar visitante (selector):', error);
      toast({
        title: 'Erro ao associar visitante',
        description: 'Ocorreu um erro ao vincular os agendamentos. Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setIsAssociating(false);
    }
  };

  const handleAssociateVisitorToClient = (visitor: Visitor, client: Client) => {
    setVisitorToAssociate(visitor);
    setClientToAssociate(client);
    setIsAssociateDialogOpen(true);
  };

  const confirmAssociation = async () => {
    if (!visitorToAssociate || !clientToAssociate || !barbershopId) return;

    setIsAssociating(true);
    try {
      // Montar variações de telefones (visitante + variantes)
      const phonesSet = new Set<string>();
      buildPhoneVariants(visitorToAssociate.visitor_phone).forEach(p => phonesSet.add(p));
      visitorToAssociate.variant_phones.forEach((p) => {
        buildPhoneVariants(p).forEach(v => phonesSet.add(v));
      });
      const phonesToMatch = Array.from(phonesSet);
      console.log('Telefones para buscar (confirm):', phonesToMatch);

      // Atualizar appointments sem client_profile_id que usam esses telefones
      const { data: updatedAppointments, error } = await supabase
        .from('appointments')
        .update({
          client_profile_id: clientToAssociate.id,
          notes: `Associado automaticamente ao cliente cadastrado em ${new Date().toLocaleDateString('pt-BR')}`
        })
        .eq('barbershop_id', barbershopId)
        .is('client_profile_id', null)
        .in('client_phone', phonesToMatch)
        .select();

      if (error) throw error;

      const updatedCount = updatedAppointments?.length || 0;
      console.log('Appointments atualizados (confirm):', updatedCount);

      if (updatedCount === 0) {
        toast({
          title: 'Nenhum agendamento encontrado',
          description: 'Não localizamos agendamentos com esses telefones. Verifique o número e tente novamente.',
        });
        return;
      }

      toast({
        title: 'Visitante associado com sucesso!',
        description: `${updatedCount} agendamento(s) foram vinculados ao cliente ${clientToAssociate.name}.`,
        variant: 'default',
      });

      // Fechar dialog e resetar estados
      setIsAssociateDialogOpen(false);
      setVisitorToAssociate(null);
      setClientToAssociate(null);

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['visitors', barbershopId] }),
        queryClient.invalidateQueries({ queryKey: ['clients', barbershopId] }),
      ]);
    } catch (error) {
      console.error('Erro ao associar visitante (confirm):', error);
      toast({
        title: 'Erro ao associar visitante',
        description: 'Ocorreu um erro ao vincular os agendamentos. Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setIsAssociating(false);
    }
  };

  if (!barbershopId) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
              <User className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Selecione uma barbearia</h3>
            <p className="text-gray-500">
              Para gerenciar os clientes, você precisa selecionar uma barbearia primeiro.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">
                Clientes
              </h1>
              <p className="mt-1 text-sm text-gray-600">
                {currentBarbershop?.name || "Carregando..."}
              </p>
            </div>
            
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-blue-600 hover:bg-blue-700 text-white border-0 shadow-sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Adicionar cliente
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle className="text-lg font-medium text-gray-900">
                    {currentVisitor ? 'Cadastrar ou Associar Visitante' : 'Adicionar novo cliente'}
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-6 py-4">
                  {currentVisitor && (
                    <>
                      {/* Opção: Associar a cliente existente */}
                      <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
                        <div className="flex items-center gap-2 mb-3">
                          <Link2 className="w-4 h-4 text-primary" />
                          <h3 className="text-sm font-semibold">
                            Associar a cliente existente
                          </h3>
                        </div>
                        <p className="text-xs text-muted-foreground mb-4">
                          Vincule os {currentVisitor.total_appointments} agendamento(s) do visitante <strong>{currentVisitor.visitor_name}</strong> a um cliente cadastrado.
                        </p>
                        <Button
                          type="button"
                          variant="outline"
                          className="w-full"
                          onClick={handleOpenClientSelector}
                        >
                          <Search className="w-4 h-4 mr-2" />
                          Buscar Cliente
                        </Button>
                      </div>

                      {/* Divisor */}
                      <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                          <div className="w-full border-t" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                          <span className="bg-background px-2 text-muted-foreground">Ou criar novo cliente</span>
                        </div>
                      </div>
                    </>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-sm font-medium text-gray-700">
                      Nome completo *
                    </Label>
                    <Input
                      id="name"
                      value={clientForm.name}
                      onChange={(e) => setClientForm({ ...clientForm, name: e.target.value })}
                      placeholder="Digite o nome completo"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="phone" className="text-sm font-medium text-gray-700">
                      Telefone *
                    </Label>
                    <Input
                      id="phone"
                      value={clientForm.phone}
                      onChange={(e) => setClientForm({ ...clientForm, phone: e.target.value })}
                      placeholder="(11) 99999-9999"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="notes" className="text-sm font-medium text-gray-700">
                      Observações
                    </Label>
                    <Textarea
                      id="notes"
                      value={clientForm.notes}
                      onChange={(e) => setClientForm({ ...clientForm, notes: e.target.value })}
                      placeholder="Informações adicionais sobre o cliente..."
                      rows={3}
                    />
                  </div>
                  
                  <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        setIsCreateDialogOpen(false);
                        setCurrentVisitor(null);
                        setClientForm({ name: "", phone: "", notes: "" });
                      }}
                      className="border-gray-300 text-gray-700 hover:bg-gray-50"
                    >
                      Cancelar
                    </Button>
                    <Button 
                      onClick={handleCreateClient}
                      disabled={
                        isAssociating || 
                        createClient.isPending || 
                        (!clientForm.name || !clientForm.phone)
                      }
                      className="bg-blue-600 hover:bg-blue-700 text-white border-0"
                    >
                      {isAssociating || createClient.isPending ? (
                        <>
                          <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          {isAssociating ? 'Associando...' : 'Salvando...'}
                        </>
                      ) : (
                        'Adicionar cliente'
                      )}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Search */}
        <div className="mb-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Buscar clientes por nome ou telefone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Visitors List */}
        <div className="mb-6">
          <VisitorsList 
            visitors={visitors || []}
            clients={clients || []}
            onConvertToClient={handleConvertVisitorToClient}
            onAssociateToClient={handleAssociateVisitorToClient}
          />
        </div>

        {/* Clients List */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center">
              <User className="w-5 h-5 mr-2 text-gray-400" />
              <h2 className="text-lg font-medium text-gray-900">
                Clientes ({filteredClients.length})
              </h2>
            </div>
          </div>
          
          <div className="divide-y divide-gray-200">
            {isLoading ? (
              <div className="px-6 py-12 text-center">
                <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                <p className="mt-2 text-sm text-gray-500">Carregando clientes...</p>
              </div>
            ) : filteredClients.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                  <User className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {searchTerm ? "Nenhum cliente encontrado" : "Nenhum cliente cadastrado"}
                </h3>
                <p className="text-gray-500 mb-6">
                  {searchTerm 
                    ? "Tente ajustar os termos de busca para encontrar o que procura."
                    : "Comece adicionando seu primeiro cliente para gerenciar seus atendimentos."
                  }
                </p>
                {!searchTerm && (
                  <Button 
                    onClick={() => setIsCreateDialogOpen(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white border-0"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Adicionar primeiro cliente
                  </Button>
                )}
              </div>
            ) : (
              filteredClients.map((client, index) => (
                <div 
                  key={client.id} 
                  className="px-6 py-4 hover:bg-gray-50 transition-colors cursor-pointer"
                  onClick={() => openDetailsDialog(client)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="text-sm font-medium text-gray-900 truncate">
                          {client.name}
                        </h3>
                        {client.phone_verified && (
                          <Badge 
                            variant="secondary" 
                            className="bg-green-100 text-green-800 text-xs px-2 py-1"
                          >
                            Verificado
                          </Badge>
                        )}
                      </div>
                      
                      <div className="flex items-center space-x-6 text-sm text-gray-500">
                        <div className="flex items-center">
                          <Phone className="w-3 h-3 mr-1" />
                          {client.phone}
                        </div>
                        <div className="flex items-center">
                          <Clock className="w-3 h-3 mr-1" />
                          Cadastrado em {format(new Date(client.created_at), "dd/MM/yyyy", { locale: ptBR })}
                        </div>
                      </div>
                      
                      {client.notes && (
                        <p className="text-sm text-gray-600 mt-2 line-clamp-2">
                          {client.notes}
                        </p>
                      )}
                    </div>
                    
                    <div className="flex items-center space-x-2 ml-4" onClick={(e) => e.stopPropagation()}>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEditDialog(client)}
                        className="border-gray-300 text-gray-700 hover:bg-gray-50"
                        title="Editar cliente"
                      >
                        <Edit className="w-3 h-3" />
                      </Button>
                      
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="border-gray-300 text-gray-700 hover:bg-gray-50 hover:text-red-600"
                            title="Excluir cliente"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle className="text-lg font-medium text-gray-900">
                              Excluir cliente
                            </AlertDialogTitle>
                            <AlertDialogDescription className="text-gray-600">
                              Tem certeza que deseja excluir o cliente <strong>{client.name}</strong>? 
                              Esta ação não pode ser desfeita e todos os dados relacionados serão removidos permanentemente.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel className="border-gray-300 text-gray-700 hover:bg-gray-50">
                              Cancelar
                            </AlertDialogCancel>
                            <AlertDialogAction 
                              onClick={() => handleDeleteClient(client.id)}
                              className="bg-red-600 hover:bg-red-700 text-white border-0"
                            >
                              Excluir cliente
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Edit Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-lg font-medium text-gray-900">
                Editar cliente
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-6 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name" className="text-sm font-medium text-gray-700">
                  Nome completo *
                </Label>
                <Input
                  id="edit-name"
                  value={clientForm.name}
                  onChange={(e) => setClientForm({ ...clientForm, name: e.target.value })}
                  placeholder="Digite o nome completo"
                  className="border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="edit-phone" className="text-sm font-medium text-gray-700">
                  Telefone *
                </Label>
                <Input
                  id="edit-phone"
                  value={clientForm.phone}
                  onChange={(e) => setClientForm({ ...clientForm, phone: e.target.value })}
                  placeholder="(11) 99999-9999"
                  className="border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="edit-notes" className="text-sm font-medium text-gray-700">
                  Observações
                </Label>
                <Textarea
                  id="edit-notes"
                  value={clientForm.notes}
                  onChange={(e) => setClientForm({ ...clientForm, notes: e.target.value })}
                  placeholder="Informações adicionais sobre o cliente..."
                  rows={3}
                  className="border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
              
              <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                <Button 
                  variant="outline" 
                  onClick={() => setIsEditDialogOpen(false)}
                  className="border-gray-300 text-gray-700 hover:bg-gray-50"
                >
                  Cancelar
                </Button>
                <Button 
                  onClick={handleEditClient}
                  disabled={!clientForm.name || !clientForm.phone || updateClient.isPending}
                  className="bg-blue-600 hover:bg-blue-700 text-white border-0"
                >
                  {updateClient.isPending ? "Salvando..." : "Salvar alterações"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Client Details Dialog */}
        <ClientDetailsDialog
          client={viewingClient}
          isOpen={isDetailsDialogOpen}
          onClose={() => setIsDetailsDialogOpen(false)}
        />

        {/* Duplicate Phone Dialog */}
        <AlertDialog open={isDuplicateDialogOpen} onOpenChange={setIsDuplicateDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Número já cadastrado</AlertDialogTitle>
              <AlertDialogDescription>
                O cliente <strong>{duplicateClient?.name}</strong> já usa o número{' '}
                <strong>{clientForm.phone}</strong>. Deseja associar os agendamentos do visitante a este cliente existente?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => {
                setIsDuplicateDialogOpen(false);
                setDuplicateClient(null);
              }}>
                Cancelar
              </AlertDialogCancel>
              <AlertDialogAction onClick={async () => {
                if (duplicateClient && currentVisitor) {
                  setIsAssociating(true);
                  try {
                    // Gerar todas as variações de telefone do visitante
                    const phonesSet = new Set<string>();
                    buildPhoneVariants(currentVisitor.visitor_phone).forEach(p => phonesSet.add(p));
                    currentVisitor.variant_phones.forEach((p) => {
                      buildPhoneVariants(p).forEach(v => phonesSet.add(v));
                    });
                    const phonesToMatch = Array.from(phonesSet);
                    
                    console.log('🔄 Associando appointments do visitante ao cliente existente:', phonesToMatch);

                    // Atualizar appointments sem client_profile_id
                    const { data: updatedAppointments, error: updateError } = await supabase
                      .from('appointments')
                      .update({
                        client_profile_id: duplicateClient.id,
                        notes: `Associado automaticamente em ${new Date().toLocaleDateString('pt-BR')}`
                      })
                      .eq('barbershop_id', barbershopId!)
                      .is('client_profile_id', null)
                      .in('client_phone', phonesToMatch)
                      .select();

                    if (updateError) throw updateError;

                    const updatedCount = updatedAppointments?.length || 0;
                    console.log('✅ Appointments associados:', updatedCount);

                    toast({
                      title: 'Associado com sucesso!',
                      description: `${updatedCount} agendamento(s) foram vinculados ao cliente ${duplicateClient.name}.`,
                    });

                    // Invalidar queries
                    await Promise.all([
                      queryClient.invalidateQueries({ queryKey: ['visitors', barbershopId] }),
                      queryClient.invalidateQueries({ queryKey: ['clients', barbershopId] }),
                    ]);

                    // Limpar e fechar
                    setClientForm({ name: "", phone: "", notes: "" });
                    setCurrentVisitor(null);
                    setIsCreateDialogOpen(false);
                    setIsDuplicateDialogOpen(false);
                    setDuplicateClient(null);
                  } catch (error) {
                    console.error('Erro ao associar:', error);
                    toast({
                      title: 'Erro ao associar',
                      description: 'Não foi possível associar os agendamentos.',
                      variant: 'destructive',
                    });
                  } finally {
                    setIsAssociating(false);
                  }
                }
              }}>
                Sim, associar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Associate Visitor Dialog */}
        <AssociateVisitorDialog
          isOpen={isAssociateDialogOpen}
          onClose={() => {
            setIsAssociateDialogOpen(false);
            setVisitorToAssociate(null);
            setClientToAssociate(null);
          }}
          onConfirm={confirmAssociation}
          visitor={visitorToAssociate}
          client={clientToAssociate}
          isLoading={isAssociating}
        />

        {/* Client Selector Modal */}
        <ClientSelectorModal
          open={isClientSelectorOpen}
          onOpenChange={setIsClientSelectorOpen}
          barbershopId={barbershopId!}
          visitorPhone={currentVisitor?.visitor_phone}
          clients={clients}
          isLoading={isLoading}
          onClientSelect={handleClientSelected}
        />
      </div>
    </div>
  );
}
