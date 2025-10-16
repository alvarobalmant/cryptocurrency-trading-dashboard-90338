import { useState, useMemo } from "react";
import { Search, User, Phone, Calendar, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Client {
  id: string;
  name: string;
  phone: string;
  created_at: string;
  notes?: string;
}

interface AppointmentClientSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onClientSelect: (client: Client) => void;
  clients: Client[];
  isLoading?: boolean;
}

export function AppointmentClientSelector({
  open,
  onOpenChange,
  onClientSelect,
  clients,
  isLoading
}: AppointmentClientSelectorProps) {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredClients = useMemo(() => {
    if (!searchTerm.trim()) return clients;

    const search = searchTerm.toLowerCase().trim();
    return clients.filter(client => 
      client.name.toLowerCase().includes(search) ||
      client.phone.replace(/\D/g, '').includes(search.replace(/\D/g, ''))
    );
  }, [clients, searchTerm]);

  const handleSelect = (client: Client) => {
    onClientSelect(client);
    setSearchTerm("");
    onOpenChange(false);
  };

  const formatPhone = (phone: string) => {
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 11) {
      return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7)}`;
    }
    return phone;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle className="text-xl font-semibold">Selecionar Cliente</DialogTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Escolha um cliente cadastrado para o agendamento
          </p>
        </DialogHeader>

        <div className="px-6 py-4 border-b bg-muted/30">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome ou telefone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-10 h-11"
            />
            {searchTerm && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSearchTerm("")}
                className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="flex flex-col items-center gap-3">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              <p className="text-sm text-muted-foreground">Carregando clientes...</p>
            </div>
          </div>
        ) : (
          <>
            <div className="px-6 py-2 bg-muted/20">
              <p className="text-xs font-medium text-muted-foreground">
                {filteredClients.length} {filteredClients.length === 1 ? 'cliente encontrado' : 'clientes encontrados'}
              </p>
            </div>

            <ScrollArea className="flex-1 max-h-[450px]">
              {filteredClients.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 px-6">
                  <User className="h-12 w-12 text-muted-foreground/30 mb-3" />
                  <p className="text-sm font-medium text-muted-foreground">Nenhum cliente encontrado</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {searchTerm ? "Tente buscar com outros termos" : "Cadastre clientes para vê-los aqui"}
                  </p>
                </div>
              ) : (
                <div className="divide-y">
                  {filteredClients.map((client) => (
                    <button
                      key={client.id}
                      onClick={() => handleSelect(client)}
                      className="w-full px-6 py-4 hover:bg-muted/50 transition-colors text-left group"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 group-hover:bg-primary/20 transition-colors">
                            <User className="h-5 w-5 text-primary" />
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-medium truncate">{client.name}</h4>
                              <Badge variant="outline" className="text-xs flex-shrink-0">
                                Cliente
                              </Badge>
                            </div>
                            
                            <div className="flex flex-col gap-1">
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Phone className="h-3.5 w-3.5 flex-shrink-0" />
                                <span className="truncate">{formatPhone(client.phone)}</span>
                              </div>
                              
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <Calendar className="h-3.5 w-3.5 flex-shrink-0" />
                                <span>
                                  Cadastrado {formatDistanceToNow(new Date(client.created_at), { 
                                    addSuffix: true, 
                                    locale: ptBR 
                                  })}
                                </span>
                              </div>
                            </div>

                            {client.notes && (
                              <p className="text-xs text-muted-foreground mt-2 line-clamp-1">
                                {client.notes}
                              </p>
                            )}
                          </div>
                        </div>

                        <Button
                          size="sm"
                          className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                        >
                          Selecionar
                        </Button>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </ScrollArea>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
