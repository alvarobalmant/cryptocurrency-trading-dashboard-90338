import barberPlusLogo from '@/assets/barber-plus-logo.png';
import { Facebook, Instagram, Youtube, Linkedin, Shield, Lock } from 'lucide-react';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-gray-900 text-gray-300 py-12">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid md:grid-cols-5 gap-8 mb-8">
          {/* Brand */}
          <div className="md:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <img src={barberPlusLogo} alt="Barber+" className="h-8 md:h-10 w-auto brightness-0 invert" />
            </div>
            <p className="text-gray-400 mb-6">
              O sistema completo para transformar sua barbearia em um negócio digital de sucesso.
            </p>
            <div className="flex gap-4">
              <a href="#" className="w-10 h-10 bg-gray-800 rounded-lg flex items-center justify-center hover:bg-indigo-600 transition-colors">
                <Facebook className="w-5 h-5" />
              </a>
              <a href="https://www.instagram.com/lucaspizzol" target="_blank" rel="noopener noreferrer" className="w-10 h-10 bg-gray-800 rounded-lg flex items-center justify-center hover:bg-indigo-600 transition-colors">
                <Instagram className="w-5 h-5" />
              </a>
              <a href="#" className="w-10 h-10 bg-gray-800 rounded-lg flex items-center justify-center hover:bg-indigo-600 transition-colors">
                <Youtube className="w-5 h-5" />
              </a>
              <a href="#" className="w-10 h-10 bg-gray-800 rounded-lg flex items-center justify-center hover:bg-indigo-600 transition-colors">
                <Linkedin className="w-5 h-5" />
              </a>
            </div>
          </div>

          {/* Links Columns */}
          <div>
            <h4 className="text-white font-bold mb-4">Produto</h4>
            <ul className="space-y-2">
              <li><a href="#funcoes" className="hover:text-indigo-400 transition-colors">Recursos</a></li>
              <li><a href="#planos" className="hover:text-indigo-400 transition-colors">Preços</a></li>
              <li><a href="#dashboard" className="hover:text-indigo-400 transition-colors">Dashboard</a></li>
              <li><a href="#api" className="hover:text-indigo-400 transition-colors">API</a></li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-bold mb-4">Empresa</h4>
            <ul className="space-y-2">
              <li><a href="#sobre" className="hover:text-indigo-400 transition-colors">Sobre nós</a></li>
              <li><a href="#casos-sucesso" className="hover:text-indigo-400 transition-colors">Casos de sucesso</a></li>
              <li><a href="#blog" className="hover:text-indigo-400 transition-colors">Blog</a></li>
              <li><a href="#carreiras" className="hover:text-indigo-400 transition-colors">Carreiras</a></li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-bold mb-4">Suporte</h4>
            <ul className="space-y-2">
              <li><a href="#ajuda" className="hover:text-indigo-400 transition-colors">Central de ajuda</a></li>
              <li><a href="#contato" className="hover:text-indigo-400 transition-colors">Contato</a></li>
              <li><a href="#status" className="hover:text-indigo-400 transition-colors">Status do sistema</a></li>
              <li><a href="#seguranca" className="hover:text-indigo-400 transition-colors">Segurança</a></li>
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div className="pt-8 border-t border-gray-800 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-gray-400">
            © {currentYear} Barber+. Todos os direitos reservados.
          </p>
          <div className="flex gap-6">
            <div className="flex items-center gap-2 text-gray-400">
              <Shield className="w-4 h-4" />
              <span className="text-sm">SSL Seguro</span>
            </div>
            <div className="flex items-center gap-2 text-gray-400">
              <Lock className="w-4 h-4" />
              <span className="text-sm">LGPD Compliant</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
