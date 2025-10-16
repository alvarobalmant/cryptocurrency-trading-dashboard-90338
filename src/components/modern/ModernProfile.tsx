import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import AvatarUpload from '@/components/AvatarUpload';
import { 
  User, 
  Mail, 
  Phone, 
  Edit3, 
  Save, 
  X, 
  Calendar,
  Star,
  TrendingUp,
  Award,
  Clock,
  DollarSign
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Employee {
  id: string;
  name: string;
  email: string;
  phone: string;
  avatar_url: string | null;
  created_at: string;
}

interface ModernProfileProps {
  employee: Employee;
  onUpdateProfile: (updatedData: Partial<Employee>) => Promise<void>;
}

export default function ModernProfile({ employee, onUpdateProfile }: ModernProfileProps) {
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: employee.name,
    phone: employee.phone || '',
  });
  const { toast } = useToast();

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast({
        title: 'Erro',
        description: 'O nome é obrigatório.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setLoading(true);
      await onUpdateProfile({
        name: formData.name.trim(),
        phone: formData.phone.trim(),
      });
      setEditing(false);
    } catch (error) {
      console.error('Erro ao salvar perfil:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      name: employee.name,
      phone: employee.phone || '',
    });
    setEditing(false);
  };

  const handleAvatarUpdate = async (newAvatarUrl: string) => {
    try {
      await onUpdateProfile({ avatar_url: newAvatarUrl });
    } catch (error) {
      console.error('Erro ao atualizar avatar:', error);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const formatMemberSince = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', { 
      month: 'long', 
      year: 'numeric' 
    });
  };

  // Dados simulados para estatísticas (em uma implementação real, viriam do backend)
  const stats = {
    totalAppointments: 156,
    averageRating: 4.8,
    totalEarnings: 4680.00,
    completionRate: 98
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-2xl p-8 text-white">
        <h1 className="text-3xl font-bold mb-2">Meu Perfil</h1>
        <p className="text-purple-100 text-lg">
          Gerencie suas informações pessoais e veja suas estatísticas
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Informações Pessoais */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="shadow-lg border-0">
            <CardHeader className="bg-slate-50 border-b">
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <User className="w-5 h-5 text-primary-600" />
                  <span>Informações Pessoais</span>
                </div>
                {!editing && (
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setEditing(true)}
                  >
                    <Edit3 className="w-4 h-4 mr-2" />
                    Editar
                  </Button>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-8">
              <div className="flex flex-col md:flex-row md:items-start space-y-6 md:space-y-0 md:space-x-8">
                {/* Avatar */}
                <div className="flex-shrink-0">
                  <AvatarUpload
                    currentAvatarUrl={employee.avatar_url}
                    onAvatarUpdate={handleAvatarUpdate}
                    fallbackText={getInitials(employee.name)}
                    userId={employee.id}
                    size="lg"
                  />
                </div>

                {/* Formulário */}
                <div className="flex-1 space-y-6">
                  {editing ? (
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="name">Nome Completo</Label>
                        <Input
                          id="name"
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          placeholder="Digite seu nome completo"
                          className="mt-1"
                        />
                      </div>

                      <div>
                        <Label htmlFor="phone">Telefone</Label>
                        <Input
                          id="phone"
                          value={formData.phone}
                          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                          placeholder="(11) 99999-9999"
                          className="mt-1"
                        />
                      </div>

                      <div className="flex space-x-3">
                        <Button 
                          onClick={handleSave} 
                          disabled={loading}
                          className="flex-1"
                        >
                          <Save className="w-4 h-4 mr-2" />
                          {loading ? 'Salvando...' : 'Salvar'}
                        </Button>
                        <Button 
                          variant="outline" 
                          onClick={handleCancel}
                          disabled={loading}
                          className="flex-1"
                        >
                          <X className="w-4 h-4 mr-2" />
                          Cancelar
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex items-center space-x-3 p-4 bg-slate-50 rounded-lg">
                        <User className="w-5 h-5 text-slate-400" />
                        <div>
                          <p className="text-sm text-slate-500">Nome</p>
                          <p className="font-medium text-slate-900">{employee.name}</p>
                        </div>
                      </div>

                      <div className="flex items-center space-x-3 p-4 bg-slate-50 rounded-lg">
                        <Mail className="w-5 h-5 text-slate-400" />
                        <div>
                          <p className="text-sm text-slate-500">Email</p>
                          <p className="font-medium text-slate-900">{employee.email}</p>
                        </div>
                      </div>

                      <div className="flex items-center space-x-3 p-4 bg-slate-50 rounded-lg">
                        <Phone className="w-5 h-5 text-slate-400" />
                        <div>
                          <p className="text-sm text-slate-500">Telefone</p>
                          <p className="font-medium text-slate-900">
                            {employee.phone || 'Não informado'}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center space-x-3 p-4 bg-slate-50 rounded-lg">
                        <Calendar className="w-5 h-5 text-slate-400" />
                        <div>
                          <p className="text-sm text-slate-500">Membro desde</p>
                          <p className="font-medium text-slate-900">
                            {formatMemberSince(employee.created_at)}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Estatísticas */}
        <div className="space-y-6">
          {/* Resumo de Performance */}
          <Card className="shadow-lg border-0">
            <CardHeader className="bg-slate-50 border-b">
              <CardTitle className="flex items-center space-x-2">
                <TrendingUp className="w-5 h-5 text-green-600" />
                <span>Performance</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Calendar className="w-4 h-4 text-blue-500" />
                  <span className="text-sm text-slate-600">Total de Atendimentos</span>
                </div>
                <Badge variant="outline" className="bg-blue-50 text-blue-700">
                  {stats.totalAppointments}
                </Badge>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Star className="w-4 h-4 text-yellow-500" />
                  <span className="text-sm text-slate-600">Avaliação Média</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Badge variant="outline" className="bg-yellow-50 text-yellow-700">
                    {stats.averageRating}
                  </Badge>
                  <div className="flex">
                    {[...Array(5)].map((_, i) => (
                      <Star 
                        key={i} 
                        className={`w-3 h-3 ${
                          i < Math.floor(stats.averageRating) 
                            ? 'text-yellow-400 fill-current' 
                            : 'text-slate-300'
                        }`} 
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <DollarSign className="w-4 h-4 text-green-500" />
                  <span className="text-sm text-slate-600">Faturamento Total</span>
                </div>
                <Badge variant="outline" className="bg-green-50 text-green-700">
                  R$ {stats.totalEarnings.toFixed(2)}
                </Badge>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Award className="w-4 h-4 text-purple-500" />
                  <span className="text-sm text-slate-600">Taxa de Conclusão</span>
                </div>
                <Badge variant="outline" className="bg-purple-50 text-purple-700">
                  {stats.completionRate}%
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Conquistas */}
          <Card className="shadow-lg border-0">
            <CardHeader className="bg-slate-50 border-b">
              <CardTitle className="flex items-center space-x-2">
                <Award className="w-5 h-5 text-orange-600" />
                <span>Conquistas</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center space-x-3 p-3 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg border border-yellow-200">
                <div className="w-10 h-10 bg-yellow-500 rounded-full flex items-center justify-center">
                  <Star className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="font-medium text-slate-900">Profissional 5 Estrelas</p>
                  <p className="text-xs text-slate-500">Avaliação média acima de 4.5</p>
                </div>
              </div>

              <div className="flex items-center space-x-3 p-3 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200">
                <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                  <Clock className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="font-medium text-slate-900">Pontualidade</p>
                  <p className="text-xs text-slate-500">98% dos atendimentos no horário</p>
                </div>
              </div>

              <div className="flex items-center space-x-3 p-3 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200">
                <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="font-medium text-slate-900">Top Performer</p>
                  <p className="text-xs text-slate-500">Entre os 10% melhores do mês</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
