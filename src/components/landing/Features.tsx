import { useState } from 'react';
import { CalendarCheck, TrendingUp, Users, Megaphone, CalendarPlus, MessageCircle, ListChecks, PieChart, Percent, Receipt, Brain, Gift, Target, BarChart3, Sparkles, Crown } from 'lucide-react';

const featuresData = {
  agendamentos: [
    {
      icon: CalendarPlus,
      title: 'Agenda Inteligente',
      description: 'Sistema de agendamento com IA que otimiza automaticamente seus horários para maximizar o faturamento.',
      features: ['Sugestão automática de horários', 'Bloqueio inteligente de intervalos', 'Otimização por tipo de serviço'],
      premium: true
    },
    {
      icon: MessageCircle,
      title: 'WhatsApp Integrado',
      description: 'Envie lembretes, confirmações e promoções diretamente pelo WhatsApp de forma automatizada.',
      features: ['Lembretes 24h e 2h antes', 'Confirmação de presença', 'Campanhas promocionais']
    },
    {
      icon: ListChecks,
      title: 'Lista de Espera',
      description: 'Aproveite cancelamentos e maximize sua agenda com sistema inteligente de lista de espera.',
      features: ['Notificação automática de vagas', 'Priorização por histórico', 'Reagendamento facilitado']
    }
  ],
  financeiro: [
    {
      icon: PieChart,
      title: 'Relatórios Avançados',
      description: 'Dashboards interativos com análises profundas do seu negócio e previsões de faturamento.',
      features: ['Análise de tendências', 'Previsão de faturamento', 'Comparativo de períodos'],
      premium: true
    },
    {
      icon: Percent,
      title: 'Comissões Automáticas',
      description: 'Calcule comissões automaticamente com regras personalizáveis por profissional e serviço.',
      features: ['Regras flexíveis', 'Metas e bonificações', 'Relatório por profissional']
    },
    {
      icon: Receipt,
      title: 'Controle de Caixa',
      description: 'Gerencie entradas, saídas e formas de pagamento com controle total do fluxo de caixa.',
      features: ['Múltiplas formas de pagamento', 'Sangria e suprimento', 'Fechamento automático']
    }
  ],
  clientes: [
    {
      icon: Brain,
      title: 'CRM Inteligente',
      description: 'Sistema de relacionamento com clientes que identifica padrões e sugere ações para aumentar a fidelização.',
      features: ['Análise comportamental', 'Segmentação automática', 'Sugestões de ações'],
      premium: true
    },
    {
      icon: Gift,
      title: 'Programa de Fidelidade',
      description: 'Crie programas de pontos e recompensas personalizados para seus clientes mais fiéis.',
      features: ['Sistema de pontos', 'Recompensas customizáveis', 'Gamificação']
    },
    {
      icon: Target,
      title: 'Histórico Completo',
      description: 'Registre preferências, histórico de serviços e observações importantes de cada cliente.',
      features: ['Preferências salvas', 'Fotos de cortes anteriores', 'Notas personalizadas']
    }
  ],
  marketing: [
    {
      icon: BarChart3,
      title: 'Campanhas Automáticas',
      description: 'Crie e envie campanhas de marketing automatizadas para diferentes segmentos de clientes.',
      features: ['Segmentação avançada', 'Agendamento de envios', 'Análise de resultados'],
      premium: true
    },
    {
      icon: Sparkles,
      title: 'Promoções Inteligentes',
      description: 'Sistema que sugere promoções baseadas em horários ociosos e comportamento dos clientes.',
      features: ['Sugestões automáticas', 'Horários estratégicos', 'Cupons personalizados']
    },
    {
      icon: Crown,
      title: 'Avaliações e Reviews',
      description: 'Colete avaliações automaticamente e melhore sua reputação online.',
      features: ['Solicitação automática', 'Integração com Google', 'Gestão de feedback']
    }
  ]
};

export default function Features() {
  const [activeCategory, setActiveCategory] = useState('agendamentos');

  const categories = [
    { id: 'agendamentos', label: 'Agendamentos', icon: CalendarCheck },
    { id: 'financeiro', label: 'Financeiro', icon: TrendingUp },
    { id: 'clientes', label: 'Clientes', icon: Users },
    { id: 'marketing', label: 'Marketing', icon: Megaphone }
  ];

  return (
    <section id="funcoes" className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-6">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-12">
          <p className="text-sm font-semibold text-indigo-600 uppercase tracking-wider mb-3">
            Recursos Completos
          </p>
          <h2 className="text-4xl font-display font-bold text-gray-900 mb-4">
            Tudo que sua barbearia precisa em um só lugar
          </h2>
          <p className="text-lg text-gray-600">
            Ferramentas profissionais para transformar seu negócio e aumentar seus resultados.
          </p>
        </div>

        {/* Category Tabs */}
        <div className="flex justify-center flex-wrap gap-4 mb-12">
          {categories.map((category) => {
            const Icon = category.icon;
            return (
              <button
                key={category.id}
                onClick={() => setActiveCategory(category.id)}
                className={`flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all ${
                  activeCategory === category.id
                    ? 'bg-indigo-600 text-white shadow-lg scale-105'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span>{category.label}</span>
              </button>
            );
          })}
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-6">
          {featuresData[activeCategory].map((feature, index) => {
            const Icon = feature.icon;
            return (
              <div 
                key={index}
                className="bg-gradient-to-br from-white to-gray-50 p-6 rounded-xl border border-gray-200 hover:border-indigo-300 hover:shadow-xl transition-all"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg">
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  {feature.premium && (
                    <span className="px-2 py-1 bg-gradient-to-r from-amber-400 to-orange-500 text-white text-xs font-bold rounded-full">
                      Premium
                    </span>
                  )}
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">{feature.title}</h3>
                <p className="text-gray-600 mb-4">{feature.description}</p>
                <ul className="space-y-2">
                  {feature.features.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm text-gray-700">
                      <span className="text-indigo-600 mt-0.5">✓</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
