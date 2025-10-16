import barberPlusLogo from '@/assets/barber-plus-logo.png';
import { useState, useEffect } from 'react';
import { Menu, X } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Header() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToSection = (e, href) => {
    e.preventDefault();
    const target = document.querySelector(href);
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setIsMobileMenuOpen(false);
    }
  };

  return (
    <header 
      className={`fixed top-0 left-0 right-0 z-[100] transition-all duration-150 ${
        isScrolled ? 'bg-white shadow-md' : 'bg-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-6">
        <nav className="flex items-center justify-between h-20">
          {/* Logo */}
          <a 
            href="#topo" 
            onClick={(e) => scrollToSection(e, '#topo')}
            className="flex items-center gap-2 transition-transform hover:scale-105"
          >
            <img src={barberPlusLogo} alt="Barber+" className="h-8 md:h-10 w-auto" />
          </a>

          {/* Desktop Menu */}
          <div className="hidden lg:flex items-center gap-8">
            <a href="#vitrines" onClick={(e) => scrollToSection(e, '#vitrines')} className="text-gray-700 hover:text-indigo-600 transition-colors font-medium">
              Início
            </a>
            <a href="#dashboard" onClick={(e) => scrollToSection(e, '#dashboard')} className="text-gray-700 hover:text-indigo-600 transition-colors font-medium">
              Dashboard
            </a>
            <a href="#funcoes" onClick={(e) => scrollToSection(e, '#funcoes')} className="text-gray-700 hover:text-indigo-600 transition-colors font-medium">
              Recursos
            </a>
            <a href="#casos-sucesso" onClick={(e) => scrollToSection(e, '#casos-sucesso')} className="text-gray-700 hover:text-indigo-600 transition-colors font-medium">
              Casos de Sucesso
            </a>
            <a href="#planos" onClick={(e) => scrollToSection(e, '#planos')} className="text-gray-700 hover:text-indigo-600 transition-colors font-medium">
              Planos
            </a>
            <a href="#avaliacoes" onClick={(e) => scrollToSection(e, '#avaliacoes')} className="text-gray-700 hover:text-indigo-600 transition-colors font-medium">
              Avaliações
            </a>
            <Link 
              to="/auth"
              className="px-4 py-2 border-2 border-indigo-500 text-indigo-600 rounded-lg hover:bg-indigo-50 transition-all font-medium"
            >
              Teste grátis
            </Link>
            <Link 
              to="/auth"
              className="px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg hover:shadow-lg transition-all font-medium"
            >
              Entrar
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="lg:hidden p-2 text-gray-700 hover:text-indigo-600 transition-colors"
            aria-label="Toggle menu"
          >
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </nav>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="lg:hidden absolute top-20 left-0 right-0 bg-white shadow-lg border-t">
            <div className="flex flex-col p-6 gap-4">
              <a href="#vitrines" onClick={(e) => scrollToSection(e, '#vitrines')} className="text-gray-700 hover:text-indigo-600 transition-colors font-medium py-2">
                Início
              </a>
              <a href="#dashboard" onClick={(e) => scrollToSection(e, '#dashboard')} className="text-gray-700 hover:text-indigo-600 transition-colors font-medium py-2">
                Dashboard
              </a>
              <a href="#funcoes" onClick={(e) => scrollToSection(e, '#funcoes')} className="text-gray-700 hover:text-indigo-600 transition-colors font-medium py-2">
                Recursos
              </a>
              <a href="#casos-sucesso" onClick={(e) => scrollToSection(e, '#casos-sucesso')} className="text-gray-700 hover:text-indigo-600 transition-colors font-medium py-2">
                Casos de Sucesso
              </a>
              <a href="#planos" onClick={(e) => scrollToSection(e, '#planos')} className="text-gray-700 hover:text-indigo-600 transition-colors font-medium py-2">
                Planos
              </a>
              <a href="#avaliacoes" onClick={(e) => scrollToSection(e, '#avaliacoes')} className="text-gray-700 hover:text-indigo-600 transition-colors font-medium py-2">
                Avaliações
              </a>
              <Link 
                to="/auth"
                className="px-4 py-2 border-2 border-indigo-500 text-indigo-600 rounded-lg hover:bg-indigo-50 transition-all font-medium text-center"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Teste grátis
              </Link>
              <Link 
                to="/auth"
                className="px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg hover:shadow-lg transition-all font-medium text-center"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Entrar
              </Link>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
