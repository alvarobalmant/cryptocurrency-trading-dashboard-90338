import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useBarbershops } from '@/hooks/useBarbershops';
import { Button } from '@/components/ui/button';
import { ArrowLeft, LogOut, Building2, FileText } from 'lucide-react';
import { getUserDisplayName } from '@/lib/utils';
import TabsManager from '@/components/tabs/TabsManager';

export default function BarbershopTabs() {
  const { barbershopId } = useParams();
  const { user, signOut } = useAuth();
  const { barbershops, loading } = useBarbershops();
  const [currentBarbershop, setCurrentBarbershop] = useState<any>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && barbershops.length > 0 && barbershopId) {
      const barbershop = barbershops.find((b) => b.id === barbershopId);
      setCurrentBarbershop(barbershop || null);
    }
  }, [loading, barbershops, barbershopId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  if (!currentBarbershop) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-4">Barbearia não encontrada</h2>
          <Button onClick={() => navigate('/barbershops')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-slate-200/60 shadow-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 lg:h-20">
            <div className="flex items-center gap-3 lg:gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/barbershops')}
                className="hover:bg-slate-100"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Voltar
              </Button>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                  <Building2 className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h1 className="text-lg font-bold text-slate-800">
                    {currentBarbershop.name}
                  </h1>
                  <p className="text-xs text-slate-500">Gerenciamento de Comandas</p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden md:block text-right">
                <p className="text-sm font-medium text-slate-700">
                  {getUserDisplayName(user)}
                </p>
                <p className="text-xs text-slate-500">{user?.email}</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => signOut()}
                className="hover:bg-red-50 hover:text-red-600"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <TabsManager barbershopId={barbershopId!} />
      </div>
    </div>
  );
}
