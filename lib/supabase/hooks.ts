'use client';

import { useState, useEffect, useCallback } from 'react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';

export interface UseQueryResult<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

/**
 * Custom hook to execute Supabase data queries with loading state, error handling, and manual refetch.
 */
export function useSupabaseQuery<T>(
  queryFn: () => Promise<T>,
  deps: React.DependencyList = []
): UseQueryResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  /* eslint-disable react-hooks/use-memo, react-hooks/exhaustive-deps */
  const execute = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await queryFn();
      setData(result);
    } catch (err: any) {
      console.error('useSupabaseQuery error:', err);
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setLoading(false);
    }
  }, deps);

  useEffect(() => {
    execute();
  }, [execute]);
  /* eslint-enable react-hooks/use-memo, react-hooks/exhaustive-deps */

  return { data, loading, error, refetch: execute };
}

/**
 * Custom hook to subscribe to Supabase Realtime changes on a specific table for a company.
 */
export function useRealtimeSubscription(
  tableName: string,
  companyId: string | undefined,
  onPayload: (payload: any) => void
) {
  useEffect(() => {
    if (!companyId) return;

    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;
    const channelName = `realtime:${tableName}:${companyId}`;

    const channel: RealtimeChannel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: tableName,
          filter: `company_id=eq.${companyId}`,
        },
        (payload) => {
          onPayload(payload);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tableName, companyId, onPayload]);
}
