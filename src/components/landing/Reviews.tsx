import { useState, useEffect } from 'react';
import { Star, CheckCircle, ChevronLeft, ChevronRight } from 'lucide-react';

const reviews = [
  {
    name: 'Luisa Simon',
    business: 'Studio Lu • São Paulo',
    avatar: 'https://i.pravatar.cc/120?img=36',
    rating: 5,
    text: 'Revolucionou minha barbearia! Os agendamentos automáticos reduziram faltas em 80% e o controle financeiro me deu visibilidade total do negócio. Em 4 meses aumentei o faturamento em 150%.',
    metrics: [
      { label: 'Redução de faltas', value: '80%' },
      { label: 'Aumento no faturamento', value: '150%' }
    ]
  },
  {
    name: 'Bruno Santos',
    business: 'BS Barber • Rio de Janeiro',
    avatar: 'https://i.pravatar.cc/120?img=12',
    rating: 5,
    text: 'O sistema é incrivelmente intuitivo. Meus funcionários aprenderam em minutos. Os relatórios me ajudam a tomar decisões baseadas em dados reais, não mais no "achismo".',
    metrics: [
      { label: 'Tempo de implementação', value: '2 dias' },
      { label: 'Satisfação da equipe', value: '100%' }
    ]
  },
  {
    name: 'Carla Nobre',
    business: 'Carla & Cia • Belo Horizonte',
    avatar: 'https://i.pravatar.cc/120?img=32',
    rating: 5,
    text: 'A integração com WhatsApp foi um divisor de águas. Nossos clientes adoram a praticidade e nós reduzimos drasticamente as faltas. O ROI foi alcançado em menos de 2 meses!',
    metrics: [
      { label: 'Redução de faltas', value: '65%' },
      { label: 'ROI', value: '< 2 meses' }
    ]
  },
  {
    name: 'Rafael Costa',
    business: 'Costa Barber Shop • Curitiba',
    avatar: 'https://i.pravatar.cc/120?img=68',
    rating: 5,
    text: 'Melhor investimento que fiz! O controle de comissões automatizado acabou com as planilhas confusas. Minha equipe está mais motivada e produtiva.',
    metrics: [
      { label: 'Economia de tempo', value: '10h/semana' },
      { label: 'Aumento produtividade', value: '35%' }
    ]
  }
];

export default function Reviews() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);

  useEffect(() => {
    if (!isAutoPlaying) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % reviews.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [isAutoPlaying]);

  const nextReview = () => {
    setIsAutoPlaying(false);
    setCurrentIndex((prev) => (prev + 1) % reviews.length);
  };

  const prevReview = () => {
    setIsAutoPlaying(false);
    setCurrentIndex((prev) => (prev - 1 + reviews.length) % reviews.length);
  };

  return (
    <section id="avaliacoes" className="py-20 bg-gradient-to-br from-indigo-50 to-purple-50">
      <div className="max-w-7xl mx-auto px-6">
        {/* Header */}
        <div className="text-center mb-12">
          <p className="text-sm font-semibold text-indigo-600 uppercase tracking-wider mb-3">
            Avaliações
          </p>
          <h2 className="text-4xl font-display font-bold text-gray-900 mb-8">
            O que nossos clientes dizem
          </h2>

          {/* Stats */}
          <div className="flex justify-center gap-12 mb-8">
            <div className="text-center">
              <div className="text-4xl font-bold text-gray-900 mb-2">4.9</div>
              <div className="flex gap-1 mb-2">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-5 h-5 text-yellow-500 fill-yellow-500" />
                ))}
              </div>
              <div className="text-sm text-gray-600">Média geral</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-gray-900 mb-2">2.500+</div>
              <div className="text-sm text-gray-600 mt-6">Avaliações</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-gray-900 mb-2">98%</div>
              <div className="text-sm text-gray-600 mt-6">Recomendam</div>
            </div>
          </div>
        </div>

        {/* Carousel */}
        <div className="relative max-w-4xl mx-auto">
          <div className="bg-white rounded-2xl shadow-2xl p-8 md:p-12">
            {/* Review Header */}
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-center gap-4">
                <img
                  src={reviews[currentIndex].avatar}
                  alt={reviews[currentIndex].name}
                  className="w-16 h-16 rounded-full"
                />
                <div>
                  <h4 className="text-xl font-bold text-gray-900">{reviews[currentIndex].name}</h4>
                  <p className="text-gray-600">{reviews[currentIndex].business}</p>
                  <div className="flex gap-1 mt-1">
                    {[...Array(reviews[currentIndex].rating)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 text-green-600 text-sm font-semibold">
                <CheckCircle className="w-5 h-5" />
                <span>Verificado</span>
              </div>
            </div>

            {/* Review Text */}
            <blockquote className="text-lg text-gray-700 italic mb-6">
              "{reviews[currentIndex].text}"
            </blockquote>

            {/* Metrics */}
            <div className="grid grid-cols-2 gap-4">
              {reviews[currentIndex].metrics.map((metric, idx) => (
                <div key={idx} className="flex justify-between items-center p-3 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg">
                  <span className="text-sm text-gray-600">{metric.label}:</span>
                  <span className="text-lg font-bold text-indigo-600">{metric.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Navigation Buttons */}
          <button
            onClick={prevReview}
            className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 w-12 h-12 bg-white rounded-full shadow-lg flex items-center justify-center hover:bg-gray-50 transition-colors"
          >
            <ChevronLeft className="w-6 h-6 text-gray-700" />
          </button>
          <button
            onClick={nextReview}
            className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 w-12 h-12 bg-white rounded-full shadow-lg flex items-center justify-center hover:bg-gray-50 transition-colors"
          >
            <ChevronRight className="w-6 h-6 text-gray-700" />
          </button>

          {/* Dots */}
          <div className="flex justify-center gap-2 mt-8">
            {reviews.map((_, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setCurrentIndex(idx);
                  setIsAutoPlaying(false);
                }}
                className={`w-2 h-2 rounded-full transition-all ${
                  idx === currentIndex ? 'bg-indigo-600 w-8' : 'bg-gray-300'
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
