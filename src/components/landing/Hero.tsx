import { useState, useEffect } from 'react';
import { Star, Rocket, Play, Shield, Headset, Smartphone, Calendar, TrendingUp, Battery } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Hero() {
  const [currentPhrase, setCurrentPhrase] = useState('');
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [charIndex, setCharIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);

  const phrases = [
    'Sistema completo para barbearias modernas',
    'Agendamentos inteligentes e automatizados',
    'Controle financeiro e relatórios avançados',
    'Aumente seu faturamento em até 150%',
    'Transforme sua barbearia em negócio digital'
  ];

  useEffect(() => {
    const typingSpeed = isDeleting ? 50 : 100;
    const pauseTime = isDeleting ? 0 : 2000;

    const timeout = setTimeout(() => {
      if (!isDeleting && charIndex === phrases[phraseIndex].length) {
        setTimeout(() => setIsDeleting(true), pauseTime);
      } else if (isDeleting && charIndex === 0) {
        setIsDeleting(false);
        setPhraseIndex((prev) => (prev + 1) % phrases.length);
      } else {
        setCharIndex((prev) => prev + (isDeleting ? -1 : 1));
      }
    }, typingSpeed);

    return () => clearTimeout(timeout);
  }, [charIndex, isDeleting, phraseIndex, phrases]);

  useEffect(() => {
    setCurrentPhrase(phrases[phraseIndex].substring(0, charIndex));
  }, [charIndex, phraseIndex, phrases]);

  return (
    <section id="vitrines" className="relative pt-32 pb-20 overflow-hidden bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Column - Content */}
          <div className="space-y-8">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white rounded-full shadow-md">
              <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
              <span className="text-sm font-medium text-gray-700">
                Mais de 2.500 barbearias confiam no Barber+
              </span>
            </div>

            {/* Title with Typing Animation */}
            <div className="min-h-[240px] flex items-start">
              <h1 className="text-5xl lg:text-6xl font-display font-bold text-gray-900 leading-tight">
                {currentPhrase}
                <span className="animate-pulse">|</span>
              </h1>
            </div>

            {/* Subtitle */}
            <p className="text-xl text-gray-600 leading-relaxed">
              Transforme sua barbearia em um negócio digital. Gerencie agendamentos, controle financeiro, comissões e muito mais em uma plataforma intuitiva e poderosa.
            </p>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-6">
              <div className="space-y-1">
                <div className="text-3xl font-bold text-indigo-600">+150%</div>
                <div className="text-sm text-gray-600">Aumento médio no faturamento</div>
              </div>
              <div className="space-y-1">
                <div className="text-3xl font-bold text-indigo-600">-70%</div>
                <div className="text-sm text-gray-600">Redução no tempo administrativo</div>
              </div>
              <div className="space-y-1">
                <div className="text-3xl font-bold text-indigo-600">98%</div>
                <div className="text-sm text-gray-600">Taxa de satisfação dos clientes</div>
              </div>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-wrap gap-4">
              <Link 
                to="/auth"
                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg font-medium hover:shadow-xl transition-all transform hover:scale-105"
              >
                <Rocket className="w-5 h-5" />
                Começar agora - Grátis por 7 dias
              </Link>
              <a 
                href="#dashboard" 
                className="inline-flex items-center gap-2 px-6 py-3 border-2 border-indigo-500 text-indigo-600 rounded-lg font-medium hover:bg-indigo-50 transition-all"
              >
                <Play className="w-5 h-5" />
                Ver demonstração
              </a>
            </div>

            {/* Features */}
            <div className="flex flex-wrap gap-6 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-indigo-500" />
                <span>Sem cartão de crédito</span>
              </div>
              <div className="flex items-center gap-2">
                <Headset className="w-5 h-5 text-indigo-500" />
                <span>Suporte especializado</span>
              </div>
              <div className="flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-indigo-500" />
                <span>Funciona em qualquer dispositivo</span>
              </div>
            </div>
          </div>

          {/* Right Column - Phone Mockup */}
          <div className="relative">
            <div className="relative max-w-sm mx-auto mt-16">
              {/* Phone Frame */}
              <div className="relative bg-gray-900 rounded-[3rem] p-4 shadow-2xl" style={{ aspectRatio: '9/16' }}>
                <div className="bg-white rounded-[2.5rem] overflow-hidden h-full flex flex-col">
                  {/* Status Bar */}
                  <div className="flex items-center justify-between px-6 py-3 bg-gray-50 flex-shrink-0">
                    <span className="text-sm font-medium">14:30</span>
                    <Battery className="w-5 h-5 text-gray-600" />
                  </div>

                  {/* App Content */}
                  <div className="p-6 space-y-4 flex-1 overflow-hidden">
                    <h3 className="text-lg font-bold text-gray-900">Hoje • 15 agendamentos</h3>
                    
                    {/* Appointment Card 1 */}
                    <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl">
                      <div className="flex items-center justify-center w-12 h-12 bg-indigo-500 text-white rounded-full font-bold">
                        JS
                      </div>
                      <div className="flex-1">
                        <div className="font-semibold text-gray-900">João Silva</div>
                        <div className="text-sm text-gray-600">Corte + Barba • R$ 45</div>
                        <div className="text-xs text-gray-500">15:00 - 15:45</div>
                      </div>
                      <div className="text-green-500 text-2xl">✓</div>
                    </div>

                    {/* Appointment Card 2 */}
                    <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
                      <div className="flex items-center justify-center w-12 h-12 bg-purple-500 text-white rounded-full font-bold">
                        MR
                      </div>
                      <div className="flex-1">
                        <div className="font-semibold text-gray-900">Miguel Rocha</div>
                        <div className="text-sm text-gray-600">Corte Social • R$ 30</div>
                        <div className="text-xs text-gray-500">15:45 - 16:15</div>
                      </div>
                      <div className="text-yellow-500 text-xl">⏱</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Floating Feature Cards */}
              <div className="absolute -left-8 top-1/4 bg-white p-4 rounded-xl shadow-xl max-w-[200px] hidden lg:block">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-10 h-10 bg-indigo-100 rounded-lg">
                    <Calendar className="w-5 h-5 text-indigo-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm text-gray-900">Agenda Inteligente</h4>
                    <p className="text-xs text-gray-600">Lembretes automáticos</p>
                  </div>
                </div>
              </div>

              <div className="absolute -right-8 bottom-1/4 bg-white p-4 rounded-xl shadow-xl max-w-[200px] hidden lg:block">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-10 h-10 bg-purple-100 rounded-lg">
                    <TrendingUp className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm text-gray-900">Relatórios Avançados</h4>
                    <p className="text-xs text-gray-600">Insights em tempo real</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Background Decoration */}
      <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-purple-100 to-transparent opacity-50 pointer-events-none" />
    </section>
  );
}
