# Tutorial: Configurar N8N para Gerar Insights de IA

## 📋 Pré-requisitos

1. Conta N8N (https://n8n.io ou self-hosted)
2. API Key do Claude (https://console.anthropic.com) OU OpenAI (https://platform.openai.com)
3. Credenciais Supabase:
   - URL: `https://oapyqafknhuvmuqumrcn.supabase.co`
   - Service Role Key: (pegar no dashboard Supabase > Settings > API)

## 🚀 Passo a Passo

### 1. Criar Workflow no N8N

1. Acesse N8N
2. Clique em "+ New Workflow"
3. Nome: "AI Insights Generator - Barbershop Analytics"
4. Salvar

### 2. Adicionar Schedule Trigger

1. Adicionar node: `Schedule Trigger`
2. Configurar:
   - **Mode**: `Interval`
   - **Interval**: `Days`
   - **Days Between Triggers**: `1`
   - **Trigger at Hour**: `9` (09:00 AM)
3. Salvar

### 3. Buscar Barbearias Ativas

1. Adicionar node: `Supabase`
2. Configurar:
   - **Resource**: `Row`
   - **Operation**: `Get All`
   - **Table**: `barbershops`
   - **Return All**: ✅
   - **Filters**: `{"active": {"eq": true}}`
   - **Select Fields**: `id, name`

### 4. Loop em Cada Barbearia

1. Adicionar node: `Loop Over Items`
2. **Batch Size**: `1`

### 5. Buscar Últimos Snapshots

1. Adicionar node: `Supabase`
2. Configurar:
   - **Table**: `analytics_snapshots`
   - **Limit**: `3`
   - **Filters**: `{"barbershop_id": {"eq": "{{ $json.id }}"}}`
   - **Sort**: `captured_at` (desc)

### 6. Preparar Prompt para IA

1. Adicionar node: `Code`
2. Código:

```javascript
const barbershopId = $input.first().json.barbershop_id;
const snapshots = $input.all().map(i => i.json);

const prompt = `Analise os dados abaixo e gere 3-5 insights ACIONÁVEIS:

${JSON.stringify(snapshots, null, 2)}

Retorne JSON:
{
  "insights": [{
    "insight_type": "revenue|costs|clients|operations|opportunity",
    "severity": "critical|warning|info|opportunity",
    "title": "Título curto",
    "description": "Descrição detalhada",
    "recommendations": [{"action": "...", "impact": "Alto|Médio|Baixo"}],
    "confidence_score": 0.85,
    "target_entity_type": "employee|client|barbershop",
    "target_entity_id": "uuid ou phone"
  }]
}`;

return [{ json: { barbershop_id: barbershopId, prompt, snapshots } }];
```

### 7. Chamar Claude/OpenAI

**Para Claude:**

1. Node: `HTTP Request`
2. URL: `https://api.anthropic.com/v1/messages`
3. Headers:
   - `x-api-key`: [SUA_API_KEY]
   - `anthropic-version`: `2023-06-01`
4. Body:
```json
{
  "model": "claude-sonnet-4-5",
  "max_tokens": 4096,
  "messages": [{"role": "user", "content": "={{ $json.prompt }}"}]
}
```

### 8. Parsear Resposta

1. Node: `Code`
2. Código:

```javascript
const aiResponse = $json.content[0].text; // Claude
// const aiResponse = $json.choices[0].message.content; // OpenAI

const parsed = JSON.parse(aiResponse.trim());
const barbershopId = $('Code').first().json.barbershop_id;
const snapshotId = $('Supabase1').first().json.id;

return parsed.insights.map(i => ({
  json: {
    barbershop_id: barbershopId,
    snapshot_id: snapshotId,
    ...i,
    generated_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + 30*24*60*60*1000).toISOString()
  }
}));
```

### 9. Salvar Insights no Supabase

1. Node: `Supabase`
2. Configurar:
   - **Operation**: `Create`
   - **Table**: `ai_insights`
   - **Data**: Auto-map Input Data

### 10. Ativar Workflow

1. Clicar em "Active" no topo
2. Workflow rodará diariamente às 09:00

## 🐛 Troubleshooting

**Erro 401:** Verificar API keys
**Erro 404:** Verificar URLs do Supabase
**JSON inválido:** Ajustar prompt da IA para retornar JSON puro

## 📊 Monitoramento

- Ver execuções no N8N: Executions > History
- Ver insights no app: Analytics > Tendências
