import { z } from "zod";

// Schema para validação de dados de pagamento PIX
export const pixPaymentSchema = z.object({
  clientName: z.string()
    .trim()
    .min(2, "Nome deve ter pelo menos 2 caracteres")
    .max(100, "Nome deve ter no máximo 100 caracteres")
    .regex(/^[a-zA-ZÀ-ÿ\s]+$/, "Nome deve conter apenas letras e espaços"),
  
  clientPhone: z.string()
    .trim()
    .min(10, "Telefone deve ter pelo menos 10 dígitos")
    .max(15, "Telefone deve ter no máximo 15 dígitos")
    .regex(/^[\d\s\(\)\-\+]+$/, "Telefone deve conter apenas números e símbolos válidos"),
  
  amount: z.number()
    .positive("Valor deve ser maior que zero")
    .max(999999, "Valor máximo excedido")
    .refine(val => val >= 0.01, "Valor mínimo é R$ 0,01"),
  
  description: z.string()
    .trim()
    .min(3, "Descrição deve ter pelo menos 3 caracteres")
    .max(200, "Descrição deve ter no máximo 200 caracteres"),
});

// Schema para validação de credenciais MercadoPago
export const mercadoPagoCredentialsSchema = z.object({
  accessToken: z.string()
    .trim()
    .min(20, "Access Token inválido")
    .startsWith("APP_USR-", "Access Token deve começar com APP_USR-"),
  
  publicKey: z.string()
    .trim()
    .min(20, "Public Key inválida")
    .startsWith("APP_USR-", "Public Key deve começar com APP_USR-"),
});

// Schema para validação de cliente
export const clientSchema = z.object({
  name: z.string()
    .trim()
    .min(2, "Nome deve ter pelo menos 2 caracteres")
    .max(100, "Nome deve ter no máximo 100 caracteres")
    .regex(/^[a-zA-ZÀ-ÿ\s]+$/, "Nome deve conter apenas letras e espaços"),
  
  phone: z.string()
    .trim()
    .min(10, "Telefone deve ter pelo menos 10 dígitos")
    .max(15, "Telefone deve ter no máximo 15 dígitos")
    .regex(/^[\d\s\(\)\-\+]+$/, "Telefone deve conter apenas números e símbolos válidos"),
  
  notes: z.string()
    .max(500, "Observações devem ter no máximo 500 caracteres")
    .optional(),
});

export type PixPaymentData = z.infer<typeof pixPaymentSchema>;
export type MercadoPagoCredentials = z.infer<typeof mercadoPagoCredentialsSchema>;
export type ClientData = z.infer<typeof clientSchema>;