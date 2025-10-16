# Barber+ - Sistema Completo de Gestão para Barbearias

## 📋 Sobre o Projeto

Barber+ é uma plataforma SaaS completa para gestão de barbearias, desenvolvida com tecnologias modernas e design profissional.

## 🚀 Tecnologias Utilizadas

### Frontend
- **React 18** - Framework UI
- **TypeScript** - Linguagem principal
- **Vite** - Build tool
- **Tailwind CSS** - Framework CSS
- **shadcn/ui** - Componentes UI
- **Radix UI** - Primitivos acessíveis
- **Lucide React** - Ícones
- **React Router DOM** - Roteamento
- **Recharts** - Gráficos

### Backend
- **Supabase** - Backend as a Service
  - PostgreSQL (banco de dados)
  - Authentication (autenticação)
  - Storage (armazenamento)
  - Edge Functions (serverless)

### Integrações
- **Mercado Pago** - Pagamentos
- **WhatsApp** - Comunicação

## 📦 Instalação

```bash
# Instalar dependências
npm install

# Rodar em desenvolvimento
npm run dev

# Build para produção
npm run build

# Preview do build
npm run preview
```

## 🎨 Páginas Implementadas

### Landing Page (/)
- Hero com animação de texto
- Preview do dashboard
- Seção de recursos
- Casos de sucesso
- Planos e preços
- Avaliações
- CTA final
- WhatsApp FAB

### Autenticação (/auth)
- Cadastro com validação
- Login
- Tela de confirmação de e-mail
- Design inspirado em grandes marcas
- Toggle entre cadastro e login

### Setup (/setup)
- Wizard em 3 passos
- Configuração da barbearia
- Progress bar animado
- Design interativo e profissional

### Dashboard (/dashboard)
- Visão geral
- Métricas e gráficos
- Agenda
- Clientes
- Serviços
- Funcionários
- Comissões
- Assinaturas
- Pagamentos
- Analytics
- Configurações

## 🎯 Funcionalidades Principais

- ✅ Agendamento online
- ✅ Gestão de clientes
- ✅ Gestão de funcionários
- ✅ Gestão de serviços
- ✅ Sistema de comissões
- ✅ Assinaturas recorrentes
- ✅ Pagamentos (PIX, pontos, dinheiro)
- ✅ Relatórios e analytics
- ✅ Integração WhatsApp
- ✅ Área do cliente
- ✅ Multi-barbearias

## 🔐 Variáveis de Ambiente

Crie um arquivo `.env.local` com:

```env
VITE_SUPABASE_URL=sua_url_supabase
VITE_SUPABASE_ANON_KEY=sua_chave_supabase
```

## 📱 Responsividade

- Mobile-first design
- Adaptável a todas as telas
- Touch-friendly
- PWA-ready

## 🎨 Design System

### Cores
- Primary: Indigo (500-600)
- Secondary: Purple (500-600)
- Success: Green (500-600)
- Gradientes modernos

### Tipografia
- Font Display: System fonts
- Tamanhos responsivos
- Hierarquia clara

### Componentes
- Botões com gradientes
- Cards com sombras
- Inputs com ícones
- Animações suaves

## 📄 Licença

© 2024 Barber+. Todos os direitos reservados.

## 🤝 Suporte

Para dúvidas ou suporte, entre em contato através do sistema.
