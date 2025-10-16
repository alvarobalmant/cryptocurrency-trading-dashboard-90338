import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, X, Phone, Calendar, TrendingUp, Star, Zap } from "lucide-react";
import { Client } from "@/hooks/useClients";
import { useClientSearch, ClientSearchResult } from "@/hooks/useClientSearch";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ClientSelectorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  barbershopId: string;
  visitorPhone?: string;
  clients: Client[];
  isLoading?: boolean;
  onClientSelect: (client: Client) => void;
}

export function ClientSelectorModal({
  open,
  onOpenChange,
  visitorPhone,
  clients,
  isLoading,
  onClientSelect
}: ClientSelectorModalProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilter, setActiveFilter] = useState<'all' | 'recent' | 'compatible' | 'vip'>('all');
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);

  const { results, isSearching, totalResults } = useClientSearch({
    clients,
    visitorPhone,
    searchTerm,
    activeFilter
  });

  const handleSelect = (client: ClientSearchResult) => {
    setSelectedClient(client);
  };

  const handleConfirm = () => {
    if (selectedClient) {
      onClientSelect(selectedClient);
      handleClose();
    }
  };

  const handleClose = () => {
    setSearchTerm("");
    setActiveFilter('all');
    setSelectedClient(null);
    onOpenChange(false);
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();
  };

  const highlightText = (text: string, highlight: string) => {
    if (!highlight.trim()) return text;
    
    const parts = text.split(new RegExp(`(${highlight})`, 'gi'));
    return (
      <span>
        {parts.map((part, i) => 
          part.toLowerCase() === highlight.toLowerCase() ? (
            <mark key={i} className="bg-yellow-200 text-gray-900 font-medium">
              {part}
            </mark>
          ) : (
            part
          )
        )}
      </span>
    );
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl h-[90vh] sm:h-auto sm:max-h-[90vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-4 sm:px-6 pt-4 sm:pt-6 pb-3 sm:pb-4 border-b flex-shrink-0">
          <DialogTitle className="text-lg sm:text-xl font-semibold">
            Selecionar Cliente
          </DialogTitle>
        </DialogHeader>

        {/* Search Input */}
        <div className="px-4 sm:px-6 py-3 sm:py-4 border-b bg-muted/30 flex-shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, telefone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-10 h-10 sm:h-11"
              autoFocus
            />
            {searchTerm && (
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 p-0"
                onClick={() => setSearchTerm("")}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
            {isSearching && (
              <div className="absolute right-10 top-1/2 -translate-y-1/2">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="px-4 sm:px-6 py-2 sm:py-3 border-b flex gap-2 overflow-x-auto flex-shrink-0">
          <Button
            variant={activeFilter === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveFilter('all')}
            className="flex-shrink-0 text-xs sm:text-sm"
          >
            Todos
          </Button>
          <Button
            variant={activeFilter === 'compatible' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveFilter('compatible')}
            className="flex-shrink-0 text-xs sm:text-sm"
          >
            <Star className="h-3 w-3 mr-1" />
            Compatíveis
          </Button>
          <Button
            variant={activeFilter === 'recent' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveFilter('recent')}
            className="flex-shrink-0 text-xs sm:text-sm"
          >
            <Zap className="h-3 w-3 mr-1" />
            Recentes
          </Button>
        </div>

        {/* Results - Scrollable Area */}
        <div className="flex-1 overflow-hidden">
          <ScrollArea className="h-full px-4 sm:px-6 py-3 sm:py-4">
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-4 p-4 rounded-lg border">
                  <Skeleton className="h-12 w-12 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-1/2" />
                    <Skeleton className="h-3 w-1/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : results.length === 0 ? (
            <div className="py-12 text-center">
              <div className="mx-auto w-16 h-16 mb-4 bg-muted rounded-full flex items-center justify-center">
                <Search className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium mb-2">
                {searchTerm ? "Nenhum cliente encontrado" : "Digite para buscar"}
              </h3>
              <p className="text-sm text-muted-foreground">
                {searchTerm 
                  ? "Tente outro termo de busca ou ajuste os filtros"
                  : "Use o campo acima para encontrar clientes cadastrados"
                }
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {results.map((client) => (
                <button
                  key={client.id}
                  onClick={() => handleSelect(client)}
                  className={`w-full text-left p-4 rounded-lg border-2 transition-all hover:shadow-md ${
                    selectedClient?.id === client.id
                      ? 'border-primary bg-primary/5 shadow-sm'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <Avatar className="h-12 w-12 flex-shrink-0">
                      <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                        {getInitials(client.name)}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium text-base truncate">
                          {highlightText(client.name, searchTerm)}
                        </h4>
                        {client.isCompatible && (
                          <Badge variant="default" className="flex-shrink-0 gap-1">
                            <Star className="h-3 w-3" />
                            Compatível
                          </Badge>
                        )}
                        {client.isRecent && (
                          <Badge variant="secondary" className="flex-shrink-0 gap-1">
                            <Zap className="h-3 w-3" />
                            Recente
                          </Badge>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {highlightText(client.phone, searchTerm)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(client.created_at), "dd/MM/yyyy", { locale: ptBR })}
                        </span>
                      </div>

                      {client.notes && (
                        <p className="mt-2 text-xs text-muted-foreground line-clamp-1">
                          {client.notes}
                        </p>
                      )}
                    </div>

                    {selectedClient?.id === client.id && (
                      <div className="flex-shrink-0 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                        <TrendingUp className="h-3 w-3 text-primary-foreground" />
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
          </ScrollArea>
        </div>

        {/* Footer */}
        <DialogFooter className="px-4 sm:px-6 py-3 sm:py-4 border-t bg-muted/30 flex-shrink-0">
          <div className="flex items-center justify-between w-full">
            <p className="text-sm text-muted-foreground">
              {totalResults} {totalResults === 1 ? 'cliente encontrado' : 'clientes encontrados'}
            </p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleClose}>
                Cancelar
              </Button>
              <Button 
                onClick={handleConfirm}
                disabled={!selectedClient}
              >
                Selecionar
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
