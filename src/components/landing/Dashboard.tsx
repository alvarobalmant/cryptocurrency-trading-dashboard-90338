import { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, Lightbulb, Clock, Users } from 'lucide-react';

const chartData = {
  faturamento: [
    { day: 'Seg', value: 1200 },
    { day: 'Ter', value: 1450 },
    { day: 'Qua', value: 1650 },
    { day: 'Qui', value: 1850 },
    { day: 'Sex', value: 2100 },
    { day: 'Sáb', value: 2400 },
    { day: 'Dom', value: 1950 }
  ],
  agendamentos: [
    { day: 'Seg', value: 15 },
    { day: 'Ter', value: 18 },
    { day: 'Qua', value: 21 },
    { day: 'Qui', value: 23 },
    { day: 'Sex', value: 26 },
    { day: 'Sáb', value: 30 },
    { day: 'Dom', value: 24 }
  ],
  clientes: [
    { day: 'Seg', value: 5 },
    { day: 'Ter', value: 7 },
    { day: 'Qua', value: 9 },
    { day: 'Qui', value: 8 },
    { day: 'Sex', value: 11 },
    { day: 'Sáb', value: 14 },
    { day: 'Dom', value: 10 }
  ]
};

export default function Dashboard() {
  const [period, setPeriod] = useState('hoje');
  const [chartType, setChartType] = useState('faturamento');

  const kpiData = {
    hoje: {
      faturamento: 'R$ 1.850',
      agendamentos: '23',
      ticket: 'R$ 42'
    },
    semana: {
      faturamento: 'R$ 12.600',
      agendamentos: '157',
      ticket: 'R$ 45'
    },
    mes: {
      faturamento: 'R$ 54.200',
      agendamentos: '672',
      ticket: 'R$ 48'
    },
    ano: {
      faturamento: 'R$ 648.000',
      agendamentos: '8.064',
      ticket: 'R$ 52'
    }
  };

  return (
    <section id="dashboard" className="py-20 bg-gray-50">
      <div className="max-w-7xl mx-auto px-6">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-12">
          <p className="text-sm font-semibold text-indigo-600 uppercase tracking-wider mb-3">
            Dashboard Inteligente
          </p>
          <h2 className="text-4xl font-display font-bold text-gray-900 mb-4">
            Sua barbearia em números — insights que geram resultados
          </h2>
          <p className="text-lg text-gray-600">
            Monitore performance, identifique oportunidades e tome decisões baseadas em dados reais.
          </p>
        </div>

        {/* Period Tabs */}
        <div className="flex justify-center gap-2 mb-8">
          {['hoje', 'semana', 'mes', 'ano'].map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-6 py-2 rounded-lg font-medium transition-all ${
                period === p
                  ? 'bg-indigo-600 text-white shadow-lg'
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              {p === 'hoje' ? 'Hoje' : p === 'semana' ? 'Esta Semana' : p === 'mes' ? 'Este Mês' : 'Este Ano'}
            </button>
          ))}
        </div>

        {/* KPIs Grid */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          {/* Faturamento */}
          <div className="bg-white p-6 rounded-xl shadow-md hover:shadow-xl transition-shadow">
            <div className="flex items-start justify-between mb-4">
              <span className="text-gray-600 font-medium">Faturamento</span>
              <div className="flex items-center gap-1 text-green-600 text-sm font-semibold">
                <TrendingUp className="w-4 h-4" />
                <span>+12,4%</span>
              </div>
            </div>
            <div className="text-3xl font-bold text-gray-900 mb-2">
              {kpiData[period].faturamento}
            </div>
            <div className="text-sm text-gray-500 mb-3">Meta: R$ 2.000 (92,5%)</div>
            <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full" style={{ width: '92.5%' }} />
            </div>
          </div>

          {/* Agendamentos */}
          <div className="bg-white p-6 rounded-xl shadow-md hover:shadow-xl transition-shadow">
            <div className="flex items-start justify-between mb-4">
              <span className="text-gray-600 font-medium">Agendamentos</span>
              <div className="flex items-center gap-1 text-green-600 text-sm font-semibold">
                <TrendingUp className="w-4 h-4" />
                <span>+8</span>
              </div>
            </div>
            <div className="text-3xl font-bold text-gray-900 mb-2">
              {kpiData[period].agendamentos}
            </div>
            <div className="text-sm text-gray-500 mb-3">Média diária: 18 (+27%)</div>
            <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-green-500 to-emerald-600 rounded-full" style={{ width: '100%' }} />
            </div>
          </div>

          {/* Ticket Médio */}
          <div className="bg-white p-6 rounded-xl shadow-md hover:shadow-xl transition-shadow">
            <div className="flex items-start justify-between mb-4">
              <span className="text-gray-600 font-medium">Ticket Médio</span>
              <div className="flex items-center gap-1 text-green-600 text-sm font-semibold">
                <TrendingUp className="w-4 h-4" />
                <span>+R$ 5</span>
              </div>
            </div>
            <div className="text-3xl font-bold text-gray-900 mb-2">
              {kpiData[period].ticket}
            </div>
            <div className="text-sm text-gray-500 mb-3">Mês anterior: R$ 37</div>
            <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-amber-500 to-orange-600 rounded-full" style={{ width: '113%' }} />
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Chart */}
          <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-md">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-gray-900">Performance dos Últimos 7 Dias</h3>
              <div className="flex gap-2">
                {['faturamento', 'agendamentos', 'clientes'].map((type) => (
                  <button
                    key={type}
                    onClick={() => setChartType(type)}
                    className={`px-4 py-1 rounded-lg text-sm font-medium transition-all ${
                      chartType === type
                        ? 'bg-indigo-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {type === 'faturamento' ? 'Faturamento' : type === 'agendamentos' ? 'Agendamentos' : 'Novos Clientes'}
                  </button>
                ))}
              </div>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData[chartType]}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="day" stroke="#6b7280" />
                <YAxis stroke="#6b7280" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#fff', 
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                  }}
                />
                <Line 
                  type="monotone" 
                  dataKey="value" 
                  stroke="#6366f1" 
                  strokeWidth={3}
                  dot={{ fill: '#6366f1', r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Insights Panel */}
          <div className="bg-white p-6 rounded-xl shadow-md">
            <h3 className="flex items-center gap-2 text-lg font-bold text-gray-900 mb-6">
              <Lightbulb className="w-5 h-5 text-yellow-500" />
              Insights Inteligentes
            </h3>
            <div className="space-y-4">
              <div className="flex gap-3">
                <div className="flex items-center justify-center w-10 h-10 bg-green-100 rounded-lg flex-shrink-0">
                  <TrendingUp className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 text-sm mb-1">Excelente performance!</h4>
                  <p className="text-xs text-gray-600">Seu faturamento está 12% acima da média. Continue assim!</p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="flex items-center justify-center w-10 h-10 bg-amber-100 rounded-lg flex-shrink-0">
                  <Clock className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 text-sm mb-1">Horário de pico</h4>
                  <p className="text-xs text-gray-600">15h-17h tem maior demanda. Considere ajustar preços neste período.</p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="flex items-center justify-center w-10 h-10 bg-blue-100 rounded-lg flex-shrink-0">
                  <Users className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 text-sm mb-1">Clientes fiéis</h4>
                  <p className="text-xs text-gray-600">78% dos seus clientes retornaram este mês. Ótima retenção!</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
