import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Bell, 
  LogOut, 
  User,
  Building2,
  ChevronDown
} from 'lucide-react';

interface Employee {
  id: string;
  name: string;
  email: string;
  avatar_url: string | null;
  status: string;
}

interface Barbershop {
  id: string;
  name: string;
  slug: string;
}

interface ModernHeaderProps {
  employee: Employee;
  barbershop: Barbershop;
  onLogout: () => void;
}

export default function ModernHeader({ employee, barbershop, onLogout }: ModernHeaderProps) {
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-lg border-b border-slate-200/60">
      <div className="px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo e Info da Barbearia */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-600 rounded-lg flex items-center justify-center">
                <Building2 className="w-5 h-5 text-white" />
              </div>
              <div className="hidden sm:block">
                <h1 className="text-lg font-semibold text-slate-900">{barbershop.name}</h1>
                <p className="text-sm text-slate-500">Painel do Funcionário</p>
              </div>
            </div>
          </div>

          {/* Área do Usuário */}
          <div className="flex items-center space-x-4">
            {/* Notificações */}
            <Button variant="ghost" size="sm" className="relative">
              <Bell className="w-5 h-5 text-slate-600" />
              <Badge 
                variant="destructive" 
                className="absolute -top-1 -right-1 w-5 h-5 p-0 flex items-center justify-center text-xs"
              >
                3
              </Badge>
            </Button>

            {/* Perfil do Funcionário */}
            <div className="flex items-center space-x-3 pl-4 border-l border-slate-200">
              <div className="relative">
                <Avatar className="w-10 h-10 ring-2 ring-primary-100">
                  <AvatarImage src={employee.avatar_url || undefined} />
                  <AvatarFallback className="bg-gradient-to-br from-primary-500 to-primary-600 text-white font-medium">
                    {getInitials(employee.name)}
                  </AvatarFallback>
                </Avatar>
                
                {/* Indicador Online */}
                <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
              </div>

              <div className="hidden md:block">
                <p className="text-sm font-medium text-slate-900">{employee.name}</p>
                <p className="text-xs text-slate-500">Funcionário</p>
              </div>

              <ChevronDown className="w-4 h-4 text-slate-400" />
            </div>

            {/* Botão de Logout */}
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={onLogout}
              className="text-slate-600 hover:text-red-600 hover:bg-red-50"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline ml-2">Sair</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Gradiente decorativo */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary-200 to-transparent"></div>
    </header>
  );
}
