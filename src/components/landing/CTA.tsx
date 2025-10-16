import { Rocket, Calendar, Shield, Headset, Award } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function CTA() {
  return (
    <section className="py-20 bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600">
      <div className="max-w-4xl mx-auto px-6 text-center">
        <h2 className="text-4xl md:text-5xl font-display font-bold text-white mb-4">
          Pronto para transformar sua barbearia?
        </h2>
        <p className="text-xl text-indigo-100 mb-8">
          Junte-se a mais de 2.500 barbearias que já aumentaram seus resultados com o Barber+
        </p>

        {/* Features */}
        <div className="flex flex-wrap justify-center gap-6 mb-8">
          <div className="flex items-center gap-2 text-white">
            <Rocket className="w-5 h-5" />
            <span>Setup em 5 minutos</span>
          </div>
          <div className="flex items-center gap-2 text-white">
            <Shield className="w-5 h-5" />
            <span>7 dias grátis</span>
          </div>
          <div className="flex items-center gap-2 text-white">
            <Headset className="w-5 h-5" />
            <span>Suporte especializado</span>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex flex-wrap justify-center gap-4 mb-8">
          <Link
            to="/auth"
            className="inline-flex items-center gap-2 px-8 py-4 bg-white text-indigo-600 rounded-lg font-bold text-lg hover:shadow-2xl transition-all transform hover:scale-105"
          >
            <Rocket className="w-6 h-6" />
            Começar agora - Grátis por 7 dias
          </Link>
          <a
            href="#demo"
            className="inline-flex items-center gap-2 px-8 py-4 border-2 border-white text-white rounded-lg font-bold text-lg hover:bg-white/10 transition-all"
          >
            <Calendar className="w-6 h-6" />
            Agendar demonstração
          </a>
        </div>

        {/* Guarantee */}
        <div className="flex items-center justify-center gap-2 text-indigo-100">
          <Award className="w-5 h-5" />
          <span>Garantia de satisfação de 30 dias ou seu dinheiro de volta</span>
        </div>
      </div>
    </section>
  );
}
