import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Plus, Search, Phone, Mail, Edit, Trash2, User, Clock, Eye } from "lucide-react";
import ClientDetailsDialog from "@/components/ClientDetailsDialog";
import { useBarbershop } from "@/hooks/useBarbershop";
import { useClients, Client, ClientInsert, ClientUpdate } from "@/hooks/useClients";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
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
  
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [viewingClient, setViewingClient] = useState<Client | null>(null);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  
  const [clientForm, setClientForm] = useState<ClientInsert | ClientUpdate>({
    name: "",
    phone: "",
    notes: "",
  });

  const filteredClients = clients.filter(client =>
    client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.phone.includes(searchTerm)
  );

  const handleCreateClient = async () => {
    try {
      // Validação com Zod
      const validatedData = clientSchema.parse({
        name: clientForm.name?.trim(),
        phone: clientForm.phone?.trim(),
        notes: clientForm.notes?.trim(),
      });

      if (!barbershopId) return;

      await createClient.mutateAsync({
        ...validatedData,
        barbershop_id: barbershopId,
      } as ClientInsert);

      setClientForm({
        name: "",
        phone: "",
        notes: "",
      });
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
                    Adicionar novo cliente
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-6 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-sm font-medium text-gray-700">
                      Nome completo *
                    </Label>
                    <Input
                      id="name"
                      value={clientForm.name}
                      onChange={(e) => setClientForm({ ...clientForm, name: e.target.value })}
                      placeholder="Digite o nome completo"
                      className="border-gray-300 focus:border-blue-500 focus:ring-blue-500"
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
                      className="border-gray-300 focus:border-blue-500 focus:ring-blue-500"
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
                      className="border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>
                  
                  <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                    <Button 
                      variant="outline" 
                      onClick={() => setIsCreateDialogOpen(false)}
                      className="border-gray-300 text-gray-700 hover:bg-gray-50"
                    >
                      Cancelar
                    </Button>
                    <Button 
                      onClick={handleCreateClient}
                      disabled={!clientForm.name || !clientForm.phone || createClient.isPending}
                      className="bg-blue-600 hover:bg-blue-700 text-white border-0"
                    >
                      {createClient.isPending ? "Salvando..." : "Adicionar cliente"}
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
      </div>
    </div>
  );
}
