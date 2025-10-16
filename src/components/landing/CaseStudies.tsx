import { CalendarCheck, Users } from 'lucide-react';

const cases = [
  {
    name: 'Barbearia Premium',
    location: 'São Paulo',
    image: 'https://images.unsplash.com/photo-1585747860715-2ba37e788b70?q=80&w=1200&auto=format&fit=crop',
    quote: 'Em 6 meses, nosso faturamento aumentou 180%. O sistema automatizou nossa agenda e liberou tempo para focar no atendimento. Hoje temos 3 unidades!',
    owner: 'Carlos Mendes',
    role: 'Proprietário',
    avatar: 'https://i.pravatar.cc/120?img=15',
    results: [
      { label: 'Faturamento', value: '+180%' },
      { label: 'Tempo Admin', value: '-60%' }
    ],
    metrics: [
      { icon: CalendarCheck, text: '450+ agendamentos/mês' },
      { icon: Users, text: '1.200+ clientes ativos' }
    ],
    featured: true
  },
  {
    name: 'Studio Cortes',
    location: 'Rio de Janeiro',
    quote: 'O WhatsApp integrado reduziu nossas faltas em 70%. Os clientes adoram receber lembretes e confirmar pelo próprio celular.',
    stats: [
      { label: 'Taxa de confirmação', value: '+120%' },
      { label: 'Faltas', value: '-70%' }
    ]
  },
  {
    name: 'Barber Shop Elite',
    location: 'Belo Horizonte',
    quote: 'Os relatórios me ajudaram a identificar os horários mais lucrativos. Ajustei os preços e aumentei a margem em 40%.',
    stats: [
      { label: 'Margem de lucro', value: '+40%' },
      { label: 'Ticket médio', value: 'R$ 85' }
    ]
  }
];

export default function CaseStudies() {
  return (
    <section id="casos-sucesso" className="py-20 bg-gradient-to-br from-gray-50 to-indigo-50">
      <div className="max-w-7xl mx-auto px-6">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-12">
          <p className="text-sm font-semibold text-indigo-600 uppercase tracking-wider mb-3">
            Casos de Sucesso
          </p>
          <h2 className="text-4xl font-display font-bold text-gray-900 mb-4">
            Barbearias que transformaram seus resultados
          </h2>
          <p className="text-lg text-gray-600">
            Veja como nossos clientes aumentaram seu faturamento e otimizaram suas operações.
          </p>
        </div>

        {/* Cases Grid */}
        <div className="grid lg:grid-cols-3 gap-6">
          {cases.map((caseStudy, index) => (
            <div 
              key={index}
              className={`bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-2xl transition-shadow ${
                caseStudy.featured ? 'lg:col-span-3' : ''
              }`}
            >
              {caseStudy.featured ? (
                <div className="grid lg:grid-cols-2 gap-0">
                  {/* Image */}
                  <div className="relative h-64 lg:h-auto">
                    <img 
                      src={caseStudy.image} 
                      alt={caseStudy.name}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-6">
                      <div className="flex gap-6">
                        {caseStudy.results.map((result, idx) => (
                          <div key={idx} className="text-center">
                            <div className="text-3xl font-bold text-white">{result.value}</div>
                            <div className="text-sm text-gray-200">{result.label}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-8">
                    <h3 className="text-2xl font-bold text-gray-900 mb-3">
                      {caseStudy.name} - {caseStudy.location}
                    </h3>
                    <p className="text-gray-700 italic mb-6">"{caseStudy.quote}"</p>
                    
                    {/* Author */}
                    <div className="flex items-center gap-4 mb-6">
                      <img 
                        src={caseStudy.avatar} 
                        alt={caseStudy.owner}
                        className="w-12 h-12 rounded-full"
                      />
                      <div>
                        <div className="font-semibold text-gray-900">{caseStudy.owner}</div>
                        <div className="text-sm text-gray-600">{caseStudy.role}</div>
                      </div>
                    </div>

                    {/* Metrics */}
                    <div className="flex flex-wrap gap-4">
                      {caseStudy.metrics.map((metric, idx) => {
                        const Icon = metric.icon;
                        return (
                          <div key={idx} className="flex items-center gap-2 text-sm text-gray-600">
                            <Icon className="w-4 h-4 text-indigo-600" />
                            <span>{metric.text}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-6">
                  <h3 className="text-xl font-bold text-gray-900 mb-3">
                    {caseStudy.name} - {caseStudy.location}
                  </h3>
                  <p className="text-gray-700 italic mb-6">"{caseStudy.quote}"</p>
                  
                  {/* Stats */}
                  <div className="grid grid-cols-2 gap-4">
                    {caseStudy.stats.map((stat, idx) => (
                      <div key={idx} className="text-center p-4 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-lg">
                        <div className="text-2xl font-bold text-indigo-600">{stat.value}</div>
                        <div className="text-sm text-gray-600">{stat.label}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
