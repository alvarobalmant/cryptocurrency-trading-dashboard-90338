import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';
import { jsPDF } from 'https://esm.sh/jspdf@2.5.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CommissionPeriod {
  id: string;
  barbershop_id: string;
  employee_id: string;
  period_start: string;
  period_end: string;
  total_services_value: number;
  total_commission_value: number;
  total_deductions: number;
  net_amount: number;
  status: string;
  employees?: {
    name: string;
    email: string;
    commission_percentage: number;
  };
  barbershops?: {
    name: string;
    address?: string;
    phone?: string;
  };
}

interface PeriodService {
  service_name: string;
  service_price: number;
  commission_percentage: number;
  commission_amount: number;
  performed_at: string;
  appointment?: {
    client_name?: string;
    client_phone?: string;
    appointment_date?: string;
    start_time?: string;
  };
}

interface Deduction {
  description: string;
  amount: number;
  deduction_date: string;
  deduction_type: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { period_id } = await req.json();
    console.log('[PDF] Generating PDF for period:', period_id);

    // Fetch period data with relations
    const { data: period, error: periodError } = await supabaseClient
      .from('commission_periods')
      .select(`
        *,
        employees(name, email, commission_percentage),
        barbershops(name, address, phone)
      `)
      .eq('id', period_id)
      .single();

    if (periodError || !period) {
      console.error('[PDF] Error fetching period:', periodError);
      throw new Error('Period not found');
    }

    console.log('[PDF] Period found:', period_id);

    // NOVA LÓGICA: Buscar comissões devidas da employee_commission_entries
    const { data: commissionEntries, error: entriesError } = await supabaseClient
      .from('employee_commission_entries')
      .select(`
        *,
        appointment:appointments(client_name, client_phone, appointment_date, start_time)
      `)
      .eq('employee_id', period.employee_id)
      .eq('barbershop_id', period.barbershop_id)
      .eq('status', 'due')
      .gte('created_at', period.period_start)
      .lte('created_at', period.period_end)
      .order('created_at', { ascending: true });

    if (entriesError) {
      console.error('[PDF] Error fetching commission entries:', entriesError);
      throw entriesError;
    }

    console.log(`[PDF] Found ${commissionEntries?.length || 0} commission entries`);

    // Converter para formato compatível
    const services = (commissionEntries || []).map(entry => ({
      service_name: entry.service_name,
      service_price: entry.service_price,
      commission_percentage: entry.commission_percentage,
      commission_amount: entry.commission_amount,
      performed_at: entry.created_at,
      appointment: entry.appointment,
    }));

    // Deductions não são mais usados
    const deductions: any[] = [];

    // Generate PDF
    const pdf = await generatePDF(
      period as CommissionPeriod,
      (services || []) as PeriodService[],
      (deductions || []) as Deduction[]
    );

    // Upload to storage
    const fileName = `${period_id}_${Date.now()}.pdf`;
    const filePath = `${period.barbershop_id}/periods/${period_id}/report.pdf`;

    const { error: uploadError } = await supabaseClient.storage
      .from('commissions')
      .upload(filePath, pdf, {
        contentType: 'application/pdf',
        upsert: true,
      });

    if (uploadError) {
      console.error('[PDF] Error uploading PDF:', uploadError);
      throw uploadError;
    }

    // Get public URL
    const { data: urlData } = supabaseClient.storage
      .from('commissions')
      .getPublicUrl(filePath);

    // Update period with PDF URL
    const { error: updateError } = await supabaseClient
      .from('commission_periods')
      .update({ document_pdf_url: urlData.publicUrl })
      .eq('id', period_id);

    if (updateError) {
      console.error('[PDF] Error updating period:', updateError);
      throw updateError;
    }

    console.log('[PDF] PDF generated successfully:', urlData.publicUrl);

