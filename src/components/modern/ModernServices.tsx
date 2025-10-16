import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { 
  Scissors, 
  Search, 
  DollarSign, 
  Clock, 
  Star,
  TrendingUp,
  Filter,
  CheckCircle,
  XCircle,
  Sparkles
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Service {
  id: string;
  name: string;
  price: number;
  duration_minutes: number;
  description: string | null;
}

interface ModernServicesProps {
  availableServices: Service[];
  employeeServices: string[];
  onToggleService: (serviceId: string) => Promise<void>;
}

export default function ModernServices({ 
  availableServices, 
  employeeServices, 
  onToggleService 
}: ModernServicesProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [loading, setLoading] = useState<string | null>(null);

  const filteredServices = availableServices.filter(service => {
    const matchesSearch = service.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         service.description?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const isActive = employeeServices.includes(service.id);
    
    const matchesFilter = filter === 'all' || 
                         (filter === 'active' && isActive) ||
                         (filter === 'inactive' && !isActive);
    
    return matchesSearch && matchesFilter;
  });

  const handleToggleService = async (serviceId: string) => {
    setLoading(serviceId);
    try {
      await onToggleService(serviceId);
    } finally {
      setLoading(null);
    }
  };

  const formatDuration = (minutes: number) => {
    if (minutes < 60) {
      return `${minutes}min`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}min` : `${hours}h`;
  };

  const getServiceStats = () => {
    const activeServices = employeeServices.length;
    const totalServices = availableServices.length;
    const totalValue = availableServices
      .filter(service => employeeServices.includes(service.id))
      .reduce((sum, service) => sum + service.price, 0);
    const averagePrice = activeServices > 0 ? totalValue / activeServices : 0;

    return {
      activeServices,
      totalServices,
      totalValue,
      averagePrice,
      activationRate: totalServices > 0 ? (activeServices / totalServices) * 100 : 0
    };
  };

  const stats = getServiceStats();

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-2xl p-8 text-white">
        <h1 className="text-3xl font-bold mb-2">Meus Serviços</h1>
        <p className="text-emerald-100 text-lg">
          Gerencie os serviços que você oferece aos clientes
        </p>
      </div>

      {/* Estatísticas */}
      <div className="grid gap-6 md:grid-cols-4">
        <Card className="shadow-lg border-0 bg-gradient-to-br from-blue-500 to-blue-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm font-medium">Serviços Ativos</p>
                <p className="text-3xl font-bold">{stats.activeServices}</p>
                <p className="text-blue-200 text-xs mt-1">de {stats.totalServices} disponíveis</p>
              </div>
              <CheckCircle className="w-8 h-8 text-blue-200" />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-lg border-0 bg-gradient-to-br from-green-500 to-green-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-sm font-medium">Valor Total</p>
                <p className="text-3xl font-bold">R$ {stats.totalValue.toFixed(0)}</p>
                <p className="text-green-200 text-xs mt-1">em serviços ativos</p>
              </div>
              <DollarSign className="w-8 h-8 text-green-200" />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-lg border-0 bg-gradient-to-br from-purple-500 to-purple-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-sm font-medium">Preço Médio</p>
                <p className="text-3xl font-bold">R$ {stats.averagePrice.toFixed(0)}</p>
                <p className="text-purple-200 text-xs mt-1">por serviço</p>
              </div>
              <TrendingUp className="w-8 h-8 text-purple-200" />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-lg border-0 bg-gradient-to-br from-orange-500 to-orange-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-orange-100 text-sm font-medium">Taxa de Ativação</p>
                <p className="text-3xl font-bold">{stats.activationRate.toFixed(0)}%</p>
                <p className="text-orange-200 text-xs mt-1">dos serviços</p>
              </div>
              <Star className="w-8 h-8 text-orange-200" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros e Busca */}
      <Card className="shadow-lg border-0">
        <CardContent className="p-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
            {/* Filtros */}
            <div className="flex flex-wrap gap-2">
              <Button
                variant={filter === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('all')}
                className="flex items-center space-x-2"
              >
                <Filter className="w-4 h-4" />
                <span>Todos ({availableServices.length})</span>
              </Button>
              
              <Button
                variant={filter === 'active' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('active')}
                className="flex items-center space-x-2"
              >
                <CheckCircle className="w-4 h-4" />
                <span>Ativos ({stats.activeServices})</span>
              </Button>
              
              <Button
                variant={filter === 'inactive' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('inactive')}
                className="flex items-center space-x-2"
              >
                <XCircle className="w-4 h-4" />
                <span>Inativos ({stats.totalServices - stats.activeServices})</span>
              </Button>
            </div>

            {/* Busca */}
            <div className="relative w-full lg:w-80">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
              <Input
                placeholder="Buscar serviços..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Serviços */}
      {filteredServices.length === 0 ? (
        <Card className="shadow-lg border-0">
          <CardContent className="text-center py-12">
            <Scissors className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-900 mb-2">Nenhum serviço encontrado</h3>
            <p className="text-slate-500">
              {searchTerm 
                ? 'Tente ajustar o termo de busca ou filtros.' 
                : 'Não há serviços disponíveis no momento.'
              }
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredServices.map((service) => {
            const isActive = employeeServices.includes(service.id);
            const isLoading = loading === service.id;
            
            return (
              <Card 
                key={service.id} 
                className={cn(
                  "shadow-lg border-2 transition-all duration-300 hover:shadow-xl transform hover:-translate-y-1",
                  isActive 
                    ? "border-emerald-200 bg-gradient-to-br from-emerald-50 to-green-50" 
                    : "border-slate-200 bg-white hover:border-slate-300"
                )}
              >
                <CardHeader className="pb-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      <div className={cn(
                        "w-12 h-12 rounded-full flex items-center justify-center",
                        isActive 
                          ? "bg-emerald-500 text-white" 
                          : "bg-slate-100 text-slate-400"
                      )}>
                        {isActive ? <Sparkles className="w-6 h-6" /> : <Scissors className="w-6 h-6" />}
                      </div>
                      
                      <div className="flex-1">
                        <CardTitle className="text-lg leading-tight">{service.name}</CardTitle>
                        {service.description && (
                          <p className="text-sm text-slate-600 mt-1 line-clamp-2">
                            {service.description}
                          </p>
                        )}
                      </div>
                    </div>
                    
                    <Switch
                      checked={isActive}
                      onCheckedChange={() => handleToggleService(service.id)}
                      disabled={isLoading}
                      className="ml-2"
                    />
                  </div>
                </CardHeader>
                
                <CardContent className="pt-0">
                  <div className="space-y-3">
                    {/* Preço e Duração */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <DollarSign className="w-4 h-4 text-green-600" />
                        <span className="font-bold text-green-600 text-lg">
                          R$ {service.price.toFixed(2)}
                        </span>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Clock className="w-4 h-4 text-blue-600" />
                        <span className="text-blue-600 font-medium">
                          {formatDuration(service.duration_minutes)}
                        </span>
                      </div>
                    </div>

                    {/* Status Badge */}
                    <div className="flex items-center justify-between">
                      <Badge 
                        variant={isActive ? "default" : "secondary"}
                        className={cn(
                          "transition-colors",
                          isActive 
                            ? "bg-emerald-600 hover:bg-emerald-700" 
                            : "bg-slate-400 hover:bg-slate-500"
                        )}
                      >
                        {isActive ? 'Ativo' : 'Inativo'}
                      </Badge>
                      
                      {isLoading && (
                        <div className="w-4 h-4 border-2 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
                      )}
                    </div>

                    {/* Valor por hora (calculado) */}
                    <div className="pt-2 border-t border-slate-200">
                      <div className="flex items-center justify-between text-xs text-slate-500">
                        <span>Valor por hora:</span>
                        <span className="font-medium">
                          R$ {((service.price / service.duration_minutes) * 60).toFixed(2)}/h
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Resumo Final */}
      {filteredServices.length > 0 && (
        <Card className="shadow-lg border-0 bg-gradient-to-r from-slate-50 to-slate-100">
          <CardContent className="p-6">
            <div className="text-center">
              <h3 className="text-lg font-semibold text-slate-900 mb-2">
                Resumo dos Serviços
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-slate-600">Serviços Ativos</p>
                  <p className="font-bold text-emerald-600 text-xl">{stats.activeServices}</p>
                </div>
                <div>
                  <p className="text-slate-600">Valor Total</p>
                  <p className="font-bold text-green-600 text-xl">R$ {stats.totalValue.toFixed(0)}</p>
                </div>
                <div>
                  <p className="text-slate-600">Preço Médio</p>
                  <p className="font-bold text-blue-600 text-xl">R$ {stats.averagePrice.toFixed(0)}</p>
                </div>
                <div>
                  <p className="text-slate-600">Taxa de Ativação</p>
                  <p className="font-bold text-purple-600 text-xl">{stats.activationRate.toFixed(0)}%</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
