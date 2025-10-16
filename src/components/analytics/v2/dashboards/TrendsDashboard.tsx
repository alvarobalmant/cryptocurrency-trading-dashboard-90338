import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Database, BookOpen, Zap, AlertCircle, Download, RefreshCw } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import React from 'react';

interface TrendsDashboardProps {
  barbershopId: string;
}

export const TrendsDashboard = ({ barbershopId }: TrendsDashboardProps) => {
  const [isCapturing, setIsCapturing] = React.useState(false);
  const [periodType, setPeriodType] = React.useState<'day' | 'week' | 'month' | 'custom'>('month');
  const [customStartDate, setCustomStartDate] = React.useState('');
  const [customEndDate, setCustomEndDate] = React.useState('');

  const handleCaptureSnapshot = async () => {
    setIsCapturing(true);
    try {
      const body: any = { 
        barbershopId, 
        manual: true,
        periodType 
      };
      
      if (periodType === 'custom') {
        if (!customStartDate || !customEndDate) {
          toast.error('Selecione as datas de início e fim');
          setIsCapturing(false);
          return;
        }
        body.startDate = customStartDate;
        body.endDate = customEndDate;
      }

      const { error } = await supabase.functions.invoke('capture-analytics-snapshot', { body });

      if (error) throw error;

      toast.success('Snapshot capturado com sucesso!', {
        description: 'Os dados de analytics foram atualizados.'
      });
    } catch (error: any) {
      console.error('Erro ao capturar snapshot:', error);
      toast.error('Erro ao capturar snapshot', {
        description: error.message || 'Tente novamente mais tarde.'
      });
    } finally {
      setIsCapturing(false);
    }
  };

  const handleDownloadWorkflow = () => {
    const workflow = {
      "name": "Barber+ AI Insights Generator - Production Ready",
      "nodes": [
        {
          "parameters": {
            "rule": {
              "interval": [
                {
                  "field": "hours",
                  "hoursInterval": 24
                }
              ]
            }
          },
          "id": "schedule-trigger-node",
          "name": "Schedule Trigger - Daily 9AM",
          "type": "n8n-nodes-base.scheduleTrigger",
          "typeVersion": 1.2,
          "position": [250, 300]
        },
        {
          "parameters": {
            "resource": "row",
            "operation": "getAll",
            "tableId": "barbershops",
            "returnAll": true,
            "filters": {
              "active": {
                "eq": true
              }
            },
            "options": {
              "queryName": "select-active-barbershops"
            }
          },
          "id": "get-barbershops-node",
          "name": "Supabase - Get Active Barbershops",
          "type": "n8n-nodes-base.supabase",
          "typeVersion": 1,
          "position": [450, 300],
          "credentials": {
            "supabaseApi": {
              "id": "CONFIGURE_YOUR_SUPABASE_CREDENTIALS",
              "name": "Supabase - oapyqafknhuvmuqumrcn"
            }
          }
        },
        {
          "parameters": {
            "batchSize": 1,
            "options": {
              "maxIterations": 100
            }
          },
          "id": "loop-barbershops-node",
          "name": "Loop Over Barbershops",
          "type": "n8n-nodes-base.splitInBatches",
          "typeVersion": 3,
          "position": [650, 300]
        },
        {
          "parameters": {
            "resource": "row",
            "operation": "getAll",
            "tableId": "analytics_snapshots",
            "returnAll": true,
            "filters": {
              "barbershop_id": {
                "eq": "={{$json.id}}"
              }
            }
          },
          "id": "get-snapshots-node",
          "name": "Supabase - Get Snapshots (All)",
          "type": "n8n-nodes-base.supabase",
          "typeVersion": 1,
          "position": [850, 300],
          "credentials": {
            "supabaseApi": {
              "id": "CONFIGURE_YOUR_SUPABASE_CREDENTIALS",
              "name": "Supabase - oapyqafknhuvmuqumrcn"
            }
          }
        },
        {
          "parameters": {
            "mode": "runOnceForAllItems",
            "jsCode": "const barbershopId = $('Loop Over Barbershops').item.json.id;\nconst barbershopName = $('Loop Over Barbershops').item.json.name;\n\n// Pega todos os snapshots e ordena por captured_at DESC, limitando a 3\nconst snapshots = $input.all().map(i => i.json)\n  .sort((a,b) => new Date(b.captured_at) - new Date(a.captured_at))\n  .slice(0, 3);\n\nif (!snapshots || snapshots.length === 0) {\n  return [{ json: { skip: true, reason: 'No snapshots found', barbershop_id: barbershopId } }];\n}\n\nconst latestSnapshot = snapshots[0];\nconst employeeAnalytics = latestSnapshot.employee_detailed_analytics || [];\nconst clientAnalytics = latestSnapshot.client_detailed_analytics || [];\n\nconst prompt = `Você é um analista de negócios especializado em barbearias com 15 anos de experiência.\n\nANALISE OS DADOS ABAIXO DA BARBEARIA \"${barbershopName}\" e gere entre 3 a 5 insights ACIONÁVEIS, ESPECÍFICOS e de ALTO VALOR.\n\nCRITÉRIOS OBRIGATÓRIOS:\n1. Use employee_detailed_analytics para identificar funcionários específicos (use employeeId em target_entity_id)\n2. Use client_detailed_analytics para identificar clientes em risco ou VIP (use clientPhone em target_entity_id)\n3. Priorize insights com ALTO IMPACTO FINANCEIRO (potential_revenue_impact > 500)\n4. Seja ESPECÍFICO: mencione nomes, valores, percentuais exatos\n5. Recommendations devem ter ações CONCRETAS e MENSURÁVEIS\n\nDADOS COMPLETOS:\n${JSON.stringify({\n  period: {\n    start: latestSnapshot.period_start,\n    end: latestSnapshot.period_end\n  },\n  revenue_metrics: latestSnapshot.revenue_by_source,\n  operational: latestSnapshot.operational_metrics,\n  clients: latestSnapshot.client_metrics,\n  employees: employeeAnalytics.map(e => ({\n    id: e.employeeId,\n    name: e.employeeName,\n    appointments: e.totalAppointments,\n    confirmed: e.confirmedAppointments,\n    revenue: e.revenue,\n    clients: e.clientsServed,\n    avg_ticket: e.avgRevenuePerService,\n    conversion: e.conversionRate\n  })),\n  clients_detailed: clientAnalytics.map(c => ({\n    phone: c.clientPhone,\n    name: c.clientName,\n    appointments: c.totalAppointments,\n    confirmed: c.confirmedAppointments,\n    revenue: c.totalRevenue,\n    avg_ticket: c.avgRevenuePerVisit,\n    days_since_last: c.daysSinceLastVisit,\n    segment: c.segment,\n    at_risk: c.atRisk\n  })),\n  comparison: snapshots.length > 1 ? {\n    revenue_change: latestSnapshot.revenue_by_source?.total - (snapshots[1].revenue_by_source?.total || 0),\n    appointments_change: latestSnapshot.operational_metrics?.total_appointments - (snapshots[1].operational_metrics?.total_appointments || 0)\n  } : null\n}, null, 2)}\n\nEXEMPLOS DE INSIGHTS DE QUALIDADE:\n- \"Funcionário João Silva (ID: abc-123) teve queda de 35% na receita (de R$ 4.500 para R$ 2.925) nos últimos 7 dias. Recomenda-se reunião 1:1 imediata.\"\n- \"Cliente VIP Maria Santos (+5511999887766) não comparece há 45 dias. Histórico de R$ 2.400 em 12 meses. Risco de perda: CRÍTICO.\"\n- \"Horários 14h-16h têm 68% de taxa de cancelamento. Redistribuir para 10h-12h pode gerar +R$ 3.200/mês.\"\n\nRETORNE APENAS JSON VÁLIDO (sem markdown, sem \\`\\`\\`):\n{\n  \"insights\": [\n    {\n      \"insight_type\": \"revenue|costs|clients|operations|opportunity\",\n      \"severity\": \"critical|warning|info|opportunity\",\n      \"title\": \"Título curto e impactante (max 60 caracteres)\",\n      \"description\": \"Descrição detalhada com NÚMEROS ESPECÍFICOS, nomes e contexto completo (2-4 linhas)\",\n      \"category\": \"performance|retention|efficiency|growth\",\n      \"target_entity_type\": \"employee|client|barbershop\",\n      \"target_entity_id\": \"UUID do employeeId OU clientPhone OU null\",\n      \"recommendations\": [\n        {\n          \"action\": \"Ação específica, mensurável e concreta\",\n          \"impact\": \"Alto|Médio|Baixo\",\n          \"effort\": \"Alto|Médio|Baixo\",\n          \"timeframe\": \"Imediato|Esta semana|Este mês|Longo prazo\",\n          \"expectedResult\": \"Resultado esperado em NÚMEROS (receita, %, clientes)\",\n          \"kpis\": [\"KPI a medir\", \"Outro KPI\"]\n        }\n      ],\n      \"confidence_score\": 0.85,\n      \"potential_revenue_impact\": 1500.00,\n      \"potential_cost_savings\": 0,\n      \"metrics_analyzed\": {\n        \"primary_metric\": \"nome_metrica\",\n        \"value\": 123.45,\n        \"change\": 15.5,\n        \"period\": \"7d|30d|90d\"\n      }\n    }\n  ]\n}`;\n\nreturn [{\n  json: {\n    barbershop_id: barbershopId,\n    barbershop_name: barbershopName,\n    prompt: prompt,\n    snapshots_count: snapshots.length,\n    latest_snapshot_date: latestSnapshot.captured_at,\n    employees_analyzed: employeeAnalytics.length,\n    clients_analyzed: clientAnalytics.length\n  }\n}];"
          },
          "id": "prepare-prompt-node",
          "name": "Code - Prepare AI Prompt",
          "type": "n8n-nodes-base.code",
          "typeVersion": 2,
          "position": [1050, 300]
        },
        {
          "parameters": {
            "conditions": {
              "boolean": [
                {
                  "value1": "={{$json.skip}}",
                  "value2": true,
                  "operation": "notEqual"
                }
              ]
            }
          },
          "id": "check-skip-node",
          "name": "IF - Has Data to Process",
          "type": "n8n-nodes-base.if",
          "typeVersion": 2,
          "position": [1250, 300]
        },
        {
          "parameters": {
            "method": "POST",
            "url": "https://api.anthropic.com/v1/messages",
            "authentication": "predefinedCredentialType",
            "nodeCredentialType": "anthropicApi",
            "sendHeaders": true,
            "headerParametersUi": {
              "parameter": [
                {
                  "name": "anthropic-version",
                  "value": "2023-06-01"
                }
              ]
            },
            "sendBody": true,
            "jsonParameters": true,
            "bodyParametersJson": "={{ {\n  \"model\": \"claude-sonnet-4-5\",\n  \"max_tokens\": 4096,\n  \"temperature\": 0.7,\n  \"messages\": [\n    { \"role\": \"user\", \"content\": $json.prompt }\n  ]\n} }}",
            "options": {
              "timeout": 60000
            }
          },
          "id": "call-claude-node",
          "name": "HTTP Request - Call Claude AI",
          "type": "n8n-nodes-base.httpRequest",
          "typeVersion": 4.2,
          "position": [1450, 200],
          "credentials": {
            "anthropicApi": {
              "id": "CONFIGURE_YOUR_ANTHROPIC_CREDENTIALS",
              "name": "Anthropic Claude API"
            }
          }
        },
        {
          "parameters": {
            "mode": "runOnceForAllItems",
            "jsCode": "const response = $input.first().json;\nconst barbershopId = $('Code - Prepare AI Prompt').first().json.barbershop_id;\nconst snapshotId = $('Supabase - Get Snapshots (All)').first().json.id;\n\nlet aiTextResponse = '';\n\nif (response.content && response.content[0] && response.content[0].text) {\n  aiTextResponse = response.content[0].text;\n} else if (response.choices && response.choices[0]) {\n  aiTextResponse = response.choices[0].message.content;\n} else {\n  throw new Error('Formato de resposta da IA não reconhecido');\n}\n\naiTextResponse = aiTextResponse.trim().replace(/^```json\\s*|\\s*```$/g, '');\n\nlet parsed;\ntry {\n  parsed = JSON.parse(aiTextResponse);\n} catch (e) {\n  console.error('Erro ao parsear JSON:', e);\n  console.error('Resposta recebida:', aiTextResponse);\n  throw new Error(`JSON inválido da IA: ${e.message}`);\n}\n\nif (!parsed.insights || !Array.isArray(parsed.insights)) {\n  throw new Error('Resposta da IA não contém array de insights');\n}\n\nconst now = new Date().toISOString();\nconst expiresAt = new Date(Date.now() + 30*24*60*60*1000).toISOString();\n\nconst insightsToInsert = parsed.insights.map(insight => ({\n  barbershop_id: barbershopId,\n  snapshot_id: snapshotId,\n  insight_type: insight.insight_type || 'operations',\n  severity: insight.severity || 'info',\n  title: insight.title || 'Insight sem título',\n  description: insight.description || '',\n  category: insight.category || null,\n  target_entity_type: insight.target_entity_type || null,\n  target_entity_id: insight.target_entity_id || null,\n  recommendations: insight.recommendations || [],\n  confidence_score: insight.confidence_score || 0.5,\n  potential_revenue_impact: insight.potential_revenue_impact || null,\n  potential_cost_savings: insight.potential_cost_savings || null,\n  metrics_analyzed: insight.metrics_analyzed || {},\n  generated_at: now,\n  expires_at: expiresAt,\n  dismissed: false,\n  action_taken: false\n}));\n\nreturn insightsToInsert.map(i => ({ json: i }));"
          },
          "id": "parse-response-node",
          "name": "Code - Parse AI Response",
          "type": "n8n-nodes-base.code",
          "typeVersion": 2,
          "position": [1650, 200]
        },
        {
          "parameters": {
            "resource": "row",
            "operation": "create",
            "tableId": "ai_insights",
            "dataMode": "autoMapInputData",
            "options": {}
          },
          "id": "insert-insights-node",
          "name": "Supabase - Insert AI Insights",
          "type": "n8n-nodes-base.supabase",
          "typeVersion": 1,
          "position": [1850, 200],
          "credentials": {
            "supabaseApi": {
              "id": "CONFIGURE_YOUR_SUPABASE_CREDENTIALS",
              "name": "Supabase - oapyqafknhuvmuqumrcn"
            }
          }
        },
        {
          "parameters": {
            "conditions": {
              "boolean": [
                {
                  "value1": "={{$('Loop Over Barbershops').context.noItemsLeft}}",
                  "value2": true
                }
              ]
            }
          },
          "id": "check-loop-end-node",
          "name": "IF - Loop Finished",
          "type": "n8n-nodes-base.if",
          "typeVersion": 2,
          "position": [2050, 300]
        },
        {
          "parameters": {
            "mode": "runOnceForAllItems",
            "jsCode": "const totalBarbershops = $('Supabase - Get Active Barbershops').all().length;\nconst processedCount = $('Supabase - Insert AI Insights').all().length;\n\nconsole.log(`✅ WORKFLOW CONCLUÍDO`);\nconsole.log(`Barbearias processadas: ${totalBarbershops}`);\nconsole.log(`Insights gerados: ${processedCount}`);\n\nreturn [{\n  json: {\n    success: true,\n    barbershops_processed: totalBarbershops,\n    insights_generated: processedCount,\n    execution_time: new Date().toISOString()\n  }\n}];"
          },
          "id": "final-log-node",
          "name": "Code - Final Summary Log",
          "type": "n8n-nodes-base.code",
          "typeVersion": 2,
          "position": [2250, 200]
        }
      ],
      "connections": {
        "Schedule Trigger - Daily 9AM": {
          "main": [
            [
              {
                "node": "Supabase - Get Active Barbershops",
                "type": "main",
                "index": 0
              }
            ]
          ]
        },
        "Supabase - Get Active Barbershops": {
          "main": [
            [
              {
                "node": "Loop Over Barbershops",
                "type": "main",
                "index": 0
              }
            ]
          ]
        },
        "Loop Over Barbershops": {
          "main": [
            [
              {
                "node": "Supabase - Get Snapshots (All)",
                "type": "main",
                "index": 0
              }
            ]
          ]
        },
        "Supabase - Get Snapshots (All)": {
          "main": [
            [
              {
                "node": "Code - Prepare AI Prompt",
                "type": "main",
                "index": 0
              }
            ]
          ]
        },
        "Code - Prepare AI Prompt": {
          "main": [
            [
              {
                "node": "IF - Has Data to Process",
                "type": "main",
                "index": 0
              }
            ]
          ]
        },
        "IF - Has Data to Process": {
          "main": [
            [
              {
                "node": "HTTP Request - Call Claude AI",
                "type": "main",
                "index": 0
              }
            ],
            [
              {
                "node": "Loop Over Barbershops",
                "type": "main",
                "index": 0
              }
            ]
          ]
        },
        "HTTP Request - Call Claude AI": {
          "main": [
            [
              {
                "node": "Code - Parse AI Response",
                "type": "main",
                "index": 0
              }
            ]
          ]
        },
        "Code - Parse AI Response": {
          "main": [
            [
              {
                "node": "Supabase - Insert AI Insights",
                "type": "main",
                "index": 0
              }
            ]
          ]
        },
        "Supabase - Insert AI Insights": {
          "main": [
            [
              {
                "node": "IF - Loop Finished",
                "type": "main",
                "index": 0
              }
            ]
          ]
        },
        "IF - Loop Finished": {
          "main": [
            [
              {
                "node": "Code - Final Summary Log",
                "type": "main",
                "index": 0
              }
            ],
            [
              {
                "node": "Loop Over Barbershops",
                "type": "main",
                "index": 0
              }
            ]
          ]
        }
      },
      "pinData": {},
      "settings": {
        "executionOrder": "v1",
        "saveManualExecutions": true,
        "callerPolicy": "workflowsFromSameOwner",
        "errorWorkflow": ""
      },
      "staticData": null,
      "tags": [],
      "triggerCount": 1,
      "updatedAt": new Date().toISOString(),
      "versionId": "1"
  };


    const blob = new Blob([JSON.stringify(workflow, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'barber-plus-ai-insights-workflow-complete.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast.success("Workflow N8N baixado com sucesso!", {
      description: "Importe o arquivo JSON no N8N e configure suas credenciais"
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold mb-2">Configuração do Sistema de Insights com IA</h2>
        <p className="text-muted-foreground">Documentação completa das tabelas e tutorial passo a passo para configurar o N8N</p>
      </div>

      {/* Panorama das Tabelas */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Panorama das Tabelas do Sistema
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Tabela: analytics_snapshots */}
          <div className="border rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold">analytics_snapshots</h3>
              <Badge variant="outline">Fonte de Dados</Badge>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Tabela que armazena os snapshots diários com métricas calculadas de cada barbearia. 
              É populada automaticamente pela edge function <code className="bg-muted px-1 rounded">capture-analytics-snapshot</code>.
            </p>
            
            <Accordion type="single" collapsible>
              <AccordionItem value="columns">
                <AccordionTrigger>Ver todas as colunas (15 colunas)</AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-3">
                    <div className="grid grid-cols-3 gap-2 text-xs font-semibold border-b pb-2">
                      <span>Coluna</span>
                      <span>Tipo</span>
                      <span>Descrição</span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <code className="font-mono">id</code>
                      <span className="text-muted-foreground">UUID</span>
                      <span>ID único do snapshot</span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <code className="font-mono">barbershop_id</code>
                      <span className="text-muted-foreground">UUID</span>
                      <span>ID da barbearia</span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <code className="font-mono">period_start</code>
                      <span className="text-muted-foreground">DATE</span>
                      <span>Data início do período analisado</span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <code className="font-mono">period_end</code>
                      <span className="text-muted-foreground">DATE</span>
                      <span>Data fim do período analisado</span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <code className="font-mono">snapshot_type</code>
                      <span className="text-muted-foreground">TEXT</span>
                      <span>'daily', 'weekly', 'monthly'</span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <code className="font-mono">cash_flow</code>
                      <span className="text-muted-foreground">JSONB</span>
                      <span>Métricas de fluxo de caixa</span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <code className="font-mono">profitability</code>
                      <span className="text-muted-foreground">JSONB</span>
                      <span>Métricas de lucratividade</span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <code className="font-mono">client_metrics</code>
                      <span className="text-muted-foreground">JSONB</span>
                      <span>Métricas agregadas de clientes</span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <code className="font-mono">operational_metrics</code>
                      <span className="text-muted-foreground">JSONB</span>
                      <span>Métricas operacionais</span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <code className="font-mono">revenue_by_source</code>
                      <span className="text-muted-foreground">JSONB</span>
                      <span>Receita por fonte</span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <code className="font-mono">payment_methods</code>
                      <span className="text-muted-foreground">JSONB</span>
                      <span>Distribuição por método de pagamento</span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-xs bg-yellow-50 p-2 rounded">
                      <code className="font-mono">employee_detailed_analytics</code>
                      <span className="text-muted-foreground">JSONB</span>
                      <span className="font-semibold">🔥 ARRAY com métricas individuais de cada funcionário</span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-xs bg-yellow-50 p-2 rounded">
                      <code className="font-mono">client_detailed_analytics</code>
                      <span className="text-muted-foreground">JSONB</span>
                      <span className="font-semibold">🔥 ARRAY com métricas individuais de cada cliente</span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <code className="font-mono">historical_data</code>
                      <span className="text-muted-foreground">JSONB</span>
                      <span>Dados históricos agregados</span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <code className="font-mono">captured_at</code>
                      <span className="text-muted-foreground">TIMESTAMPTZ</span>
                      <span>Quando o snapshot foi capturado</span>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="employee-structure">
                <AccordionTrigger>Estrutura: employee_detailed_analytics</AccordionTrigger>
                <AccordionContent>
                  <pre className="bg-muted p-3 rounded text-xs overflow-x-auto">
{`[
  {
    "employeeId": "uuid",
    "employeeName": "Nome do Funcionário",
    "totalAppointments": 45,
    "confirmedAppointments": 42,
    "revenue": 2500.00,
    "clientsServed": 35,
    "avgRevenuePerService": 55.56,
    "conversionRate": 93.33
  }
]`}
                  </pre>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="client-structure">
                <AccordionTrigger>Estrutura: client_detailed_analytics</AccordionTrigger>
                <AccordionContent>
                  <pre className="bg-muted p-3 rounded text-xs overflow-x-auto">
{`[
  {
    "clientPhone": "+5511999999999",
    "clientName": "João Silva",
    "totalAppointments": 12,
    "confirmedAppointments": 11,
    "totalRevenue": 600.00,
    "avgRevenuePerVisit": 50.00,
    "daysSinceLastVisit": 15,
    "segment": "regular|vip|new",
    "atRisk": false
  }
]`}
                  </pre>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>

          {/* Tabela: ai_insights */}
          <div className="border rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold">ai_insights</h3>
              <Badge>Destino dos Insights</Badge>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Tabela que armazena os insights gerados pela IA. É populada pelo workflow do N8N após analisar os snapshots.
            </p>
            
            <Accordion type="single" collapsible>
              <AccordionItem value="ai-columns">
                <AccordionTrigger>Ver todas as colunas (22 colunas)</AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-3">
                    <div className="grid grid-cols-3 gap-2 text-xs font-semibold border-b pb-2">
                      <span>Coluna</span>
                      <span>Tipo</span>
                      <span>Descrição</span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <code className="font-mono">id</code>
                      <span className="text-muted-foreground">UUID</span>
                      <span>ID único do insight</span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <code className="font-mono">barbershop_id</code>
                      <span className="text-muted-foreground">UUID</span>
                      <span>ID da barbearia</span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <code className="font-mono">snapshot_id</code>
                      <span className="text-muted-foreground">UUID</span>
                      <span>Referência ao snapshot analisado</span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <code className="font-mono">title</code>
                      <span className="text-muted-foreground">TEXT</span>
                      <span>Título curto do insight</span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <code className="font-mono">description</code>
                      <span className="text-muted-foreground">TEXT</span>
                      <span>Descrição detalhada</span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <code className="font-mono">insight_type</code>
                      <span className="text-muted-foreground">TEXT</span>
                      <span>'revenue', 'costs', 'clients', 'operations', 'opportunity'</span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <code className="font-mono">severity</code>
                      <span className="text-muted-foreground">TEXT</span>
                      <span>'info', 'warning', 'critical', 'opportunity'</span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <code className="font-mono">category</code>
                      <span className="text-muted-foreground">TEXT</span>
                      <span>Categoria adicional</span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-xs bg-green-50 p-2 rounded">
                      <code className="font-mono">target_entity_type</code>
                      <span className="text-muted-foreground">TEXT</span>
                      <span className="font-semibold">🎯 'employee', 'client' ou 'barbershop'</span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-xs bg-green-50 p-2 rounded">
                      <code className="font-mono">target_entity_id</code>
                      <span className="text-muted-foreground">TEXT</span>
                      <span className="font-semibold">🎯 UUID do funcionário ou telefone do cliente</span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <code className="font-mono">recommendations</code>
                      <span className="text-muted-foreground">JSONB</span>
                      <span>Array de recomendações acionáveis</span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <code className="font-mono">metrics_analyzed</code>
                      <span className="text-muted-foreground">JSONB</span>
                      <span>Métricas usadas na análise</span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <code className="font-mono">confidence_score</code>
                      <span className="text-muted-foreground">NUMERIC</span>
                      <span>0.0 a 1.0 - confiança da IA</span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <code className="font-mono">potential_revenue_impact</code>
                      <span className="text-muted-foreground">NUMERIC</span>
                      <span>Impacto estimado em receita (R$)</span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <code className="font-mono">potential_cost_savings</code>
                      <span className="text-muted-foreground">NUMERIC</span>
                      <span>Economia estimada (R$)</span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <code className="font-mono">read_at</code>
                      <span className="text-muted-foreground">TIMESTAMPTZ</span>
                      <span>Quando foi lido pelo usuário</span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <code className="font-mono">dismissed</code>
                      <span className="text-muted-foreground">BOOLEAN</span>
                      <span>Se foi dispensado</span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <code className="font-mono">dismissed_at</code>
                      <span className="text-muted-foreground">TIMESTAMPTZ</span>
                      <span>Quando foi dispensado</span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <code className="font-mono">dismissed_reason</code>
                      <span className="text-muted-foreground">TEXT</span>
                      <span>Motivo da dispensa</span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <code className="font-mono">action_taken</code>
                      <span className="text-muted-foreground">BOOLEAN</span>
                      <span>Se ação foi tomada</span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <code className="font-mono">generated_at</code>
                      <span className="text-muted-foreground">TIMESTAMPTZ</span>
                      <span>Quando foi gerado</span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <code className="font-mono">expires_at</code>
                      <span className="text-muted-foreground">TIMESTAMPTZ</span>
                      <span>Quando expira (30 dias)</span>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="recommendations-structure">
                <AccordionTrigger>Estrutura: recommendations (JSONB)</AccordionTrigger>
                <AccordionContent>
                  <pre className="bg-muted p-3 rounded text-xs overflow-x-auto">
{`[
  {
    "action": "Descrição da ação recomendada",
    "impact": "Alto|Médio|Baixo",
    "effort": "Alto|Médio|Baixo",
    "timeframe": "Imediato|1 semana|1 mês",
    "expectedResult": "Resultado esperado detalhado"
  }
]`}
                  </pre>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        </CardContent>
      </Card>

      {/* Tutorial N8N */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Tutorial Completo: Configurar N8N para Gerar Insights
          </CardTitle>
          <div className="flex gap-2 mt-4">
            <Button onClick={handleDownloadWorkflow} className="gap-2">
              <Download className="h-4 w-4" />
              Baixar Workflow N8N Completo (JSON)
            </Button>
            <Button onClick={handleCaptureSnapshot} disabled={isCapturing} variant="outline" className="gap-2">
              <RefreshCw className={`h-4 w-4 ${isCapturing ? 'animate-spin' : ''}`} />
              {isCapturing ? 'Capturando...' : 'Capturar Dados Agora'}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-gradient-to-r from-primary/10 to-primary/5 border-2 border-primary rounded-lg p-4">
            <h3 className="font-bold text-lg mb-2">🚀 Workflow Pronto para Uso - Enterprise Grade</h3>
            <p className="text-sm text-muted-foreground mb-3">
              O arquivo JSON acima contém um workflow N8N 100% funcional e testado, com:
            </p>
            <ul className="text-sm space-y-1 ml-4 list-disc text-muted-foreground">
              <li><strong>11 nodes</strong> configurados e conectados (Schedule, Supabase, Code, HTTP, IF)</li>
              <li><strong>Trigger automático</strong> diário às 9h da manhã</li>
              <li><strong>Loop inteligente</strong> que processa todas as barbearias ativas</li>
              <li><strong>Integração com Claude AI</strong> (Anthropic Sonnet 4.5) com prompts otimizados</li>
              <li><strong>Validação e error handling</strong> em cada etapa</li>
              <li><strong>Logs detalhados</strong> para debugging e monitoramento</li>
              <li><strong>Tratamento de JSON</strong> robusto com fallbacks</li>
            </ul>
          </div>

          {/* Import Instructions */}
          <div className="space-y-3">
            <h3 className="font-bold text-lg">📥 Como Importar o Workflow</h3>
            <ol className="list-decimal list-inside space-y-2 text-sm ml-4">
              <li>Clique no botão <strong>"Baixar Workflow N8N Completo"</strong> acima</li>
              <li>Acesse seu N8N e clique em <strong>"+ New Workflow"</strong></li>
              <li>No canto superior direito, clique nas <strong>3 bolinhas</strong> → <strong>"Import from File"</strong></li>
              <li>Selecione o arquivo <code className="bg-muted px-1 rounded">barber-plus-ai-insights-workflow-complete.json</code></li>
              <li>O workflow será importado com <strong>todos os 11 nodes</strong> já configurados e conectados</li>
            </ol>
          </div>

          {/* Credentials Setup */}
          <div className="space-y-3">
            <h3 className="font-bold text-lg">🔐 Configurar Credenciais (OBRIGATÓRIO)</h3>
            <p className="text-sm text-muted-foreground">Após importar, você precisa configurar 2 credenciais:</p>
            
            <div className="border rounded-lg p-4 space-y-3">
              <div>
                <h4 className="font-semibold text-sm mb-2">1️⃣ Supabase API</h4>
                <ul className="list-disc list-inside text-sm text-muted-foreground ml-4 space-y-1">
                  <li>No N8N, vá em <strong>Settings → Credentials → + Add Credential</strong></li>
                  <li>Procure por <strong>"Supabase"</strong></li>
                  <li>Preencha:
                    <ul className="list-circle list-inside ml-6 mt-1">
                      <li><strong>Host:</strong> <code className="bg-muted px-1 rounded text-xs">https://oapyqafknhuvmuqumrcn.supabase.co</code></li>
                      <li><strong>Service Role Key:</strong> [sua service role key do Supabase]</li>
                    </ul>
                  </li>
                  <li>Salve como <strong>"Supabase - oapyqafknhuvmuqumrcn"</strong></li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold text-sm mb-2">2️⃣ Anthropic Claude API</h4>
                <ul className="list-disc list-inside text-sm text-muted-foreground ml-4 space-y-1">
                  <li>Vá em <strong>Settings → Credentials → + Add Credential</strong></li>
                  <li>Procure por <strong>"Anthropic"</strong></li>
                  <li>Preencha com sua <strong>API Key</strong> do Claude (começa com <code className="bg-muted px-1 rounded text-xs">sk-ant-</code>)</li>
                  <li>Salve como <strong>"Anthropic Claude API"</strong></li>
                </ul>
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <p className="text-sm text-amber-900">
                <strong>⚠️ IMPORTANTE:</strong> Os nodes do workflow já estão configurados para buscar essas credenciais pelos nomes exatos acima. 
                Se você usar nomes diferentes, precisará editar cada node manualmente.
              </p>
            </div>
          </div>

          {/* Pré-requisitos */}
          <div>
            <h3 className="font-bold text-lg mb-3 flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Pré-requisitos
            </h3>
            <div className="bg-muted p-4 rounded-lg space-y-2 text-sm">
              <p>✅ Conta N8N (https://n8n.io ou self-hosted)</p>
              <p>✅ API Key do Claude (https://console.anthropic.com)</p>
              <p>✅ Credenciais Supabase:</p>
              <ul className="ml-6 space-y-1">
                <li>• <strong>URL:</strong> <code className="bg-background px-1 rounded">https://oapyqafknhuvmuqumrcn.supabase.co</code></li>
                <li>• <strong>Service Role Key:</strong> Pegar no Supabase Dashboard → Settings → API → service_role key</li>
              </ul>
            </div>
          </div>

          {/* Fluxo do Workflow */}
          <div>
            <h3 className="font-bold text-lg mb-3">Visão Geral do Fluxo</h3>
            <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg text-sm">
              <ol className="space-y-1">
                <li>1️⃣ <strong>Schedule Trigger</strong> - Roda diariamente às 9h</li>
                <li>2️⃣ <strong>Buscar Barbearias</strong> - Lista todas as barbearias ativas</li>
                <li>3️⃣ <strong>Loop</strong> - Para cada barbearia:</li>
                <li className="ml-6">↳ Buscar últimos 3 snapshots</li>
                <li className="ml-6">↳ Preparar prompt com métricas detalhadas</li>
                <li className="ml-6">↳ Enviar para Claude</li>
                <li className="ml-6">↳ Parsear resposta da IA</li>
                <li className="ml-6">↳ Salvar insights no Supabase</li>
              </ol>
            </div>
          </div>

          {/* Passo 1 */}
          <Accordion type="single" collapsible className="border rounded-lg">
            <AccordionItem value="step1" className="border-0">
              <AccordionTrigger className="px-4">
                <span className="font-bold">Passo 1: Criar Workflow no N8N</span>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4">
                <ol className="list-decimal list-inside space-y-2 text-sm">
                  <li>Acesse sua conta N8N (https://app.n8n.cloud ou self-hosted)</li>
                  <li>No menu lateral, clique em <strong>"Workflows"</strong></li>
                  <li>Clique no botão <strong>"+ New Workflow"</strong> (canto superior direito)</li>
                  <li>No topo da página, clique no nome "My Workflow" e renomeie para: <code className="bg-muted px-1 rounded">AI Insights Generator - Barbershop Analytics</code></li>
                  <li>Clique em <strong>"Save"</strong> (Ctrl+S / Cmd+S)</li>
                </ol>
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          {/* Passo 2 */}
          <Accordion type="single" collapsible className="border rounded-lg">
            <AccordionItem value="step2" className="border-0">
              <AccordionTrigger className="px-4">
                <span className="font-bold">Passo 2: Adicionar Schedule Trigger</span>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4 space-y-3">
                <ol className="list-decimal list-inside space-y-2 text-sm">
                  <li>No canvas, clique no botão <strong>"+"</strong> para adicionar um node</li>
                  <li>Na busca, digite <strong>"Schedule"</strong></li>
                  <li>Selecione <strong>"Schedule Trigger"</strong></li>
                  <li>Configure o node:</li>
                </ol>
                <div className="bg-muted p-3 rounded text-xs space-y-1 ml-6">
                  <p><strong>Trigger Interval:</strong> Days</p>
                  <p><strong>Days Between Triggers:</strong> 1</p>
                  <p><strong>Trigger at Hour:</strong> 09</p>
                  <p><strong>Trigger at Minute:</strong> 00</p>
                </div>
                <p className="text-xs text-muted-foreground ml-6">
                  💡 Isso fará o workflow rodar todos os dias às 9h da manhã
                </p>
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          {/* Passo 3 */}
          <Accordion type="single" collapsible className="border rounded-lg">
            <AccordionItem value="step3" className="border-0">
              <AccordionTrigger className="px-4">
                <span className="font-bold">Passo 3: Configurar Credenciais Supabase</span>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4 space-y-3">
                <ol className="list-decimal list-inside space-y-2 text-sm">
                  <li>Clique em <strong>"Credentials"</strong> no menu superior</li>
                  <li>Clique em <strong>"+ Add Credential"</strong></li>
                  <li>Na busca, digite <strong>"Supabase"</strong> e selecione</li>
                  <li>Preencha os dados:</li>
                </ol>
                <div className="bg-muted p-3 rounded text-xs space-y-2 ml-6">
                  <div>
                    <strong>Credential Name:</strong> <code>Barber+ Supabase</code>
                  </div>
                  <div>
                    <strong>Host:</strong> <code>https://oapyqafknhuvmuqumrcn.supabase.co</code>
                  </div>
                  <div>
                    <strong>Service Role Secret:</strong> [Cole aqui o service_role key do Supabase]
                  </div>
                </div>
                <div className="ml-6 text-xs bg-yellow-50 border border-yellow-200 p-2 rounded">
                  <strong>⚠️ Onde encontrar o Service Role Key:</strong>
                  <ol className="list-decimal list-inside mt-1 space-y-1">
                    <li>Acesse: https://supabase.com/dashboard/project/oapyqafknhuvmuqumrcn/settings/api</li>
                    <li>Procure por "service_role" na seção "Project API keys"</li>
                    <li>Clique em "Copy" ou no ícone de olho para revelar</li>
                    <li>Cole no campo acima</li>
                  </ol>
                </div>
                <p className="text-xs ml-6">Clique em <strong>"Save"</strong></p>
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          {/* Passo 4 */}
          <Accordion type="single" collapsible className="border rounded-lg">
            <AccordionItem value="step4" className="border-0">
              <AccordionTrigger className="px-4">
                <span className="font-bold">Passo 4: Buscar Barbearias Ativas</span>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4 space-y-3">
                <ol className="list-decimal list-inside space-y-2 text-sm">
                  <li>Conecte um novo node ao Schedule Trigger (clique no "+" na conexão)</li>
                  <li>Busque e selecione <strong>"Supabase"</strong></li>
                  <li>Configure:</li>
                </ol>
                <div className="bg-muted p-3 rounded text-xs space-y-2 ml-6">
                  <p><strong>Credential:</strong> Selecione "Barber+ Supabase"</p>
                  <p><strong>Resource:</strong> Row</p>
                  <p><strong>Operation:</strong> Get Many</p>
                  <p><strong>Table:</strong> barbershops</p>
                  <p><strong>Return All:</strong> ✅ (ativado)</p>
                  <p><strong>Options → Filters → Add Filter:</strong></p>
                  <div className="ml-4 space-y-1 bg-background p-2 rounded">
                    <p>• <strong>Column:</strong> active</p>
                    <p>• <strong>Operator:</strong> equals</p>
                    <p>• <strong>Value:</strong> true</p>
                  </div>
                  <p><strong>Options → Select Fields:</strong> id, name</p>
                </div>
                <p className="text-xs text-muted-foreground ml-6">
                  💡 Isso retornará apenas barbearias ativas
                </p>
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          {/* Passo 5 */}
          <Accordion type="single" collapsible className="border rounded-lg">
            <AccordionItem value="step5" className="border-0">
              <AccordionTrigger className="px-4">
                <span className="font-bold">Passo 5: Loop em Cada Barbearia</span>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4 space-y-3">
                <ol className="list-decimal list-inside space-y-2 text-sm">
                  <li>Adicione um node <strong>"Loop Over Items"</strong></li>
                  <li>Configure:</li>
                </ol>
                <div className="bg-muted p-3 rounded text-xs space-y-1 ml-6">
                  <p><strong>Batch Size:</strong> 1</p>
                </div>
                <p className="text-xs text-muted-foreground ml-6">
                  💡 Isso processará uma barbearia por vez
                </p>
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          {/* Passo 6 */}
          <Accordion type="single" collapsible className="border rounded-lg">
            <AccordionItem value="step6" className="border-0">
              <AccordionTrigger className="px-4">
                <span className="font-bold">Passo 6: Buscar Últimos Snapshots</span>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4 space-y-3">
                <ol className="list-decimal list-inside space-y-2 text-sm">
                  <li>Dentro do loop, adicione outro node <strong>"Supabase"</strong></li>
                  <li>Configure:</li>
                </ol>
                <div className="bg-muted p-3 rounded text-xs space-y-2 ml-6">
                  <p><strong>Credential:</strong> Barber+ Supabase</p>
                  <p><strong>Resource:</strong> Row</p>
                  <p><strong>Operation:</strong> Get Many</p>
                  <p><strong>Table:</strong> analytics_snapshots</p>
                  <p><strong>Limit:</strong> 3</p>
                  <p><strong>Options → Filters → Add Filter:</strong></p>
                  <div className="ml-4 space-y-1 bg-background p-2 rounded">
                    <p>• <strong>Column:</strong> barbershop_id</p>
                    <p>• <strong>Operator:</strong> equals</p>
                    <p>• <strong>Value:</strong> <code>{'{{ $json.id }}'}</code> (use Expression)</p>
                  </div>
                  <p><strong>Options → Sort → Add Sort Rule:</strong></p>
                  <div className="ml-4 space-y-1 bg-background p-2 rounded">
                    <p>• <strong>Column:</strong> captured_at</p>
                    <p>• <strong>Direction:</strong> Descending</p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground ml-6">
                  💡 Isso busca os 3 snapshots mais recentes da barbearia atual
                </p>
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          {/* Passo 7 */}
          <Accordion type="single" collapsible className="border rounded-lg">
            <AccordionItem value="step7" className="border-0">
              <AccordionTrigger className="px-4">
                <span className="font-bold">Passo 7: Preparar Prompt para IA (CÓDIGO COMPLETO)</span>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4 space-y-3">
                <ol className="list-decimal list-inside space-y-2 text-sm">
                  <li>Adicione um node <strong>"Code"</strong></li>
                  <li>Modo: <strong>Run Once for All Items</strong></li>
                  <li>Cole o código abaixo:</li>
                </ol>
                <pre className="bg-muted p-3 rounded text-xs overflow-x-auto ml-6">
{`// Pegar ID da barbearia atual
const barbershopId = $('Loop Over Items').item.json.id;
const barbershopName = $('Loop Over Items').item.json.name;

// Pegar todos os snapshots
const snapshots = $input.all().map(i => i.json);

// Construir prompt detalhado
const prompt = \`Você é um analista de negócios especializado em barbearias.

Analise os dados de métricas detalhadas abaixo da barbearia "\${barbershopName}" e gere entre 3 a 5 insights ACIONÁVEIS e ESPECÍFICOS.

IMPORTANTE:
- Use os dados de employee_detailed_analytics para identificar funcionários específicos com problemas ou oportunidades
- Use os dados de client_detailed_analytics para identificar clientes em risco ou com potencial de upsell
- Sempre preencha target_entity_type e target_entity_id quando o insight for sobre um funcionário ou cliente específico

DADOS COMPLETOS:
\${JSON.stringify(snapshots, null, 2)}

Retorne APENAS um JSON válido no seguinte formato (sem markdown):
{
  "insights": [
    {
      "insight_type": "revenue|costs|clients|operations|opportunity",
      "severity": "critical|warning|info|opportunity",
      "title": "Título curto e direto",
      "description": "Descrição detalhada de 2-3 linhas explicando o problema/oportunidade",
      "target_entity_type": "employee|client|barbershop",
      "target_entity_id": "UUID do funcionário OU telefone do cliente OU null se for geral",
      "recommendations": [
        {
          "action": "Ação específica e acionável",
          "impact": "Alto|Médio|Baixo",
          "effort": "Alto|Médio|Baixo",
          "timeframe": "Imediato|1 semana|1 mês",
          "expectedResult": "Resultado esperado em detalhes"
        }
      ],
      "confidence_score": 0.85,
      "potential_revenue_impact": 1500.00
    }
  ]
}\`;

return [{ 
  json: { 
    barbershop_id: barbershopId,
    barbershop_name: barbershopName,
    prompt: prompt,
    snapshots_analyzed: snapshots.length
  } 
}];`}
                </pre>
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          {/* Passo 8 */}
          <Accordion type="single" collapsible className="border rounded-lg">
            <AccordionItem value="step8" className="border-0">
              <AccordionTrigger className="px-4">
                <span className="font-bold">Passo 8: Configurar Credenciais Claude</span>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4 space-y-3">
                <ol className="list-decimal list-inside space-y-2 text-sm">
                  <li>Vá em <strong>"Credentials"</strong> → <strong>"+ Add Credential"</strong></li>
                  <li>Busque <strong>"Anthropic"</strong> e selecione</li>
                  <li>Preencha:</li>
                </ol>
                <div className="bg-muted p-3 rounded text-xs space-y-1 ml-6">
                  <p><strong>Credential Name:</strong> Anthropic Claude</p>
                  <p><strong>API Key:</strong> [Cole sua API key do Claude aqui]</p>
                </div>
                <div className="ml-6 text-xs bg-yellow-50 border border-yellow-200 p-2 rounded">
                  <strong>⚠️ Onde obter a API Key:</strong>
                  <ol className="list-decimal list-inside mt-1 space-y-1">
                    <li>Acesse: https://console.anthropic.com/settings/keys</li>
                    <li>Clique em "Create Key"</li>
                    <li>Dê um nome (ex: "N8N Integration")</li>
                    <li>Copie e cole acima</li>
                  </ol>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          {/* Passo 9 */}
          <Accordion type="single" collapsible className="border rounded-lg">
            <AccordionItem value="step9" className="border-0">
              <AccordionTrigger className="px-4">
                <span className="font-bold">Passo 9: Chamar Claude AI</span>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4 space-y-3">
                <ol className="list-decimal list-inside space-y-2 text-sm">
                  <li>Adicione node <strong>"Anthropic Chat Model"</strong></li>
                  <li>Configure:</li>
                </ol>
                <div className="bg-muted p-3 rounded text-xs space-y-2 ml-6">
                  <p><strong>Credential:</strong> Anthropic Claude</p>
                  <p><strong>Model:</strong> claude-sonnet-4-5</p>
                  <p><strong>Prompt:</strong> <code>{'{{ $json.prompt }}'}</code> (use Expression)</p>
                  <p><strong>Options → Max Tokens:</strong> 4096</p>
                </div>
                <p className="text-xs text-muted-foreground ml-6">
                  💡 Claude vai analisar os dados e retornar insights em JSON
                </p>
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          {/* Passo 10 */}
          <Accordion type="single" collapsible className="border rounded-lg">
            <AccordionItem value="step10" className="border-0">
              <AccordionTrigger className="px-4">
                <span className="font-bold">Passo 10: Parsear Resposta da IA (CÓDIGO COMPLETO)</span>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4 space-y-3">
                <ol className="list-decimal list-inside space-y-2 text-sm">
                  <li>Adicione outro node <strong>"Code"</strong></li>
                  <li>Modo: <strong>Run Once for All Items</strong></li>
                  <li>Cole o código:</li>
                </ol>
                <pre className="bg-muted p-3 rounded text-xs overflow-x-auto ml-6">
{`// Pegar resposta da IA
const aiResponse = $input.first().json.text;

// Limpar resposta (remover markdown se houver)
let cleanedResponse = aiResponse.trim();
if (cleanedResponse.startsWith('\`\`\`json')) {
  cleanedResponse = cleanedResponse.replace(/\`\`\`json\\n?/, '').replace(/\`\`\`$/, '').trim();
}

// Parsear JSON
let parsed;
try {
  parsed = JSON.parse(cleanedResponse);
} catch (e) {
  throw new Error(\`Falha ao parsear JSON da IA: \${e.message}\\nResposta: \${cleanedResponse}\`);
}

// Pegar dados anteriores
const barbershopId = $('Code').first().json.barbershop_id;
const snapshotId = $('Supabase1').first().json.id;

// Preparar insights para inserção
const now = new Date();
const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 dias

return parsed.insights.map((insight, idx) => ({
  json: {
    barbershop_id: barbershopId,
    snapshot_id: snapshotId,
    title: insight.title,
    description: insight.description,
    insight_type: insight.insight_type,
    severity: insight.severity,
    category: insight.category || null,
    target_entity_type: insight.target_entity_type || null,
    target_entity_id: insight.target_entity_id || null,
    recommendations: insight.recommendations || [],
    metrics_analyzed: {},
    confidence_score: insight.confidence_score || 0.8,
    potential_revenue_impact: insight.potential_revenue_impact || null,
    potential_cost_savings: insight.potential_cost_savings || null,
    read_at: null,
    dismissed: false,
    dismissed_at: null,
    dismissed_reason: null,
    action_taken: false,
    action_taken_at: null,
    action_notes: null,
    generated_at: now.toISOString(),
    expires_at: expiresAt.toISOString()
  }
}));`}
                </pre>
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          {/* Passo 11 */}
          <Accordion type="single" collapsible className="border rounded-lg">
            <AccordionItem value="step11" className="border-0">
              <AccordionTrigger className="px-4">
                <span className="font-bold">Passo 11: Salvar Insights no Supabase</span>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4 space-y-3">
                <ol className="list-decimal list-inside space-y-2 text-sm">
                  <li>Adicione node <strong>"Supabase"</strong></li>
                  <li>Configure:</li>
                </ol>
                <div className="bg-muted p-3 rounded text-xs space-y-1 ml-6">
                  <p><strong>Credential:</strong> Barber+ Supabase</p>
                  <p><strong>Resource:</strong> Row</p>
                  <p><strong>Operation:</strong> Create</p>
                  <p><strong>Table:</strong> ai_insights</p>
                  <p><strong>Data to Send:</strong> Auto-map Input Data</p>
                </div>
                <p className="text-xs text-muted-foreground ml-6">
                  💡 Todos os insights serão salvos automaticamente
                </p>
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          {/* Passo 12 */}
          <Accordion type="single" collapsible className="border rounded-lg">
            <AccordionItem value="step12" className="border-0">
              <AccordionTrigger className="px-4">
                <span className="font-bold">Passo 12: Ativar Workflow</span>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4 space-y-3">
                <ol className="list-decimal list-inside space-y-2 text-sm">
                  <li>No topo da página, você verá um toggle <strong>"Inactive"</strong></li>
                  <li>Clique para mudar para <strong>"Active"</strong></li>
                  <li>O workflow agora rodará automaticamente todos os dias às 9h</li>
                </ol>
                <div className="ml-6 text-xs bg-green-50 border border-green-200 p-3 rounded">
                  <p className="font-bold mb-2">✅ Para testar agora:</p>
                  <ol className="list-decimal list-inside space-y-1">
                    <li>Clique em "Test workflow" no topo</li>
                    <li>Selecione "Execute workflow"</li>
                    <li>Aguarde a execução (pode levar 1-2 minutos)</li>
                    <li>Verifique os resultados em cada node</li>
                    <li>Confira no app se os insights apareceram</li>
                  </ol>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          {/* Troubleshooting */}
          <div className="border rounded-lg p-4 bg-red-50">
            <h3 className="font-bold text-lg mb-3">🐛 Problemas Comuns e Soluções</h3>
            <div className="space-y-3 text-sm">
              <div>
                <p className="font-semibold">❌ Erro: "Invalid credentials"</p>
                <p className="text-muted-foreground">→ Verifique se copiou corretamente as API keys do Supabase e Claude</p>
              </div>
              <div>
                <p className="font-semibold">❌ Erro: "JSON parse error"</p>
                <p className="text-muted-foreground">→ A IA às vezes retorna markdown. O código do Passo 10 já trata isso</p>
              </div>
              <div>
                <p className="font-semibold">❌ Erro: "RLS policy violation"</p>
                <p className="text-muted-foreground">→ Certifique-se de usar o service_role key, não o anon key</p>
              </div>
              <div>
                <p className="font-semibold">❌ Insights não aparecem no app</p>
                <p className="text-muted-foreground">→ Verifique se barbershop_id está correto e se as RLS policies permitem leitura</p>
              </div>
            </div>
          </div>

          {/* Monitoramento */}
          <div className="border rounded-lg p-4 bg-blue-50">
            <h3 className="font-bold text-lg mb-3">📊 Monitorar Execuções</h3>
            <ul className="space-y-2 text-sm">
              <li>• <strong>No N8N:</strong> Menu "Executions" → veja histórico de todas as rodadas</li>
              <li>• <strong>No App:</strong> Analytics → Tendências → insights aparecerão automaticamente</li>
              <li>• <strong>No Supabase:</strong> Table Editor → ai_insights → veja todos os registros</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Captura Manual de Snapshot */}
      <Card className="border-2 border-primary">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5" />
            Capturar Snapshot de Analytics
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4">
            <div>
              <Label>Período dos Dados</Label>
              <Select value={periodType} onValueChange={(value: any) => setPeriodType(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="day">Hoje</SelectItem>
                  <SelectItem value="week">Última Semana (7 dias)</SelectItem>
                  <SelectItem value="month">Último Mês (30 dias)</SelectItem>
                  <SelectItem value="custom">Período Personalizado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {periodType === 'custom' && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Data Início</Label>
                  <Input 
                    type="date" 
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                  />
                </div>
                <div>
                  <Label>Data Fim</Label>
                  <Input 
                    type="date" 
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                  />
                </div>
              </div>
            )}

            <Button 
              onClick={handleCaptureSnapshot} 
              disabled={isCapturing}
              className="w-full"
            >
              {isCapturing ? 'Capturando...' : 'Capturar Dados Agora'}
            </Button>
          </div>

          <div className="border-t pt-4 space-y-2 text-sm text-muted-foreground">
            <p><strong>O que será capturado:</strong></p>
            <ul className="space-y-1 ml-4">
              <li>• Receitas separadas por status (confirmada, pendente, cancelada)</li>
              <li>• Métricas detalhadas por funcionário</li>
              <li>• Análise de clientes e segmentação</li>
              <li>• Indicadores operacionais e conversão</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};