    return new Response(
      JSON.stringify({
        success: true,
        url: urlData.publicUrl,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('[PDF] Error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});

function formatDateBR(dateInput: string | Date | null | undefined): string {
  if (!dateInput) return '';
  const s = typeof dateInput === 'string' ? dateInput : new Date(dateInput).toISOString();
  const datePart = s.split('T')[0];
  const [y, m, d] = datePart.split('-');
  if (y && m && d) return `${d}/${m}/${y}`;
  try { return new Date(s).toLocaleDateString('pt-BR'); } catch { return s; }
}

async function generatePDF(
  period: CommissionPeriod,
  services: PeriodService[],
  deductions: Deduction[]
): Promise<Uint8Array> {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  let yPos = 20;

  // Header
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('RELATÓRIO DE COMISSÃO', pageWidth / 2, yPos, { align: 'center' });
  yPos += 15;

  // Barbershop info
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  if (period.barbershops?.name) {
    doc.text(period.barbershops.name, pageWidth / 2, yPos, { align: 'center' });
    yPos += 6;
  }
  if (period.barbershops?.address) {
    doc.setFontSize(10);
    doc.text(period.barbershops.address, pageWidth / 2, yPos, { align: 'center' });
    yPos += 6;
  }
  if (period.barbershops?.phone) {
    doc.text(period.barbershops.phone, pageWidth / 2, yPos, { align: 'center' });
    yPos += 10;
  }

  // Period info
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Funcionário:', 20, yPos);
  doc.setFont('helvetica', 'normal');
  doc.text(period.employees?.name || '', 60, yPos);
  yPos += 7;

  doc.setFont('helvetica', 'bold');
  doc.text('Período:', 20, yPos);
  doc.setFont('helvetica', 'normal');
  doc.text(
    `${formatDateBR(period.period_start)} - ${formatDateBR(period.period_end)}`,
    60,
    yPos
  );
  yPos += 7;

  doc.setFont('helvetica', 'bold');
  doc.text('Comissão:', 20, yPos);
  doc.setFont('helvetica', 'normal');
  doc.text(`${period.employees?.commission_percentage || 0}%`, 60, yPos);
  yPos += 15;

  // Services table
  if (services && services.length > 0) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('SERVIÇOS REALIZADOS', 20, yPos);
    yPos += 8;

    // Table header
    doc.setFontSize(9);
    doc.setFillColor(240, 240, 240);
    doc.rect(20, yPos - 5, pageWidth - 40, 7, 'F');
    doc.text('Data', 22, yPos);
    doc.text('Cliente', 50, yPos);
    doc.text('Serviço', 85, yPos);
    doc.text('Valor', 130, yPos);
    doc.text('%', 152, yPos);
    doc.text('Comissão', 165, yPos);
    yPos += 10;

    // Table rows
    doc.setFont('helvetica', 'normal');
    services.forEach((service) => {
      if (yPos > 270) {
        doc.addPage();
        yPos = 20;
      }
      const apt = service.appointment as any;
      doc.text(formatDateBR(String(service.performed_at)), 22, yPos);
      doc.text((apt?.client_name || 'Cliente').substring(0, 15), 50, yPos);
      doc.text(service.service_name.substring(0, 20), 85, yPos);
      doc.text(`R$ ${service.service_price.toFixed(2)}`, 130, yPos);
      doc.text(`${service.commission_percentage}%`, 152, yPos);
      doc.text(`R$ ${service.commission_amount.toFixed(2)}`, 165, yPos);
      yPos += 7;
    });

    yPos += 10;
  } else {
    // No services message
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('SERVIÇOS REALIZADOS', 20, yPos);
    yPos += 10;
    
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(10);
    doc.text('Nenhum serviço registrado neste período.', 20, yPos);
    yPos += 15;
  }

  // Deductions table
  if (deductions && deductions.length > 0) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('DESCONTOS E ADIANTAMENTOS', 20, yPos);
    yPos += 8;

    // Table header
    doc.setFontSize(9);
    doc.setFillColor(240, 240, 240);
    doc.rect(20, yPos - 5, pageWidth - 40, 7, 'F');
    doc.text('Data', 22, yPos);
    doc.text('Descrição', 50, yPos);
    doc.text('Tipo', 130, yPos);
    doc.text('Valor', 160, yPos);
    yPos += 10;

    // Table rows
    doc.setFont('helvetica', 'normal');
    deductions.forEach((deduction) => {
      if (yPos > 270) {
        doc.addPage();
        yPos = 20;
      }
      doc.text(formatDateBR(String(deduction.deduction_date)), 22, yPos);
      doc.text(deduction.description.substring(0, 35), 50, yPos);
      doc.text(deduction.deduction_type, 130, yPos);
      doc.text(`R$ ${deduction.amount.toFixed(2)}`, 160, yPos);
      yPos += 7;
    });

    yPos += 10;
  }

  // Summary
  if (yPos > 240) {
    doc.addPage();
    yPos = 20;
  }

  doc.setFillColor(245, 245, 245);
  doc.rect(20, yPos - 5, pageWidth - 40, 35, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  yPos += 2;
  doc.text('RESUMO FINANCEIRO', 25, yPos);
  yPos += 10;

  doc.setFont('helvetica', 'normal');
  doc.text('Total de Serviços:', 25, yPos);
  doc.text(`R$ ${period.total_services_value.toFixed(2)}`, 160, yPos, { align: 'right' });
  yPos += 7;

  doc.text('Total de Comissão:', 25, yPos);
  doc.text(`R$ ${period.total_commission_value.toFixed(2)}`, 160, yPos, { align: 'right' });
  yPos += 7;

  doc.text('(-) Descontos:', 25, yPos);
  doc.text(`R$ ${period.total_deductions.toFixed(2)}`, 160, yPos, { align: 'right' });
  yPos += 10;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('VALOR LÍQUIDO A RECEBER:', 25, yPos);
  doc.text(`R$ ${period.net_amount.toFixed(2)}`, 160, yPos, { align: 'right' });

  // Signature area
  yPos += 30;
  if (yPos > 250) {
    doc.addPage();
    yPos = 20;
  }

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.line(20, yPos, 90, yPos);
  doc.text('Assinatura do Funcionário', 20, yPos + 5);

  doc.line(120, yPos, 190, yPos);
  doc.text('Assinatura do Proprietário', 120, yPos + 5);

  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.text(
      `Documento gerado em ${new Date().toLocaleString('pt-BR')} - Página ${i} de ${pageCount}`,
      pageWidth / 2,
      285,
      { align: 'center' }
    );
  }

  return doc.output('arraybuffer');
}
