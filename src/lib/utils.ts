import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Safely extracts display name from user object
 * Handles nested objects in user_metadata.full_name
 */
export function getUserDisplayName(user: any): string {
  if (!user) return 'Usuário';
  
  // Check if full_name exists and is a string
  if (user.user_metadata?.full_name) {
    const fullName = user.user_metadata.full_name;
    
    // If it's an object (like {data: {name: "..."}})
    if (typeof fullName === 'object' && fullName !== null) {
      if (fullName.data?.name) return String(fullName.data.name);
      if (fullName.name) return String(fullName.name);
      // If object doesn't have expected structure, fall through
    }
    
    // If it's a string, return it
    if (typeof fullName === 'string') {
      return fullName;
    }
  }
  
  // Fallback to email or phone
  return user.email || user.phone || 'Usuário';
}

/**
 * Format number as Brazilian currency (BRL)
 */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}
