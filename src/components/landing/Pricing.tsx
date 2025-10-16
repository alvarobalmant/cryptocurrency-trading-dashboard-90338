import { useState } from 'react';
import { Check, ArrowRight, Shield } from 'lucide-react';
import { Link } from 'react-router-dom';

const plans = [
  {
    name: 'Starter',
    description: 'Perfeito para começar',
    monthlyPrice: 29,
    yearlyPrice: 23,
    features: [
      'Até 100 agendamentos/mês',
      '1 profissional',
      'Agenda básica',
      'Cadastro de clientes',
      'Relatórios básicos',
      'Suporte por email'
    ]
  },
  {
    name: 'Professional',
    description: 'Para barbearias em crescimento',
    monthlyPrice: 49,
    yearlyPrice: 39,
    popular: true,
    features: [
      'Agendamentos ilimitados',
      'Até 3 profissionais',
      'WhatsApp integrado',
      'Controle de caixa',
      'Comissões automáticas',
      'Relatórios avançados',
      'Lista de espera',
      'Suporte prioritário'
    ]
  },
  {
    name: 'Enterprise',
    description: 'Para redes e grandes barbearias',
    monthlyPrice: 99,
    yearlyPrice: 79,
    features: [
      'Tudo do Professional',
      'Profissionais ilimitados',
      'Múltiplas unidades',
      'IA para otimização',
      'Marketing automatizado',
      'API personalizada',
      'Gerente de sucesso',
      'Suporte 24/7'
    ]
  }
];

const faqs = [
  {
    question: 'Posso trocar de plano a qualquer momento?',
    answer: 'Sim! Você pode fazer upgrade ou downgrade do seu plano a qualquer momento. As mudanças são aplicadas imediatamente.'
  },
  {
    question: 'O que acontece após o período gratuito?',
    answer: 'Após 7 dias, você será cobrado automaticamente pelo plano escolhido. Pode cancelar a qualquer momento antes do vencimento.'
  },
  {
    question: 'Há taxa de setup ou instalação?',
    answer: 'Não! Não cobramos nenhuma taxa adicional. O preço que você vê é exatamente o que você paga.'
  },
  {
    question: 'Posso cancelar quando quiser?',
    answer: 'Claro! Não há fidelidade. Você pode cancelar sua assinatura a qualquer momento direto no painel.'
  }
];

export default function Pricing() {
  const [isYearly, setIsYearly] = useState(false);

  return (
    <section id="planos" className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-6">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-12">
          <p className="text-sm font-semibold text-indigo-600 uppercase tracking-wider mb-3">
            Planos e Preços
          </p>
          <h2 className="text-4xl font-display font-bold text-gray-900 mb-4">
            Escolha o plano ideal para sua barbearia
          </h2>
          <p className="text-lg text-gray-600">
            Comece grátis e escale conforme seu negócio cresce. Sem taxas ocultas, sem surpresas.
          </p>
        </div>

        {/* Pricing Toggle */}
        <div className="flex items-center justify-center gap-4 mb-12">
          <span className={`font-medium ${!isYearly ? 'text-gray-900' : 'text-gray-500'}`}>
            Mensal
          </span>
          <button
            onClick={() => setIsYearly(!isYearly)}
            className="relative w-14 h-7 bg-gray-300 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
            style={{ backgroundColor: isYearly ? '#6366f1' : '#d1d5db' }}
          >
            <span
              className="absolute top-1 left-1 w-5 h-5 bg-white rounded-full transition-transform"
              style={{ transform: isYearly ? 'translateX(28px)' : 'translateX(0)' }}
            />
          </button>
          <span className={`font-medium ${isYearly ? 'text-gray-900' : 'text-gray-500'}`}>
            Anual
            <span className="ml-2 px-2 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full">
              -20%
            </span>
          </span>
        </div>

        {/* Plans Grid */}
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          {plans.map((plan, index) => (
            <div
              key={index}
              className={`relative bg-white rounded-2xl border-2 p-8 hover:shadow-2xl transition-all ${
                plan.popular
                  ? 'border-indigo-500 shadow-xl scale-105'
                  : 'border-gray-200 hover:border-indigo-300'
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-sm font-bold rounded-full">
                  Mais Popular
                </div>
              )}

              <div className="mb-6">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">{plan.name}</h3>
                <p className="text-gray-600">{plan.description}</p>
              </div>

              <div className="mb-6">
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-bold text-gray-900">R$</span>
                  <span className="text-5xl font-bold text-gray-900">
                    {isYearly ? plan.yearlyPrice : plan.monthlyPrice}
                  </span>
                  <span className="text-gray-600">/mês</span>
                </div>
                {isYearly ? (
                  <>
                    <p className="text-xs text-gray-500 mt-1">
                      cobrado anualmente
                    </p>
                    <p className="text-sm text-green-600 font-medium mt-2">
                      Economize R$ {(plan.monthlyPrice - plan.yearlyPrice) * 12}/ano
                    </p>
                  </>
                ) : null}
              </div>

              <ul className="space-y-3 mb-8">
                {plan.features.map((feature, idx) => (
                  <li key={idx} className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-indigo-600 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-700">{feature}</span>
                  </li>
                ))}
              </ul>

              <Link
                to="/auth"
                className={`w-full flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-medium transition-all ${
                  plan.popular
                    ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white hover:shadow-xl'
                    : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
                }`}
              >
                <span>Começar grátis</span>
                <ArrowRight className="w-5 h-5" />
              </Link>

              <p className="text-center text-sm text-gray-500 mt-4">
                7 dias grátis • Sem cartão
              </p>
            </div>
          ))}
        </div>

        {/* Guarantee */}
        <div className="flex items-center justify-center gap-4 p-6 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl mb-12">
          <Shield className="w-8 h-8 text-green-600" />
          <div>
            <h4 className="font-bold text-gray-900">Garantia de 30 dias</h4>
            <p className="text-gray-600">Não ficou satisfeito? Devolvemos 100% do seu dinheiro, sem perguntas.</p>
          </div>
        </div>

        {/* FAQ */}
        <div>
          <h3 className="text-2xl font-bold text-gray-900 text-center mb-8">Perguntas Frequentes</h3>
          <div className="grid md:grid-cols-2 gap-6">
            {faqs.map((faq, index) => (
              <div key={index} className="p-6 bg-gray-50 rounded-xl">
                <h4 className="font-bold text-gray-900 mb-2">{faq.question}</h4>
                <p className="text-gray-600">{faq.answer}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
