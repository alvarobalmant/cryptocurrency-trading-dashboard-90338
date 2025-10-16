import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { Database } from '@/integrations/supabase/types';

export type ServiceCategory = Database['public']['Tables']['service_categories']['Row'];
type ServiceCategoryInsert = Database['public']['Tables']['service_categories']['Insert'];
type ServiceCategoryUpdate = Database['public']['Tables']['service_categories']['Update'];

export const useServiceCategories = (barbershopId?: string, parentId?: string | null) => {
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [allCategories, setAllCategories] = useState<ServiceCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const fetchCategories = async () => {
    if (!user || !barbershopId) return;

    try {
      // Fetch all categories for the barbershop
      const { data: allData, error: allError } = await supabase
        .from('service_categories')
        .select('*')
        .eq('barbershop_id', barbershopId)
        .order('order_index', { ascending: true });

      if (allError) throw allError;
      setAllCategories(allData || []);

      // Filter by parent_id for current level
      const filteredData = (allData || []).filter(cat => {
        if (parentId === undefined) {
          // Show root categories (no parent)
          return cat.parent_id === null;
        } else {
          // Show categories with specific parent
          return cat.parent_id === parentId;
        }
      });

      setCategories(filteredData);
    } catch (error) {
      console.error('Error fetching service categories:', error);
    } finally {
      setLoading(false);
    }
  };

  const createCategory = async (categoryData: Omit<ServiceCategoryInsert, 'barbershop_id'>) => {
    if (!user || !barbershopId) throw new Error('User not authenticated or barbershop not selected');

    const { data, error } = await supabase
      .from('service_categories')
      .insert([
        {
          ...categoryData,
          barbershop_id: barbershopId,
        },
      ])
      .select()
      .single();

    if (error) throw error;
    
    // Update both allCategories and categories
    setAllCategories(prev => [...prev, data].sort((a, b) => a.order_index - b.order_index));
    
    // Update categories if this category belongs to current level
    const belongsToCurrentLevel = parentId === undefined ? 
      data.parent_id === null : 
      data.parent_id === parentId;
    
    if (belongsToCurrentLevel) {
      setCategories(prev => [...prev, data].sort((a, b) => a.order_index - b.order_index));
    }
    
    return data;
  };

  const updateCategory = async (id: string, updates: ServiceCategoryUpdate) => {
    const { data, error } = await supabase
      .from('service_categories')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    // Update both allCategories and categories
    setAllCategories(prev => 
      prev.map(category => category.id === id ? data : category)
        .sort((a, b) => a.order_index - b.order_index)
    );
    
    setCategories(prev => 
      prev.map(category => category.id === id ? data : category)
        .sort((a, b) => a.order_index - b.order_index)
    );
    return data;
  };

  const deleteCategory = async (id: string) => {
    const { error } = await supabase
      .from('service_categories')
      .delete()
      .eq('id', id);

    if (error) throw error;

    // Update both allCategories and categories
    setAllCategories(prev => prev.filter(category => category.id !== id));
    setCategories(prev => prev.filter(category => category.id !== id));
  };

  const reorderCategories = async (categoryIds: string[]) => {
    for (const [index, id] of categoryIds.entries()) {
      const { error } = await supabase
        .from('service_categories')
        .update({ order_index: index })
        .eq('id', id);

      if (error) throw error;
    }

    await fetchCategories();
  };

  useEffect(() => {
    fetchCategories();
  }, [user, barbershopId, parentId]);

  return {
    categories,
    allCategories,
    loading,
    createCategory,
    updateCategory,
    deleteCategory,
    reorderCategories,
    fetchCategories,
  };
};