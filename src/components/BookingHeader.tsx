import React from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import { LogOut, User, Calendar } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface BookingHeaderProps {
  barbershop: {
    id: string;
    name: string;
    avatar_url?: string;
    slogan?: string;
  };
  clientProfile?: {
    name: string;
    phone: string;
  } | null;
  isAuthenticated: boolean;
  onLogout: () => void;
}

export default function BookingHeader({ 
  barbershop, 
  clientProfile, 
  isAuthenticated, 
  onLogout 
}: BookingHeaderProps) {
  const navigate = useNavigate();

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const handleClientArea = () => {
    navigate('/cliente');
  };

  return (
    <header className="bg-card/50 backdrop-blur border-b border-border/50 sticky top-0 z-50">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          {/* Barbershop Info */}
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={barbershop.avatar_url} alt={barbershop.name} />
              <AvatarFallback>
                {getInitials(barbershop.name)}
              </AvatarFallback>
            </Avatar>
            <div>
              <h2 className="font-semibold text-sm">{barbershop.name}</h2>
              {barbershop.slogan && (
                <p className="text-xs text-muted-foreground">{barbershop.slogan}</p>
              )}
            </div>
          </div>

          {/* User Actions */}
          {isAuthenticated && clientProfile ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-2">
                  <Avatar className="h-6 w-6">
                    <AvatarFallback className="text-xs">
                      {getInitials(clientProfile.name)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="hidden sm:inline">{clientProfile.name}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="px-3 py-2">
                  <p className="text-sm font-medium">{clientProfile.name}</p>
                  <p className="text-xs text-muted-foreground">{clientProfile.phone}</p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleClientArea}>
                  <User className="h-4 w-4 mr-2" />
                  Área do Cliente
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/')}>
                  <Calendar className="h-4 w-4 mr-2" />
                  Novo Agendamento
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={onLogout}
                  className="text-destructive focus:text-destructive"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button variant="ghost" size="sm" onClick={() => navigate('/')}>
              Voltar
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}