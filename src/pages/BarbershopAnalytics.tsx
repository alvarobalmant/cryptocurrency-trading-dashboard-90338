import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useBarbershops } from '@/hooks/useBarbershops';
import { useComprehensiveAnalytics } from '@/hooks/useComprehensiveAnalytics';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, TrendingUp, BarChart3, Users, Settings, LineChart, UserCog } from 'lucide-react';
import { OverviewDashboard } from '@/components/analytics/v2/dashboards/OverviewDashboard';
import { FinancialDashboard } from '@/components/analytics/v2/dashboards/FinancialDashboard';
import { ClientDashboard } from '@/components/analytics/v2/dashboards/ClientDashboard';
import { OperationalDashboard } from '@/components/analytics/v2/dashboards/OperationalDashboard';
import { TrendsDashboard } from '@/components/analytics/v2/dashboards/TrendsDashboard';
import { EmployeeDashboard } from '@/components/analytics/v2/dashboards/EmployeeDashboard';
import { DateRange } from 'react-day-picker';

const BarbershopAnalytics = () => {
  const { barbershopId } = useParams();
  const navigate = useNavigate();
  const { barbershops, loading: barbershopsLoading } = useBarbershops();
  const [currentBarbershop, setCurrentBarbershop] = useState(null);
  
  // Date range state - include past and future appointments by default
  const [startDate, setStartDate] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() - 30); // 30 days ago
    return date.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() + 30); // 30 days ahead
    return date.toISOString().split('T')[0];
  });
  
  // Operational dashboard date range state
  const [operationalDateRange, setOperationalDateRange] = useState<DateRange | undefined>({
    from: new Date(startDate),
    to: new Date(endDate)
  });
  
  // Use the specific barbershop ID from URL params or the current barbershop ID
  const actualBarbershopId = barbershopId || currentBarbershop?.id;
  const { data: analytics, isLoading: loading } = useComprehensiveAnalytics(
    actualBarbershopId, 
    operationalDateRange?.from?.toISOString().split('T')[0] || startDate, 
    operationalDateRange?.to?.toISOString().split('T')[0] || endDate
  );

  useEffect(() => {
    if (!barbershopsLoading && barbershops.length > 0) {
      if (barbershopId) {
        const barbershop = barbershops.find(b => b.id === barbershopId);
        setCurrentBarbershop(barbershop || null);
      } else {
        setCurrentBarbershop(barbershops[0]);
      }
    }
  }, [barbershopsLoading, barbershops, barbershopId]);


  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card sticky top-0 z-10 backdrop-blur-sm bg-card/95">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate(barbershopId ? '/barbershops' : '/dashboard')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-2">
            <TrendingUp className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-bold">Análises</h1>
          </div>
          <div className="ml-auto text-sm text-muted-foreground">
            {analytics && `${analytics.employeeAnalytics?.length ?? 0} funcionários`}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Page Header */}
        <div className="mb-6">
          <h2 className="text-3xl font-bold mb-2">Analytics Enterprise</h2>
          <p className="text-muted-foreground">
            Análises avançadas com inteligência artificial e métricas profissionais
          </p>
        </div>


        {loading ? (
          <div className="text-center py-20">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
            <p className="text-muted-foreground text-lg">Carregando análises avançadas...</p>
          </div>
        ) : !analytics ? (
          <Card className="text-center py-20">
            <CardHeader>
              <TrendingUp className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <CardTitle className="text-2xl">Nenhum dado encontrado</CardTitle>
              <CardDescription className="text-base">
                Não há dados suficientes para o período selecionado.
              </CardDescription>
            </CardHeader>
          </Card>
        ) : (
          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList className="grid w-full grid-cols-6 lg:w-auto lg:inline-grid">
              <TabsTrigger value="overview" className="gap-2">
                <BarChart3 className="h-4 w-4" />
                <span className="hidden sm:inline">Visão Geral</span>
              </TabsTrigger>
              <TabsTrigger value="financial" className="gap-2">
                <TrendingUp className="h-4 w-4" />
                <span className="hidden sm:inline">Financeiro</span>
              </TabsTrigger>
              <TabsTrigger value="employees" className="gap-2">
                <UserCog className="h-4 w-4" />
                <span className="hidden sm:inline">Funcionários</span>
              </TabsTrigger>
              <TabsTrigger value="clients" className="gap-2">
                <Users className="h-4 w-4" />
                <span className="hidden sm:inline">Clientes</span>
              </TabsTrigger>
              <TabsTrigger value="operational" className="gap-2">
                <Settings className="h-4 w-4" />
                <span className="hidden sm:inline">Operacional</span>
              </TabsTrigger>
              <TabsTrigger value="trends" className="gap-2">
                <LineChart className="h-4 w-4" />
                <span className="hidden sm:inline">Tendências</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
              <OverviewDashboard analytics={analytics} />
            </TabsContent>

            <TabsContent value="financial" className="space-y-4">
              <FinancialDashboard analytics={analytics} />
            </TabsContent>

            <TabsContent value="employees" className="space-y-4">
              <EmployeeDashboard analytics={analytics} />
            </TabsContent>

            <TabsContent value="clients" className="space-y-4">
              <ClientDashboard 
                analytics={analytics} 
                barbershopId={actualBarbershopId}
                startDate={operationalDateRange?.from?.toISOString().split('T')[0] || startDate}
                endDate={operationalDateRange?.to?.toISOString().split('T')[0] || endDate}
              />
            </TabsContent>

            <TabsContent value="operational" className="space-y-4">
              <OperationalDashboard 
                analytics={analytics} 
                dateRange={operationalDateRange}
                onDateRangeChange={setOperationalDateRange}
              />
            </TabsContent>

            <TabsContent value="trends" className="space-y-4">
              <TrendsDashboard barbershopId={actualBarbershopId!} />
            </TabsContent>
          </Tabs>
        )}
      </main>
    </div>
  );
};

export default BarbershopAnalytics;