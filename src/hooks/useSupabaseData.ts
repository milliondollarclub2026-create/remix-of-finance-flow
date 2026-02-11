import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export function useSupabaseTable<T extends { id: string }>(
  tableName: string,
  orderBy: string = 'created_at'
) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    setLoading(true);
    const { data: rows, error } = await (supabase as any)
      .from(tableName)
      .select('*')
      .order(orderBy);
    if (!error && rows) {
      setData(rows as unknown as T[]);
    }
    setLoading(false);
  }, [tableName, orderBy]);

  useEffect(() => { fetch(); }, [fetch]);

  const insert = useCallback(async (item: Partial<T>) => {
    const { data: row, error } = await (supabase as any)
      .from(tableName)
      .insert(item)
      .select()
      .single();
    if (!error && row) {
      const typed = row as unknown as T;
      setData(prev => [...prev, typed]);
      return typed;
    }
    return null;
  }, [tableName]);

  const update = useCallback(async (id: string, updates: Partial<T>) => {
    const { error } = await (supabase as any)
      .from(tableName)
      .update(updates)
      .eq('id', id);
    if (!error) {
      setData(prev => prev.map(item => item.id === id ? { ...item, ...updates } : item));
    }
  }, [tableName]);

  const remove = useCallback(async (id: string) => {
    const { error } = await (supabase as any)
      .from(tableName)
      .delete()
      .eq('id', id);
    if (!error) {
      setData(prev => prev.filter(item => item.id !== id));
    }
  }, [tableName]);

  return { data, setData, loading, refetch: fetch, insert, update, remove };
}
