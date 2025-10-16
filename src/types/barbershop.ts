import type { Database } from '@/integrations/supabase/types';

// Safe barbershop type without sensitive MercadoPago fields
export type SafeBarbershop = Omit<
  Database['public']['Tables']['barbershops']['Row'], 
  'mercadopago_access_token' | 'mercadopago_public_key'
> & {
  whatsapp_business_account_id?: string | null;
};

// Full barbershop type (for internal use only)
export type FullBarbershop = Database['public']['Tables']['barbershops']['Row'];

export type BarbershopInsert = Database['public']['Tables']['barbershops']['Insert'];
export type BarbershopUpdate = Database['public']['Tables']['barbershops']['Update'];