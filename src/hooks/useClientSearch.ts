import { useMemo, useState, useEffect } from "react";
import { Client } from "./useClients";

export interface ClientSearchResult extends Client {
  relevanceScore: number;
  isCompatible: boolean;
  isRecent: boolean;
  isVip: boolean;
}

interface UseClientSearchProps {
  clients: Client[];
  visitorPhone?: string;
  searchTerm: string;
  activeFilter: 'all' | 'recent' | 'compatible' | 'vip';
}

// Normaliza telefone removendo caracteres não numéricos e códigos de país
const normalizePhone = (phone: string): string => {
  return phone.replace(/[^0-9]/g, '').replace(/^55/, '');
};

// Fuzzy search simples - retorna score de similaridade entre 0 e 1
const fuzzyMatch = (str: string, pattern: string): number => {
  const strLower = str.toLowerCase();
  const patternLower = pattern.toLowerCase();
  
  // Exact match
  if (strLower === patternLower) return 1.0;
  
  // Contains match
  if (strLower.includes(patternLower)) return 0.8;
  
  // Character-by-character fuzzy
  let score = 0;
  let patternIdx = 0;
  
  for (let i = 0; i < strLower.length && patternIdx < patternLower.length; i++) {
    if (strLower[i] === patternLower[patternIdx]) {
      score++;
      patternIdx++;
    }
  }
  
  return patternIdx === patternLower.length ? score / patternLower.length * 0.6 : 0;
};

export const useClientSearch = ({
  clients,
  visitorPhone,
  searchTerm,
  activeFilter
}: UseClientSearchProps) => {
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState(searchTerm);

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  const searchResults = useMemo(() => {
    // Proteção contra clients undefined
    if (!clients || !Array.isArray(clients)) {
      return [];
    }
    
    const normalizedVisitorPhone = visitorPhone ? normalizePhone(visitorPhone) : '';
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    let results: ClientSearchResult[] = clients.map((client) => {
      const normalizedClientPhone = normalizePhone(client.phone);
      
      // Calculate compatibility
      const isCompatible = normalizedVisitorPhone && 
        normalizedClientPhone === normalizedVisitorPhone;
      
      // Check if recent (created in last 7 days)
      const createdAt = new Date(client.created_at);
      const isRecent = createdAt >= sevenDaysAgo;
      
      // VIP status - placeholder (could be based on appointment count)
      const isVip = false; // TODO: Integrate with appointment data
      
      // Calculate relevance score
      let relevanceScore = 0;
      
      // Phone match is highest priority
      if (isCompatible) {
        relevanceScore += 100;
      }
      
      // Recent activity bonus
      if (isRecent) {
        relevanceScore += 20;
      }
      
      // VIP bonus
      if (isVip) {
        relevanceScore += 15;
      }
      
      // Search term matching
      if (debouncedSearchTerm) {
        const nameMatch = fuzzyMatch(client.name, debouncedSearchTerm);
        const phoneMatch = fuzzyMatch(client.phone, debouncedSearchTerm);
        
        const searchScore = Math.max(nameMatch, phoneMatch) * 50;
        relevanceScore += searchScore;
        
        // Exact match bonus
        if (client.name.toLowerCase() === debouncedSearchTerm.toLowerCase() ||
            client.phone === debouncedSearchTerm) {
          relevanceScore += 30;
        }
      }
      
      return {
        ...client,
        relevanceScore,
        isCompatible,
        isRecent,
        isVip
      };
    });

    // Filter by search term - must have some relevance
    if (debouncedSearchTerm) {
      results = results.filter(r => r.relevanceScore > 0);
    }

    // Apply active filter
    switch (activeFilter) {
      case 'recent':
        results = results.filter(r => r.isRecent);
        break;
      case 'compatible':
        results = results.filter(r => r.isCompatible);
        break;
      case 'vip':
        results = results.filter(r => r.isVip);
        break;
      // 'all' - no additional filtering
    }

    // Sort by relevance score
    results.sort((a, b) => b.relevanceScore - a.relevanceScore);

    return results;
  }, [clients, visitorPhone, debouncedSearchTerm, activeFilter]);

  return {
    results: searchResults,
    isSearching: searchTerm !== debouncedSearchTerm,
    totalResults: searchResults.length
  };
};
