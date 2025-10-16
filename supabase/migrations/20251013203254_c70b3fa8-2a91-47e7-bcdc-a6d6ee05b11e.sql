-- Create new RPC function to get employee commission periods history
CREATE OR REPLACE FUNCTION get_employee_commission_periods_history(
  employee_id_param uuid,
  barbershop_id_param uuid,
  start_date date DEFAULT NULL,
  end_date date DEFAULT NULL
)
RETURNS TABLE(
  id uuid,
  period_start date,
  period_end date,
  total_amount numeric,
  status text,
  period_type text,
  document_pdf_url text,
  payment_receipt_urls text[],
  signature_images text[],
  paid_at timestamp with time zone,
  created_at timestamp with time zone,
  notes text,
  commission_entries jsonb
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cp.id,
    cp.period_start,
    cp.period_end,
    cp.net_amount as total_amount,
    cp.status::text,
    cp.period_type::text,
    cp.document_pdf_url,
    cp.payment_receipt_urls,
    cp.signature_images,
    cp.paid_at,
    cp.created_at,
    cp.notes,
    (
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', ece.id,
          'service_name', ece.service_name,
          'service_price', ece.service_price,
          'commission_percentage', ece.commission_percentage,
          'commission_amount', ece.commission_amount,
          'created_at', ece.created_at,
          'status', ece.status,
          'appointment_id', ece.appointment_id
        )
        ORDER BY ece.created_at DESC
      )
      FROM employee_commission_entries ece
      WHERE ece.employee_id = cp.employee_id
        AND ece.barbershop_id = cp.barbershop_id
        AND ece.created_at >= cp.period_start::timestamp
        AND ece.created_at <= (cp.period_end::timestamp + interval '1 day')
    ) as commission_entries
  FROM commission_periods cp
  WHERE cp.employee_id = employee_id_param
    AND cp.barbershop_id = barbershop_id_param
    AND (start_date IS NULL OR cp.period_start >= start_date)
    AND (end_date IS NULL OR cp.period_end <= end_date)
  ORDER BY cp.created_at DESC;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public';